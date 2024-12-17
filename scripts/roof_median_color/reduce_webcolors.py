import numpy as np
from sklearn.cluster import KMeans
import webcolors
from scipy.spatial.distance import cdist

# Original CSS3 color names to hex mapping
original_colors = webcolors.CSS3_NAMES_TO_HEX

# Extract RGB values from hex colors
rgb_values = [webcolors.hex_to_rgb(color) for color in original_colors.values()]

# Convert RGB values to a numpy array
rgb_array = np.array(rgb_values)

# Determine the number of clusters for reduced colors
num_clusters = len(original_colors) // 4

# Perform K-means clustering on the original colors
kmeans = KMeans(n_clusters=num_clusters, random_state=42)
kmeans.fit(rgb_array)

# Retrieve the cluster centers
cluster_centers = kmeans.cluster_centers_.round().astype(int)

# Generate the reduced color names and hex codes
reduced_colors = {}
for i, center in enumerate(cluster_centers):
    rgb_tuple = tuple(center)
    hex_code = webcolors.rgb_to_hex(rgb_tuple)
    reduced_colors[hex_code] = i

# Helper function to find the closest color name
def find_closest_color_name(rgb_value):
    distances = cdist([rgb_value], cluster_centers)
    closest_color_index = np.argmin(distances)
    closest_color_hex = webcolors.rgb_to_hex(tuple(cluster_centers[closest_color_index]))
    
    try:
        closest_color_name = webcolors.hex_to_name(closest_color_hex, spec='css3')
    except ValueError:
        closest_color_name = find_nearest_color_name(closest_color_hex)
    
    return closest_color_name

# Helper function to find the nearest color name from the original colors
def find_nearest_color_name(hex_code):
    distances = cdist([webcolors.hex_to_rgb(hex_code)], rgb_array)
    closest_color_index = np.argmin(distances)
    closest_color_name = list(original_colors.keys())[closest_color_index]
    return closest_color_name

# Generate the mapping of original colors to their closest reduced colors
color_mapping = {}
for color_name, hex_code in original_colors.items():
    rgb_value = webcolors.hex_to_rgb(hex_code)
    closest_color_name = find_closest_color_name(rgb_value)
    color_mapping[color_name] = closest_color_name

# Output key-value pairs for each named color and its closest reduced color
for color_name, closest_reduced_color in color_mapping.items():
    print(f"{color_name}: {closest_reduced_color}")
