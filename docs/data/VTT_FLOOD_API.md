# VTT Flood Simulation API

What the upstream VTT R4C flood-simulation API serves, as measured on 2026-10-08 (#1055). The client is `src/services/vttFlood.js`; constants live in `src/constants/vttFlood.ts`.

## Request

- The app sends `POST /vtt-api?scenario=<S>&frame=<N>` with the JSON body `{"picture_number": N, "scenario_number": "S"}`.
  - nginx (`nginx/default.conf.template`) and the Vite dev proxy forward it to `/python_api/calc` on `VITE_VTT_API_HOST`.
  - The query string exists only so the nginx cache key can tell frames apart. Upstream reads the body.
- Production `/vtt-api` sits behind the OAuth proxy, so a plain `curl` gets a 302 to Google sign-in.
- Scenarios are `1`, `2` and `3` (`VTT_SCENARIOS`).
- Frames run `0..287` for every scenario (`VTT_FRAME_COUNT = 288`, 2.5 min apart). Frame 288 returns 404 `{"error": "Tiedostoa ei löytynyt", "filename": "mesh2d_out_288.geojson"}`.

## Response

- Each response is a static file:
  - `Content-Type: application/octet-stream`
  - `Content-Disposition: inline; filename=mesh2d_out_<NNN>.geojson`
  - `Last-Modified` 2026-04-02, a different timestamp per file
  - `Cache-Control: no-cache`
- About 6.1 MB uncompressed. The nginx proxy gzips it.
- A GeoJSON FeatureCollection with `type`, `name`, `crs` (CRS84) and `features`. There is no unit or variable metadata, and there is no docs or OpenAPI endpoint (`/python_api/` returns 403).
- 13,077 Polygon cells of about 100 m. The ring is roughly 5 vertices, and both single-ring and nested-ring shapes occur.
- Cell ids and their order are identical in every frame and every scenario.
- Mesh bbox: lon 25.03685–25.06373, lat 60.16116–60.17409 (southern Laajasalo; `VTT_DATA_EXTENT`).

## Cell properties

Units are not confirmed by VTT; see #1059. The UI shows no unit for the first two rows and metres for the depths.

| Property                    | Behaviour in the data                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transpiration`             | Cumulative. It never decreases per cell and grows linearly over the run (scenario 1 maximum: 0.0745 at +05:00, 0.178 at +11:57:30). Exactly zero for material classes 1, 2, 3 and 11. |
| `canopy_air_temperature`    | Constant 5.0 in every cell and frame                                                                                                                                                  |
| `overland_water_depth`      | State variable: it rises early, then drains. Scenario 1 peaks at 1.65 m around frame 12.                                                                                              |
| `upper_storage_water_depth` | Two values per frame (0 and 0.001, later 0.0009 in scenario 1)                                                                                                                        |
| `material`                  | Integer surface class, 1–11                                                                                                                                                           |
| `id`                        | Cell id                                                                                                                                                                               |

Frame 0 is constant in every dimension, so the panel opens on `VTT_DEFAULT_FRAME`.

## Derived artefacts

The colour class breaks in `src/constants/vttFloodClassBreaks.ts` are generated from sampled frames by `bun scripts/vtt-flood/derive-class-breaks.mjs`. Re-run the script if VTT regenerates the simulation; the file's header records the upstream `Last-Modified` range it was built from.
