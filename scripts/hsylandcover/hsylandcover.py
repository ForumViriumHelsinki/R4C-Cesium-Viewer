import geopandas as gpd
import json
import pandas as pd
import ssl
import urllib.request
from google.cloud import storage
from flask import jsonify

def fetch_wfs_data(typename):
    """
    Fetches WFS data from HSY GeoServer for given typename.
    """
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'
    params = {
        'service': 'WFS',
        'request': 'GetFeature',
        'typename': typename,
        'version': '2.0.0',
        'outputFormat': 'application/json',
        'CQL_FILTER': 'kunta IN (\'Espoo\',\'Helsinki\',\'Kauniainen\',\'Vantaa\')',
        'srsName': 'EPSG:4326'
    }

    query_string = urllib.parse.urlencode(params)
    request_url = f"{wfs_url}?{query_string}"
    print(f"Fetching WFS data from: {request_url}")

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        response = urllib.request.urlopen(request_url, context=ssl_context)
        data = json.loads(response.read())
        return gpd.GeoDataFrame.from_features(data['features'])
    except Exception as e:
        print(f"Error fetching WFS data: {e}")
        return None

def update_geojson_with_data(gdf, output_data, index_column):
    """
    Updates GeoDataFrame with area calculation results.
    """
    output_df = pd.DataFrame(output_data)
    pivoted_output_df = output_df.pivot(index=index_column, columns='attribute_name', values='area').reset_index()
    updated_gdf = gdf.merge(pivoted_output_df, on=index_column, how='left')
    return updated_gdf

def generate_attribute_name(koodi, year):
    """
    Generates attribute name based on koodi and year.
    """
    koodi_map = {
        '310': 'rocks', '212': 'vegetation', '520': 'sea', '130': 'other',
        '112': 'dirtroad', '111': 'pavedroad', '410': 'bareland', '211': 'field',
        '221': 'tree2', '222': 'tree10', '223': 'tree15', '224': 'tree20',
        '121': 'building', '510': 'water', '120': 'building'  # 2022 exception
    }
    base = koodi_map.get(str(koodi), 'unknown')
    return f"{base}_m2_{year}"

def calculate_area_sums(hsylandcover, areas, index_column):
    """
    Calculates total area for each land cover type per district.
    """
    area_sums = {}
    for _, district in areas.iterrows():
        try:
            clipped = hsylandcover.clip(district.geometry)
            if clipped.empty:
                continue
            for _, feature in clipped.iterrows():
                koodi = feature['koodi']
                area = gpd.GeoSeries([feature.geometry], crs=hsylandcover.crs).to_crs(epsg=3879).area.iloc[0]
                key = (koodi, district[index_column])
                area_sums[key] = area_sums.get(key, 0) + area
        except Exception as e:
            print(f"Error processing {district[index_column]}: {e}")
    return area_sums

def create_output_data(area_sums, year, index_column):
    """
    Converts area sums to JSON-compatible format.
    """
    return [{index_column: id, 'attribute_name': generate_attribute_name(koodi, year), 'area': area}
            for (koodi, id), area in area_sums.items()]

def process_land_cover(bucket_name, geojson_path, year, index_column):
    """
    Main function: downloads GeoJSON, processes it, and uploads updated version.
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    # Download GeoJSON file
    blob = bucket.blob(geojson_path)
    local_geojson_path = "/tmp/vector.geojson"
    blob.download_to_filename(local_geojson_path)

    # Load GeoJSON
    areas = gpd.read_file(local_geojson_path)
    areas['geometry'] = areas['geometry'].buffer(0)

    landcover_layers = [
        'maanpeite_avokalliot', 'maanpeite_merialue', 'maanpeite_muu_avoin_matala_kasvillisuus',
        'maanpeite_muu_vetta_lapaisematon_pinta', 'maanpeite_paallystamaton_tie', 'maanpeite_paallystetty_tie',
        'maanpeite_paljas_maa', 'maanpeite_pellot', 'maanpeite_puusto_10_15m', 'maanpeite_puusto_15_20m',
        'maanpeite_puusto_2_10m', 'maanpeite_puusto_yli20m', 'maanpeite_vesi', 'maanpeite_rakennus'
    ]

    for layer in landcover_layers:
        typename = f"asuminen_ja_maankaytto:{layer}_{year}"
        hsylandcover = fetch_wfs_data(typename)
        
        if hsylandcover is None:
            continue

        hsylandcover = hsylandcover.set_crs("EPSG:4326", allow_override=True).to_crs(areas.crs)
        hsylandcover['geometry'] = hsylandcover['geometry'].buffer(0)

        # Drop unknown columns if present
        unknown_cols = [col for col in hsylandcover.columns if col.startswith("unknown_m2_")]
        hsylandcover.drop(columns=unknown_cols, inplace=True, errors='ignore')

        # Compute and merge area sums
        area_sums = calculate_area_sums(hsylandcover, areas, index_column)
        output_data = create_output_data(area_sums, year, index_column)
        areas = update_geojson_with_data(areas, output_data, index_column)

    # Save updated GeoJSON locally
    updated_geojson_path = "/tmp/updated_vector.geojson"
    areas.to_file(updated_geojson_path, driver='GeoJSON')

    # Upload back to GCS
    updated_blob = bucket.blob(geojson_path)
    updated_blob.upload_from_filename(updated_geojson_path)

    print(f"Updated GeoJSON uploaded to gs://{bucket_name}/{geojson_path}")

    return {"status": "success", "updated_geojson": f"gs://{bucket_name}/{geojson_path}"}

def process_hsy_landcover(request):
    """
    Cloud Function entry point.
    """
    request_json = request.get_json(silent=True)
    if not request_json:
        return jsonify({"error": "Invalid request, missing JSON body"}), 400

    required_params = ["bucket", "geojson_path", "year", "index_column"]
    for param in required_params:
        if param not in request_json:
            return jsonify({"error": f"Missing parameter: {param}"}), 400

    bucket_name = request_json["bucket"]
    geojson_path = request_json["geojson_path"]
    year = request_json["year"]
    index_column = request_json["index_column"]

    if year not in ["2024", "2022", "2020", "2018", "2016"]:
        return jsonify({"error": "Year must be 2024, 2022, 2020, 2018, or 2016"}), 400

    result = process_land_cover(bucket_name, geojson_path, year, index_column)
    return jsonify(result)