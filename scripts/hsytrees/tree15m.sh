CLOUD_RUN_URL="https://add-hsy-trees-179156192201.europe-north1.run.app/"
TYPENAME="asuminen_ja_maankaytto:maanpeite_puusto_15_20m_2024"
CITY="Vantaa"
BUCKET="regions4climate"
JSON_PATH="NDVI/vector_data/hsy_po.json"

LOWER_HEIGHT=0
while (( $(echo "$LOWER_HEIGHT <= 21" | bc -l) )); do
    UPPER_HEIGHT=$(echo "$LOWER_HEIGHT + 1.5" | bc)

    echo "Processing height range: $LOWER_HEIGHT - $UPPER_HEIGHT"
    ACCESS_TOKEN=$(gcloud auth print-identity-token)

    curl -X POST "$CLOUD_RUN_URL" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
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
