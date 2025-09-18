FROM node:23-alpine AS build

ARG SENTRY_AUTH_TOKEN
ARG VITE_SENTRY_DSN
ARG VITE_PYGEOAPI_HOST=pygeoapi.dataportal.fi
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_PYGEOAPI_HOST=${VITE_PYGEOAPI_HOST}

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

RUN npx vite build && npx vite optimize

FROM nginx:1.27

# Set default value for nginx environment variable
ENV VITE_PYGEOAPI_HOST=pygeoapi.dataportal.fi

COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/
