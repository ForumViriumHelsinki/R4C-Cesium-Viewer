import json
import geopandas as gpd
from google.cloud.sql.connector import Connector
import pg8000
from google.cloud import storage
from flask import jsonify
import os
import urllib.request
import urllib.parse
import ssl

def insert_to_db(trees_gdf):
    """
    Inserts full building polygons (GeoJSON) into Google Cloud SQL PostgreSQL.
    """

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
            INSERT INTO {insert_table} (postinumero, korkeus_ka_m, kohde_id, kunta, koodi, kuvaus, geom)
            VALUES (%s, %s, %s, %s, %s, %s, ST_MakeValid(ST_GeomFromText(%s, 4326)))
        """

        # Prepare data for insertion
        data_to_insert = []
        for _, row in trees_gdf.iterrows():
            if row.geometry:  # Ensure valid geometry

                data_to_insert.append((
                    row.postinumero, row.korkeus_ka_m, row.kohde_id, row.kunta, row.koodi, row.kuvaus, row.geometry.wkt
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


def fetch_wfs_data(typename, city, lowerHeight=None, upperHeight=None):
    """
    Fetches data from a WFS server with optional height filtering.

    :param typename: The name of the feature type in WFS.
    :param city: The city name to filter data.
    :param lowerHeight: (Optional) The lower bound for height filtering (must be provided together with upperHeight).
    :param upperHeight: (Optional) The upper bound for height filtering (must be provided together with lowerHeight).
    :return: WFS data in JSON format.
    """
    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Construct the CQL filter dynamically
    cql_filter = f"kunta = '{city}' AND p_ala_m2 >= 1"

    # Add height filtering only if both lowerHeight and upperHeight are provided
    if lowerHeight is not None and upperHeight is not None:
        cql_filter += f" AND korkeus_ka_m >= {lowerHeight} AND korkeus_ka_m < {upperHeight}"
    elif lowerHeight is not None or upperHeight is not None:
        raise ValueError("Both lowerHeight and upperHeight must be provided together or omitted.")

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

    # Create an SSL context that does not verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Request to WFS and process response
    try:
        response = urllib.request.urlopen(request_url, context=ssl_context)
        data = json.loads(response.read())
        # Check if "features" exist and are non-empty
        if "features" not in data or not data["features"]:
            print("No data found from WFS with the given parameters.")
            return None  # Return None if no data

        return data
    except Exception as e:
        print(f"An error occurred: {e}")

def spatial_relation_with_postal_code_areas(wfs_json, postal_code_gdf):
    """
    Clips WFS features by postal code areas and assigns the postal code (postinumero).
    If a feature spans multiple postal code areas, it is split into multiple features.
    """

    # Convert WFS JSON to GeoDataFrame
    wfs_gdf = gpd.GeoDataFrame.from_features(wfs_json["features"])
    print(f"Number of fetched WFS features: {len(wfs_gdf)}")

    # Ensure CRS consistency
    wfs_gdf.crs = "EPSG:4326"
    postal_code_gdf.crs = "EPSG:4326"

    # List to store new split features
    split_features = []

    # Iterate over each WFS feature
    for _, feature in wfs_gdf.iterrows():
        feature_geom = feature.geometry

        # Iterate over each postal code area
        for _, postalarea in postal_code_gdf.iterrows():
            if feature_geom.intersects(postalarea.geometry):
                # Clip feature to the postal area
                clipped_geom = feature_geom.intersection(postalarea.geometry)

                # Ensure valid geometry
                if not clipped_geom.is_empty:
                    new_feature = feature.copy()
                    new_feature.geometry = clipped_geom
                    new_feature["postinumero"] = postalarea["posno"]  # Assign postal code
                    split_features.append(new_feature)

    # Create a new GeoDataFrame with the split features
    split_gdf = gpd.GeoDataFrame(split_features, crs="EPSG:4326")

    print(f"Number of split features with assigned postal codes: {len(split_gdf)}")

    return split_gdf

def add_hsy_trees(request):

    # Access data from the request arguments
    request_json = request.get_json(silent=True) or {}

    typename = request_json.get('typename')
    city = request_json.get('city')
    bucket_name = request_json.get('bucket')
    json_path = request_json.get('json_path')

    # Retrieve height filters safely
    lowerHeight = request_json.get('lowerHeight')
    upperHeight = request_json.get('upperHeight')

    if (lowerHeight is None and upperHeight is not None) or (lowerHeight is not None and upperHeight is None):
        return jsonify({"error": "Both lowerHeight and upperHeight must be provided together or omitted."}), 400

    # Ensure required parameters exist
    if not all([typename, city, bucket_name, json_path]):
        return jsonify({"error": "Missing required parameters: typename, city, bucket, or json_path."}), 400

    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    # Download vector file
    vector_blob = bucket.blob(json_path)
    vector_blob.download_to_filename('/tmp/vector.geojson')

    gdf = gpd.read_file('/tmp/vector.geojson')

    wfs_json = fetch_wfs_data(typename, city, lowerHeight, upperHeight)

        # Check if no data was found
    if wfs_json is None:
        return jsonify({"status": "no_data", "message": "No data found from WFS with the given parameters."}), 200

    wfs_gdf = spatial_relation_with_postal_code_areas(wfs_json, gdf)

    # Insert data into database and get the count of inserted records
    inserted_count = insert_to_db(wfs_gdf)

    # Return response with the number of inserted features
    return jsonify({"status": "success", "features_inserted": inserted_count})
