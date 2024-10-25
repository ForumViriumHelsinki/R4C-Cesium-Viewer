# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

## Installation 
```
npm install
```
### local development
```
npm run serve
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

Warning: if redis cache is needed to application should be started also locally with docker-compose

## Start locally with Docker

```
docker-compose -f docker-compose.dev.yml up
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Start server build with Docker 

```
docker-compose up -d --build --force-recreate
```

The build has been only tested and should only work on Ubuntu server with nginx. With different setup the Dockerfile needs to be updated

## Running tests

Use Playwright to run tests

```
npx playwright test
```

Run tests with an interactive user interface

```
npx playwright test --ui

## Skaffold

```
skaffold delete
docker system --prune --all
