import ssl
import urllib.request
import json
import rasterio
import geopandas as gpd
from rasterio.mask import mask
import numpy as np
from flask import Response, stream_with_context
from google.cloud.sql.connector import Connector
import pg8000
from shapely.geometry import shape, box
from google.cloud import storage
from flask import jsonify
import os

def fetch_wfs_data(typename, posno):

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'
    
        # Ensure posno is properly formatted for CQL_FILTER
    if isinstance(posno, list):  
        posno_str = ",".join(f"'{p}'" for p in posno)  # Format as 'value1','value2'
        cql_filter = f"posno IN ({posno_str})"
    else:
        cql_filter = f"posno = '{posno}'"  # Single value case

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
	    'request': 'GetFeature',
	    'typename': typename,
	    'version': '2.0.0',
	    'outputFormat': 'application/json',
        'CQL_FILTER': cql_filter,
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

def calculate_heat_exp(geojson, src):

    # Get raster metadata
    nodata = src.nodata

    # Open the raster and vector files
    gdf =  gpd.GeoDataFrame.from_features(geojson["features"])
    # Drop rows where the 'geometria' property is 'piste'
    gdf = gdf[gdf["geometria"] != "piste"]

    # Initialize a list to store weighted average  values
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

    # Add weighted average heat values to the GeoDataFrame
    gdf['avgheatexposure'] = weighted_avg_values 
    
    return gdf       
    
def insert_to_db(buildings_gdf, date_str):
    """
    Inserts full building polygons (GeoJSON) into Google Cloud SQL PostgreSQL.
    """
    # Get temperatures from metadata
    max_temp_k, min_temp_k = get_temperature_from_metadata(date_str)

    if max_temp_k is None or min_temp_k is None:
        print(f"Temperature data for {date_str} not found.")
        return
    
    # Database connection details
    instance_connection_name = os.getenv("INSTANCE_NAME")
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")

    connector = Connector()

    def getconn():
        return connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_password,
            db=db_name,
        )

    inserted_count = 0  # Track number of inserted rows

    try:
        conn = getconn()
        cursor = conn.cursor()

        insert_sql = """
            INSERT INTO hsy_building_heat (avgheatexposure, date, vtj_prt, avg_temp_c, posno)
            VALUES (%s, %s, %s, %s, %s)
        """

        # Prepare data for insertion
        data_to_insert = []
        for _, row in buildings_gdf.iterrows():
            if row.avgheatexposure >= 0 and row.geometry:  # Ensure valid geometry
                avg_temp_c = calculate_temp_in_c(row.avgheatexposure, max_temp_k, min_temp_k)
                
                # Convert geometry to GeoJSON
                # geom_json = json.dumps(row.geometry.__geo_interface__)  # Convert geometry to GeoJSON format
                
                data_to_insert.append((
                    row.avgheatexposure, date_str, row.vtj_prt, avg_temp_c, row.posno
                ))

        # Batch insert into database
        if data_to_insert:
            cursor.executemany(insert_sql, data_to_insert)
            conn.commit()
            inserted_count = len(data_to_insert)
            print(f"Inserted {inserted_count} records into hsy_building_heat.")

    except Exception as e:
        print(f"Database insert error: {e}")
    
    finally:
        cursor.close()
        connector.close()
        
    return inserted_count  # Return the number of inserted records

def calculate_temp_in_c(heatexposure, max_temp_k, min_temp_k):
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

def get_temperature_from_metadata(date_str):
    """
    Reads heat_metadata.json and retrieves max and min temperature for the given date.
    
    :param date_str: The date for which temperature data is needed.
    :return: (max_temp_k, min_temp_k) if found, otherwise (None, None)
    """
    metadata_path = "/tmp/heat_metadata.json"

    # Load metadata from file
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Search for matching date entry
        for entry in metadata.get("heat_metadata", []):
            if entry["date"] == date_str:
                return entry["max"], entry["min"]

    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading metadata file: {e}")

    return None, None  # Return None if date is not found or an error occurs


def calculate_heat_data( request ):
    
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    date_str = request_json['date']
    posno = request_json['posno']
    bucket_name = request_json['bucket']
    # 'asuminen_ja_maankaytto:pks_rakennukset_paivittyva'
    typename = request_json['hsy_wfs']
    
    wfs_json = fetch_wfs_data(typename, posno)
    
    # Folder path where TIFF filee
    raster_path = f'Thermal/raster_data/{date_str}/{date_str}_normalized.tiff'
    
    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    
    # Download raster file
    raster_blob = bucket.blob(raster_path)
    raster_blob.download_to_filename('/tmp/normalized.tiff')
    
    # Open the raster and vector files
    src = rasterio.open('/tmp/normalized.tiff')
    
    gdf = calculate_heat_exp( wfs_json, src )
    print(f"Number of filtered features: {len(gdf)}")
    
    # Download metadata file
    metadata_path = "Thermal/heat_metadata.json"
    metadata_blob = bucket.blob(metadata_path)
    metadata_blob.download_to_filename('/tmp/heat_metadata.json')
    
    # Insert data into database and get the count of inserted records
    inserted_count = insert_to_db(gdf, date_str)
    
    # Return response with the number of inserted features
    return jsonify({"status": "success", "features_inserted": inserted_count})