FROM node:23-alpine AS build

ARG SENTRY_AUTH_TOKEN
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

RUN npx vite build && npx vite optimize

FROM nginx:1.27

# Default PyGeoAPI host — overridden at runtime via deploy/values.yaml env
ENV VITE_PYGEOAPI_HOST=pygeoapi.dataportal.fi
# DNS resolver: "auto" detects from /etc/resolv.conf at startup.
# Works in both Docker (127.0.0.11) and Kubernetes (kube-dns ClusterIP).
ENV NGINX_DNS_RESOLVER=auto

COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/
# Sourced by nginx entrypoint to populate NGINX_DNS_RESOLVER before envsubst
COPY nginx/docker-entrypoint.d/05-set-dns-resolver.envsh /docker-entrypoint.d/
