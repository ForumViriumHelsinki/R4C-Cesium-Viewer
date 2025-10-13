import os
import json
import urllib.request
import urllib.parse
import ssl
from flask import Response, stream_with_context

from google.cloud.sql.connector import Connector
import pg8000

def fetch_wfs_data():
    """
    Fetches data from the WFS server and logs the response content.
    """

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
        'request': 'GetFeature',
        'typename': 'asuminen_ja_maankaytto:pks_rakennukset_paivittyva',
        'version': '2.0.0',
        'outputFormat': 'application/json',
        'srsName': 'EPSG:4326'
    }

    # Construct the query string
    query_string = urllib.parse.urlencode(params)

    # Complete URL for the request
    request_url = wfs_url + '?' + query_string

    # Create an SSL context that does not verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Request to WFS and process response
    try:
        response = urllib.request.urlopen(request_url, context=ssl_context)

        # Read the response content
        response_content = response.read()

        # Check if response is empty
        if not response_content:
            print("No data returned from the server.")
            return None

        # Try to parse the JSON response
        try:
            data = json.loads(response_content)
            return data
        except json.JSONDecodeError:
            print(f"Failed to parse JSON. Response content:\n{response_content.decode('utf-8')}")
            return None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None  # Return None in case of an error

def update_google_sql(data):
    """
    Updates the Google Cloud SQL PostgreSQL table with the fetched WFS data.
    """
    if not data or 'features' not in data:
        print("Invalid or empty WFS data.")
        return

    print(f"Processing {len(data['features'])} features...")

    instance_connection_name = os.environ.get("INSTANCE_NAME")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")

    connector = Connector()

    # Counters for inserts and updates
    update_count = 0
    insert_count = 0

    def getconn() -> pg8000.dbapi.Connection:
        conn: pg8000.dbapi.Connection = connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_password,
            db=db_name,
        )
        return conn

    try:
        conn = getconn()
        cursor = conn.cursor()

        for feature in data['features']:
            properties = feature['properties']

            # Skip features where 'geometria' property equals 'piste'
            if properties.get('geometria') == 'piste':
                continue

            geom = json.dumps(feature['geometry'])

            fields = [
                'kunta', 'vtj_prt', 'raktun', 'kiitun', 'katu', 'osno1', 'oski1',
                'osno2', 'oski2', 'postinumero', 'kavu', 'kayttarks', 'kerala', 'korala',
                'kohala', 'ashala', 'asuntojen_lkm', 'kerrosten_lkm', 'rakennusaine_s',
                'julkisivu_s', 'lammitystapa_s', 'lammitysaine_s', 'viemari', 'vesijohto',
                'olotila_s', 'poimintapvm', 'kokotun'
            ]

            values = [properties.get(field) for field in fields] + [geom]

            # Use pg8000 placeholder style
            placeholders = ', '.join(['%s'] * len(fields))

            cursor.execute("SELECT 1 FROM r4c_hsy_building_test WHERE vtj_prt = %s", (properties.get('vtj_prt'),))
            existing_record = cursor.fetchone()

            if existing_record:
                update_sql = f"""
                    UPDATE r4c_hsy_building_test
                    SET {', '.join([f"{field} = %s" for field in fields])}, geom = ST_GeomFromGeoJSON(%s)
                    WHERE vtj_prt = %s
                """
                cursor.execute(update_sql, values + [properties.get('vtj_prt')])
                update_count += 1

            else:
                insert_sql = f"""
                    INSERT INTO r4c_hsy_building_test ({', '.join(fields)}, geom)
                    VALUES ({placeholders}, ST_GeomFromGeoJSON(%s))
                """
                cursor.execute(insert_sql, values)
                insert_count += 1

        conn.commit()
        cursor.close()
        print(f"Database update completed successfully. {update_count} records updated, {insert_count} records inserted.")

    except Exception as e:
        print(f"An error occurred while updating the database: {e}")
        print(f"geom {geom}")

    finally:
        connector.close()

def update_hsy_buildings(request):
    """
    Cloud Function to fetch data from a WFS server and update a Google SQL table.
    """

    # Fetch data from WFS server
    data = fetch_wfs_data()

    # Update Google SQL table
    update_google_sql(data)

    return "Data fetched and updated successfully!"
