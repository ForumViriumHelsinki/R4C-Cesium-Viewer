import os
import json
import urllib.request
import urllib.parse
import ssl
import geopandas as gpd
from shapely.geometry import shape
from google.cloud import sql_v1beta4

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
    """

    # Google Cloud SQL connection details
    instance_name = os.environ.get("INSTANCE_NAME")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")

    db_config = {
        "user": db_user,
        "password": db_password,
        "database": db_name,
    }
    pool = sql_v1beta4.ConnectionPool(instance_connection_name=instance_name, db_config=db_config)
    table_name = os.environ.get("TABLE_NAME")  # Get table name from environment variables

    postal_code_gdf = gpd.read_file(postal_code_geojson_path)
    wfs_gdf = gpd.GeoDataFrame.from_features(wfs_json["features"])
    print(f"Number of filtered features: {len(wfs_gdf)}")

    wfs_gdf.crs = "EPSG:4326"
    postal_code_gdf.crs = "EPSG:4326"

    with pool.connect() as conn:
        with conn.cursor() as cursor:
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
                        cursor.execute(f"""
                            INSERT INTO {table_name} (postinumero, kohde_id, kunta, paaluokka, alaluokka, ryhma, koodi, kuvaus, geom)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s))
                        """, (postalarea['posno'], clipped_feature['kohde_id'], clipped_feature['kunta'], clipped_feature['paaluokka'], clipped_feature['alaluokka'], clipped_feature['ryhma'], clipped_feature['koodi'], clipped_feature['kuvaus'], geometry_wkt))

                    # Commit after processing each postal area
                    conn.commit()
                    print(f"Data saved to PostgreSQL table {table_name} for postal area {postalarea['posno']} successfully!")

                except Exception as e:
                    print(f"An error occurred while processing postalarea {postalarea['posno']}: {e}")
                    
typename = os.environ.get["TYPENAME"]
city = os.environ.get["CITY"]
postal_code_geojson_path = os.environ.get["hsy_po"] 
wfs_json = fetch_wfs_data(typename, city)
spatial_relation_with_postal_code_areas_and_save_to_db(wfs_json, postal_code_geojson_path)