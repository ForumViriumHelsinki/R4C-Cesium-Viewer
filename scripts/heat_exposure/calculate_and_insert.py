import ssl
import urllib.request
import json
import rasterio
import geopandas as gpd
from rasterio.mask import mask
import numpy as np
from affine import Affine
from math import cos, radians
import psycopg2
from psycopg2.extras import RealDictCursor
from shapely.geometry import shape
from dotenv import dotenv_values
from math import cos, radians

# Load environment variables from .env file
env_vars = dotenv_values(".env")
date = env_vars["DATE"]
# Read min and max temperature from environment variables
min_temp_k = float(env_vars["MIN_TEMP_K"])
max_temp_k = float(env_vars["MAX_TEMP_K"])

def fetch_wfs_data(typename):

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
	    'request': 'GetFeature',
	    'typename': typename,
	    'version': '2.0.0',
	    'outputFormat': 'application/json',
	    'srsName': 'EPSG:4326'
    }

    # Construct the query string
    query_string = urllib.parse.urlencode(params)

    # Complete URL for the request
    request_url = wfs_url + '?' + query_string

    print(request_url)

    # Create an SSL context that does not verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Request to WFS and process response
    try:
        response = urllib.request.urlopen(request_url, context=ssl_context)
        data = json.loads(response.read())
        return data
    except Exception as e:
        print(f"An error occurred: {e}")

def calculate_cell_area(transform, latitude):
    """
    Calculate the area of a cell in square meters for a raster in geographic coordinates,
    assuming a uniform cell size and using an approximate method suitable for the latitude of Helsinki.

    Parameters:
    - transform: The affine transform of the raster.
    - latitude: The latitude at which to calculate the area (default is Helsinki's approximate latitude).

    Returns:
    - The area of a cell in square meters.
    """
    # Calculate dimensions of a cell in degrees
    delta_lat = abs(transform.e)  # Cell height in degrees (transform.e is negative)
    delta_lon = transform.a       # Cell width in degrees

    # Convert latitude to radians for the cosine calculation
    lat_rad = radians(latitude)

    # Calculate the area of a cell using the approximate formula
    cell_area_km2 = (delta_lon * cos(lat_rad)) * delta_lat * ((40075.017/360) ** 2) # Earth circumference is about 40075 km

    # Convert square kilometers to square meters
    cell_area_m2 = cell_area_km2 * (1000 ** 2)

    return cell_area_m2

def calculate_heat_exp(geojson_data, raster_path, output_column_name):
    # Open the raster and vector files
    gdf =  gpd.GeoDataFrame.from_features(geojson_data["features"])
    src = rasterio.open(raster_path)

    # Initialize a list to store weighted average  values
    weighted_avg_values = []

    # Loop through each building polygon
    for idx, geom in gdf.iterrows():
        # Extract the centroid of the geometry to use its latitude
        centroid = geom.geometry.centroid
        latitude = centroid.y
        geometry = geom.geometry.__geo_interface__
        out_image, out_transform = mask(src, [geometry], crop=True, all_touched=True, filled=True)
        out_image = out_image[0]  # Assuming a single band

        # Create an Affine transform for the masked region
        masked_transform = Affine(out_transform[0], out_transform[1], out_transform[2],out_transform[3], out_transform[4], out_transform[5])

        # Initialize total value and total area
        total_value = 0
        total_area = 0

        # Calculate total value and total area for the masked region
        for row in range(out_image.shape[0]):
            for col in range(out_image.shape[1]):
                pixel_value = out_image[row, col]
                if pixel_value > 0:  # Valid pixel
                    cell_area = calculate_cell_area(masked_transform, latitude)
                    total_value += pixel_value * cell_area
                    total_area += cell_area

        # Calculate the weighted average value if there's any valid area
        if total_area > 0:
            avg_value = total_value / total_area
        else:
            avg_value = np.nan  # No valid data within this polygon

        weighted_avg_values.append(avg_value)

    # Add weighted average heat values to the GeoDataFrame
    gdf[output_column_name] = weighted_avg_values

    return gdf

def insert_to_db(buildings_gdf):
    """
    Compare fetched WFS data with postal code GeoJSON file, join posno, and save to PostgreSQL table.

    Parameters:
        - wfs_json (dict): Fetched data from the WFS server.
        - postal_code_geojson_path (str): Path to the postal code GeoJSON file.
    """
    # Read postal code data

    # Read environment variables (ensure they are set properly)
    DB_HOST = env_vars["DB_HOST"]
    DB_PORT = env_vars["DB_PORT"]
    DB_NAME = env_vars["DB_NAME"]
    DB_USER = env_vars["DB_USER"]
    DB_PASSWORD = env_vars["DB_PASSWORD"]
    HEAT_TIMESERIES_TABLE = env_vars["HEAT_TIMESERIES_TABLE"]

    if None in [DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, HEAT_TIMESERIES_TABLE]:
        raise ValueError("One or more required environment variables are missing.")


    insert_query = f"""
    INSERT INTO {HEAT_TIMESERIES_TABLE} (avgheatexposure, date, vtj_prt, avg_temp_c)
    VALUES (%s, %s, %s, %s)
    """

    # Prepare data for insertion
    data_to_insert = [
        (row.avgheatexposure, date, row.vtj_prt, calculate_temp_in_c(row.avgheatexposure))
        for _, row in buildings_gdf.iterrows() if row.avgheatexposure >= 0
    ]

    # Insert data into database
    try:
        with psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=DB_USER, password=DB_PASSWORD
        ) as conn:
            with conn.cursor() as cur:
                cur.executemany(insert_query, data_to_insert)
                conn.commit()
    except Exception as e:
        print(f"Error inserting data into database: {e}")
        raise

def calculate_temp_in_c(heatexposure):
    """
    Calculates temperature in Celsius from a normalized heatexposure index and reference temperatures in Kelvin.

    Args:
        heatexposure (float): The normalized heatexposure index.
        max_temp_k (float): The maximum reference temperature in Kelvin.
        min_temp_k (float): The minimum reference temperature in Kelvin.

    Returns:
        float: The calculated temperature in Celsius.
    """
    temp_k = heatexposure * (max_temp_k - min_temp_k) + min_temp_k  # Denormalize to Kelvin
    temp_c = temp_k - 273.15  # Convert from Kelvin to Celsius
    return temp_c

typename = 'asuminen_ja_maankaytto:pks_rakennukset_paivittyva'
raster_path = env_vars["RASTER"]
wfs_json = fetch_wfs_data(typename)
gdf = calculate_heat_exp(wfs_json, raster_path, 'avgheatexposure' )
print(f"Number of filtered features: {len(gdf)}")

insert_to_db( gdf )
