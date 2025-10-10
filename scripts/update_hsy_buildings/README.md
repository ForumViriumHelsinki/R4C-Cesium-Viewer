# Update HSY Buildings by POSNO Cloud Function

This repository contains a Google Cloud Function called `update_hsy_buildings_by_posno`, which fetches building data from a WFS server and updates a Google Cloud SQL database.

## Function Overview

### `update_hsy_buildings_by_posno`

Fetches building data from the HSY WFS service based on a given `posno` and updates a PostgreSQL database hosted on Google Cloud SQL.

## Deployment

The function is designed to be deployed as a Google Cloud Function.

## Usage

### Calling the Function Manually

To invoke the function using `gcloud`, use the following command:

```bash
gcloud functions call update_hsy_buildings_by_posno --region europe-north1 --data '{"posno": "00100"}'
```

## Batch Processing with Shell Script

The function can also be run for multiple `posno` values using the `update_all_posno.sh` script. This script, located in the same folder as this documentation, iterates over a predefined list of `posno` values and calls the function for each one.

## Implementation Details

### Fetching WFS Data

- The function queries the HSY WFS endpoint for building data associated with the given `posno`.
- The data is returned in GeoJSON format and filtered to remove duplicate `vtj_prt` records.

### Updating Google Cloud SQL

- The function connects to a PostgreSQL database hosted on Google Cloud SQL.
- It compares existing records with the new data.
- New records are inserted, and existing ones are updated in bulk.
- Geometries are processed using PostGIS functions.

### Response

The function returns a JSON response indicating the number of features inserted and updated:

```json
{
  "status": "success",
  "features_inserted": 10,
  "features_updated": 5
}
```

If no data is returned from the WFS service, an error response is returned:

```json
{
  "status": "error",
  "message": "No data returned from WFS"
}
```
