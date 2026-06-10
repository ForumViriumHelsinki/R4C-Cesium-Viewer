#!/usr/bin/env node
/**
 * Build-time static precompression.
 *
 * Walks the build output (`dist/`) and writes a level-9 gzip sibling
 * (`<file>.gz`) for every compressible asset above a size threshold. nginx
 * serves these directly via `gzip_static on;` — no per-request CPU and a far
 * better ratio than nginx's default on-the-fly gzip level 1.
 *
 * Why a script (not a bundle-scoped vite plugin): the heaviest compressible
 * payload — `assets/data/r4c_stats_grid_index.json` (8.9 MB, WO-6) — is a
 * `public/` asset copied verbatim into `dist/`, NOT a rollup bundle chunk.
 * Walking `dist/` guarantees it is covered; a generateBundle-hook plugin may
 * silently skip copied public assets.
 *
 * Run with `bun scripts/precompress.mjs` (the build image is `oven/bun`, which
 * has no `node` binary). bun implements `node:zlib` / `node:fs`.
 *
 * Brotli (`.br`) is intentionally NOT emitted here: stock `nginx:1.31` has no
 * brotli module, so `.br` files would ship dead weight. Adding `brotli_static`
 * is a tracked follow-up that also adds `.br` generation here.
 */
import { gzipSync, constants } from 'node:zlib';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
// Only precompress text-like assets; binary/image/font formats are already
// compressed and would only waste bytes + build time.
const COMPRESSIBLE = new Set([
	'.js',
	'.mjs',
	'.css',
	'.json',
	'.html',
	'.svg',
	'.xml',
	'.txt',
	'.map',
	'.wasm',
]);
// Mirror nginx `gzip_min_length 1000` — tiny files don't benefit.
const MIN_BYTES = 1024;

let count = 0;
let rawTotal = 0;
let gzTotal = 0;

/** @param {string} dir */
function walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full);
			continue;
		}
		if (!entry.isFile()) continue;
		if (entry.name.endsWith('.gz') || entry.name.endsWith('.br')) continue;
		if (!COMPRESSIBLE.has(extname(entry.name).toLowerCase())) continue;

		const size = statSync(full).size;
		if (size < MIN_BYTES) continue;

		const buf = readFileSync(full);
		const gz = gzipSync(buf, { level: constants.Z_BEST_COMPRESSION });
		// Skip if compression doesn't actually help (e.g. already-dense data).
		if (gz.length >= size) continue;

		writeFileSync(`${full}.gz`, gz);
		count += 1;
		rawTotal += size;
		gzTotal += gz.length;
	}
}

try {
	statSync(DIST);
} catch {
	console.error(`precompress: "${DIST}/" not found — run after \`vite build\`.`);
	process.exit(1);
}

walk(DIST);

const pct = rawTotal > 0 ? ((1 - gzTotal / rawTotal) * 100).toFixed(1) : '0.0';
console.log(
	`precompress: gzip-9 wrote ${count} .gz files — ` +
		`${(rawTotal / 1e6).toFixed(2)} MB → ${(gzTotal / 1e6).toFixed(2)} MB (-${pct}%)`
);
