FROM oven/bun:1 AS build

ARG SENTRY_AUTH_TOKEN
ARG VITE_SENTRY_DSN
ARG VITE_PYGEOAPI_HOST=pygeoapi.dataportal.fi
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_PYGEOAPI_HOST=${VITE_PYGEOAPI_HOST}

WORKDIR /app

COPY package.json bun.lock ./
# Cache bun packages across builds for faster installs
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .

# Cache Vite build artifacts for faster rebuilds
RUN --mount=type=cache,target=/app/node_modules/.vite \
    NODE_ENV=production bun run build

# Compile ngx_brotli as a dynamic module against the SAME pinned nginx:1.31
# base, so the resulting .so is ABI-compatible with the runtime binary. Built
# with `--with-compat` (the only configure flag required for a portable
# dynamic module), so we don't need to mirror the stock image's full configure
# args. Keeping this on the Debian-based official image preserves the apt-get
# dbmate install below and the Renovate-managed `nginx:1.31` pin (issue #876).
FROM nginx:1.31 AS brotli-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential ca-certificates git wget libpcre2-dev zlib1g-dev \
    && NGINX_VERSION="$(nginx -v 2>&1 | sed 's|.*nginx/||')" \
    && wget -qO /tmp/nginx.tar.gz "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" \
    && tar -xf /tmp/nginx.tar.gz -C /tmp \
    && git clone --depth 1 --recurse-submodules --shallow-submodules \
        https://github.com/google/ngx_brotli.git /tmp/ngx_brotli \
    && cd "/tmp/nginx-${NGINX_VERSION}" \
    && ./configure --with-compat --add-dynamic-module=/tmp/ngx_brotli \
    && make -j"$(nproc)" modules \
    && mkdir -p /modules \
    && cp objs/ngx_http_brotli_static_module.so /modules/

FROM nginx:1.31

# Set default values for nginx environment variables
ENV VITE_PYGEOAPI_HOST=pygeoapi.dataportal.fi
# VTT R4C flood simulation API host.
ENV VITE_VTT_API_HOST=130.188.4.230
# DNS resolver: "auto" means detect from /etc/resolv.conf at startup
# This works in both Docker (127.0.0.11) and Kubernetes (kube-dns ClusterIP)
ENV NGINX_DNS_RESOLVER=auto
# GOFF relay evaluation key, injected into proxied /feature-flags/ requests by
# nginx (see default.conf.template). MUST stay defined (even empty): the nginx
# image's envsubst-on-templates only substitutes variables present in the
# environment — an undefined var leaves a literal ${GOFF_API_KEY} that nginx
# parses as an unknown nginx variable and refuses to start. Production
# overrides this via a Secret-backed env var on the Deployment.
ENV GOFF_API_KEY=""

# Install dbmate and postgresql-client for migrations
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v2.13.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Load the brotli static module compiled above. `load_module` must live in the
# main context, before `events`/`http`; the official image's nginx.conf has no
# modules-enabled include, so prepend the directive. `modules/` resolves under
# the prefix (/etc/nginx/modules -> /usr/lib/nginx/modules). Only the static
# module is shipped — we serve precompressed `.br` siblings (brotli_static),
# not on-the-fly compression, so the filter module is intentionally omitted.
COPY --from=brotli-builder /modules/ngx_http_brotli_static_module.so /etc/nginx/modules/
RUN sed -i '1i load_module modules/ngx_http_brotli_static_module.so;' /etc/nginx/nginx.conf

# Copy built frontend
COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/
# Copy custom entrypoint script to auto-detect DNS resolver (sourced by nginx entrypoint)
COPY nginx/docker-entrypoint.d/05-set-dns-resolver.envsh /docker-entrypoint.d/

# Copy database migrations
COPY db/migrations /migrations

# Set dbmate environment
ENV DBMATE_MIGRATIONS_DIR=/migrations
ENV DBMATE_NO_DUMP_SCHEMA=true
