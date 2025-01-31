# Define the Cloud Function name and region
CLOUD_FUNCTION_NAME="calculate_heat_data"
REGION="europe-north1"

# List of all Vantaa postal codes
POSNO_LIST=(
    "01300" "01301" "01350" "01360" "01370" "01380" "01400" "01410" "01420" 
    "01450" "01480" "01510" "01520" "01530" "01590" "01600" "01610" "01620" 
    "01630" "01640" "01650" "01700" "01710" "01730" "01740" "01750" "01760"
)

# Loop through each posno and invoke the function
for POSNO in "${POSNO_LIST[@]}"; do
    echo "Processing posno: $POSNO"

    # Call the Cloud Function
    gcloud functions call $CLOUD_FUNCTION_NAME \
        --region=$REGION \
        --data '{
            "date": "2023-06-23",
            "bucket": "regions4climate",
            "posno": "'"$POSNO"'",
            "hsy_wfs": "asuminen_ja_maankaytto:pks_rakennukset_paivittyva"
        }'

    echo "Finished processing posno: $POSNO"
    sleep 2  # Optional: Small delay to avoid overwhelming the function
done
