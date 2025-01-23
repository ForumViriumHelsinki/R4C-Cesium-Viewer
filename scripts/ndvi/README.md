# NDVI Calculation Functions for Google Cloud Functions

This repository contains two Python functions for calculating NDVI (Normalized Difference Vegetation Index) from Sentinel-2 satellite imagery and analyzing NDVI values within GeoJSON features.

## Functions

process_sentinel_ndvi: Calculates NDVI from red and NIR bands stored in Google Cloud Storage and saves the output NDVI TIFF file back to the bucket.
calculate_average_ndvi: Calculates the average NDVI value for each feature in a GeoJSON file within a specified NDVI raster.
Usage

## Deploying the functions

Deploy both functions to Google Cloud Functions.

Provide the date and bucket name as arguments to the process_sentinel_ndvi function. The function will download the red and NIR bands for the specified date from the bucket and calculate the NDVI. The output NDVI TIFF file will be saved back to the bucket.

Provide the date, bucket name, and paths to the input and output GeoJSON files as arguments to the calculate_average_ndvi function. The function will read the GeoJSON features, calculate the average NDVI value for each feature within the specified NDVI raster, and save the updated GeoJSON file back to the bucket.

### Input and Output

process_sentinel_ndvi:

Input:
date (string): The date in YYYY-MM-DD format for which the NDVI data should be processed.
bucket (string): The name of the Google Cloud Storage bucket where the input and output data is stored.

Output:
A NDVI TIFF file saved to the raster_data folder within the specified bucket, named ndvi_{date}.tiff.

calculate_average_ndvi:

Input:
date (string): The date in YYYY-MM-DD format for which the NDVI data was calculated.
bucket (string): The name of the Google Cloud Storage bucket where the input and output data is stored.
json_input (string): The path to the input GeoJSON file within the bucket.
json_output (string): The path to the output GeoJSON file within the bucket.

Output:
An updated GeoJSON file with an additional column named ndvi_{date} containing the average NDVI value for each feature. The file is saved to the vector_data folder within the specified bucket.