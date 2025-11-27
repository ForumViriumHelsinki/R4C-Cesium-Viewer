# Test Setup

## Digitransit API Mocking

This directory contains setup files for mocking external APIs during testing.

### digitransit-mock.ts

Provides comprehensive mocking for the Digitransit API to prevent test failures when the `VITE_DIGITRANSIT_KEY` environment variable is not set.

#### Features:

- **Autocomplete endpoint mocking**: Returns realistic geocoding responses for address search
- **Search endpoint mocking**: Handles location search requests
- **Health check mocking**: Provides fallback responses for API health checks
- **Dynamic responses**: Adapts responses based on search parameters

#### Usage:

```typescript
import { setupDigitransitMock } from './setup/digitransit-mock';

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();
```

### global-setup.ts

Configures the test environment:

- Sets default `VITE_DIGITRANSIT_KEY=test-key` if not provided
- Logs environment configuration for debugging
- Ensures consistent test environment setup

#### Configuration:

The global setup is automatically loaded via `playwright.config.ts` and runs before all tests.

## Development Usage

### Without API Key

The application will now run gracefully in development mode without a digitransit API key:

- Warning message shown in console: `⚠️ VITE_DIGITRANSIT_KEY not set - digitransit API calls may fail or be rate limited`
- Proxy configuration handles missing headers gracefully
- API calls may be rate-limited but won't cause application crashes

### With API Key

Set your digitransit subscription key in your environment:

```bash
export VITE_DIGITRANSIT_KEY=your-api-key-here
```

## Testing

All tests now include digitransit mocking by default. The mock provides realistic responses that allow the application to function normally during testing without requiring a valid API key.
