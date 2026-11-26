#!/usr/bin/env node
/**
 * slim-hsy-po.mjs — reproducibly slim public/assets/data/hsy_po.json
 *
 * The postal-code boundaries load on every page load (useViewerInitialization.js
 * addPostalCodes), so their size counts against the first paint. Sentry flagged
 * the request as a "Large HTTP payload" (REGIONS4CLIMATE-44).
 *
 * WHAT IT DOES
 *   1. Rounds every coordinate to 6 decimals. The source carries 10 (about
 *      0.01 mm); 6 decimals is about 0.11 m of latitude and 0.06 m of longitude
 *      at 60° N, well below what a postal-code boundary drawn on a city-scale
 *      map can show.
 *   2. Drops a position that rounds onto the one before it, so no ring carries
 *      a repeated point.
 *   3. Minifies (drops the tab-indented pretty-print whitespace).
 *
 * Properties are NOT touched: PieChart.vue reads the `${key}_${year}` landcover
 * keys and NDVIChart.vue the ndvi_* keys dynamically (docs/data/GRID_INDEX.md).
 *
 * USAGE
 *   node scripts/slim-hsy-po.mjs                 # slim in place
 *   node scripts/slim-hsy-po.mjs --check         # report bytes, do not write
 *   node scripts/slim-hsy-po.mjs --in FILE --out FILE
 *
 * The transform is idempotent.
 */

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = resolve(__dirname, '../public/assets/data/hsy_po.json');

export const COORDINATE_DECIMALS = 6;

const round = (value) => Number(value.toFixed(COORDINATE_DECIMALS));

const samePosition = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Round a ring's positions and drop any that repeat the previous one. */
function slimRing(ring) {
	const out = [];
	for (const position of ring) {
		const rounded = position.map(round);
		if (out.length === 0 || !samePosition(out.at(-1), rounded)) {
			out.push(rounded);
		}
	}
	return out;
}

/** Round the coordinates of a Polygon or MultiPolygon geometry in place. */
function slimGeometry(geometry) {
	if (geometry?.type === 'Polygon') {
		geometry.coordinates = geometry.coordinates.map(slimRing);
	} else if (geometry?.type === 'MultiPolygon') {
		geometry.coordinates = geometry.coordinates.map((polygon) => polygon.map(slimRing));
	} else {
		throw new Error(`Unsupported geometry type: ${geometry?.type}`);
	}
}

/**
 * Slim every feature's geometry. Mutates in place and returns the same object.
 * @param {{ features?: Array<{ geometry: { type: string, coordinates: unknown } }> }} geojson
 */
export function slimHsyPo(geojson) {
	if (!geojson || !Array.isArray(geojson.features)) {
		throw new Error('Input is not a GeoJSON FeatureCollection with a features array');
	}
	for (const feature of geojson.features) {
		slimGeometry(feature.geometry);
	}
	return geojson;
}

function parseArgs(argv) {
	const args = { check: false, in: DEFAULT_FILE, out: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--check') {
			args.check = true;
		} else if (a === '--in' || a === '--out') {
			const val = argv[i + 1];
			if (!val || val.startsWith('-')) throw new Error(`Missing value for ${a}`);
			args[a.slice(2)] = resolve(val);
			i++;
		}
	}
	if (!args.out) args.out = args.in;
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const bytesBefore = statSync(args.in).size;
	const geojson = slimHsyPo(JSON.parse(readFileSync(args.in, 'utf8')));

	// Trailing newline keeps the output stable under the end-of-file-fixer hook.
	const minified = `${JSON.stringify(geojson)}\n`;
	const bytesAfter = Buffer.byteLength(minified, 'utf8');
	const pct = (100 * (bytesBefore - bytesAfter)) / bytesBefore;

	console.log(`features:    ${geojson.features.length}`);
	console.log(`raw before:  ${bytesBefore.toLocaleString()} B`);
	console.log(`raw after:   ${bytesAfter.toLocaleString()} B (${pct.toFixed(1)}% smaller)`);

	if (args.check) {
		console.log('--check: no file written');
		return;
	}
	writeFileSync(args.out, minified);
	console.log(`wrote:       ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
