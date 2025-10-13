import os
import json
import urllib.request
import urllib.parse
import ssl
from flask import jsonify

from google.cloud.sql.connector import Connector
import pg8000

def fetch_wfs_data(posno):
    """
    Fetches data from the WFS server and removes duplicate vtj_prt rows.
    """

    # Base URL for the WFS server
    wfs_url = 'https://kartta.hsy.fi/geoserver/wfs'

    # Ensure posno is properly formatted for CQL_FILTER
    if isinstance(posno, list):
        posno_str = ",".join(f"'{p}'" for p in posno)  # Format as 'value1','value2'
        cql_filter = f"posno IN ({posno_str})"
    else:
        cql_filter = f"posno = '{posno}'"  # Single value case

    # Parameters for the WFS request
    params = {
        'service': 'WFS',
        'request': 'GetFeature',
        'typename': 'asuminen_ja_maankaytto:pks_rakennukset_paivittyva',
        'version': '2.0.0',
        'outputFormat': 'application/json',
        'CQL_FILTER': cql_filter,
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
            if 'features' not in data:
                print("Invalid WFS response structure.")
                return None

            # ✅ **Remove duplicate vtj_prt records**
            unique_features = {}
            for feature in data['features']:
                properties = feature.get('properties', {})
                vtj_prt = properties.get('vtj_prt')

                if vtj_prt:
                    # Keep only the latest or first encountered vtj_prt
                    unique_features[vtj_prt] = feature

            # ✅ Convert back to list
            data['features'] = list(unique_features.values())

            print(f"Filtered {len(data['features'])} unique records from WFS data.")

            return data

        except json.JSONDecodeError:
            print(f"Failed to parse JSON. Response content:\n{response_content.decode('utf-8')}")
            return None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None  # Return None in case of an error

def fetch_existing_vtj_prt(conn, posno, table_name):
    """Fetches existing vtj_prt values from the database filtered by posno."""
    cursor = conn.cursor()

    # Properly format table name in query
    sql = f"SELECT vtj_prt FROM {table_name} WHERE posno = %s"
    cursor.execute(sql, (posno,))

    existing_vtj_prt_set = {row[0] for row in cursor.fetchall()}  # Convert to a set for O(1) lookups
    cursor.close()
    return existing_vtj_prt_set

def update_google_sql(data, posno):
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
    table_name = os.environ.get("TABLE_NAME")

    connector = Connector()

    # Collect batches for insert and update
    update_values = []
    insert_values = []

    fields = [
        'kunta', 'vtj_prt', 'raktun', 'kiitun', 'katu', 'osno1', 'oski1',
        'osno2', 'oski2', 'posno', 'kavu', 'kayttarks', 'kerala', 'korala',
        'kohala', 'ashala', 'asuntojen_lkm', 'kerrosten_lkm', 'rakennusaine_s',
        'julkisivu_s', 'lammitystapa_s', 'lammitysaine_s', 'viemari', 'vesijohto',
        'olotila_s', 'poimintapvm', 'kokotun'
    ]

    def getconn() -> pg8000.dbapi.Connection:
        return connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_password,
            db=db_name,
        )

    try:
        conn = getconn()
        cursor = conn.cursor()

        # Fetch existing vtj_prt values for this posno
        existing_vtj_prt_set = fetch_existing_vtj_prt(conn, posno, table_name)

        # Loop through the data to collect values for batch insert/update
        for feature in data['features']:
            properties = feature['properties']

            # Skip features where 'geometria' property equals 'piste'
            if properties.get('geometria') == 'piste':
                continue

            geom = json.dumps(feature['geometry'])
            values = [properties.get(field) for field in fields] + [geom]

            # Check if vtj_prt exists in the fetched set
            if properties.get('vtj_prt') in existing_vtj_prt_set:
                update_values.append(values + [properties.get('vtj_prt')])
            else:
                insert_values.append(values)

        # Perform bulk insert if any new records
        if insert_values:
            insert_sql = f"""
                INSERT INTO {table_name} ({', '.join(fields)}, geom, area_m2)
                VALUES ({', '.join(['%s'] * len(fields))},
                    ST_MakeValid(ST_GeomFromGeoJSON(%s)),
                    ST_Area(ST_Transform(ST_MakeValid(ST_GeomFromGeoJSON(%s)), 3857)))
            """
            cursor.executemany(insert_sql, insert_values)
            print(f"{len(insert_values)} records inserted.")

        # Perform bulk update if any records to update
        if update_values:
            update_sql = f"""
                UPDATE {table_name}
                SET {', '.join([f"{field} = %s" for field in fields])},
                    geom = ST_MakeValid(ST_GeomFromGeoJSON(%s)),
                    area_m2 = ST_Area(ST_Transform(ST_MakeValid(ST_GeomFromGeoJSON(%s)), 3857))
                WHERE vtj_prt = %s
            """
            cursor.executemany(update_sql, update_values)
            print(f"{len(update_values)} records updated.")

        # Commit all the changes
        conn.commit()
        cursor.close()
        print("Database update completed successfully.")

    except Exception as e:
        print(f"An error occurred while updating the database: {e}")

    finally:
        connector.close()

    return len(insert_values), len(update_values)  # Return the counts for inserted and updated records

def update_hsy_buildings_by_posno(request):
    """
    Cloud Function to fetch data from a WFS server and update a Google SQL table.
    """
    # Access data from the request arguments
    request_json = request.get_json(silent=True)
    posno = request_json['posno']

    # Fetch data from WFS server
    data = fetch_wfs_data(posno)

    # Update Google SQL table and get counts
    inserted_count, updated_count = update_google_sql(data, posno)

    if not data:
        return jsonify({"status": "error", "message": "No data returned from WFS"}), 500


    return jsonify({
        "status": "success",
        "features_inserted": inserted_count,
        "features_updated": updated_count
    })
