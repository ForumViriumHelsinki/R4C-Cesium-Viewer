# Normalise Landsat B10 Cloud Function

This repository contains a Google Cloud Function called `normalise_landsat_b10`, which processes Landsat 8/9 Band 10 thermal imagery by normalizing temperature values and updating heat metadata in Google Cloud Storage and Cloud SQL.

## Function Overview

### `normalise_landsat_b10`

- Downloads Landsat 8/9 Band 10 raster data from Google Cloud Storage.
- Clips the raster using a vector dataset.
- Normalizes temperature values above 273K.
- Saves the normalized raster back to Google Cloud Storage.
- Updates heat metadata in Cloud Storage and Google Cloud SQL.

## Deployment

The function is designed to be deployed as a Google Cloud Function.

## Usage

### Calling the Function Manually

To invoke the function using `gcloud`, use the following command:

```bash
gcloud functions call normalise-landsat-b10 --region europe-north1 --data '{"date": "yyyy-mm-dd", "bucket": "regions4climate", "json_input": "hsy_po.json"}'
```

### With Curl

The function can be also used with curl command

```bash
curl -X POST "https://normalise-landsat-b10-ykahq53hja-lz.a.run.app" \
-H "Authorization: Bearer $(gcloud auth print-identity-token)" \
-H "Content-Type: application/json" \
-d '{"date": "2025-07-14", "bucket": "regions4climate", "json_input": "hsy_po.json"}'
```

## Input Parameters

The function expects the following parameters in the JSON payload:

- **`date`**: The date of the Landsat data (YYYY-MM-DD).
- **`bucket`**: The name of the Google Cloud Storage (GCS) bucket containing the raster and vector data.
- **`json_input`**: The name of the GeoJSON vector file located in the `Thermal/vector_data/` directory within the specified GCS bucket.

## Implementation Details

### Data Retrieval

- The function retrieves the Landsat raster and GeoJSON vector files from the specified GCS bucket.
- Temporary local file paths are used for processing.

### Raster Processing

- The Landsat raster is clipped using the GeoJSON vector geometry.
- Pixel values are normalized based on the minimum and maximum valid temperatures (above 273K).
- The normalized raster is saved as a GeoTIFF file.

### Metadata Management

- Heat metadata (date, minimum, and maximum values) is updated in a JSON file in GCS (`Thermal/heat_metadata.json`).
- The same data is also inserted into a PostgreSQL database on Google Cloud SQL, using the `insert_metadata_into_db` function.

### Database Interaction

- The `insert_metadata_into_db` function uses the Cloud SQL Python Connector and `pg8000` to connect to and insert data into the PostgreSQL database.
- Environment variables are used to store database connection details (instance connection name, database name, user, and password).

## Response

The function returns a JSON response:

### On success:

```json
{
  "message": "Normalization completed successfully.",
  "raster_min": <min_value>,
  "raster_max": <max_value>
}
```

### On error (missing parameters, no valid temperature values):

```json
{
	"error": "<error_message>"
}
```
