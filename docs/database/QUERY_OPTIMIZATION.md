SELECT
COUNT(\*) AS count_1
FROM (
SELECT
public.tree_f.kohde_id AS public_tree_f_kohde_id,
public.tree_f.kunta AS public_tree_f_kunta,
public.tree_f.koodi AS public_tree_f_koodi,
public.tree_f.kuvaus AS public_tree_f_kuvaus,
public.tree_f.p_ala_m2 AS public_tree_f_p_ala_m2,
public.tree_f.postinumero AS public_tree_f_postinumero,
public.tree_f.geom AS public_tree_f_geom,
public.tree_f.id AS public_tree_f_id,
public.tree_f.korkeus_ka_m AS public_tree_f_korkeus_ka_m
FROM
public.tree_f
WHERE
public.tree_f.postinumero = $1
AND public.tree_f.koodi = $2) AS anon_1

SELECT
ST_AsEWKB(public.r4c_postalcode.geom) AS public_r4c_postalcode_geom,
public.r4c_postalcode.postinumero AS public_r4c_postalcode_postinumero,
public.r4c_postalcode.avgheatexposure AS public_r4c_postalcode_avgheatexposure,
public.r4c_postalcode.avgcoldexposure AS public_r4c_postalcode_avgcoldexposure,
public.r4c_postalcode.hki_avgheatexposure AS public_r4c_postalcode_hki_avgheatexposure
FROM
public.r4c_postalcode
WHERE
$1
ORDER BY
public.r4c_postalcode.postinumero ASC
LIMIT
$2
OFFSET
$3

SELECT
COUNT(\*) AS count_1
FROM (
SELECT
public.r4c_postalcode.geom AS public_r4c_postalcode_geom,
public.r4c_postalcode.postinumero AS public_r4c_postalcode_postinumero,
public.r4c_postalcode.avgheatexposure AS public_r4c_postalcode_avgheatexposure,
public.r4c_postalcode.avgcoldexposure AS public_r4c_postalcode_avgcoldexposure,
public.r4c_postalcode.hki_avgheatexposure AS public_r4c_postalcode_hki_avgheatexposure
FROM
public.r4c_postalcode
WHERE
$1) AS anon_1

SELECT
public.tree_f.kohde_id AS public_tree_f_kohde_id,
public.tree_f.kunta AS public_tree_f_kunta,
public.tree_f.koodi AS public_tree_f_koodi,
public.tree_f.kuvaus AS public_tree_f_kuvaus,
public.tree_f.p_ala_m2 AS public_tree_f_p_ala_m2,
public.tree_f.postinumero AS public_tree_f_postinumero,
ST_AsEWKB(public.tree_f.geom) AS public_tree_f_geom,
public.tree_f.id AS public_tree_f_id,
public.tree_f.korkeus_ka_m AS public_tree_f_korkeus_ka_m
FROM
public.tree_f
WHERE
public.tree_f.postinumero = $1
AND public.tree_f.koodi = $2
ORDER BY
public.tree_f.id ASC
LIMIT
$3
OFFSET
$4
