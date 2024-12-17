import math
import psycopg2
import webcolors
from dotenv import dotenv_values

def get_color_name(rgb):
    """
    Converts an RGB color tuple to a human-readable color name.
    """
    try:
        color_name = webcolors.rgb_to_name(rgb)
    except ValueError:
        # If the color is not recognized, find the closest color
        closest_color = get_closest_color(rgb)
        color_name = closest_color
    return color_name

def get_closest_color(rgb):
    """
    Finds the closest color to the given RGB value.
    """
    min_distance = math.inf
    closest_color = None

    for color_name in webcolors.CSS3_NAMES_TO_HEX:
        color_rgb = webcolors.name_to_rgb(color_name)
        distance = color_distance(rgb, color_rgb)
        if distance < min_distance:
            min_distance = distance
            closest_color = color_name

    return closest_color

def color_distance(rgb1, rgb2):
    """
    Calculates the Euclidean distance between two RGB colors.
    """
    r1, g1, b1 = rgb1
    r2, g2, b2 = rgb2
    distance = math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
    return distance

# Load environment variables from .env file
env_variables = dotenv_values(".env")

# PostgreSQL database connection parameters
db_params = {
    "host": env_variables["DB_HOST"],
    "port": env_variables["DB_PORT"],
    "database": env_variables["DB_NAME"],
    "user": env_variables["DB_USER"],
    "password": env_variables["DB_PASSWORD"]
}

# Table names from environment variables
rgb_table_name = env_variables["RGB_VALUES_TABLE"]  # Assuming you have an environment variable for this
color_names_table_name = env_variables["COLOR_NAMES_TABLE"]  # Assuming you have an environment variable for this

# Establish a connection to the PostgreSQL database
conn = psycopg2.connect(**db_params)

# Create a cursor object to interact with the database
cursor = conn.cursor()

# Execute a SELECT query to fetch the RGB values from the 'rgb_values' table
cursor.execute(f"SELECT r, g, b, hki_id FROM {rgb_table_name}")

# Iterate through the RGB values and store the color name in the 'color_names' table
for rgb in cursor.fetchall():
    color_name = get_color_name(rgb[:3])
    hki_id = rgb[3]

    # Execute an INSERT query to store the color name in the 'color_names' table
    cursor.execute(f"INSERT INTO {color_names_table_name} (name, hki_id) VALUES (%s, %s)", (color_name, hki_id))

# Commit the changes to the database
conn.commit()

# Close the cursor and connection
cursor.close()
conn.close()