import os
import json
import rasterio
from rasterio.mask import mask
import numpy as np
import geopandas as gpd
from flask import jsonify
from google.cloud import storage

def normalise_landsat_b10(request):
    """
    Google Cloud Function to normalise Landsat raster data and update heat metadata.
    """
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    date_str = request_json.get('date')
    bucket_name = request_json.get('bucket')

    # Validate input parameters
    if not date_str or not bucket_name:
        return jsonify({"error": "Missing required parameters: 'date', 'bucket'"}), 400

    # Paths for the raster and vector files in the bucket
    folder_path = f'Thermal/raster_data/{date_str}/'
    landsat_file_name = f"{folder_path}{date_str}-00:00_{date_str}-23:59_Landsat_8-9_L2_B10_(Raw).tiff"
    output_raster = f"{folder_path}{date_str}_normalised.tiff"
    metadata_path = "Thermal/heat_metadata.json"

    # Temporary file paths
    local_raster_path = '/tmp/thermal.tiff'
    local_output_path = '/tmp/normalised.tiff'
    local_metadata_path = "/tmp/heat_metadata.json"

    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    try:
        # Download raster file from GCS
        raster_blob = bucket.blob(landsat_file_name)
        raster_blob.download_to_filename(local_raster_path)

        # Open the raster and vector files
        with rasterio.open(local_raster_path) as src:

            band = src.read(1)  # First band of the raster

            # Exclude no-data and sub-zero values from the normalization calculation
            valid_pixels = band[(band > 0) & (band >= 273)]  # Ignore sub-zero temperatures
            if len(valid_pixels) == 0:
                return jsonify({"error": "No valid temperature values found above 273K."}), 400

            actual_min = np.min(valid_pixels)
            actual_max = np.max(valid_pixels)

            # Normalise only valid pixel values
            normalised_band = np.where(
                (band >= 273),  # Only normalise valid temperatures
                (band.astype(float) - actual_min) / (actual_max - actual_min),
                0  # Set ignored pixels to 0
            )

            # Update the raster profile for output
            new_profile = src.profile.copy()
            new_profile.update(
                dtype=rasterio.float32,
                count=1,
                compress='lzw'
            )

            # Write the normalised raster to a temporary file
            with rasterio.open(local_output_path, 'w', **new_profile) as dst:
                dst.write(normalised_band.astype(rasterio.float32), 1)

        # Upload the normalised raster back to the GCS bucket
        output_blob = bucket.blob(output_raster)
        output_blob.upload_from_filename(local_output_path)

        # Save metadata
        save_heat_metadata(bucket, metadata_path, date_str, actual_min, actual_max, local_metadata_path)

        return jsonify({
            "message": "Normalization completed successfully.",
            "raster_min": float(actual_min),
            "raster_max": float(actual_max)
        }), 200

    finally:
        # Clean up temporary files
        for file_path in [local_raster_path, local_output_path, local_metadata_path]:
            if os.path.exists(file_path):
                os.remove(file_path)

def save_heat_metadata(bucket, metadata_path, date, min_value, max_value, local_metadata_path):
    """
    Fetches and updates heat metadata JSON in the GCS bucket.
    Converts NumPy float32 values to standard Python float before saving.
    """
    blob = bucket.blob(metadata_path)

    # Try to download existing metadata file
    try:
        blob.download_to_filename(local_metadata_path)
        with open(local_metadata_path, "r") as f:
            metadata = json.load(f)
    except Exception:
        # If file does not exist or is empty, create a new structure
        metadata = {"heat_metadata": []}

    # Convert float32 to standard Python float
    min_value = float(min_value)
    max_value = float(max_value)

    # Check if entry with the same date exists
    existing_entry = next((entry for entry in metadata["heat_metadata"] if entry["date"] == date), None)

    if existing_entry:
        # Update existing metadata entry
        existing_entry["min"] = min_value
        existing_entry["max"] = max_value
    else:
        # Add new metadata entry
        metadata["heat_metadata"].append({
            "date": date,
            "min": min_value,
            "max": max_value
        })

    # Save updated metadata back to local file
    with open(local_metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)

    # Upload the updated file back to GCS
    blob.upload_from_filename(local_metadata_path)