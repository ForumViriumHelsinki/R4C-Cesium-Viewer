import os
import json
import geopandas as gpd
import pandas as pd
import ssl
import urllib.request
import urllib.parse
import sys
from tqdm import tqdm
from google.cloud.sql.connector import Connector
from google.cloud import storage
from flask import jsonify

# Initialize clients outside the main function for reuse
storage_client = storage.Client()
connector = Connector()

def fetch_wfs_data_by_bbox(typename, bbox_str):
    # (This function remains unchanged)
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'
    params = {
        'service': 'WFS', 'request': 'GetFeature', 'typename': typename,
        'version': '2.0.0', 'outputFormat': 'application/json',
        'srsName': 'EPSG:3879', 'BBOX': f'{bbox_str},EPSG:3879'
    }
    query_string = urllib.parse.urlencode(params)
    request_url = f"{wfs_url}?{query_string}"

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(request_url, context=ssl_context) as response:
            data = json.loads(response.read())
            if not data.get('features'): return None
            return gpd.GeoDataFrame.from_features(data['features'], crs='EPSG:3879')
    except urllib.error.HTTPError as e:
        if e.code == 400: tqdm.write(f"\n--> HTTP 400 for '{typename}'. Layer likely doesn't exist for the year.")
        else: tqdm.write(f"\n--> HTTP Error for '{typename}': {e}")
        return None
    except Exception as e:
        tqdm.write(f"\n--> General error fetching '{typename}': {e}")
        return None

def insert_data_to_sql(processed_gdf, db_connection_info):
    # (This function remains mostly unchanged, but now accepts connection info)
    conn = None
    inserted_count = 0

    def getconn():
        return connector.connect(
            db_connection_info["instance_name"], "pg8000",
            user=db_connection_info["user"], password=db_connection_info["password"],
            db=db_connection_info["db_name"]
        )

    try:
        conn = getconn()
        cursor = conn.cursor()
        insert_sql = f"""
            INSERT INTO {db_connection_info["table"]} (grid_id, area_m2, year, koodi, geom)
            VALUES (%s, %s, %s, %s, ST_GeomFromText(%s, 4326))
        """
        data_to_insert = []
        for _, row in processed_gdf.iterrows():
            geom_wkt = row.geometry.wkt if row.geometry else None
            if geom_wkt:
                data_to_insert.append((
                    row['grid_id'], row['area_m2'], row['year'], row['koodi'], geom_wkt
                ))
        if data_to_insert:
            cursor.executemany(insert_sql, data_to_insert)
            conn.commit()
            inserted_count = len(data_to_insert)
        return inserted_count, "Success"
    except Exception as e:
        print(f"Database insert error: {e}")
        return 0, str(e)
    finally:
        if conn: conn.close()

def adaptation_landcover(request):
    request_json = request.get_json(silent=True)
    if not request_json:
        return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

    try:
        year = request_json['year']
        gcs_bucket_name = request_json['gcs_bucket']
        gcs_file_path = request_json['gcs_path']
        landcover_basenames = request_json['wfs_layers']
        # --- NEW: Configurable batch size ---
        batch_size = request_json.get('batch_size', 100) # Process 100 grid cells at a time by default
    except KeyError as e:
        return jsonify({"status": "error", "message": f"Missing key in JSON payload: {e}"}), 400

    try:
        db_connection_info = {
            "instance_name": os.environ["INSTANCE_NAME"],
            "db_name": os.environ["DB_NAME"], "user": os.environ["DB_USER"],
            "password": os.environ["DB_PASSWORD"],
            "table": os.environ.get("INSERT_TABLE", "adaptation_landcover")
        }
    except KeyError as e:
        return jsonify({"status": "error", "message": f"Missing environment variable: {e}"}), 500

    temp_grid_path = f'/tmp/grid_source.json'
    try:
        bucket = storage_client.bucket(gcs_bucket_name)
        blob = bucket.blob(gcs_file_path)
        blob.download_to_filename(temp_grid_path)
        grid_gdf = gpd.read_file(temp_grid_path)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to download or read GCS file: {e}"}), 500

    if grid_gdf.crs is None: grid_gdf = grid_gdf.set_crs("EPSG:4326")
    grid_gdf = grid_gdf.to_crs("EPSG:3879")

    if 'grid_id' not in grid_gdf.columns:
        return jsonify({"status": "error", "message": "Source grid must have a 'grid_id' column."}), 400

    total_inserted = 0
    # --- NEW: Batch processing loop ---
    newly_created_features = []
    print(f"Starting to process {len(grid_gdf)} grid cells in batches of {batch_size}...")

    for index, district in tqdm(grid_gdf.iterrows(), total=grid_gdf.shape[0]):
        grid_cell_id = district['grid_id']
        grid_cell_geom = district.geometry
        bounds = grid_cell_geom.bounds
        bbox_str = f"{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}"

        for basename in landcover_basenames:
            typename = f"{basename}_{year}"
            landcover_gdf = fetch_wfs_data_by_bbox(typename, bbox_str)
            if landcover_gdf is None: continue

            try:
                landcover_gdf.geometry = landcover_gdf.geometry.buffer(0)
                clipped_gdf = gpd.clip(landcover_gdf, grid_cell_geom)
                if not clipped_gdf.empty:
                    dissolved_geom = clipped_gdf.dissolve().geometry.iloc[0]
                    newly_created_features.append({
                        'grid_id': grid_cell_id,
                        'koodi': clipped_gdf['koodi'].iloc[0] if 'koodi' in clipped_gdf.columns else 'unknown',
                        'area_m2': dissolved_geom.area, 'geom': dissolved_geom
                    })
            except Exception as e:
                tqdm.write(f"Warning: Geometry processing error for grid_id {grid_cell_id}. Skipping. Details: {e}")
                continue

        # --- NEW: Check if batch is ready to be inserted ---
        if (index + 1) % batch_size == 0 or (index + 1) == len(grid_gdf):
            if newly_created_features:
                tqdm.write(f"\nProcessed batch up to index {index}. Inserting {len(newly_created_features)} new features...")
                batch_gdf = gpd.GeoDataFrame(newly_created_features, crs="EPSG:3879")
                batch_gdf['year'] = int(year)
                batch_gdf = gpd.GeoDataFrame(newly_created_features, geometry='geom', crs="EPSG:3879")

                inserted_count, status_message = insert_data_to_sql(batch_gdf, db_connection_info)
                if status_message != "Success":
                    # If any batch fails, stop and report the error
                    return jsonify({"status": "error", "message": f"Database insert failed on a batch: {status_message}", "total_features_inserted_before_error": total_inserted}), 500
                total_inserted += inserted_count
                
                # Clear the list for the next batch
                newly_created_features = []

    return jsonify({"status": "success", "message": "Processing complete.", "features_inserted": total_inserted})