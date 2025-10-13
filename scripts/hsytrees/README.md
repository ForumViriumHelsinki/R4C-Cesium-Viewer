# Google Cloud Function: add_hsy_trees

## Overview

The `add_hsy_trees` Google Cloud Function is designed to fetch tree canopy height data from the HSY WFS service, process it against postal code areas, and insert the results into a PostgreSQL database hosted on Google Cloud SQL.

## Functionality

1. **Fetch Data from WFS**
   - Uses the `typename`, `city`, `lowerHeight`, and `upperHeight` parameters to retrieve data from the HSY WFS server.
   - Filters results based on city and height range.

2. **Spatial Processing**
   - Loads postal code area data from a Google Cloud Storage JSON file.
   - Clips tree canopy data to postal code areas.
   - Assigns postal code information to each feature.

3. **Insert Data into Database**
   - Converts features to `GeoDataFrame`.
   - Inserts the processed data into a PostgreSQL table in Google Cloud SQL.

---

## Usage

### 1. **Calling the Cloud Function**

You can invoke this function using `gcloud` CLI:

```bash
gcloud functions call add_hsy_trees --region=europe-north1 --data '{
    "typename": "asuminen_ja_maankaytto:maanpeite_puusto_15_20m_2024",
    "city": "helsinki",
    "bucket": "regions4climate",
    "json_path": "NDVI/vector_data/hsy_po.json",
    "lowerHeight": 0,
    "upperHeight": 4
}'
```

### 2. Automating Calls with a Bash Script

Use the provided scripts to loop through height ranges. Change the city to run the script for other cities in Helsinki Metropolian area. tree15m can also be used for 2m and 10m trees
