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

# Install dbmate and postgresql-client for migrations
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v2.13.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built frontend
COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/

# Copy database migrations
COPY db/migrations /migrations

# Set dbmate environment
ENV DBMATE_MIGRATIONS_DIR=/migrations
ENV DBMATE_NO_DUMP_SCHEMA=true
