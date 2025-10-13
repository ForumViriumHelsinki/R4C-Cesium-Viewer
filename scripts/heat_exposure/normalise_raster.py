import rasterio
from rasterio.enums import Resampling
from rasterio.mask import mask
import numpy as np
import geopandas as gpd

# Define the path to your input and output raster files and GeoJSON
input_raster = 'B10_(Raw).tiff'
output_raster = 'normalised.tiff'
geojson_path = 'hsy_po.json'

# Load the GeoJSON file
geojson = gpd.read_file(geojson_path)
# Convert GeoDataFrame to GeoJSON features
features = [feature["geometry"] for _, feature in geojson.iterrows()]

# Open the input raster
with rasterio.open(input_raster) as src:
    # Clip the raster with the GeoJSON geometry
    out_image, out_transform = mask(src, features, crop=True)
    # The mask function returns a masked array, we need the first band
    band = out_image[0]
    src_profile = src.profile

    # Exclude no-data values from the normalization calculation
    # Assuming no-data values are represented by 0
    valid_pixels = band[band > 0]
    actual_min = np.min(valid_pixels)
    actual_max = np.max(valid_pixels)

    # Normalize only valid pixel values
    # Set invalid (0 or no-data) pixels to a specific value or keep as is
    normalized_band = (band.astype(float) - actual_min) / (actual_max - actual_min)
    #outside areas to 0
    normalized_band[normalized_band < 0] = 0

    src_profile.update(dtype=rasterio.float32, count=1, compress='lzw')

    # Write the normalized data to a new raster file
    with rasterio.open(output_raster, 'w', **src_profile) as dst:
        dst.write(normalized_band.astype(rasterio.float32), 1)

print(f"Actual min value: {actual_min}")
print(f"Actual max value: {actual_max}")
