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
