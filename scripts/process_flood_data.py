import json
import geopandas as gpd
import pandas as pd

# Path to your geopackage files
file_path = "mesh2d_out_{:03d}.gpkg"  # Example: "data/mesh2d_out_{:03d}.gpkg"

# Initialize the base GeoDataFrame from the first file
base_gdf = gpd.read_file(file_path.format(1))
base_gdf = base_gdf.set_index("id")[["geometry"]]  # Use 'id' as the index

# Initialize empty lists to collect attribute data for each feature
all_water_depth = [[] for _ in range(len(base_gdf))]
all_discharge = [[] for _ in range(len(base_gdf))]


# Loop through the remaining files
for i in range(2, 241):
    gdf = gpd.read_file(file_path.format(i))

    # Check if id column exists
    if "id" not in gdf.columns:
        print(f"Skipping file {i}: id column not found")
        continue

    # Ensure geometries match by reindexing
    gdf = gdf.set_index("id")
    if not base_gdf.geometry.equals(gdf.geometry):
        raise ValueError(f"Geometries mismatch in file {i}!")

    # Append water_depth and discharge to the respective lists, for each feature
    for j in range(len(gdf)):
        all_water_depth[j].append(gdf["water_depth"].iloc[j])  # Feature-wise append
        all_discharge[j].append(gdf["discharge"].iloc[j])

# Create GeoDataFrame from the base geometry and joined data
final_gdf = base_gdf.copy()  # Create a copy to avoid modifying the original
final_gdf["water_depth"] = [json.dumps(wd) for wd in all_water_depth]
final_gdf["discharge"] = [json.dumps(dis) for dis in all_discharge]

# Reproject to WGS84 (EPSG:4326)
final_gdf = final_gdf.to_crs("EPSG:4326")

# Save as GeoJSON
final_gdf.to_file("output.geojson", driver="GeoJSON")

print("Processing complete. Output saved to output.geojson")
