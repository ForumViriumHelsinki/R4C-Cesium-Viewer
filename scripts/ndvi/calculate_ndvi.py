import rasterio
import geopandas as gpd
import numpy as np
from rasterio.mask import mask
from shapely.geometry import shape, box
from google.cloud import storage
from flask import jsonify

def health_check():
    return jsonify({'status': 'healthy'}), 200

# Load the NDVI raster and GeoJSON
def calculate_average_ndvi(request):
    
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    date_str = request_json['date']
    bucket_name = request_json['bucket']
    json_input = request_json['json_input']
    json_output = request_json['json_output']
    
    # Check if both date and bucket are provided
    if not date_str or not bucket_name:
        return "Error: Missing 'date' or 'bucket' parameter", 400

    # Folder path where TIFF filee
    raster_path = f'NDVI/raster_data/{date_str}/ndvi_{date_str}.tiff'

    # Folder path where TIFF files are located in the bucket
    json_path = f'NDVI/vector_data/{json_input}'
    
    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    
    # Download raster file
    raster_blob = bucket.blob(raster_path)
    raster_blob.download_to_filename('/tmp/ndvi.tiff')
    
    # Download vector file
    vector_blob = bucket.blob(json_path)
    vector_blob.download_to_filename('/tmp/vector.geojson')

    # Open the raster and vector files
    src = rasterio.open('/tmp/ndvi.tiff')
    gdf = gpd.read_file('/tmp/vector.geojson')

    # Get raster metadata
    nodata = src.nodata

    # Initialize a list to store weighted average values
    weighted_avg_values = []

    # Loop through each polygon in the GeoDataFrame
    for idx, geom in gdf.iterrows():
        polygon = shape(geom.geometry)

        # Mask the raster with the polygon geometry
        out_image, out_transform = mask(src, [polygon], crop=True, all_touched=True, filled=True)
        out_image = out_image[0]  # Assuming a single band

        # Initialize total value and total area
        total_value = 0
        total_area = 0

        # Iterate over raster cells and compute their intersections with the polygon
        for row in range(out_image.shape[0]):
            for col in range(out_image.shape[1]):
                pixel_value = out_image[row, col]

                # Ignore no-data values
                if pixel_value == nodata:
                    continue

                # Ignore no-data values
                if pixel_value < 0:
                    continue
                
                # Get the bounding box of the current cell
                cell_x, cell_y = out_transform * (col, row)
                cell_geom = box(cell_x, cell_y, cell_x + out_transform.a, cell_y + out_transform.e)

                # Compute the intersection area
                intersection = polygon.intersection(cell_geom)
                if not intersection.is_empty:
                    intersection_area = intersection.area
                    total_value += pixel_value * intersection_area
                    total_area += intersection_area

        # Calculate the weighted average value if there's any valid area
        if total_area > 0:
            avg_value = total_value / total_area
        else:
            avg_value = np.nan  # No valid data within this polygon

        weighted_avg_values.append(avg_value)

    # Add weighted average values to the GeoDataFrame
    gdf[f'ndvi_{date_str}'] = weighted_avg_values

    # Save the updated GeoJSON to temporary storage
    output_path = '/tmp/updated_vector.geojson'
    gdf.to_file(output_path, driver='GeoJSON')

    # Upload the processed GeoJSON back to the bucket
    output_blob = bucket.blob(f'NDVI/vector_data/{json_output}')
    output_blob.upload_from_filename(output_path)

    # Close the raster file
    src.close()
    
    message = f"NDVI calculated and saved to: gs://{bucket_name}/NDVI/vector_data/{json_output}"

    print(message)

    # Return success response
    return jsonify({"message": message}), 200
