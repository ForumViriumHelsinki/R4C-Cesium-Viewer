CLOUD_RUN_URL="https://normalise-landsat-b10-179156192201.europe-north1.run.app"
BUCKET="regions4climate"

declare -a dates=("2023-06-23" "2024-05-25" "2022-06-28" "2021-07-12" "2018-07-27" "2015-07-03" "2024-09-05" "2024-06-26" "2020-06-23" "2019-06-05" "2016-06-03")

# Loop through each date in the dates array
for DATE in "${dates[@]}"; do
    echo "Processing date: $DATE"

    ACCESS_TOKEN=$(gcloud auth print-identity-token)

    curl -X POST "$CLOUD_RUN_URL" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "date": "'"$DATE"'",
            "bucket": "'"$BUCKET"'"
        }'

    echo "Finished processing date: $DATE"
    sleep 2  
done