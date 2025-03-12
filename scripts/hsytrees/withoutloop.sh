CLOUD_RUN_URL="https://add-hsy-trees-179156192201.europe-north1.run.app/"
TYPENAME="asuminen_ja_maankaytto:maanpeite_puusto_2_10m_2024"
CITY="Helsinki"
BUCKET="regions4climate"
JSON_PATH="NDVI/vector_data/hsy_po.json"

echo "Processing $TYPENAME"
ACCESS_TOKEN=$(gcloud auth print-identity-token)

curl -X POST "$CLOUD_RUN_URL" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "typename": "'"$TYPENAME"'",
        "city": "'"$CITY"'",
        "bucket": "'"$BUCKET"'",
        "json_path": "'"$JSON_PATH"'"
    }'

echo "Finished processing: $rocessing $TYPENAME"
sleep 2
