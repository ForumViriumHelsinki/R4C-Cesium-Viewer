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

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: hsy_tree_spotted; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hsy_tree_spotted (
    id integer,
    geom public.geometry,
    area_m2 double precision,
    tunnus text,
    koodi text
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: spotted_ndvi_range; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spotted_ndvi_range (
    id integer NOT NULL,
    geom public.geometry,
    suurpiiri integer,
    peruspiiri integer,
    osaalue integer,
    avgndvi double precision,
    date date,
    area_m2 double precision
);


--
-- Name: spotted_ndvi_range_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spotted_ndvi_range_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spotted_ndvi_range_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spotted_ndvi_range_id_seq OWNED BY public.spotted_ndvi_range.id;


--
-- Name: spotted_ndvi_range id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotted_ndvi_range ALTER COLUMN id SET DEFAULT nextval('public.spotted_ndvi_range_id_seq'::regclass);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: spotted_ndvi_range spotted_ndvi_range_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotted_ndvi_range
    ADD CONSTRAINT spotted_ndvi_range_pkey PRIMARY KEY (id);


--
-- Name: idx_spotted_ndvi_range_suurpiiri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spotted_ndvi_range_suurpiiri ON public.spotted_ndvi_range USING btree (suurpiiri);


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--
