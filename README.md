# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

## Run with Vite

```
npx vite dev
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Run with Docker

```
docker compose up
```
The application should now be running at [http://localhost:4173](http://localhost:4173).

## Run with Skaffold

```
scaffold dev
```

## Running tests

Use Playwright to run tests

```
npx playwright test
```

## Troubleshooting

```
skaffold delete
docker system --prune --all
```