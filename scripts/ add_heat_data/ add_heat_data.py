import json
import rasterio
import geopandas as gpd
from rasterio.mask import mask
import numpy as np
from flask import Response, stream_with_context
from google.cloud.sql.connector import Connector
import pg8000
from shapely.geometry import shape, Polygon
from google.cloud import storage
from flask import jsonify
import os

def fetch_buildings_from_db(posno):
    """
    Fetches buildings from the PostgreSQL database filtered by posno.

    Args:
        posno (str or list): A single postal code or a list of postal codes.

    Returns:
        dict: GeoJSON-like dictionary of features.
    """
    instance_connection_name = os.getenv("INSTANCE_NAME")
    select_table = os.getenv("SELECT_TABLE")  # Ensure the table name is sanitized and trusted
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

    try:
        conn = getconn()
        cursor = conn.cursor()

        # Construct query with filtering on posno
        if isinstance(posno, list):
            posno_str = ', '.join(f"'{p}'" for p in posno)  # Format as 'value1', 'value2'
            sql = f"SELECT vtj_prt, posno, ST_AsGeoJSON(geom) FROM {select_table} WHERE posno IN ({posno_str})"
        else:
            # Use the correct SQL parameterization for values like posno, while using the select_table variable directly
            sql = f"SELECT vtj_prt, posno, ST_AsGeoJSON(geom) FROM {select_table} WHERE posno = %s"

        cursor.execute(sql, (posno,) if isinstance(posno, str) else None)

        features = []
        for row in cursor.fetchall():
            vtj_prt, posno, geom_json = row
            if geom_json:  # Ensure geometry is valid
                feature = {
                    "type": "Feature",
                    "properties": {"vtj_prt": vtj_prt, "posno": posno},
                    "geometry": json.loads(geom_json)
                }
                features.append(feature)

        cursor.close()
        connector.close()

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print(f"Database query error: {e}")
        return None

def calculate_heat_exp(geojson, src):

    # Get raster metadata
    nodata = src.nodata

    # Open the raster and vector files
    gdf =  gpd.GeoDataFrame.from_features(geojson["features"])

    # Initialize a list to store weighted average  values
    weighted_avg_values = []

    # Loop through each polygon in the GeoDataFrame
    for idx, geom in gdf.iterrows():
        polygon = shape(geom.geometry)

        # Mask the raster with the polygon geometry
        out_image, out_transform = mask(src, [polygon], crop=True, all_touched=True, filled=False)
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

                # Get the four corner coordinates of the pixel
                top_left = out_transform * (col, row)
                top_right = out_transform * (col + 1, row)
                bottom_left = out_transform * (col, row + 1)
                bottom_right = out_transform * (col + 1, row + 1)

                # Create an accurate polygon for the raster cell
                cell_geom = Polygon([top_left, top_right, bottom_right, bottom_left])

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
    insert_table = os.getenv("INSERT_TABLE")

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

        insert_sql = f"""
            INSERT INTO {insert_table} (avgheatexposure, date, vtj_prt, avg_temp_c, posno)
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
            print(f"Inserted {inserted_count} records")

    except Exception as e:
        print(f"Database insert error: {e}")

    finally:
        cursor.close()
        connector.close()

    return inserted_count  # Return the number of inserted records

def calculate_temp_in_c(heatexposure, max_temp_k, min_temp_k):
    """
    Calculates temperature in Celsius from a normalised heatexposure index and reference temperatures in Kelvin.

    Args:
        heatexposure (float): The normalised heatexposure index.
        max_temp_k (float): The maximum reference temperature in Kelvin.
        min_temp_k (float): The minimum reference temperature in Kelvin.

    Returns:
        float: The calculated temperature in Celsius.
    """
    temp_k = heatexposure * (max_temp_k - min_temp_k) + min_temp_k  # Denormalise to Kelvin
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

    buildings_json = fetch_buildings_from_db(posno)

    # Folder path where TIFF filee
    raster_path = f'Thermal/raster_data/{date_str}/{date_str}_normalised.tiff'

    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    # Download raster file
    raster_blob = bucket.blob(raster_path)
    raster_blob.download_to_filename('/tmp/normalised.tiff')

    # Open the raster and vector files
    src = rasterio.open('/tmp/normalised.tiff')

    # Perform heat exposure calculation
    gdf = calculate_heat_exp(buildings_json, src)

    # Download metadata file
    metadata_path = "Thermal/heat_metadata.json"
    metadata_blob = bucket.blob(metadata_path)
    metadata_blob.download_to_filename('/tmp/heat_metadata.json')

    # Insert data into database and get the count of inserted records
    inserted_count = insert_to_db(gdf, date_str)

    # Return response with the number of inserted features
    return jsonify({"status": "success", "features_inserted": inserted_count})
