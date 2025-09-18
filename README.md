# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

## Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### PygeoAPI Configuration

The PygeoAPI host can be configured via environment variable:

- `VITE_PYGEOAPI_HOST`: The PygeoAPI host (default: `pygeoapi.dataportal.fi`)
  - For production hosts (without port), HTTPS protocol is used automatically
  - For localhost with port (e.g., `localhost:5000`), HTTP protocol is used automatically

For development, you can point to a local PygeoAPI instance:
```bash
VITE_PYGEOAPI_HOST=localhost:5000
```

## Run with Vite

```
npm run dev
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Run with Docker

```
docker compose up
```
The application should now be running at [http://localhost:4173](http://localhost:4173).

## Run with Skaffold

```
skaffold dev --port-forward
```

## Testing with Playwright

Run tests:
```
npx playwright test
```

Run tests in interactive UI mode:
```
npx playwright test --ui
```

Run tests in headed browsers (default: headless):
```
npx playwright test --headed
```

## Troubleshooting

```
skaffold delete
docker system --prune --all
```

## Sentry
https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/
https://docs.sentry.io/platforms/javascript/guides/vue/
https://docs.sentry.io/platforms/javascript/guides/vue/features/pinia/
