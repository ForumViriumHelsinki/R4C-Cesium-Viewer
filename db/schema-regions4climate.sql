SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: google_vacuum_mgmt; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA google_vacuum_mgmt;


--
-- Name: google_vacuum_mgmt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS google_vacuum_mgmt WITH SCHEMA google_vacuum_mgmt;


--
-- Name: EXTENSION google_vacuum_mgmt; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION google_vacuum_mgmt IS 'extension for assistive operational tooling';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_DATE;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adaptation_landcover; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptation_landcover (
    id integer NOT NULL,
    grid_id character varying(50),
    area_m2 double precision,
    year integer,
    koodi character varying(50),
    geom public.geometry(Geometry,4326)
);


--
-- Name: adaptation_landcover_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptation_landcover_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptation_landcover_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptation_landcover_id_seq OWNED BY public.adaptation_landcover.id;


--
-- Name: building_tree; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_tree (
    tree_id text,
    building_id bigint,
    geom_tree jsonb,
    kuvaus text,
    postinumero text,
    geom_building jsonb
);


--
-- Name: building_tree_for_bearing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_tree_for_bearing (
    distance double precision,
    building_id integer,
    id integer,
    geom_tree public.geometry,
    geom_building public.geometry,
    tree_id text,
    kuvaus text,
    postinumero text
);


--
-- Name: building_tree_undone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_tree_undone (
    building_id bigint,
    geom_tree jsonb,
    geom_building jsonb,
    tree_id text,
    kuvaus text,
    postinumero text
);


--
-- Name: flood; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flood (
    material text,
    water text,
    geometry text,
    postinumero text,
    id integer NOT NULL
);


--
-- Name: flood_f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flood_f (
    id integer,
    geom public.geometry,
    water text,
    material text,
    postinumero text
);


--
-- Name: flood_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flood_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flood_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flood_id_seq OWNED BY public.flood.id;


--
-- Name: heat_vulnerable_demographic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.heat_vulnerable_demographic (
    id bigint NOT NULL,
    postinumero text,
    vulnerable_pop integer,
    total_pop integer,
    fraction double precision,
    pop_density double precision,
    geometry jsonb,
    hr_ktu integer,
    income_rank integer,
    educ double precision,
    educ_rank integer,
    avg_apart_size double precision,
    apart_size_rank integer,
    vulnerable_both double precision,
    vulnerable_both_rank integer,
    vulnerable_children double precision,
    vulnerable_children_rank integer,
    vulnerable_eldery double precision,
    vulnerable_eldery_rank integer,
    apartment_heat_exposure double precision,
    apartment_heat_exposure_rank integer,
    average_vul double precision,
    average_vul_rank integer,
    rental_rate double precision,
    rental_rate_rank integer,
    vegetation double precision,
    vegetation_rank integer,
    income double precision
);


--
-- Name: heat_vulnerable_demographic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.heat_vulnerable_demographic_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: heat_vulnerable_demographic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.heat_vulnerable_demographic_id_seq OWNED BY public.heat_vulnerable_demographic.id;


--
-- Name: hki_roof_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hki_roof_colors (
    r_median double precision,
    g_median double precision,
    b_median double precision,
    r_mode double precision,
    g_mode double precision,
    b_mode double precision,
    id bigint,
    kuntarekisteri_id bigint,
    kg_krakenn bigint,
    ratu bigint,
    vtj_prt text,
    tyyppi text,
    tyyppi_koodi bigint,
    tila text,
    tila_koodi bigint,
    ratu_vastaavuus text,
    ratu_vastaavuus_koodi bigint,
    ratu_laatu text,
    ratu_laatu_koodi bigint,
    i_raktilav bigint,
    i_pyraknro bigint,
    i_nkoord bigint,
    i_ekoord bigint,
    i_kokala bigint,
    i_kerrosala bigint,
    i_kerrlkm bigint,
    c_vtj_prt text,
    c_valmpvm text,
    c_sahkolii text,
    c_rakeaine text,
    c_lammtapa text,
    c_kiinteistotunnus text,
    c_kayttark text,
    c_julkisivu text,
    katunimi_suomi text,
    katunimi_ruotsi text,
    osoitenumero text,
    postinumero text,
    muokkauspvm text,
    luontipvm text,
    datanomistaja text,
    paivitetty_tietopalveluun text,
    tietopalvelu_id bigint,
    c_viemlii text,
    c_vesilii text,
    c_poltaine text,
    i_huoneistojen_lkm bigint,
    d_ashuoala double precision,
    i_kellarala bigint,
    c_hissi text,
    location text,
    url text
);


--
-- Name: hki_roof_colors_f; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.hki_roof_colors_f AS
 SELECT id AS hki_id,
    r_median,
    g_median,
    b_median,
    r_mode,
    g_mode,
    b_mode,
    kuntarekisteri_id,
    kg_krakenn,
    tyyppi_koodi,
    tila_koodi,
    ratu_vastaavuus_koodi,
    ratu_laatu_koodi,
    i_raktilav,
    i_pyraknro,
    i_nkoord,
    i_ekoord,
    i_kokala,
    i_kerrosala,
    i_kerrlkm,
    i_kellarala,
    i_huoneistojen_lkm,
    d_ashuoala,
    tietopalvelu_id,
    osoitenumero,
    postinumero,
    muokkauspvm,
    luontipvm,
    datanomistaja,
    c_vtj_prt,
    c_viemlii,
    c_vesilii,
    c_valmpvm,
    c_sahkolii,
    vtj_prt,
    tyyppi,
    c_rakeaine,
    tila,
    c_poltaine,
    ratu_vastaavuus,
    c_lammtapa,
    ratu_laatu,
    c_kiinteistotunnus,
    c_kayttark,
    c_julkisivu,
    c_hissi,
    katunimi_suomi,
    katunimi_ruotsi,
    public.st_geomfromgeojson(location) AS geom
   FROM public.hki_roof_colors f;


--
-- Name: hki_travel_time_r4c_f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hki_travel_time_r4c_f (
    from_id integer,
    travel_data jsonb,
    geom public.geometry,
    id integer NOT NULL
);


--
-- Name: hki_travel_time_r4c_f_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hki_travel_time_r4c_f_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hki_travel_time_r4c_f_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hki_travel_time_r4c_f_id_seq OWNED BY public.hki_travel_time_r4c_f.id;


--
-- Name: hki_urbanheat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hki_urbanheat (
    postinumero text,
    hki_avgheatexposure double precision
);


--
-- Name: hsy_building_heat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hsy_building_heat (
    id bigint NOT NULL,
    avgheatexposure double precision,
    date date,
    vtj_prt text,
    avg_temp_c double precision,
    posno text
);


--
-- Name: hsy_building_heat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hsy_building_heat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hsy_building_heat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hsy_building_heat_id_seq OWNED BY public.hsy_building_heat.id;


--
-- Name: hsy_building_spotted_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hsy_building_spotted_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kafka_finest_station; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kafka_finest_station (
    id bigint NOT NULL,
    name text,
    description text,
    location jsonb,
    properties jsonb
);


--
-- Name: kafka_finest_station_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kafka_finest_station_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kafka_finest_station_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kafka_finest_station_id_seq OWNED BY public.kafka_finest_station.id;


--
-- Name: keharist_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keharist_catalogue (
    loc text,
    url text,
    type text,
    point text,
    direction text,
    dir_text text,
    date text,
    id text,
    "time" text,
    ha text,
    pa text,
    ka text,
    ra text,
    la text,
    mp text,
    rv text,
    autot text,
    m_ajon text,
    yht text,
    hay text,
    pvm text,
    street18 text,
    street182 text,
    tx text,
    pp text,
    ajon text,
    huom text,
    val text,
    majon text,
    raskas text,
    aux_direction text,
    year text,
    geom public.geometry(Geometry,4326)
);


--
-- Name: keharist_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keharist_data (
    loc text,
    url text,
    type text,
    point text,
    direction text,
    dir_text text,
    date text,
    id text,
    "time" text,
    ha text,
    pa text,
    ka text,
    ra text,
    la text,
    mp text,
    rv text,
    autot text,
    m_ajon text,
    yht text,
    hay text,
    pvm text,
    street18 text,
    street182 text,
    tx text,
    pp text,
    ajon text,
    huom text,
    val text,
    majon text,
    raskas text,
    aux_direction text,
    year text,
    geom public.geometry(Geometry,4326)
);


--
-- Name: nature_area; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nature_area (
    gml_id text,
    kunta text,
    tunnus text,
    osaalue_tunnus text,
    osaalue_nimi_fi text,
    osaalue_nimi_se text,
    peruspiiri_tunnus text,
    peruspiiri_nimi_fi text,
    peruspiiri_nimi_se text,
    suurpiiri_tunnus text,
    suurpiiri_nimi_fi text,
    suurpiiri_nimi_se text,
    yhtluontipvm text,
    yhtmuokkauspvm text,
    yhtdatanomistaja text,
    paivitetty_tietopalveluun text,
    postinumero text,
    kohde_id text,
    paaluokka text,
    alaluokka text,
    ryhma text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    location jsonb,
    id integer NOT NULL
);


--
-- Name: nature_area_f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nature_area_f (
    gml_id text,
    kohde_id text,
    kunta text,
    paaluokka text,
    alaluokka text,
    ryhma text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    postinumero text,
    geom public.geometry,
    id integer
);


--
-- Name: nature_area_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nature_area_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nature_area_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nature_area_id_seq OWNED BY public.nature_area.id;


--
-- Name: other_nature_r4c; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.other_nature_r4c (
    gml_id text,
    kohde_id text,
    kunta text,
    paaluokka text,
    alaluokka text,
    ryhma text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    postinumero text,
    location text,
    id integer NOT NULL,
    geom public.geometry(Geometry,4326)
);


--
-- Name: other_nature_r4c_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.other_nature_r4c_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: other_nature_r4c_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.other_nature_r4c_id_seq OWNED BY public.other_nature_r4c.id;


--
-- Name: r4c_coldspot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_coldspot (
    id integer NOT NULL,
    posno text,
    heatexposure double precision,
    geom public.geometry(Geometry,4326),
    temp_c double precision,
    date date
);


--
-- Name: r4c_coldspot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.r4c_coldspot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: r4c_coldspot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.r4c_coldspot_id_seq OWNED BY public.r4c_coldspot.id;


--
-- Name: r4c_heat_timeseries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_heat_timeseries (
    avgheatexposure double precision,
    date text,
    vtj_prt text,
    avg_temp_c double precision
);


--
-- Name: r4c_hsy_building_current; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_hsy_building_current (
    kunta text,
    vtj_prt text NOT NULL,
    raktun text,
    kiitun text,
    katu text,
    osno1 double precision,
    oski1 text,
    osno2 double precision,
    oski2 text,
    posno text,
    kavu double precision,
    kayttarks text,
    kerala double precision,
    korala double precision,
    kohala double precision,
    ashala double precision,
    asuntojen_lkm double precision,
    kerrosten_lkm double precision,
    rakennusaine_s text,
    julkisivu_s text,
    lammitystapa_s text,
    lammitysaine_s text,
    viemari double precision,
    vesijohto double precision,
    olotila_s text,
    poimintapvm text,
    kokotun text,
    area_m2 double precision,
    geom public.geometry(Geometry,4326),
    created_at date DEFAULT CURRENT_DATE,
    updated_at date DEFAULT CURRENT_DATE
);


--
-- Name: r4c_hsy_building; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.r4c_hsy_building AS
 SELECT b.kunta,
    b.vtj_prt,
    b.raktun,
    b.kiitun,
    b.katu,
    b.osno1,
    b.oski1,
    b.osno2,
    b.oski2,
    b.posno AS postinumero,
    b.kavu,
    b.kayttarks,
    b.kerala,
    b.korala,
    b.kohala,
    b.ashala,
    b.asuntojen_lkm,
    b.kerrosten_lkm,
    b.rakennusaine_s,
    b.julkisivu_s,
    b.lammitystapa_s,
    b.lammitysaine_s,
    b.viemari,
    b.vesijohto,
    b.olotila_s,
    b.poimintapvm,
    b.kokotun,
    b.area_m2,
    b.geom,
    b.created_at,
    b.updated_at,
    COALESCE(json_agg(json_build_object('date', h.date, 'avgheatexposure', h.avgheatexposure, 'avg_temp_c', h.avg_temp_c) ORDER BY h.date), '[]'::json) AS heat_timeseries
   FROM (public.r4c_hsy_building_current b
     LEFT JOIN public.hsy_building_heat h ON ((b.vtj_prt = h.vtj_prt)))
  GROUP BY b.kunta, b.vtj_prt, b.raktun, b.kiitun, b.katu, b.osno1, b.oski1, b.osno2, b.oski2, b.posno, b.kavu, b.kayttarks, b.kerala, b.korala, b.kohala, b.ashala, b.asuntojen_lkm, b.kerrosten_lkm, b.rakennusaine_s, b.julkisivu_s, b.lammitystapa_s, b.lammitysaine_s, b.viemari, b.vesijohto, b.olotila_s, b.poimintapvm, b.kokotun, b.area_m2, b.geom, b.created_at, b.updated_at;


--
-- Name: r4c_hsy_building_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_hsy_building_backup (
    vtj_prt text,
    heatexposure230623v1 double precision,
    tempincelsius230623v1 double precision,
    heatexposure230623v2 double precision,
    tempincelsius230623v2 double precision
);


--
-- Name: r4c_hsy_building_copy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_hsy_building_copy (
    kunta text,
    vtj_prt text,
    raktun text,
    kiitun text,
    katu text,
    osno1 double precision,
    oski1 text,
    osno2 double precision,
    oski2 text,
    postinumero text,
    kavu double precision,
    kayttarks text,
    kerala double precision,
    korala double precision,
    kohala double precision,
    ashala double precision,
    asuntojen_lkm double precision,
    kerrosten_lkm double precision,
    rakennusaine_s text,
    julkisivu_s text,
    lammitystapa_s text,
    lammitysaine_s text,
    viemari double precision,
    vesijohto double precision,
    olotila_s text,
    poimintapvm text,
    kokotun text,
    area_m2 double precision,
    avgheatexposuretobuilding double precision,
    geom public.geometry(Geometry,4326),
    hki_id integer,
    avg_temp_c double precision,
    heat_timeseries jsonb,
    created_at date,
    updated_at date
);


--
-- Name: r4c_hsy_building_mat; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.r4c_hsy_building_mat AS
 SELECT b.kunta,
    b.vtj_prt,
    b.raktun,
    b.kiitun,
    b.katu,
    b.osno1,
    b.oski1,
    b.osno2,
    b.oski2,
    b.posno AS postinumero,
    b.kavu,
    b.kayttarks,
    b.kerala,
    b.korala,
    b.kohala,
    b.ashala,
    b.asuntojen_lkm,
    b.kerrosten_lkm,
    b.rakennusaine_s,
    b.julkisivu_s,
    b.lammitystapa_s,
    b.lammitysaine_s,
    b.viemari,
    b.vesijohto,
    b.olotila_s,
    b.poimintapvm,
    b.kokotun,
    b.area_m2,
    b.geom,
    b.created_at,
    b.updated_at,
    COALESCE(json_agg(json_build_object('date', h.date, 'avgheatexposure', h.avgheatexposure, 'avg_temp_c', h.avg_temp_c) ORDER BY h.date), '[]'::json) AS heat_timeseries
   FROM (public.r4c_hsy_building_current b
     LEFT JOIN public.hsy_building_heat h ON ((b.vtj_prt = h.vtj_prt)))
  GROUP BY b.kunta, b.vtj_prt, b.raktun, b.kiitun, b.katu, b.osno1, b.oski1, b.osno2, b.oski2, b.posno, b.kavu, b.kayttarks, b.kerala, b.korala, b.kohala, b.ashala, b.asuntojen_lkm, b.kerrosten_lkm, b.rakennusaine_s, b.julkisivu_s, b.lammitystapa_s, b.lammitysaine_s, b.viemari, b.vesijohto, b.olotila_s, b.poimintapvm, b.kokotun, b.area_m2, b.geom, b.created_at, b.updated_at
  WITH NO DATA;


--
-- Name: r4c_paavo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_paavo (
    id integer NOT NULL,
    pinta_ala integer,
    he_vakiy integer,
    he_0_2 integer,
    he_3_6 integer,
    he_7_12 integer,
    he_65_69 integer,
    he_70_74 integer,
    he_75_79 integer,
    he_80_84 integer,
    he_85_ integer,
    ko_koul integer,
    ra_as_kpa integer,
    hr_ktu integer,
    ko_ika18y integer,
    ko_al_kork integer,
    vuosi integer,
    postinumeroalue text,
    kunta text,
    nimi text,
    geom public.geometry
);


--
-- Name: r4c_paavo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.r4c_paavo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: r4c_paavo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.r4c_paavo_id_seq OWNED BY public.r4c_paavo.id;


--
-- Name: r4c_postalcode; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.r4c_postalcode AS
 WITH avg_heat AS (
         SELECT avg(
                CASE
                    WHEN (hsy_building_heat.date = '2021-02-18'::date) THEN NULL::double precision
                    ELSE hsy_building_heat.avgheatexposure
                END) AS overall_avgheatexposure
           FROM public.hsy_building_heat
        )
 SELECT p.geom,
    h.posno AS postinumero,
    avg(
        CASE
            WHEN (h.date = '2021-02-18'::date) THEN NULL::double precision
            ELSE h.avgheatexposure
        END) AS avgheatexposure,
    avg(
        CASE
            WHEN (h.date = '2021-02-18'::date) THEN h.avgheatexposure
            ELSE NULL::double precision
        END) AS avgcoldexposure,
    hki.hki_avgheatexposure
   FROM ((public.hsy_building_heat h
     JOIN public.r4c_paavo p ON ((h.posno = p.postinumeroalue)))
     LEFT JOIN public.hki_urbanheat hki ON ((h.posno = hki.postinumero)))
  GROUP BY h.posno, p.geom, hki.hki_avgheatexposure
UNION ALL
 SELECT public.st_geomfromtext('POLYGON((24.499172 60.059348, 25.254980 60.059348, 25.254980 60.401400, 24.499172 60.401400, 24.499172 60.059348))'::text, 4326) AS geom,
    '99999'::text AS postinumero,
    avg_heat.overall_avgheatexposure AS avgheatexposure,
    NULL::double precision AS avgcoldexposure,
    NULL::double precision AS hki_avgheatexposure
   FROM avg_heat;


--
-- Name: r4c_postalcode_mat; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.r4c_postalcode_mat AS
 WITH avg_heat AS (
         SELECT avg(
                CASE
                    WHEN (hsy_building_heat.date = '2021-02-18'::date) THEN NULL::double precision
                    ELSE hsy_building_heat.avgheatexposure
                END) AS overall_avgheatexposure
           FROM public.hsy_building_heat
        )
 SELECT p.geom,
    h.posno AS postinumero,
    avg(
        CASE
            WHEN (h.date = '2021-02-18'::date) THEN NULL::double precision
            ELSE h.avgheatexposure
        END) AS avgheatexposure,
    avg(
        CASE
            WHEN (h.date = '2021-02-18'::date) THEN h.avgheatexposure
            ELSE NULL::double precision
        END) AS avgcoldexposure,
    hki.hki_avgheatexposure
   FROM ((public.hsy_building_heat h
     JOIN public.r4c_paavo p ON ((h.posno = p.postinumeroalue)))
     LEFT JOIN public.hki_urbanheat hki ON ((h.posno = hki.postinumero)))
  GROUP BY h.posno, p.geom, hki.hki_avgheatexposure
UNION ALL
 SELECT public.st_geomfromtext('POLYGON((24.499172 60.059348, 25.254980 60.059348, 25.254980 60.401400, 24.499172
  60.401400, 24.499172 60.059348))'::text, 4326) AS geom,
    '99999'::text AS postinumero,
    avg_heat.overall_avgheatexposure AS avgheatexposure,
    NULL::double precision AS avgcoldexposure,
    NULL::double precision AS hki_avgheatexposure
   FROM avg_heat
  WITH NO DATA;


--
-- Name: r4c_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r4c_users (
    id integer NOT NULL,
    email text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: r4c_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.r4c_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: r4c_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.r4c_users_id_seq OWNED BY public.r4c_users.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: tree_building_distance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tree_building_distance (
    id integer NOT NULL,
    tree_id text,
    building_id integer,
    distance double precision,
    kuvaus text,
    postinumero text,
    geom public.geometry,
    bearing integer
);


--
-- Name: tree_building_distance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tree_building_distance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tree_building_distance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tree_building_distance_id_seq OWNED BY public.tree_building_distance.id;


--
-- Name: tree_distance_building; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tree_distance_building (
    id integer NOT NULL,
    tree_id text,
    building_id integer,
    distance double precision,
    kuvaus text,
    postinumero text,
    geom_tree jsonb
);


--
-- Name: tree_distance_building_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tree_distance_building_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tree_distance_building_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tree_distance_building_id_seq OWNED BY public.tree_distance_building.id;


--
-- Name: tree_f_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tree_f_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tree_f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tree_f (
    kohde_id text,
    kunta text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    postinumero text,
    geom public.geometry,
    id integer DEFAULT nextval('public.tree_f_id_seq'::regclass),
    korkeus_ka_m numeric
);


--
-- Name: tree_f_test; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tree_f_test (
    kohde_id text,
    kunta text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    postinumero text,
    geom public.geometry,
    id integer,
    korkeus_ka_m numeric
);


--
-- Name: urban_heat_building; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.urban_heat_building (
    ratu integer,
    geometry jsonb,
    c_kayttark text,
    katunimi_suomi text,
    katunimi_ruotsi text,
    osoitenumero text,
    postinumero text,
    avgheatexposuretobuilding double precision,
    hki_id bigint,
    locationunder40 text,
    distancetounder40 integer,
    id integer NOT NULL,
    measured_height double precision,
    year_of_construction text,
    roof_type text,
    roof_median_color text,
    roof_mode_color text,
    area_m2 double precision,
    green_roof text
);


--
-- Name: urban_heat_building_f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.urban_heat_building_f (
    id integer,
    ratu integer,
    geom public.geometry,
    distancetounder40 integer,
    locationunder40 text,
    c_kayttark text,
    katunimi_suomi text,
    katunimi_ruotsi text,
    osoitenumero text,
    postinumero text,
    year_of_construction text,
    measured_height double precision,
    roof_type text,
    avgheatexposuretobuilding double precision,
    hki_id bigint,
    roof_median_color text,
    roof_mode_color text,
    area_m2 double precision
);


--
-- Name: urban_heat_building_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.urban_heat_building_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: urban_heat_building_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.urban_heat_building_id_seq OWNED BY public.urban_heat_building.id;


--
-- Name: urbanheattest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.urbanheattest (
    ratu integer,
    geometry jsonb,
    c_kayttark text,
    katunimi_suomi text,
    katunimi_ruotsi text,
    osoitenumero text,
    postinumero text,
    avgheatexposuretobuilding double precision,
    hki_id bigint,
    locationunder40 text,
    distancetounder40 integer,
    id integer
);


--
-- Name: vegetation_r4c; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vegetation_r4c (
    gml_id text,
    kohde_id text,
    kunta text,
    paaluokka text,
    alaluokka text,
    ryhma text,
    koodi text,
    kuvaus text,
    p_ala_m2 double precision,
    postinumero text,
    location text,
    id integer NOT NULL
);


--
-- Name: vegetation_r4c_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vegetation_r4c_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vegetation_r4c_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vegetation_r4c_id_seq OWNED BY public.vegetation_r4c.id;


--
-- Name: adaptation_landcover id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptation_landcover ALTER COLUMN id SET DEFAULT nextval('public.adaptation_landcover_id_seq'::regclass);


--
-- Name: flood id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flood ALTER COLUMN id SET DEFAULT nextval('public.flood_id_seq'::regclass);


--
-- Name: heat_vulnerable_demographic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heat_vulnerable_demographic ALTER COLUMN id SET DEFAULT nextval('public.heat_vulnerable_demographic_id_seq'::regclass);


--
-- Name: hki_travel_time_r4c_f id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hki_travel_time_r4c_f ALTER COLUMN id SET DEFAULT nextval('public.hki_travel_time_r4c_f_id_seq'::regclass);


--
-- Name: hsy_building_heat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hsy_building_heat ALTER COLUMN id SET DEFAULT nextval('public.hsy_building_heat_id_seq'::regclass);


--
-- Name: kafka_finest_station id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kafka_finest_station ALTER COLUMN id SET DEFAULT nextval('public.kafka_finest_station_id_seq'::regclass);


--
-- Name: nature_area id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nature_area ALTER COLUMN id SET DEFAULT nextval('public.nature_area_id_seq'::regclass);


--
-- Name: other_nature_r4c id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_nature_r4c ALTER COLUMN id SET DEFAULT nextval('public.other_nature_r4c_id_seq'::regclass);


--
-- Name: r4c_coldspot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_coldspot ALTER COLUMN id SET DEFAULT nextval('public.r4c_coldspot_id_seq'::regclass);


--
-- Name: r4c_paavo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_paavo ALTER COLUMN id SET DEFAULT nextval('public.r4c_paavo_id_seq'::regclass);


--
-- Name: r4c_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_users ALTER COLUMN id SET DEFAULT nextval('public.r4c_users_id_seq'::regclass);


--
-- Name: tree_building_distance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tree_building_distance ALTER COLUMN id SET DEFAULT nextval('public.tree_building_distance_id_seq'::regclass);


--
-- Name: tree_distance_building id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tree_distance_building ALTER COLUMN id SET DEFAULT nextval('public.tree_distance_building_id_seq'::regclass);


--
-- Name: urban_heat_building id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.urban_heat_building ALTER COLUMN id SET DEFAULT nextval('public.urban_heat_building_id_seq'::regclass);


--
-- Name: vegetation_r4c id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vegetation_r4c ALTER COLUMN id SET DEFAULT nextval('public.vegetation_r4c_id_seq'::regclass);


--
-- Name: adaptation_landcover adaptation_landcover_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptation_landcover
    ADD CONSTRAINT adaptation_landcover_pkey PRIMARY KEY (id);


--
-- Name: flood flood_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flood
    ADD CONSTRAINT flood_pkey PRIMARY KEY (id);


--
-- Name: heat_vulnerable_demographic heat_vulnerable_demographic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heat_vulnerable_demographic
    ADD CONSTRAINT heat_vulnerable_demographic_pkey PRIMARY KEY (id);


--
-- Name: hki_travel_time_r4c_f hki_travel_time_r4c_f_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hki_travel_time_r4c_f
    ADD CONSTRAINT hki_travel_time_r4c_f_pkey PRIMARY KEY (id);


--
-- Name: hsy_building_heat hsy_building_heat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hsy_building_heat
    ADD CONSTRAINT hsy_building_heat_pkey PRIMARY KEY (id);


--
-- Name: kafka_finest_station kafka_finest_station_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kafka_finest_station
    ADD CONSTRAINT kafka_finest_station_pkey PRIMARY KEY (id);


--
-- Name: nature_area nature_area_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nature_area
    ADD CONSTRAINT nature_area_pkey PRIMARY KEY (id);


--
-- Name: other_nature_r4c other_nature_r4c_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_nature_r4c
    ADD CONSTRAINT other_nature_r4c_pkey PRIMARY KEY (id);


--
-- Name: r4c_coldspot r4c_coldspot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_coldspot
    ADD CONSTRAINT r4c_coldspot_pkey PRIMARY KEY (id);


--
-- Name: r4c_hsy_building_current r4c_hsy_building_test_vtj_prt_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_hsy_building_current
    ADD CONSTRAINT r4c_hsy_building_test_vtj_prt_key UNIQUE (vtj_prt);


--
-- Name: r4c_paavo r4c_paavo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_paavo
    ADD CONSTRAINT r4c_paavo_pkey PRIMARY KEY (id);


--
-- Name: r4c_users r4c_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r4c_users
    ADD CONSTRAINT r4c_users_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tree_building_distance tree_building_distance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tree_building_distance
    ADD CONSTRAINT tree_building_distance_pkey PRIMARY KEY (id);


--
-- Name: tree_distance_building tree_distance_building_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tree_distance_building
    ADD CONSTRAINT tree_distance_building_pkey PRIMARY KEY (id);


--
-- Name: urban_heat_building urban_heat_building_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.urban_heat_building
    ADD CONSTRAINT urban_heat_building_pkey PRIMARY KEY (id);


--
-- Name: vegetation_r4c vegetation_r4c_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vegetation_r4c
    ADD CONSTRAINT vegetation_r4c_pkey PRIMARY KEY (id);


--
-- Name: idx_adaptation_landcover_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptation_landcover_geom ON public.adaptation_landcover USING gist (geom);


--
-- Name: idx_adaptation_landcover_grid_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptation_landcover_grid_id ON public.adaptation_landcover USING btree (grid_id);


--
-- Name: idx_flood_f_postinumero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flood_f_postinumero ON public.flood_f USING btree (postinumero);


--
-- Name: idx_hki_urbanheat_postinumero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hki_urbanheat_postinumero ON public.hki_urbanheat USING btree (postinumero);


--
-- Name: idx_hsy_building_heat_vtj_prt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hsy_building_heat_vtj_prt ON public.hsy_building_heat USING btree (vtj_prt);


--
-- Name: idx_posno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posno ON public.r4c_coldspot USING btree (posno);


--
-- Name: idx_r4c_hsy_building_mat_geom_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_hsy_building_mat_geom_gist ON public.r4c_hsy_building_mat USING gist (geom);


--
-- Name: idx_r4c_hsy_building_mat_postinumero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_hsy_building_mat_postinumero ON public.r4c_hsy_building_mat USING btree (postinumero);


--
-- Name: idx_r4c_hsy_building_mat_vtj_prt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_hsy_building_mat_vtj_prt ON public.r4c_hsy_building_mat USING btree (vtj_prt);


--
-- Name: idx_r4c_hsy_building_test_posno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_hsy_building_test_posno ON public.r4c_hsy_building_current USING btree (posno);


--
-- Name: idx_r4c_hsy_building_test_vtj_prt_posno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_hsy_building_test_vtj_prt_posno ON public.r4c_hsy_building_current USING btree (vtj_prt, posno);


--
-- Name: idx_r4c_postalcode_mat_geom_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_postalcode_mat_geom_gist ON public.r4c_postalcode_mat USING gist (geom);


--
-- Name: idx_r4c_postalcode_mat_postinumero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_r4c_postalcode_mat_postinumero ON public.r4c_postalcode_mat USING btree (postinumero);


--
-- Name: keharist_catalogue_geom_1657115388778116000; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX keharist_catalogue_geom_1657115388778116000 ON public.keharist_catalogue USING gist (geom);


--
-- Name: keharist_data_geom_1657115103429589000; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX keharist_data_geom_1657115103429589000 ON public.keharist_data USING gist (geom);


--
-- Name: r4c_hsy_building_current trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.r4c_hsy_building_current FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--
