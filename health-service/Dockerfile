# R4C Health Check Service
# Lightweight health check service using Bun runtime

FROM oven/bun:1-alpine

# Install PostgreSQL client for database connectivity checks
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (minimal for this service)
RUN bun install --frozen-lockfile || bun install

# Copy source code
COPY server.ts ./

# Health check for this container itself
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5051/live || exit 1

# Run as non-root user
USER bun

# Expose port
EXPOSE 5051

# Start the service
CMD ["bun", "run", "server.ts"]
