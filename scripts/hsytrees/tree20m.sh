#!/bin/bash

# Google Cloud Function details
CLOUD_FUNCTION_NAME="add_hsy_trees"
REGION="europe-north1"

# Static parameters
TYPENAME="asuminen_ja_maankaytto:maanpeite_puusto_yli20m_2020"
CITY="helsinki"
BUCKET="regions4climate"
JSON_PATH="NDVI/vector_data/hsy_po.json"

# Loop through height ranges from 0-4 to 76-80
for LOWER_HEIGHT in $(seq 0 4 76); do
    UPPER_HEIGHT=$((LOWER_HEIGHT + 4))

    echo "Processing height range: $LOWER_HEIGHT - $UPPER_HEIGHT"

    gcloud functions call $CLOUD_FUNCTION_NAME \
        --region=$REGION \
        --data '{
            "typename": "'"$TYPENAME"'",
            "city": "'"$CITY"'",
            "bucket": "'"$BUCKET"'",
            "json_path": "'"$JSON_PATH"'",
            "lowerHeight": '"$LOWER_HEIGHT"',
            "upperHeight": '"$UPPER_HEIGHT"'
        }'

    echo "Finished processing height range: $LOWER_HEIGHT - $UPPER_HEIGHT"
    sleep 2
done
