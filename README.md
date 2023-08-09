# R4C-Cesium-Viewer

Codebase copied from https://github.com/ForumViriumHelsinki/CityModelFME/tree/main/cesium_viewer, refactored to suit the visualisation needs of R4C project.

This user interface is currently running at https://geo.fvh.fi/r4c/M8Na2P0v6z/

# Deployment

Build a Docker image from a Dockerfile in the current directory and tag it with your chosen image name: 

```
docker build -t <Your-Image-Name> .
```

Start a detached Docker container with a specified name, port mapping, and using the specified image: 

```
docker run -d --name <Your-Container-Name> -p <Host-Port:Container-Port> <Your-Image-Name> 
```

