# Define the Cloud Function name and region
CLOUD_FUNCTION_NAME="calculate_heat_data"
REGION="europe-north1"

# List of all Helsinki postal codes
POSNO_LIST=(
    "00100" "00120" "00130" "00140" "00150" "00160" "00170" "00180" "00190"
    "00200" "00210" "00220" "00230" "00240" "00250" "00260" "00270" "00280" "00290"
    "00300" "00310" "00320" "00330" "00340" "00350" "00360" "00370" "00380" "00390"
    "00400" "00410" "00420" "00430" "00440"
    "00500" "00510" "00520" "00530" "00540" "00550" "00560" "00570" "00580" "00590"
    "00600" "00610" "00620" "00630" "00640" "00650" "00660" "00670" "00680" "00690"
    "00700" "00710" "00720" "00730" "00740" "00750" "00760" "00770" "00780" "00790"
    "00800" "00810" "00820" "00830" "00840" "00850" "00860" "00870" "00880" "00890"
    "00900" "00910" "00920" "00930" "00940" "00950" "00960" "00970" "00980" "00990"
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
