import json
import requests


def calculate_building_center(posno):
  """
  Fetches building data for a given postal code and calculates the average center coordinates.

  Args:
    posno: The postal code.

  Returns:
    A tuple containing the average center_x and center_y, or None if no buildings are found.
  """
  url = f"https://geo.fvh.fi/r4c/collections/hsy_buildings/items?f=json&limit=5000&postinumero={posno}"
  response = requests.get(url)
  data = response.json()

  if 'features' not in data or not data['features']:
    return None

  center_x_sum = 0
  center_y_sum = 0
  building_count = 0

  for feature in data['features']:
    # Handle different geometry types
    if feature['geometry']['type'] == 'Polygon':
      coordinates = feature['geometry']['coordinates'][0]
      for coord in coordinates:
        center_x_sum += coord[0]
        center_y_sum += coord[1]
        building_count += 1
    elif feature['geometry']['type'] == 'MultiPolygon':
      for polygon_coords in feature['geometry']['coordinates']:
        for coord in polygon_coords[0]:  # Access the first ring of each polygon
          center_x_sum += coord[0]
          center_y_sum += coord[1]
          building_count += 1
    else:
      print(f"Unsupported geometry type: {feature['geometry']['type']}")

  if building_count > 0:
    avg_center_x = center_x_sum / building_count
    avg_center_y = center_y_sum / building_count
    return avg_center_x, avg_center_y
  else:
    return None


def update_geojson(geojson_file, output_file):
  """
  Updates the center_x and center_y attributes in a GeoJSON file to be the
  center of buildings for each feature.

  Args:
    geojson_file: Path to the input GeoJSON file.
    output_file: Path to the output GeoJSON file.
  """
  with open(geojson_file, 'r') as f:
    geojson_data = json.load(f)

  for feature in geojson_data['features']:
    posno = feature['properties']['posno']
    building_center = calculate_building_center(posno)
    if building_center:
      feature['properties']['center_x'] = building_center[0]
      feature['properties']['center_y'] = building_center[1]

  with open(output_file, 'w') as f:
    json.dump(geojson_data, f, indent=2)


# Example usage
geojson_file = 'hsy_po.json'  # Replace with your input file path
output_file = 'hsy_po_updated.json'  # Replace with your desired output file path
update_geojson(geojson_file, output_file)
