# NDVI Calculation Functions for Google Cloud Functions

This repository contains two Python functions for calculating NDVI (Normalized Difference Vegetation Index) from Sentinel-2 satellite imagery and analyzing NDVI values within GeoJSON features.

## Functions

### `process_sentinel_ndvi`

Calculates NDVI from red and NIR bands stored in Google Cloud Storage and saves the output NDVI TIFF file back to the bucket.

### `calculate_average_ndvi`

Computes the average NDVI value for each feature in a GeoJSON file using a specified NDVI raster.

## Deploying the Functions

Both functions should be deployed to Google Cloud Functions.

### `process_sentinel_ndvi`

**Usage:**

- Provide the **date** and **bucket name** as arguments.
- The function downloads the red and NIR bands for the specified date from the bucket, calculates the NDVI, and saves the NDVI TIFF file back to the bucket.

To invoke `process_sentinel_ndvi` using `gcloud`:

```sh
gcloud functions call process_sentinel_ndvi --region europe-north1 --project fvh-project-containers-etc --data '{"date": "2025-06-20", "bucket": "regions4climate"}'
```

#### Input:

- `date` (string): The date in `YYYY-MM-DD` format for which the NDVI data should be processed.
- `bucket` (string): The name of the Google Cloud Storage bucket where the input and output data are stored.

#### Output:

- A NDVI TIFF file saved to the `raster_data` folder within the specified bucket, named `ndvi_{date}.tiff`.

### `calculate_average_ndvi`

**Usage:**

- Provide the **date**, **bucket name**, and paths to the input and output GeoJSON files as arguments.
- The function reads the GeoJSON features, calculates the average NDVI value for each feature using the specified NDVI raster, and saves the updated GeoJSON file back to the bucket.

#### Input:

- `date` (string): The date in `YYYY-MM-DD` format for which the NDVI data was calculated.
- `bucket` (string): The name of the Google Cloud Storage bucket where the input and output data are stored.
- `json_input` (string): The path to the input GeoJSON file within the bucket.
- `json_output` (string): The path to the output GeoJSON file within the bucket.

#### Output:

- An updated GeoJSON file with an additional column named `ndvi_{date}` containing the average NDVI value for each feature.
- The file is saved to the `vector_data` folder within the specified bucket.

## Example Usage

To invoke `calculate_average_ndvi` using `gcloud`:

```sh
gcloud functions call calculate_average_ndvi --region europe-north1 --project fvh-project-containers-etc --data '{"date": "2025-06-20", "bucket": "regions4climate", "json_input": "hsy_po_org.json", "json_output": "hsy_po_new.json"}'
```

## Implementation Details

### `calculate_average_ndvi`

- Loads the NDVI raster and GeoJSON data from Google Cloud Storage.
- Uses `rasterio` to mask and extract NDVI values for each GeoJSON feature.
- Computes a weighted average NDVI value for each feature based on intersecting raster pixels.
- Saves the updated GeoJSON file back to Cloud Storage.

### `process_sentinel_ndvi`

- Downloads the red (B04) and NIR (B08) bands from Sentinel-2 imagery stored in Cloud Storage.
- Uses `rasterio` and NumPy to compute NDVI:

  \[ NDVI = (NIR - RED) / (NIR + RED) \]

- Saves the computed NDVI raster as a TIFF file in Cloud Storage.

## Serving NDVI rasters as Cloud Optimized GeoTIFFs

The viewer loads `gs://ndvi_public/ndvi_<date>.tiff` through `/ndvi_public`. A
stripped GeoTIFF is downloaded whole (about 24 MB per date); a COG is read tile
by tile, about 1 MB for a postal-code or region view (#1083).
`process_sentinel_ndvi` writes COGs. To convert existing files:

1. `pip install rio-cogeo numpy`, then
   `python scripts/ndvi/convert_to_cog.py out/ ndvi_*.tiff`. The script fails
   unless each output is a valid COG with the same pixels as its input.
2. Keep the originals: `gsutil -m cp 'gs://ndvi_public/ndvi_*.tiff' gs://ndvi_public/original-stripped/`
3. Upload under the same names:
   `gsutil -m -h 'Cache-Control:public, max-age=3600' -h 'Content-Type:image/tiff' cp out/ndvi_*.tiff gs://ndvi_public/`
4. Check: `rio cogeo validate /vsicurl/https://storage.googleapis.com/ndvi_public/ndvi_2025-06-20.tiff`

Browsers may serve the old file from cache for up to an hour after the upload.
