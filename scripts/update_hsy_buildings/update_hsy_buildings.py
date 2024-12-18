import os
import json
import urllib.request
import urllib.parse
import ssl

from google.cloud import sql_v1beta4

def fetch_wfs_data():
    """
    Fetches data from the WFS server.
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
        data = json.loads(response.read())
        return data
    except Exception as e:
        print(f"An error occurred: {e}")
        return None  # Return None in case of an error

def update_google_sql(data):
    """
    Updates the Google SQL table with the fetched WFS data.
    """

    # Google SQL connection details
    instance_name = os.environ.get("INSTANCE_NAME")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    
    db_config = {
        "user": db_user,
        "password": db_password,
        "database": db_name,
    }
    pool = sql_v1beta4.ConnectionPool(instance_connection_name=instance_name, db_config=db_config)

    with pool.connect() as conn:
        with conn.cursor() as cursor:
            for feature in data['features']:
                # Extract relevant data from the feature
                kunta = feature['properties']['kunta']
                osno1 = feature['properties']['osno1']
                korala = feature['properties']['korala']
                lammitysaine_s = feature['properties']['lammitysaine_s']
                area_m2 = feature['properties']['area_m2']
                raktun = feature['properties']['raktun']
                oski1 = feature['properties']['oski1']
                kohala = feature['properties']['kohala']
                avgheatexposuretobuilding = feature['properties']['avgheatexposuretobuilding']
                osno2 = feature['properties']['osno2']
                ashala = feature['properties']['ashala']
                viemari = feature['properties']['viemari']
                oski2 = feature['properties']['oski2']
                asuntojen_lkm = feature['properties']['asuntojen_lkm']
                vesijohto = feature['properties']['vesijohto']
                hki_id = feature['properties']['hki_id']
                postinumero = feature['properties']['postinumero']
                kerrosten_lkm = feature['properties']['kerrosten_lkm']
                olotila_s = feature['properties']['olotila_s']
                avg_temp_c = feature['properties']['avg_temp_c']
                kavu = feature['properties']['kavu']
                rakennusaine_s = feature['properties']['rakennusaine_s']
                kiitun = feature['properties']['kiitun']
                kayttarks = feature['properties']['kayttarks']
                julkisivu_s = feature['properties']['julkisivu_s']
                poimintapvm = feature['properties']['poimintapvm']
                katu = feature['properties']['katu']
                kerala = feature['properties']['kerala']
                lammitystapa_s = feature['properties']['lammitystapa_s']
                kokotun = feature['properties']['kokotun']
                vtj_prt = feature['properties']['vtj_prt']
                geom = json.dumps(feature['geometry'])  # Convert geometry to GeoJSON string

                cursor.execute("SELECT * FROM r4c_hsy_building WHERE vtj_prt = %s", (vtj_prt,))
                existing_record = cursor.fetchone()

                if existing_record:
                    # Compare values and check for 'vtj_prt'
                    values_changed = any(
                        existing_record[i] != val for i, val in enumerate((kunta, osno1, korala, lammitysaine_s, area_m2, oski1, kohala, osno2, ashala, viemari, oski2, asuntojen_lkm, vesijohto, hki_id, postinumero, kerrosten_lkm, olotila_s, avg_temp_c, kavu, rakennusaine_s, kiitun, kayttarks, julkisivu_s, poimintapvm, katu, kerala, lammitystapa_s, kokotun, vtj_prt, geom))
                    )
                    vtj_prt_missing = existing_record[29] is None  # 29 is the index of 'vtj_prt' in the fetched row

                    if values_changed or vtj_prt_missing:
                        # Construct SQL UPDATE statement (only if changes found)
                        sql = """
                            UPDATE r4c_hsy_building
                            SET kunta = %s, osno1 = %s, korala = %s, lammitysaine_s = %s, area_m2 = %s, oski1 = %s, kohala = %s, osno2 = %s, ashala = %s, viemari = %s, oski2 = %s, asuntojen_lkm = %s, vesijohto = %s, hki_id = %s, postinumero = %s, kerrosten_lkm = %s, olotila_s = %s, avg_temp_c = %s, kavu = %s, rakennusaine_s = %s, kiitun = %s, kayttarks = %s, julkisivu_s = %s, poimintapvm = %s, katu = %s, kerala = %s, lammitystapa_s = %s, kokotun = %s, vtj_prt = %s, geom = ST_GeomFromGeoJSON(%s)
                            WHERE raktun = %s;
                        """
                        cursor.execute(sql, (kunta, osno1, korala, lammitysaine_s, area_m2, oski1, kohala, osno2, ashala, viemari, oski2, asuntojen_lkm, vesijohto, hki_id, postinumero, kerrosten_lkm, olotila_s, avg_temp_c, kavu, rakennusaine_s, kiitun, kayttarks, julkisivu_s, poimintapvm, katu, kerala, lammitystapa_s, kokotun, vtj_prt, geom, raktun))
                else:
                    # Construct SQL INSERT statement (only if record doesn't exist)
                    sql = """
                        INSERT INTO r4c_hsy_building (kunta, osno1, korala, lammitysaine_s, area_m2, raktun, oski1, kohala, osno2, ashala, viemari, oski2, asuntojen_lkm, vesijohto, hki_id, postinumero, kerrosten_lkm, olotila_s, avg_temp_c, kavu, rakennusaine_s, kiitun, kayttarks, julkisivu_s, poimintapvm, katu, kerala, lammitystapa_s, kokotun, vtj_prt, geom)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromGeoJSON(%s));
                    """
                    cursor.execute(sql, (kunta, osno1, korala, lammitysaine_s, area_m2, raktun, oski1, kohala, osno2, ashala, viemari, oski2, asuntojen_lkm, vesijohto, hki_id, postinumero, kerrosten_lkm, olotila_s, avg_temp_c, kavu, rakennusaine_s, kiitun, kayttarks, julkisivu_s, poimintapvm, katu, kerala, lammitystapa_s, kokotun, vtj_prt, geom))

def fetch_and_update_data(request):
    """
    Cloud Function to fetch data from a WFS server and update a Google SQL table.
    """

    # Fetch data from WFS server
    data = fetch_wfs_data()

    # Update Google SQL table
    update_google_sql(data)

    return "Data fetched and updated successfully!"