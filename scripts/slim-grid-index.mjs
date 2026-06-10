#!/usr/bin/env node
/**
 * slim-grid-index.mjs — reproducibly slim public/assets/data/r4c_stats_grid_index.json
 *
 * WHAT IT DOES
 *   1. Drops 9 property keys that have ZERO consumers anywhere in src/ or tests/.
 *      These are raw landcover-area / total-green inputs that the upstream
 *      vulnerability pipeline already folds into the *derived* indices
 *      (heat_exposure, flood_exposure, green, vegetation, trees, water). The
 *      derived indices are what the frontend reads; the raw inputs are dead
 *      weight in the served file.
 *   2. Minifies (drops the indent=4 pretty-print whitespace).
 *
 * DROPPED KEYS (all *_m2_2022 landcover-area + total_green):
 *   field_m2_2022, sea_m2_2022, total_green, tree2_m2_2022, tree10_m2_2022,
 *   tree15_m2_2022, tree20_m2_2022, vegetation_m2_2022, water_m2_2022
 *
 * VERIFIED-UNUSED (grep src/ tests/ docs/ for the literal names AND dynamic
 *   `${key}_${year}` constructions): the only dynamic landcover read,
 *   PieChart.vue's `${key}_${year}`, targets propsStore.postalCodeData
 *   (= public/assets/data/hsy_po.json), NOT this grid file. The grid file is
 *   consumed solely by SosEco250mGrid.vue + the geojson worker, which read
 *   grid_id, euref_x/y, heat_index, flood_index, green, vegetation, trees,
 *   water, kunta, final_avg_conditional, missing_values — none of the 9 keys.
 *
 * UPSTREAM ADOPTION (so the data pipeline can drop these at the source):
 *   In scripts/vulnerability/combine.py, append the 9 keys above to the
 *   existing `columns_to_remove` list (which already strips socioeconomic
 *   intermediate columns), and change save_geojson() to dump compact JSON
 *   (json.dump(data, f, separators=(",", ":")) instead of indent=4). Then this
 *   client-side slimming script becomes a no-op and can be retired.
 *
 * USAGE
 *   node scripts/slim-grid-index.mjs                 # slim in place
 *   node scripts/slim-grid-index.mjs --check         # report bytes, do not write
 *   node scripts/slim-grid-index.mjs --in FILE --out FILE
 *
 * The transform is idempotent: re-running on an already-slimmed file is a no-op
 * (the keys are already gone; output stays minified).
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = resolve(__dirname, '../public/assets/data/r4c_stats_grid_index.json');

export const DROPPED_KEYS = Object.freeze([
	'field_m2_2022',
	'sea_m2_2022',
	'total_green',
	'tree2_m2_2022',
	'tree10_m2_2022',
	'tree15_m2_2022',
	'tree20_m2_2022',
	'vegetation_m2_2022',
	'water_m2_2022',
]);

/**
 * Drop the unused keys from every feature's properties. Mutates in place and
 * returns the same object for convenience.
 * @param {{ features?: Array<{ properties?: Record<string, unknown> }> }} geojson
 */
export function slimGridIndex(geojson) {
	if (!geojson || !Array.isArray(geojson.features)) {
		throw new Error('Input is not a GeoJSON FeatureCollection with a features array');
	}
	for (const feature of geojson.features) {
		const props = feature?.properties;
		if (!props) continue;
		for (const key of DROPPED_KEYS) {
			delete props[key];
		}
	}
	return geojson;
}

function parseArgs(argv) {
	const args = { check: false, in: DEFAULT_FILE, out: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--check') {
			args.check = true;
		} else if (a === '--in') {
			const val = argv[i + 1];
			if (!val || val.startsWith('-')) throw new Error('Missing value for --in');
			args.in = resolve(val);
			i++;
		} else if (a === '--out') {
			const val = argv[i + 1];
			if (!val || val.startsWith('-')) throw new Error('Missing value for --out');
			args.out = resolve(val);
			i++;
		}
	}
	if (!args.out) args.out = args.in;
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const rawBefore = readFileSync(args.in, 'utf8');
	const bytesBefore = statSync(args.in).size;

	const geojson = JSON.parse(rawBefore);
	slimGridIndex(geojson);
	const featureCount = geojson.features.length;

	// Minify: no indent, compact separators. Trailing newline keeps the output
	// idempotent with the repo's end-of-file-fixer pre-commit hook.
	const minified = `${JSON.stringify(geojson)}\n`;
	const bytesAfter = Buffer.byteLength(minified, 'utf8');

	const pct = (100 * (bytesBefore - bytesAfter)) / bytesBefore;
	console.log(`features:        ${featureCount}`);
	console.log(`dropped keys:    ${DROPPED_KEYS.length} (${DROPPED_KEYS.join(', ')})`);
	console.log(`raw before:      ${bytesBefore.toLocaleString()} B`);
	console.log(`raw after:       ${bytesAfter.toLocaleString()} B`);
	console.log(`raw saved:       ${(bytesBefore - bytesAfter).toLocaleString()} B (${pct.toFixed(1)}%)`);

	if (args.check) {
		console.log('--check: no file written');
		return;
	}
	writeFileSync(args.out, minified);
	console.log(`wrote:           ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
