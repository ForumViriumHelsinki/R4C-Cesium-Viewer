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
            INSERT INTO {insert_table} (postinumero, korkeus_ka_m, kohde_id, kunta, paaluokka, alaluokka, ryhma, koodi, kuvaus, geom)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, ST_MakeValid(ST_GeomFromText(%s, 4326)))
        """

        # Prepare data for insertion
        data_to_insert = []
        for _, row in trees_gdf.iterrows():
            if row.geometry:  # Ensure valid geometry
                
                data_to_insert.append((
                    row.postinumero, row.korkeus_ka_m, row.kohde_id, row.kunta, row.paaluokka, row.alaluokka, row.ryhma, row.koodi, row.kuvaus, row.geometry.wkt
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


def fetch_wfs_data(typename, city, lowerHeight, upperHeight):

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
        'request': 'GetFeature',
        'typename': typename,
        'version': '2.0.0',
        'outputFormat': 'application/json',
        'CQL_FILTER': f"kunta IN ('{city}') AND p_ala_m2 >= 1 AND korkeus_ka_m >= {lowerHeight} AND korkeus_ka_m < {upperHeight}",
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
        return data                                                                                                                                                                                                                  
    except Exception as e:
        print(f"An error occurred: {e}")
    
def spatial_relation_with_postal_code_areas(wfs_json, postal_code_gdf):
    """
    Compare fetched WFS data with postal code GeoJSON file, join posno, and save to PostgreSQL table.
    """

    wfs_gdf = gpd.GeoDataFrame.from_features(wfs_json["features"])
    print(f"Number of filtered features: {len(wfs_gdf)}")

    wfs_gdf.crs = "EPSG:4326"
    postal_code_gdf.crs = "EPSG:4326"

    # Iterate over each feature in postal_code_gdf
    for _, postalarea in postal_code_gdf.iterrows():
        try:
            # Clip the hsylandcover features by the district geometry
            clipped = wfs_gdf.clip(postalarea.geometry)

            # Skip if there are no clipped geometries
            if clipped.empty:
                continue

            # Assign valid geometry WKT
            for index, clipped_feature in clipped.iterrows():
                if clipped_feature['geometry'].geom_type in ['Polygon', 'MultiPolygon']:
                    wfs_gdf.at[index, 'geometry_wkt'] = clipped_feature['geometry'].wkt
                else:
                    print(f"Unsupported geometry type: {clipped_feature['geometry'].geom_type}")
                    continue
                        
        except Exception as e:
            print(f"An error occurred while processing postalarea {postalarea['posno']}: {e}")
                
    return wfs_gdf                 

def add_hsy_trees(request):
    
    # Access data from the request arguments
    request_json = request.get_json(silent=True)

    typename = request_json['typename']
    city = request_json['city']
    bucket_name = request_json['bucket']
    lowerHeight = request_json['lowerHeight']
    upperHeight = request_json['upperHeight']
    json_path = request_json['json_path']
    
    # Create a Google Cloud Storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    
    # Download vector file
    vector_blob = bucket.blob(json_path)
    vector_blob.download_to_filename('/tmp/vector.geojson')

    gdf = gpd.read_file('/tmp/vector.geojson')

    wfs_json = fetch_wfs_data(typename, city, lowerHeight, upperHeight)
    wfs_gdf = spatial_relation_with_postal_code_areas(wfs_json, gdf)

    # Insert data into database and get the count of inserted records
    inserted_count = insert_to_db(wfs_gdf)
    
    # Return response with the number of inserted features
    return jsonify({"status": "success", "features_inserted": inserted_count})