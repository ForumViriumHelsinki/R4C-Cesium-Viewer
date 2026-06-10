# Grid Index (`r4c_stats_grid_index.json`)

`public/assets/data/r4c_stats_grid_index.json` is the 250 m socio-economic /
climate-vulnerability statistics grid (6,710 `MultiPolygon` features). It is
**lazy-loaded** when the user opens the 250 m SosEco grid view
(`SosEco250mGrid.vue`) and parsed in a Web Worker
(`src/workers/geojsonParser.worker.js`).

## Consumed properties

Grid-file consumers (`SosEco250mGrid.vue`, `useGridStyling.js`, the geojson
worker, `mitigationStore.js`, `LandcoverToParks.vue`,
`CoolingCenterOptimiser.vue`) read:

- **Identity / position**: `grid_id`, `euref_x`, `euref_y`, `kunta`,
  `missing_values`, `final_avg_conditional`
- **Derived indices** (the visualised values): `heat_index`, `flood_index`,
  `sensitivity`, `heat_exposure`, `flood_exposure`, `green`, `vegetation`,
  `trees`, `water`
- **Dynamically-selectable index components** read via
  `entity.properties[selectedIndex]` in `useGridStyling.js` (option lists in
  `PopGridLegend.vue` / `StatisticalGridOptions.vue`): `flood_prepare`,
  `flood_respond`, `flood_recover`, `heat_prepare`, `heat_respond`, `age`,
  `info`, `tenure`, `social_networks`, `overcrowding`

## Slimming (dropped properties)

The served file previously also carried 9 raw landcover-area / total-green
**inputs** that have **zero consumers** in `src/` or `tests/`. They are the raw
material the vulnerability pipeline already folds into the derived indices
above, so they are dead weight on the wire and in the parse:

```
field_m2_2022   sea_m2_2022      total_green
tree2_m2_2022   tree10_m2_2022   tree15_m2_2022   tree20_m2_2022
vegetation_m2_2022   water_m2_2022
```

> ⚠️ These `*_m2_<year>` landcover keys are **NOT** unique to this file. The
> sibling `public/assets/data/hsy_po.json` (postal-code landcover, loaded as
> `propsStore.postalCodeData`) carries `*_m2_2016..2024` keys that **are**
> consumed by `PieChart.vue` (dynamic `` `${key}_${year}` ``) and `ndvi_*` keys
> consumed by `NDVIChart.vue`. **Do not slim `hsy_po.json`.** The drop applies
> only to the grid index, whose own consumers never read these keys.

### How the served file is slimmed

`scripts/slim-grid-index.mjs` performs the transform reproducibly: it drops the
9 keys and minifies (removes the `indent=4` pretty-print whitespace).

```bash
node scripts/slim-grid-index.mjs          # slim public/assets/data/r4c_stats_grid_index.json in place
node scripts/slim-grid-index.mjs --check  # report bytes only, no write
```

The transform is idempotent. A regression test
(`tests/unit/data/grid-index-slim.test.js`) asserts the feature count (6,710),
geometry integrity, absence of the 9 dropped keys, presence of every consumed
key, and that the file is minified.

### Byte impact (raw 9.31 MB → 5.47 MB, −41 %)

| Encoding   | Before (B) | After (B) | Saved   |
| ---------- | ---------- | --------- | ------- |
| raw        | 9,314,409  | 5,467,419 | −41.3 % |
| gzip -9    | 1,864,062  | 1,279,869 | −31.3 % |
| brotli -11 | 1,338,452  | 925,458   | −30.9 % |

Combined with server-side compression (handled separately), the wire saving vs
the current production nginx gzip-1 baseline is **≈ −60 %** (WO-6 row C2).

## Upstream pipeline adoption (drop at the source)

The grid is produced by the in-repo vulnerability pipeline under
`scripts/vulnerability/` (`combine_for_index.py` → `calculate_index.py` →
`combine.py`). `combine.py` already strips socio-economic intermediate columns
via a `columns_to_remove` list and pretty-prints with `indent=4`. To make the
client-side `slim-grid-index.mjs` redundant, the pipeline should:

1. Append the 9 keys above to `columns_to_remove` in
   `scripts/vulnerability/combine.py` (note `total_green` is consumed _during_
   index calculation as `i_16` → `flood_exposure`; it is only redundant in the
   **output**, so drop it after the index step, not before).
2. Change `save_geojson()` to emit compact JSON
   (`json.dump(data, f, separators=(",", ":"))` instead of `indent=4`).

Once the pipeline emits the slimmed/minified file, `slim-grid-index.mjs` becomes
a no-op and can be retired.
