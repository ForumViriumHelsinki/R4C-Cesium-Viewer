---
paths:
  - 'nginx/**'
  - 'Dockerfile'
  - 'docker-compose*.yml'
---

# nginx Configuration (`nginx/default.conf.template`)

Hard-won facts from PR #877 (delivery caching + HSY stale-on-error), each
verified against nginx docs and empirically in the container. The config is
an envsubst template — keep `${VAR}` placeholders intact, and remember the
Kyverno read-only-rootfs constraint: anything nginx writes (proxy cache,
temp paths) must live on the writable tmp emptyDir mount.

## `add_header` in a location block suppresses ALL inherited headers

nginx's headers module inherits `add_header` directives from outer scopes
**only if the current level defines none**. Adding a single `add_header`
to a `location` silently drops every server-level header (the security set:
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, …). Any
location that sets its own `Cache-Control` must re-declare the security
headers. Verify with `curl -sI` against the container — we shipped this bug
in the first cut of `/assets/data/`.

## Outbound TLS proxying needs explicit SNI

`proxy_ssl_server_name` defaults to **off**; Azure App Gateway fronted
upstreams (HSY `kartta.hsy.fi`) and api.digitransit.fi (#870) 502 the
handshake without SNI. Every `proxy_pass https://...` location needs
`proxy_ssl_server_name on;` (`proxy_ssl_name` defaults to `$proxy_host`,
which is correct here). Symptom: works with `curl` direct, 502 via nginx.

## Cache policy by path class

| Path                      | Policy                                                                                                          | Why                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/assets/data/*.json`     | `max-age=3600, must-revalidate` + ETag                                                                          | **Unhashed filenames** (grid index etc.) — `immutable` here served year-stale data after redeploys (the original bug) |
| `/assets/` hashed bundles | `max-age=31536000, immutable`                                                                                   | Content-hashed names, safe forever                                                                                    |
| `/wms/proxy` (HSY tiles)  | `proxy_cache` + `proxy_cache_use_stale error timeout updating http_5xx` + `proxy_cache_lock`, 3 s/10 s timeouts | HSY 504s under load and goes down; stale tiles beat broken demos. `X-Cache-Status` exposes HIT/MISS/STALE             |

Do not "simplify" the `/assets/data/` block to `expires 1h` — `expires`
emits only `max-age`, dropping the deliberate `public`/`must-revalidate`.

Known pre-existing quirk (untouched, do not cargo-cult): the `/assets/`
block emits a duplicate `Cache-Control` (one from `expires 1y`, one from
`add_header`).

## Compression

Build-time precompression (`scripts/precompress.mjs`, gzip-9) + `gzip_static
on;` serves `.gz` siblings; dynamic/proxied responses (pygeoapi JSON arrives
uncompressed from origin) use `gzip_comp_level 6` + `application/geo+json`
in `gzip_types`. The stock `nginx:1.31` image (Renovate-managed) has **no
brotli module** — `.br` serving requires an image change, tracked in #876.

## Verifying changes

`docker compose build && docker compose up -d`, then `nginx -t` inside the
container and `curl -sI` the three path classes (data JSON, hashed bundle,
GetMap twice for MISS→HIT). `docker compose down -v` after. Local compose
needs `VITE_DIGITRANSIT_KEY` in the environment.
