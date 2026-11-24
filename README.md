# @giltiq/sdk

Node.js SDK for the [Giltiq VAT Validation API](https://giltiq.de).

## Installation

```bash
npm install @giltiq/sdk
```

## Usage

```typescript
import { Giltiq } from "@giltiq/sdk";

const client = new Giltiq({ apiKey: "your-api-key" });

// Validate a VAT ID
const result = await client.validate("DE123456789");
console.log(result.valid, result.company_name);

// Check usage
const usage = await client.usage();
console.log(usage.requests);

// Check API status
const status = await client.status();
console.log(status.sources);
```

### Qualified Confirmation (German BZSt)

```typescript
const result = await client.validate("DE123456789", {
  requester_vat_id: "DE987654321",
  company_name: "Example GmbH",
  company_city: "Berlin",
  company_zip: "10115",
});

if (result.qualified_confirmation) {
  console.log(result.qualified_confirmation.company_name);
}
```

`requester_vat_id` is required for qualified requests: it must be your own German VAT
ID (DE + 9 digits) and is sent to BZSt as the requesting party. A missing or non-German
value returns 400 `INVALID_REQUESTER_VAT_ID` before BZSt is called. Receipts belong to your
account (not the API key), so they survive key rotation and plan downgrades.

### Error Handling

```typescript
import { Giltiq, GiltiqApiError } from "@giltiq/sdk";

try {
  const result = await client.validate("INVALID");
} catch (error) {
  if (error instanceof GiltiqApiError) {
    console.error(error.code, error.message, error.status);
  }
}
```

Qualified confirmations are included from the Starter plan: 100 per account and
calendar month on Starter, 1,000 on Business. Free keys get `PLAN_REQUIRED` (402).
Once the allowance is used up, the API returns 402 `QUALIFIED_QUOTA_EXCEEDED` until
the next month; the error carries `limit`, `used` and `upgradeUrl`:

```typescript
try {
  await client.validate("DE123456789", { requester_vat_id: "DE987654321" });
} catch (error) {
  if (error instanceof GiltiqApiError && error.code === "QUALIFIED_QUOTA_EXCEEDED") {
    console.warn(`Used ${error.used} of ${error.limit}. Upgrade: ${error.upgradeUrl}`);
  }
}
```

## Configuration

```typescript
const client = new Giltiq({
  apiKey: "your-api-key",
  baseUrl: "https://api.giltiq.de", // default
  timeout: 15000, // ms, default
  retries: 2, // default
});
```

## Documentation

Full API documentation at [giltiq.de/docs](https://giltiq.de/docs).

## License

MIT
