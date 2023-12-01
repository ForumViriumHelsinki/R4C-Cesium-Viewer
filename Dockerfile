# Use the official Node.js image as the base image
FROM node:18 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the application
RUN npm run build

# Stage 2: Use Nginx to serve the built application
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=build /usr/src/app/dist /usr/share/nginx/html