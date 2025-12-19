# Database Seeding for Development

> **This is the recommended approach for local development.** Seeding generates realistic mock data in 30-60 seconds, compared to 15-30 minutes for importing the 18GB production dump.

## Quick Start

```bash
# Start services first
make dev

# Seed the database (in another terminal)
make db-seed
```

That's it. You now have realistic test data for all major tables.

## Why Seeding Instead of Production Import?

| Aspect       | Seeding               | Production Import           |
| ------------ | --------------------- | --------------------------- |
| **Time**     | 30-60 seconds         | 15-30 minutes               |
| **Size**     | 10-50 MB              | ~18 GB                      |
| **Network**  | No download needed    | Requires GCS access         |
| **Use Case** | Daily development, CI | Reproducing production bugs |

**Use seeding for:**

- Local development and testing
- CI/CD pipelines
- Onboarding new developers
- Quick iterations

**Use production import only when:**

- Reproducing a specific production bug
- Testing with real-world data distributions
- Data analysis or reporting

## Overview

The seeding system provides realistic test data for all major tables in the regions4climate database:

- **adaptation_landcover** - Land cover areas for climate adaptation
- **r4c_coldspot** - Areas with low heat exposure
- **tree_f** - Tree and vegetation data
- **hsy_building_heat** - Building heat exposure measurements
- **r4c_hsy_building_current** - Current building information
- **urban_heat_building_f** - Urban heat building data
- **r4c_paavo** - Postal code demographic statistics

## Makefile Commands (Recommended)

```bash
make db-seed                    # Seed with 100 records per table
make db-seed SEED_RECORDS=50    # Fewer records (faster)
make db-seed SEED_RECORDS=500   # More records (load testing)
make db-seed-clean              # Clear existing data, then seed
```

## Manual Seeding

If you prefer running the script directly:

```bash
# Install Python dependencies
pip install -r db/scripts/requirements-seeding.txt

# Seed the database
python3 db/scripts/seed-dev-data.py --clear-first --num-records 100
```

## Script Options

### Basic Usage

```bash
python3 db/scripts/seed-dev-data.py [OPTIONS]
```

### Available Options

| Option           | Description                        | Default                     |
| ---------------- | ---------------------------------- | --------------------------- |
| `--database-url` | Database connection URL            | Uses `DATABASE_URL` env var |
| `--clear-first`  | Clear existing data before seeding | False                       |
| `--num-records`  | Number of records per table        | 100                         |
| `--tables`       | Specific tables to seed            | All tables                  |

### Examples

```bash
# Seed all tables with default settings
python3 db/scripts/seed-dev-data.py

# Seed with custom record count
python3 db/scripts/seed-dev-data.py --num-records 50

# Clear existing data and seed fresh
python3 db/scripts/seed-dev-data.py --clear-first --num-records 200

# Seed only specific tables
python3 db/scripts/seed-dev-data.py --tables adaptation_landcover r4c_coldspot

# Custom database URL
python3 db/scripts/seed-dev-data.py --database-url "postgres://user:pass@localhost:5432/mydb"
```

## Data Characteristics

### Geographic Data

All seeded data uses **realistic Helsinki coordinates**:

- **Latitude**: 60.1 to 60.3 degrees North
- **Longitude**: 24.8 to 25.3 degrees East
- **Postal Codes**: Real Helsinki postal codes (00100-00990)

### Data Types

#### Land Cover (`adaptation_landcover`)

- **Grid IDs**: Sequential format `GRID_000001`
- **Area**: 100-10,000 m^2
- **Types**: FOREST, WATER, URBAN, GRASS, AGRICULTURAL, BARE
- **Years**: 2020-2024

#### Cold Spots (`r4c_coldspot`)

- **Heat Exposure**: 0.0-0.4 (low values for cold spots)
- **Temperature**: 15-25 C
- **Dates**: Random dates within last year

#### Trees (`tree_f`)

- **Types**: DECIDUOUS, CONIFEROUS, MIXED
- **Area**: 10-500 m^2
- **Height**: 5-25 meters

#### Buildings (`r4c_hsy_building_current`)

- **Types**: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, PUBLIC
- **Heating**: DISTRICT_HEATING, ELECTRIC, OIL, GAS
- **Size**: Realistic building dimensions

#### Demographics (`r4c_paavo`)

- **Population**: 1,000-15,000 per postal code
- **Age Groups**: Realistic distribution
- **Income/Education**: Statistical ranges

## Kubernetes Job Seeding

For automated deployment environments, you can use the Kubernetes Job:

```bash
# Deploy the seeding job
kubectl apply -f skaffold/database-seeding-job.yaml

# Check job status
kubectl get jobs database-seeding

# View logs
kubectl logs job/database-seeding
```

The job will:

1. Wait for PostgreSQL to be ready
2. Install required Python packages
3. Run the seeding script
4. Clean up automatically after 5 minutes

## Integration with Development Workflow

### With Makefile (Recommended)

```bash
# 1. Start services
make dev

# 2. In another terminal: seed the database
make db-seed

# 3. Develop with data
# Your application now has realistic test data
```

### With Skaffold Directly

```bash
# 1. Start services
skaffold dev --profile=local-with-services

# 2. Initialize database (in another terminal)
./scripts/init-local-db.sh
# Answer 'y' when prompted to seed

# 3. Develop with data
```

### Continuous Development

- **Data persists**: Mock data remains across Skaffold restarts
- **Re-seeding**: Run `make db-seed-clean` to refresh data
- **Selective updates**: Use `--tables` to update specific datasets

## Testing pygeoapi Collections

After seeding, you can test pygeoapi endpoints with real data:

```bash
# List collections
curl http://localhost:5000/collections

# Get adaptation landcover features
curl "http://localhost:5000/collections/adaptation_landcover/items?limit=10"

# Get cold spots
curl "http://localhost:5000/collections/coldarea/items?limit=5"

# Get trees
curl "http://localhost:5000/collections/tree/items?limit=20"
```

## Troubleshooting

### Common Issues

**Python dependencies missing**:

```bash
pip install psycopg2-binary
# or
pip install -r db/scripts/requirements-seeding.txt
```

**Database connection failed**:

```bash
# Check if PostgreSQL is running
kubectl get pods -n regions4climate

# Check port-forward
kubectl port-forward svc/postgresql 5432:5432 -n regions4climate

# Test connection
psql "postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate" -c "SELECT 1;"
```

**Seeding script fails**:

```bash
# Run with verbose output
python3 db/scripts/seed-dev-data.py --clear-first --num-records 10

# Check table exists
psql "$DATABASE_URL" -c "\dt adaptation_landcover"
```

### Performance Notes

- **Seeding time**: ~30-60 seconds for 100 records per table
- **Database size**: ~10-50MB for default record counts
- **Memory usage**: Minimal, safe for local development

## Customization

### Adding New Tables

To seed additional tables, edit `db/scripts/seed-dev-data.py`:

1. **Add seeding function**:

```python
def seed_my_table(conn, num_records=50):
    print(f"Seeding my_table with {num_records} records...")
    # Implementation here
```

2. **Call in main()**:

```python
if 'all' in tables_to_seed:
    seed_my_table(conn, args.num_records)
```

### Custom Data Patterns

You can modify the data generation patterns:

- **Geographic bounds**: Edit `HELSINKI_BBOX`
- **Postal codes**: Modify `HELSINKI_POSTAL_CODES`
- **Value ranges**: Adjust `random.uniform()` calls
- **Data relationships**: Add foreign key consistency

## Best Practices

1. **Use `make db-seed`** for the simplest experience
2. **Start with default record counts** (100) for normal development
3. **Use `make db-seed-clean`** for fresh testing environments
4. **Test pygeoapi endpoints** after seeding to verify data quality
5. **Use realistic coordinate bounds** to match your application's expected data

## Related Documentation

- [Getting Started](../GETTING_STARTED.md) - Local development setup
- [Database Import](./IMPORT.md) - Importing production data (when needed)
- [Database Migrations](../../db/README.md) - Migration workflow
