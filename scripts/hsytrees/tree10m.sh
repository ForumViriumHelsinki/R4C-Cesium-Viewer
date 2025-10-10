CLOUD_RUN_URL="https://add-hsy-trees-179156192201.europe-north1.run.app/"
TYPENAME="asuminen_ja_maankaytto:maanpeite_puusto_10_15m_2024"
CITY="Espoo"
BUCKET="regions4climate"
JSON_PATH="NDVI/vector_data/hsy_po.json"

LOWER_HEIGHT=0
while (( $(echo "$LOWER_HEIGHT <= 21" | bc -l) )); do
    UPPER_HEIGHT=$(echo "$LOWER_HEIGHT + 0.5" | bc)

    LOWER_HEIGHT_FMT=$(printf "%.1f" "$LOWER_HEIGHT")
    UPPER_HEIGHT_FMT=$(printf "%.1f" "$UPPER_HEIGHT")

    echo "Processing height range: $LOWER_HEIGHT_FMT - $UPPER_HEIGHT_FMT"
    ACCESS_TOKEN=$(gcloud auth print-identity-token)

    curl -X POST "$CLOUD_RUN_URL" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "typename": "'"$TYPENAME"'",
            "city": "'"$CITY"'",
            "bucket": "'"$BUCKET"'",
            "json_path": "'"$JSON_PATH"'",
            "lowerHeight": '"$LOWER_HEIGHT_FMT"',
            "upperHeight": '"$UPPER_HEIGHT_FMT"'
        }'

    echo "Finished processing height range: $LOWER_HEIGHT_FMT - $UPPER_HEIGHT_FMT"
    sleep 2

    LOWER_HEIGHT=$(echo "$LOWER_HEIGHT + 0.5" | bc)
done
