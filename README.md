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
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Start locally with Docker

```
docker-compose -f docker-compose.dev.yml up
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Start server build with Docker 

```
docker build -t my-server-app . ; sudo docker run -d --name app-name -p 5173:80 my-server-app
```

The build has been only tested and should only work on Ubuntu server with nginx. With different setup the Dockerfile needs to be updated