# Define the Cloud Function name and region
CLOUD_FUNCTION_NAME="calculate_heat_data"
REGION="europe-north1"

# List of all Espoo postal codes
POSNO_LIST=(
    "02100" "02110" "02120" "02130" "02140" "02150" "02160" "02170" "02180"
    "02200" "02210" "02230" "02240" "02250" "02260" "02270" "02280" "02290"
    "02300" "02320" "02330" "02340" "02360" "02380" "02400" "02410" "02420"
    "02510" "02520" "02540" "02550" "02600" "02610" "02620" "02630" "02650"
    "02700" "02710" "02720" "02730" "02740" "02750" "02760" "02770" "02780"
    "02810" "02820" "02860" "02880" "02920" "02940" "02970"
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
