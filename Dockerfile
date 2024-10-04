FROM node:21-alpine AS build

# These will be automatically populated by docker/metadata-action
ARG DOCKER_META_VERSION
ARG DOCKER_META_TITLE
ARG DOCKER_META_VERSION_SEMVER
ARG DOCKER_META_REVISION

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

# Create version.json that will be copied to the final image
RUN echo "{\"version\": \"${DOCKER_META_VERSION_SEMVER:-0.0.0}\", \"commitHash\": \"${DOCKER_META_REVISION:-development}\", \"buildTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > public/version.json

RUN npx vite build && npx vite optimize

FROM nginx:1.27

COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
