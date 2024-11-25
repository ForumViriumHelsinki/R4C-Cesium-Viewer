# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

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
