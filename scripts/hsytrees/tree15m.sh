#!/bin/bash

# Google Cloud Function details
CLOUD_FUNCTION_NAME="add_hsy_trees"
REGION="europe-north1"

# Static parameters
TYPENAME="asuminen_ja_maankaytto:maanpeite_puusto_15_20m_2024"
CITY="helsinki"
BUCKET="regions4climate"
JSON_PATH="NDVI/vector_data/hsy_po.json"

# Loop through height ranges from 0-1.5 to 21-22.5
LOWER_HEIGHT=0
while (( $(echo "$LOWER_HEIGHT <= 21" | bc -l) )); do
    UPPER_HEIGHT=$(echo "$LOWER_HEIGHT + 1.5" | bc)

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

    LOWER_HEIGHT=$(echo "$LOWER_HEIGHT + 1.5" | bc)
done
