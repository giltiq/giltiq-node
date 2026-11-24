export interface GiltiqConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	retries?: number;
}

export interface ValidationResult {
	valid: boolean | null;
	vat_id: string;
	country_code: string;
	vat_number: string;
	company_name: string | null;
	company_address: string | null;
	source: string;
	source_timestamp: string;
	cache: boolean;
	qualified_confirmation: QualifiedConfirmation | null;
	request_id: string;
	requested_at: string;
}

export interface QualifiedConfirmation {
	company_name: string;
	company_city: string;
	company_zip: string;
	company_street: string;
}

export interface ValidateOptions {
	requester_vat_id?: string;
	company_name?: string;
	company_city?: string;
	company_zip?: string;
	force_live?: boolean;
}

export interface UsageResult {
	plan: string;
	period: { start: string; end: string };
	requests: { used: number; remaining: number; limit: number };
}

export interface StatusResult {
	status: string;
	sources: {
		vies: { status: string };
		bzst: { status: string };
	};
	timestamp: string;
}

export interface GiltiqError {
	code: string;
	message: string;
	request_id?: string;
	/** QUALIFIED_QUOTA_EXCEEDED: monthly qualified confirmation allowance. */
	limit?: number;
	/** QUALIFIED_QUOTA_EXCEEDED: confirmations already used this month. */
	used?: number;
	/** QUALIFIED_QUOTA_EXCEEDED: where to upgrade. */
	upgrade_url?: string;
}

export class GiltiqApiError extends Error {
	code: string;
	status: number;
	requestId?: string;
	limit?: number;
	used?: number;
	upgradeUrl?: string;

	constructor(status: number, error: GiltiqError) {
		super(error.message);
		this.name = "GiltiqApiError";
		this.code = error.code;
		this.status = status;
		this.requestId = error.request_id;
		this.limit = error.limit;
		this.used = error.used;
		this.upgradeUrl = error.upgrade_url;
	}
}

export class Giltiq {
	private apiKey: string;
	private baseUrl: string;
	private timeout: number;
	private retries: number;

	constructor(config: GiltiqConfig) {
		this.apiKey = config.apiKey;
		this.baseUrl = (config.baseUrl || "https://api.giltiq.de").replace(
			/\/$/,
			"",
		);
		this.timeout = config.timeout || 15000;
		this.retries = config.retries ?? 2;
	}

	async validate(
		vatId: string,
		options?: ValidateOptions,
	): Promise<ValidationResult> {
		const params = new URLSearchParams();
		if (options?.requester_vat_id)
			params.set("requester_vat_id", options.requester_vat_id);
		if (options?.company_name)
			params.set("company_name", options.company_name);
		if (options?.company_city)
			params.set("company_city", options.company_city);
		if (options?.company_zip) params.set("company_zip", options.company_zip);
		if (options?.force_live) params.set("force_live", "true");

		const qs = params.toString();
		const url = `${this.baseUrl}/v1/validate/${encodeURIComponent(vatId)}${qs ? `?${qs}` : ""}`;
		return this.request<ValidationResult>(url);
	}

	async usage(): Promise<UsageResult> {
		return this.request<UsageResult>(`${this.baseUrl}/v1/usage`);
	}

	async status(): Promise<StatusResult> {
		return this.request<StatusResult>(`${this.baseUrl}/v1/status`);
	}

	private async request<T>(url: string, attempt = 0): Promise<T> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeout);

		try {
			const res = await fetch(url, {
				headers: { "X-API-Key": this.apiKey },
				signal: controller.signal,
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({
					error: { code: "UNKNOWN", message: res.statusText },
				}));

				// Retry on 5xx
				if (res.status >= 500 && attempt < this.retries) {
					const delay = Math.min(1000 * 2 ** attempt, 10000);
					await new Promise((r) => setTimeout(r, delay));
					return this.request<T>(url, attempt + 1);
				}

				throw new GiltiqApiError(res.status, body.error);
			}

			return (await res.json()) as T;
		} catch (error) {
			if (error instanceof GiltiqApiError) throw error;
			if (
				error instanceof DOMException &&
				error.name === "AbortError"
			) {
				if (attempt < this.retries) {
					return this.request<T>(url, attempt + 1);
				}
				throw new GiltiqApiError(0, {
					code: "TIMEOUT",
					message: "Request timed out",
				});
			}
			throw error;
		} finally {
			clearTimeout(timer);
		}
	}
}
