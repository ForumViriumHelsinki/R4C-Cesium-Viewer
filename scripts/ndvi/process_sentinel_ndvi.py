import rasterio
import numpy as np
from flask import jsonify
from google.cloud import storage

def process_sentinel_ndvi(request):
    """
    Calculates NDVI from red and NIR bands stored in Google Cloud Storage,
    and saves the output NDVI TIFF file back to the bucket.
    """
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    date_str = request_json['date']
    bucket_name = request_json['bucket']

    # Check if both date and bucket are provided
    if not date_str or not bucket_name:
        return "Error: Missing 'date' or 'bucket' parameter", 400

    # Folder path where TIFF files are located in the bucket
    folder_path = f'NDVI/raster_data/{date_str}/'

    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    # Construct the file names for the red and NIR bands
    red_file_name = f"{folder_path}{date_str}-00:00_{date_str}-23:59_Sentinel-2_L2A_B04_(Raw).tiff"
    nir_file_name = f"{folder_path}{date_str}-00:00_{date_str}-23:59_Sentinel-2_L2A_B08_(Raw).tiff"

    # Download the red and NIR bands
    red_blob = bucket.blob(red_file_name)
    nir_blob = bucket.blob(nir_file_name)

    red_blob.download_to_filename("B04.tiff")
    nir_blob.download_to_filename("B08.tiff")

    # Open the red and NIR bands using rasterio
    with rasterio.open('B04.tiff') as red:
        red_band = red.read(1)
        red_profile = red.profile

    with rasterio.open('B08.tiff') as nir:
        nir_band = nir.read(1)

    # Calculate NDVI
    np.seterr(divide='ignore', invalid='ignore')  # Ignore divide by zero warnings
    ndvi = np.where((nir_band + red_band) == 0, 0,
                    (nir_band.astype(float) - red_band.astype(float)) / (nir_band + red_band))
    ndvi = np.nan_to_num(ndvi)  # Replace NaN values with 0

    # Update the profile for the NDVI data
    ndvi_profile = red_profile.copy()
    ndvi_profile.update(dtype=rasterio.float32, count=1, compress='lzw')

    # Write the NDVI raster to a temporary file
    with rasterio.open('ndvi_temp.tiff', 'w', **ndvi_profile) as dst:
        dst.write(ndvi.astype(rasterio.float32), 1)

    # Upload the NDVI TIFF file to the bucket
    ndvi_blob = bucket.blob(f'NDVI/raster_data/{date_str}/ndvi_{date_str}.tiff')
    ndvi_blob.upload_from_filename('ndvi_temp.tiff')

    message = f"NDVI calculated and saved to: gs://{bucket_name}/NDVI/raster_data/{date_str}/ndvi_{date_str}.tiff"
    print(message)

    # Return success response
    return jsonify({"message": message}), 200
