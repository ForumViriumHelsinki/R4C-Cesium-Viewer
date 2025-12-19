# Mock PyGeoAPI Server

Lightweight Bun server that mimics PyGeoAPI endpoints for local development.
No database required - uses generated GeoJSON fixtures.

## Quick Start

```bash
# Generate fixtures (one time)
bun run generate

# Start mock server
bun run dev
```

The server runs on `http://localhost:5050` (port 5000 is often used by AirPlay on macOS).

## Usage with Frontend

### Recommended: Use Makefile

```bash
# Start mock API + frontend together
make dev-mock
```

This automatically:

1. Generates fixtures if needed
2. Starts the mock server on port 5050
3. Starts Vite dev server
4. Cleans up on Ctrl+C

### Manual Start (Two Terminals)

```bash
# Terminal 1: Start mock API
cd mock-api && bun run dev

# Terminal 2: Start frontend (auto-detects mock server)
npm run dev
```

### Vite Auto-Detection

Vite automatically detects running backends in this priority order:

1. **Mock API** (localhost:5050) - If running, uses mock server
2. **kubectl port-forward** - If pygeoapi port-forward is running
3. **Production** (pygeoapi.dataportal.fi) - Fallback

No configuration needed. Just start the mock server and Vite finds it.

## Customizing Data Density

```bash
# Default: 50 buildings per postal code
bun run generate

# More data (load testing)
bun run generate --density 100

# Less data (faster startup)
bun run generate --density 20

# Limit postal codes (faster generation)
bun run generate --postal-codes 10
```

Via Makefile:

```bash
# Default density
make mock-generate

# Custom density
MOCK_DENSITY=100 make mock-generate

# Force regeneration
rm -rf mock-api/fixtures && make mock-generate
```

## Supported Collections

| Collection                 | Query Parameters                |
| -------------------------- | ------------------------------- |
| `hsy_buildings_optimized`  | `postinumero`, `bbox`, `limit`  |
| `heatexposure_optimized`   | `postinumero`, `limit`          |
| `urban_heat_building`      | `postinumero`, `limit`          |
| `tree`                     | `postinumero`, `koodi`, `limit` |
| `coldarea`                 | `posno`, `limit`                |
| `adaptation_landcover`     | `grid_id`, `bbox`, `limit`      |
| `tree_building_distance`   | `postinumero`, `limit`          |
| `othernature`              | `postinumero`, `limit`          |
| `hki_travel_time`          | `from_id`, `limit`              |
| `populationgrid`           | `limit`                         |
| `capitalregion_postalcode` | `limit`                         |

## Example Requests

```bash
# Health check
curl http://localhost:5050/health

# List all collections
curl http://localhost:5050/collections

# Get buildings in postal code 00100
curl "http://localhost:5050/collections/hsy_buildings_optimized/items?postinumero=00100&limit=50"

# Get heat exposure data
curl "http://localhost:5050/collections/heatexposure_optimized/items?limit=100"

# Get trees by height category
curl "http://localhost:5050/collections/tree/items?postinumero=00100&koodi=T510"

# Bounding box query
curl "http://localhost:5050/collections/hsy_buildings_optimized/items?bbox=24.9,60.16,25.0,60.18"
```

## Differences from Real PyGeoAPI

| Aspect          | Mock API              | Real PyGeoAPI              |
| --------------- | --------------------- | -------------------------- |
| Data source     | Generated JSON files  | PostgreSQL + PostGIS       |
| Data accuracy   | Synthetic values      | Real Helsinki data         |
| Geometry        | Simplified rectangles | Actual building footprints |
| Response time   | Instant               | Database query time        |
| WFS integration | None                  | External WFS sources       |

The mock API is sufficient for:

- Frontend UI development
- Component styling
- Data visualization testing
- Rapid iteration

Use the real PyGeoAPI for:

- Database query testing
- Production bug reproduction
- Data accuracy verification

## Files

```
mock-api/
├── server.ts       # Bun HTTP server with routing and filtering
├── generate.ts     # Fixture generator with realistic Helsinki data
├── package.json    # Dependencies (@types/bun)
├── README.md       # This file
└── fixtures/       # Generated GeoJSON files (gitignored)
    ├── buildings.json
    ├── heatexposure.json
    ├── trees.json
    ├── coldarea.json
    ├── urban_heat_building.json
    ├── adaptation_landcover.json
    ├── tree_building_distance.json
    ├── othernature.json
    ├── travel_time.json
    ├── populationgrid.json
    └── capitalregion_postalcode.json
```

## Server Architecture

The server (`server.ts`) is a single-file Bun HTTP server that:

1. **Loads fixtures on demand** - Cached in memory after first request
2. **Filters by query parameters** - Implements `postinumero`, `bbox`, `limit`, etc.
3. **Returns GeoJSON** - Standard FeatureCollection format matching PyGeoAPI
4. **CORS enabled** - Works with any frontend origin

## Data Generation

The generator (`generate.ts`) creates realistic Helsinki-area data:

- **100+ postal codes** from Helsinki, Espoo, and Vantaa
- **Building properties** matching real schema (vtj_prt, postinumero, kayttarks, etc.)
- **Heat exposure values** with realistic temperature ranges
- **Tree data** with height categories (T510-T550)
- **Land cover** types (FOREST, WATER, URBAN, etc.)

## Requirements

- [Bun](https://bun.sh/) runtime (replaces Node.js for this server)
- No other dependencies (Bun has built-in TypeScript and HTTP server)

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Related Documentation

- [Getting Started Guide](../docs/GETTING_STARTED.md) - Full development setup options
- [Makefile targets](../Makefile) - `mock-api`, `mock-generate`, `dev-mock`, `mock-stop`
- [Vite configuration](../vite.config.js) - `detectPygeoApiPort()` function
