import geopandas as gpd
import json
import pandas as pd
import ssl
import urllib.request
import sys

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
     	'CQL_FILTER': 'kunta IN (\'Espoo\',\'Helsinki\',\'Kauniainen\',\'Vantaa\')',
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
        return gpd.GeoDataFrame.from_features(data['features'])
    except Exception as e:
        print(f"An error occurred: {e}")

def update_geojson_with_data(geojson_path, output_data, index_column):
    # Read the existing GeoJSON into a GeoDataFrame
    existing_geojson = gpd.read_file(geojson_path)

    # Convert output_data to a DataFrame
    output_df = pd.DataFrame(output_data)

    # Pivot output_df to have one row per tunnus, with multiple columns for each koodi
    pivoted_output_df = output_df.pivot(index=index_column, columns='attribute_name', values='area').reset_index()

    # Merge the pivoted data with the existing GeoDataFrame on 'tunnus'
    updated_geojson = existing_geojson.merge(pivoted_output_df, on=index_column, how='left')

    # Write the updated GeoDataFrame to a GeoJSON file
    updated_geojson.to_file(geojson_path, driver='GeoJSON')

# Function to generate attribute name based on koodi and year
def generate_attribute_name(koodi, year):
    koodi = str(koodi)
     
    koodi_name_map = {
        '310': 'rocks',
        '212': 'vegetation',
        '520': 'sea',
        '130': 'other',
        '112': 'dirtroad',
        '111': 'pavedroad',
        '410': 'bareland',
        '211': 'field',
        '221': 'tree2',
        '222': 'tree10',
        '223': 'tree15',
        '224': 'tree20',
        '121': 'building',
        '510': 'water',
        '120': 'building' # for 2022
        # Add other koodi mappings here...
    }
    attribute_base = koodi_name_map.get(koodi, 'unknown')
    return f"{attribute_base}_m2_{year}"

def calculate_area_sums(hsylandcover, areas, index_column ):
    # Dictionary to store the sum of areas for each tunnus and koodi combination
    area_sums = {}

    # Iterate over each feature in areas
    for _, district in areas.iterrows():
        try:
            # Clip the hsylandcover features by the district geometry
            clipped = hsylandcover.clip(district.geometry)

            # Skip if there are no clipped geometries
            if clipped.empty:
                continue

            # Calculate area for each clipped feature and sum up
            for _, clipped_feature in clipped.iterrows():
                koodi = clipped_feature['koodi']

                # Create a GeoSeries from the geometry with the same CRS as hsylandcover
                geom_series = gpd.GeoSeries([clipped_feature['geometry']], crs=hsylandcover.crs)
            
                # Project to the desired CRS and calculate the area
                area = geom_series.to_crs(epsg=3879).area.iloc[0]
                key = (koodi, district[index_column])

                # Add the area to the corresponding koodi and tunnus
                if key in area_sums:
                    area_sums[key] += area
                else:
                    area_sums[key] = area

        except Exception as e:
            print(f"An error occurred while processing {district[index_column]}: {e}")
            
    return area_sums        

def create_output_data( area_sums, year, index_column ):

    # Convert the area sums to the desired JSON format
    output_data = []
    for (koodi, id), area in area_sums.items():
        attr_name = generate_attribute_name(koodi, year)
        # Set area to 0 if it is null (None)
        area = 0 if area is None else area
        output_data.append({index_column: id, 'attribute_name': attr_name, 'area': area})
        
    return output_data

def main(geojson_path, year, index_column):

    landcoverLayers = [
        'asuminen_ja_maankaytto:maanpeite_avokalliot',
        'asuminen_ja_maankaytto:maanpeite_merialue',
        'asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus',
        'asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta',
        'asuminen_ja_maankaytto:maanpeite_paallystamaton_tie',
        'asuminen_ja_maankaytto:maanpeite_paallystetty_tie',
        'asuminen_ja_maankaytto:maanpeite_paljas_maa',
        'asuminen_ja_maankaytto:maanpeite_pellot',
        'asuminen_ja_maankaytto:maanpeite_puusto_10_15m',
        'asuminen_ja_maankaytto:maanpeite_puusto_15_20m',
        'asuminen_ja_maankaytto:maanpeite_puusto_2_10m',
        'asuminen_ja_maankaytto:maanpeite_puusto_yli20m',
        'asuminen_ja_maankaytto:maanpeite_vesi',
        'asuminen_ja_maankaytto:maanpeite_rakennus'
    ]

    # Load areas GeoDataFrame
    areas = gpd.read_file(geojson_path)
    areas['geometry'] = areas['geometry'].buffer(0)

    # Iterate over each land cover layer
    for layer in landcoverLayers:
        landcoverName = f"{layer}_{year}"
        hsylandcover = fetch_wfs_data(landcoverName)
        
        # Check if data was fetched successfully
        if hsylandcover is None:
            continue

        # Set the CRS and fix geometries (if needed)
        if hsylandcover.crs is None:
            hsylandcover = hsylandcover.set_crs("EPSG:4326")
        hsylandcover['geometry'] = hsylandcover['geometry'].buffer(0)
        hsylandcover = hsylandcover.to_crs(areas.crs)
        
        columns_to_drop = [col for col in hsylandcover.columns if col.startswith("unknown_m2_")]
        hsylandcover.drop(columns=columns_to_drop, inplace=True)

        # Calculate and process area sums
        area_sums = calculate_area_sums(hsylandcover, areas, index_column)
        output_data = create_output_data(area_sums, year, index_column)

        # Update the GeoJSON file
        update_geojson_with_data(geojson_path, output_data, index_column)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python script.py <geojson_path> <year> <index_column>")
        sys.exit(1)

    geojson_path = sys.argv[1]
    year = sys.argv[2]
    index_column = sys.argv[3]
        
    if year not in ["2022", "2020", "2018", "2016", "2024"]:
        print("Year must be either 2024, 2022, 2020, 2018 or 2016")
        sys.exit(1)
        
    main(geojson_path, year, index_column)