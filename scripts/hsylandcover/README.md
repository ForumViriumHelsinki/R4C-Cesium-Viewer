# HSY Land Cover Processing Cloud Function

This Google Cloud Function processes land cover data from the **HSY GeoServer** and updates a **GeoJSON file** stored in **Google Cloud Storage**. The function calculates land cover area statistics for specific districts and updates the GeoJSON with new attributes.

## Features

- Fetches land cover data from HSY **WFS (Web Feature Service)**.
- Clips the data to match district boundaries.
- Calculates area sums for different land cover types.
- Updates a **GeoJSON file** with new attributes.
- Reads and writes the GeoJSON to/from **Google Cloud Storage**.
