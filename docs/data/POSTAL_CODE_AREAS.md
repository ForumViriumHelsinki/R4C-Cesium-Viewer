# Postal Code Areas (`hsy_po.json`)

`public/assets/data/hsy_po.json` holds the 172 Capital Region postal code
areas. The viewer loads it at start-up as the `PostCodes` data source
(`addPostalCodes` in `src/composables/useViewerInitialization.js`, and again in
`ViewModeCompact.vue`), and `postalCodeIndex` looks areas up by `posno`.

## Source

The polygons are HSY's postal code areas, **2023 edition**:

|                             |                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Dataset                     | [Pääkaupunkiseudun postinumeroalueet](https://hri.fi/data/en_GB/dataset/paakaupunkiseudun-postinumeroalueet) (Helsinki Region Infoshare) |
| Publisher                   | Helsingin seudun ympäristöpalvelut (HSY)                                                                                                 |
| Licence                     | Creative Commons Attribution 4.0                                                                                                         |
| WFS layer                   | `taustakartat_ja_aluejaot:PKS_postinumeroalueet_2023_shp` on `https://kartta.hsy.fi/geoserver/wfs`                                       |
| Fields kept from the source | `posno`, `nimi`, `nimi_ru`, `toimip`, `toimip_ru`, `kunta`, `kunta_nro`                                                                  |

The repo does not record how the file was produced. The edition was identified
on 2026-11-26 by comparing the file as first committed (`eca1a6f`, 2024-02-06)
with the WFS layers fetched in EPSG:4326:

- The 2022 and 2023 layers have the same 172 postal codes and the same field
  names. The 2024 layer renames the fields (`posnro`, `nimiru`, `postitoimi`,
  `postitoiru`).
- Every vertex of the committed file lies within 2.9–3.5 mm of a 2023 vertex of
  the same postal code (median 2.93 mm, 30,338 vertices). Against 2022, 16 of
  the 172 areas have vertices with no counterpart.
- The vertex order differs from the WFS output, and the offset is nearly
  uniform. The file was most likely reprojected from the source CRS with a
  different tool than GeoServer. The offset is far below anything visible on
  the map.

## Properties Added in This Repo

None of these come from HSY. Each was added to the file by a script or Cloud
Function:

| Properties                                | Added by                                                                                                       | Read by                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `center_x`, `center_y`                    | `scripts/update_hsy_po.py` (mean of building coordinates per postal code, from the `hsy_buildings` collection) | `src/services/camera.js`                                      |
| `<class>_m2_<year>`, land cover 2016–2024 | `scripts/hsylandcover/hsylandcover.py`                                                                         | `PieChart.vue` (keys built at runtime), `AreaProperties.vue`  |
| `ndvi_<date>`, 2017–2025                  | Cloud Function `calculate_average_ndvi` (`scripts/ndvi/`)                                                      | `NDVIChart.vue` (keys built at runtime), `AreaProperties.vue` |

## Other Copies

The same file exists outside this path, and nothing keeps the copies in sync:

- GCS bucket `regions4climate`: `NDVI/vector_data/hsy_po.json` is the input of
  the tree-canopy and NDVI Cloud Functions (`scripts/hsytrees/`,
  `scripts/ndvi/`). The Landsat normalisation function reads `hsy_po.json` from
  the same bucket (`scripts/normalise_landsat_b10/`).
- The pygeoapi collection `capitalregion_postalcode` reads
  `tests/data/hsy_po.json` inside the pygeoapi container
  (`k8s/pygeoapi-deployment.yaml`, `db/PYGEOAPI_ALIGNMENT.md`). That path is not
  in this repo.

When a Cloud Function adds a new year, its output is written from the bucket
copy. Check it against `public/assets/data/hsy_po.json` before committing it.

## Moving to a Newer Edition

A newer HSY edition needs the 2024 field names mapped back to the ones above,
and the repo-added properties recomputed for every area whose boundary changed.
