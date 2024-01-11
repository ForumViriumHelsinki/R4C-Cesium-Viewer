# backend/Dockerfile
# Use a specific version of Node.js as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# The port the app runs on
EXPOSE 3000

# The command to run the app
CMD ["node", "src/server.js"]