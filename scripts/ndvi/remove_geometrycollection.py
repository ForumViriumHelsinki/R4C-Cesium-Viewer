import json

def remove_geometry_collection(geojson_data):
    """
    Removes GeometryCollection from GeoJSON features and replaces it with the contained MultiPolygon.

    Args:
    - geojson_data: The GeoJSON data as a Python dictionary.

    Returns:
    - The modified GeoJSON data with GeometryCollection removed.
    """

    for feature in geojson_data['features']:
        if feature['geometry']['type'] == 'GeometryCollection':
            # Assuming GeometryCollection contains only one MultiPolygon
            feature['geometry'] = feature['geometry']['geometries'][0]
    return geojson_data

# Load the GeoJSON data
with open('hsy_po_wo_water.json', 'r') as f:
    geojson_data = json.load(f)

# Remove GeometryCollection from features
modified_geojson = remove_geometry_collection(geojson_data)

# Save the modified GeoJSON data to a new file
with open('modified_hsy_po_wo_water.json', 'w') as f:
    json.dump(modified_geojson, f, indent=4)
