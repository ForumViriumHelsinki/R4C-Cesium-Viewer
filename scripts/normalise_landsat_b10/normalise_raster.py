import os
import json
import rasterio
from rasterio.mask import mask
import numpy as np
import geopandas as gpd
from flask import jsonify
from google.cloud import storage
from google.cloud.sql.connector import Connector
import pg8000

def normalise_landsat_b10(request):
    """
    Google Cloud Function to normalize Landsat raster data and update heat metadata.
    """
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    date_str = request_json.get('date')
    bucket_name = request_json.get('bucket')
    json_input = request_json.get('json_input')

    # Validate input parameters
    if not date_str or not bucket_name or not json_input:
        return jsonify({"error": "Missing required parameters: 'date', 'bucket', or 'json_input'"}), 400

    # Paths for the raster and vector files in the bucket
    folder_path = f'Thermal/raster_data/{date_str}/'
    landsat_file_name = f"{folder_path}{date_str}-00:00_{date_str}-23:59_Landsat_8-9_L2_B10_(Raw).tiff"
    output_raster = f"{folder_path}{date_str}_normalized.tiff"
    json_path = f'Thermal/vector_data/{json_input}'
    metadata_path = "Thermal/heat_metadata.json"

    # Temporary file paths
    local_raster_path = '/tmp/thermal.tiff'
    local_vector_path = '/tmp/vector.geojson'
    local_output_path = '/tmp/normalized.tiff'
    local_metadata_path = "/tmp/heat_metadata.json"

    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    try:
        # Download raster file from GCS
        raster_blob = bucket.blob(landsat_file_name)
        raster_blob.download_to_filename(local_raster_path)

        # Download vector file from GCS
        vector_blob = bucket.blob(json_path)
        vector_blob.download_to_filename(local_vector_path)

        # Open the raster and vector files
        with rasterio.open(local_raster_path) as src:
            gdf = gpd.read_file(local_vector_path)

            # Convert GeoDataFrame to GeoJSON features
            features = [feature["geometry"] for _, feature in gdf.iterrows()]

            # Clip the raster with the GeoJSON geometry
            out_image, out_transform = mask(src, features, crop=True)
            band = out_image[0]  # First band of the raster
            src_profile = src.profile

            # Exclude no-data and sub-zero values from the normalization calculation
            valid_pixels = band[(band > 0) & (band >= 273)]  # Ignore sub-zero temperatures
            if len(valid_pixels) == 0:
                return jsonify({"error": "No valid temperature values found above 273K."}), 400

            actual_min = np.min(valid_pixels)
            actual_max = np.max(valid_pixels)

            # Normalize only valid pixel values
            normalized_band = np.where(
                (band >= 273),  # Only normalize valid temperatures
                (band.astype(float) - actual_min) / (actual_max - actual_min),
                -1  # Set ignored pixels to 0
            )

            # Update the raster profile for output
            src_profile.update(dtype=rasterio.float32, count=1, compress='lzw', transform=out_transform)

            # Write the normalized raster to a temporary file
            with rasterio.open(local_output_path, 'w', **src_profile) as dst:
                dst.write(normalized_band.astype(rasterio.float32), 1)

        # Upload the normalized raster back to the GCS bucket
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
        for file_path in [local_raster_path, local_vector_path, local_output_path, local_metadata_path]:
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

def insert_metadata_into_db(date_str, raster_min, raster_max, output_raster):
    """
    Inserts normalization metadata into Google Cloud SQL PostgreSQL.
    """
    instance_connection_name = os.environ.get("INSTANCE_NAME")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")

    connector = Connector()

    def getconn() -> pg8000.dbapi.Connection:
        return connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_password,
            db=db_name,
        )

    try:
        conn = getconn()
        cursor = conn.cursor()

        # Insert metadata into table
        insert_sql = """
            INSERT INTO heat_metadata (date, raster_min, raster_max, raster_path)
            VALUES (%s, %s, %s, %s)
        """
        print(insert_sql)
        cursor.execute(insert_sql, (date_str, raster_min, raster_max, output_raster))
        conn.commit()
        cursor.close()
        print("Metadata successfully inserted into Cloud SQL.")

    except Exception as e:
        print(f"Database insert error: {e}")

    finally:
        connector.close()