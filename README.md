# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

THE user interface is currently running at https://geo.fvh.fi/r4c/M8Na2P0v6z/

## Installation 
```
npm install
```
### local development
```
npm run serve
```

## Run build with Docker 

```
docker build -t <my-build-image> . ; sudo docker run -d --name r4c-cesium-viewer -p 5173:80 <my-build-image> 
```