import ssl
import urllib.request
import json
import geopandas as gpd
import psycopg2
from psycopg2.extras import RealDictCursor
from shapely.geometry import shape
from dotenv import dotenv_values
import os

# Load environment variables from .env file
env_vars = dotenv_values(".env")

def fetch_wfs_data(typename, city):

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
	    'request': 'GetFeature',
	    'typename': typename,
	    'version': '2.0.0',
	    'outputFormat': 'application/json',
	    'CQL_FILTER': 'kunta IN ' + city,
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
    
def spatial_relation_with_postal_code_areas_and_save_to_db(wfs_json, postal_code_geojson_path):
    """
    Compare fetched WFS data with postal code GeoJSON file, join posno, and save to PostgreSQL table.

    Parameters:
        - wfs_json (dict): Fetched data from the WFS server.
        - postal_code_geojson_path (str): Path to the postal code GeoJSON file.
    """
    # Read postal code data

    conn = psycopg2.connect(
        host=env_vars["DB_HOST"],
        port=env_vars["DB_PORT"],
        database=env_vars["DB_NAME"],
        user=env_vars["DB_USER"],
        password=env_vars["DB_PASSWORD"]
    )
    cur = conn.cursor()
    
    # Get table name from environment variables
    table_name = env_vars["TABLE_NAME"]

    postal_code_gdf = gpd.read_file(postal_code_geojson_path)
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

            # Calculate area for each clipped feature and sum up
            for _, clipped_feature in clipped.iterrows():
                # Get the geometry in WKT format
                if clipped_feature['geometry'].geom_type == 'Polygon':
                    geometry_wkt = clipped_feature['geometry'].wkt
                elif clipped_feature['geometry'].geom_type == 'MultiPolygon':
                    geometry_wkt = clipped_feature['geometry'].buffer(0).wkt  # Handle invalid geometries
                else:
                    print(f"Unsupported geometry type: {clipped_feature['geometry'].geom_type}")
                    continue

                # Insert to database
                cur.execute("""
                    INSERT INTO {table_name} (postinumero, kohde_id, kunta, paaluokka, alaluokka, ryhma, koodi, kuvaus, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s))
                """, (postalarea['posno'], clipped_feature['kohde_id'], clipped_feature['kunta'], clipped_feature['paaluokka'], clipped_feature['alaluokka'], clipped_feature['ryhma'], clipped_feature['koodi'], clipped_feature['kuvaus'], geometry_wkt))

            # Commit after processing each postal area
            conn.commit()
            print(f"Data saved to PostgreSQL table tree_f for postal area {postalarea['posno']} successfully!")

        except Exception as e:
            print(f"An error occurred while processing postalarea {postalarea['posno']}: {e}")
        
    # Close the cursor and the connection
    cur.close()
    conn.close()

typename = env_vars["TYPENAME"]
city = env_vars["CITY"]
postal_code_geojson_path = 'hsy_po.json' 
wfs_json = fetch_wfs_data(typename, city)
spatial_relation_with_postal_code_areas_and_save_to_db(wfs_json, postal_code_geojson_path)