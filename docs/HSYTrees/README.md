# Description
This script automates the retrieval of tree data from the HSY (Helsinki Region Environmental Services Authority) WFS (Web Feature Service) and processes it to associate tree data with corresponding postal codes. The processed data is then saved to a PostgreSQL database for further analysis or visualization.

## Prerequisites

HSY WFS Endpoint: Ensure access to the HSY WFS service providing tree data. The endpoint and relevant parameters (typename, city) are loaded from a .env file.

Postal Code GeoJSON: A GeoJSON file containing postal code boundaries (hsy_po.json in this script) is required for spatial joining.

PostgreSQL Database: A PostgreSQL database with a table named tree_f should be set up to store the results. The database connection details are loaded from the .env file.

## Procedure

Fetch WFS Data:

Construct a URL for the HSY WFS service based on parameters in the .env file.
Use urllib.request to fetch the data as a JSON response.
An SSL context is created to bypass certificate verification (adjust for production environments).

Spatial Joining and Database Insertion:

Read the postal code GeoJSON and the fetched WFS data into Geopandas DataFrames.
Iterate through postal code areas:
Clip the tree features to the current postal code area.
If there are clipped features:
Calculate areas and other relevant attributes.
Insert each processed feature into the PostgreSQL table tree_f along with the associated postal code.
