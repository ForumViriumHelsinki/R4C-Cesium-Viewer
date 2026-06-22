#!/usr/bin/env node
/**
 * Build-time static precompression.
 *
 * Walks the build output (`dist/`) and writes, for every compressible asset
 * above a size threshold, both a level-9 gzip sibling (`<file>.gz`) and a
 * quality-11 brotli sibling (`<file>.br`). nginx serves these directly via
 * `gzip_static on;` / `brotli_static on;` — no per-request CPU and a far
 * better ratio than nginx's default on-the-fly gzip level 1. A client
 * advertising `Accept-Encoding: br` gets the smaller `.br`; gzip-only clients
 * fall back to the `.gz`. Brotli-11 shaves a further ~28-43% off the largest
 * static JSON payloads over gzip-9 (WO-6).
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
 * The runtime image (Dockerfile) compiles `ngx_brotli` as a dynamic module so
 * nginx can serve these `.br` siblings via `brotli_static on;` (issue #876).
 */
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
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

/** @param {Buffer} buf */
function brotli(buf) {
	return brotliCompressSync(buf, {
		params: {
			[constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY, // 11
			[constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
		},
	});
}

let count = 0;
let rawTotal = 0;
let gzTotal = 0;
let brTotal = 0;

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
		const br = brotli(buf);
		// Skip if neither codec actually helps (e.g. already-dense data).
		if (gz.length >= size && br.length >= size) continue;

		count += 1;
		rawTotal += size;
		// Emit each sibling only when it beats the raw payload. When a codec
		// doesn't help, nginx serves the uncompressed file for that encoding, so
		// accumulate the raw `size` (not 0) to keep the printed totals/ratios
		// honest.
		if (gz.length < size) {
			writeFileSync(`${full}.gz`, gz);
			gzTotal += gz.length;
		} else {
			gzTotal += size;
		}
		if (br.length < size) {
			writeFileSync(`${full}.br`, br);
			brTotal += br.length;
		} else {
			brTotal += size;
		}
	}
}

try {
	statSync(DIST);
} catch {
	console.error(`precompress: "${DIST}/" not found — run after \`vite build\`.`);
	process.exit(1);
}

walk(DIST);

const gzPct = rawTotal > 0 ? ((1 - gzTotal / rawTotal) * 100).toFixed(1) : '0.0';
const brPct = rawTotal > 0 ? ((1 - brTotal / rawTotal) * 100).toFixed(1) : '0.0';
console.log(
	`precompress: ${count} assets, ${(rawTotal / 1e6).toFixed(2)} MB raw — ` +
		`gzip-9 → ${(gzTotal / 1e6).toFixed(2)} MB (-${gzPct}%), ` +
		`brotli-11 → ${(brTotal / 1e6).toFixed(2)} MB (-${brPct}%)`
);
