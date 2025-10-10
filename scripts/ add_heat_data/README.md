# Calculate Heat Data Cloud Function

This document describes the `calculate-heat-data` Google Cloud Function, which calculates average heat exposure for buildings and stores the results in a Google Cloud SQL database.

## Function Overview

The `calculate-heat-data` function performs the following operations:

1.  **Retrieves Building Data:** Fetches building geometries and associated data from a PostgreSQL database on Google Cloud SQL based on provided postal codes (`posno`).
2.  **Downloads Normalized Raster:** Downloads a normalized Landsat raster from Google Cloud Storage (GCS). This raster contains heat data.
3.  **Calculates Heat Exposure:** Calculates the average heat exposure for each building by overlaying the building geometries with the raster data.
4.  **Inserts Data into Database:** Inserts the calculated heat exposure values, along with other relevant data, into a specified table in the PostgreSQL database.

## Deployment

This function is designed to be deployed as a Google Cloud Function.

## Usage

### Calling the Function Manually

To invoke the function using `gcloud`, provide a JSON payload with the required parameters:

```bash
gcloud functions call calculate-heat-data --region <YOUR_REGION> --data '{"date": "YYYY-MM-DD", "bucket": "<YOUR_BUCKET_NAME>", "posno": ["<POSNO_1>", "<POSNO_2>", ...]}'
```

## Input Parameters

The function expects the following parameters in the JSON payload:

- **`date`**: The date of the heat data (YYYY-MM-DD).
- **`bucket`**: The name of the GCS bucket containing the normalized raster data.
- **`posno`**: A single postal code or a list of postal codes to filter buildings.

## Implementation Details

### Data Retrieval

- The `fetch_buildings_from_db` function retrieves building data from the PostgreSQL database based on the provided postal codes.
- The normalized Landsat raster is downloaded from the specified GCS bucket.

### Heat Exposure Calculation

- The `calculate_heat_exp` function calculates the average heat exposure for each building by intersecting the building geometries with the raster data.
- The function accounts for no-data values and partial cell intersections to ensure accurate calculations.

### Database Insertion

- The `insert_to_db` function inserts the calculated heat exposure data into the specified table in the PostgreSQL database.
- The function also retrieves temperature metadata from GCS to calculate the average temperature in Celsius.
- Environment variables are used to store database connection details.

## Response

The function returns a JSON response indicating the number of features inserted into the database:

```json
{
  "status": "success",
  "features_inserted": <number_of_features>
}
```

## Additional Functions

- **`calculate_temp_in_c`**: Calculates the temperature in Celsius from the normalized heat exposure value and temperature metadata.
- **`get_temperature_from_metadata`**: Reads temperature metadata from a JSON file in GCS.

## Error Handling

- The functions include error handling for database connection and query errors.
- The `get_temperature_from_metadata` function handles file not found and JSON decode errors.
