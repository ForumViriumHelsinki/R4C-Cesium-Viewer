import rasterio
from rasterio.features import shapes
from shapely.geometry import shape
import json
import geopandas as gpd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import dotenv_values
import os

# Load environment variables from .env file
env_vars = dotenv_values(".env")

def raster_to_polygon(input_file, min_val=0, max_val=0.4):
    with rasterio.open(input_file) as src:
        # Read the raster data
        image = src.read(1)

        # Generate polygon geometries with filtering
        polygons = []
        for i, (s, v) in enumerate(shapes(image, mask=None, connectivity=4, transform=src.transform)):
            if min_val < v <= max_val:
                polygons.append({'geometry': shape(s), 'heatexposure': v})

        # Convert to GeoDataFrame
        polygons_gdf = gpd.GeoDataFrame(polygons, crs=src.crs)

    return polygons_gdf

def spatial_relation_with_postal_code_areas_and_save_to_db(polygons_gdf, postal_code_geojson_path, minTempK, maxTempK, imageDate, tableName):
    # Read postal code data
    postal_code_gdf = gpd.read_file(postal_code_geojson_path)

    # Connect to the PostgreSQL database
    conn = psycopg2.connect(
        host=env_vars["DB_HOST"],
        port=env_vars["DB_PORT"],
        database=env_vars["DB_NAME"],
        user=env_vars["DB_USER"],
        password=env_vars["DB_PASSWORD"]
    )
    cur = conn.cursor()

    # Iterate through each feature in polygons_gdf
    for idx, polygon in polygons_gdf.iterrows():
        # Check for intersection with postal code polygons
        intersecting = postal_code_gdf[(postal_code_gdf.intersects(polygon['geometry'])) | (postal_code_gdf.within(polygon['geometry']))]
        if not intersecting.empty:
            # If there is an intersection, add attributes to the filtered feature
            for _, row in intersecting.iterrows():
                # Calculate temperature in Celsius
                temp_c = calculateTempInC(polygon['heatexposure'], minTempK, maxTempK)

                # Prepare the insert query
                insert_query = f"INSERT INTO {tableName} (posno, heatexposure, geom, temp_c, date) VALUES (%s, %s, ST_GeomFromGeoJSON(%s), %s, %s)"

                # Execute the insert query with the values
                cur.execute(insert_query, (row['posno'], polygon['heatexposure'], json.dumps(polygon['geometry']), temp_c, imageDate))
                conn.commit()

    # Close the cursor and the connection
    cur.close()
    conn.close()

def calculateTempInC(heatexposure, minTempK, maxTempK):
    return (heatexposure * (maxTempK - minTempK) + minTempK) - 273.15

if __name__ == "__main__":
    # Get user input for parameters
    input_raster = input("Enter the path to the input raster file: ")
    postal_code_geojson_path = input("Enter the path to the postal code GeoJSON file: ")
    minTempK = float(input("Enter the minimum temperature in Kelvin: "))
    maxTempK = float(input("Enter the maximum temperature in Kelvin: "))
    imageDate = input("Enter the image date (YYYY-MM-DD): ")
    tableName = input("Enter the table name for the database: ")

    # Call raster_to_polygon to process raster data
    polygons_gdf = raster_to_polygon(input_raster)

    # Call spatial_relation_with_postal_code_areas_and_save_to_db to perform spatial analysis and save to database
    spatial_relation_with_postal_code_areas_and_save_to_db(polygons_gdf, postal_code_geojson_path, minTempK, maxTempK, imageDate, tableName)
