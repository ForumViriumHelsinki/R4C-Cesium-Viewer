#!/usr/bin/env bun
/**
 * derive-class-breaks.mjs — fixed colour-class breaks per VTT flood scenario.
 *
 * WHAT IT DOES
 *   For every scenario in VTT_SCENARIOS and every dimension whose scale kind is
 *   `scenario`, pools the shown values (above the dimension's `hideBelow`) of
 *   sampled frames and splits them into equal-count classes with
 *   equalCountBreaks.mjs. Writes src/constants/vttFloodClassBreaks.ts, which the colour scale reads,
 *   so classes stay fixed while the user scrubs frames.
 *
 *   Both data sources get breaks: the VTT API (`vtt`) and the synthetic frames
 *   behind the `vttFloodSyntheticData` flag (`synthetic`), whose values are on
 *   a different range.
 *
 * FRAMES
 *   Every SAMPLE_STEP-th frame plus the last one. VTT frames are fetched from
 *   the upstream API and cached in tmp/frames/s<scenario>_<frame>.json (about
 *   6 MB each) with the response headers beside them in .meta.json, so a re-run
 *   downloads nothing. Delete tmp/frames/ to re-fetch after VTT updates the data.
 *
 * VALUES
 *   The app holds frame values in Float32Array, so the values are rounded to
 *   float32 before pooling. A break that falls on a tied value then compares
 *   equal to that value in the browser.
 *
 * RUN
 *   bun scripts/vtt-flood/derive-class-breaks.mjs
 *   VITE_VTT_API_HOST overrides the upstream host (default http://130.188.4.230).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	VTT_COLOR_STEPS,
	VTT_DIMENSIONS,
	VTT_FRAME_COUNT,
	VTT_SCENARIOS,
} from '../../src/constants/vttFlood.ts'
import { generateSyntheticFrame } from '../../src/services/vttFloodSynthetic.js'
import { equalCountBreaks } from './equalCountBreaks.mjs'

const SAMPLE_STEP = 12
const FETCH_CONCURRENCY = 4
const CACHE_DIR = 'tmp/frames'
const OUTPUT = 'src/constants/vttFloodClassBreaks.ts'
const COMMAND = 'bun scripts/vtt-flood/derive-class-breaks.mjs'

const host = process.env.VITE_VTT_API_HOST || 'http://130.188.4.230'
const API_URL = `${/^https?:\/\//.test(host) ? host : `http://${host}`}/python_api/calc`

const FRAMES = []
for (let f = 0; f < VTT_FRAME_COUNT; f += SAMPLE_STEP) FRAMES.push(f)
if (FRAMES.at(-1) !== VTT_FRAME_COUNT - 1) FRAMES.push(VTT_FRAME_COUNT - 1)

const DIMENSIONS = VTT_DIMENSIONS.filter((d) => d.scale.kind === 'scenario')

/** @returns {Promise<{features: any[], lastModified: string | null}>} */
async function vttFrame(scenarioId, frame) {
	const dataPath = join(CACHE_DIR, `s${scenarioId}_${frame}.json`)
	const metaPath = join(CACHE_DIR, `s${scenarioId}_${frame}.meta.json`)
	if (existsSync(dataPath) && existsSync(metaPath)) {
		const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
		return { features: JSON.parse(readFileSync(dataPath, 'utf8')).features, ...meta }
	}
	const response = await fetch(API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ picture_number: frame, scenario_number: scenarioId }),
	})
	if (!response.ok) {
		throw new Error(`${API_URL} responded ${response.status} for scenario ${scenarioId} frame ${frame}`)
	}
	const text = await response.text()
	const payload = JSON.parse(text)
	if (!Array.isArray(payload?.features)) {
		throw new Error(`No features[] for scenario ${scenarioId} frame ${frame}`)
	}
	const meta = { lastModified: response.headers.get('last-modified') }
	writeFileSync(dataPath, text)
	writeFileSync(metaPath, JSON.stringify(meta))
	return { features: payload.features, ...meta }
}

function syntheticFrame(scenarioId, frame) {
	const { features } = generateSyntheticFrame({ scenarioId, frameNumber: frame })
	return { features, lastModified: null }
}

/** Shown values of one frame per dimension key, rounded to float32. */
function shownValues(features) {
	const out = {}
	for (const d of DIMENSIONS) {
		const values = []
		for (const feature of features) {
			const v = feature?.properties?.[d.key]
			if (typeof v === 'number' && Number.isFinite(v) && v > d.hideBelow) values.push(Math.fround(v))
		}
		out[d.key] = values
	}
	return out
}

/** Run `task` over `items` with at most `limit` in flight; results in order. */
async function mapLimited(items, limit, task) {
	const results = new Array(items.length)
	let next = 0
	const worker = async () => {
		while (next < items.length) {
			const i = next++
			results[i] = await task(items[i])
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
	return results
}

async function deriveSource(loadFrame) {
	const breaks = {}
	const lastModified = new Set()
	for (const scenario of VTT_SCENARIOS) {
		const pooled = Object.fromEntries(DIMENSIONS.map((d) => [d.key, []]))
		await mapLimited(FRAMES, FETCH_CONCURRENCY, async (frame) => {
			const { features, lastModified: lm } = await loadFrame(scenario.id, frame)
			if (lm) lastModified.add(lm)
			const shown = shownValues(features)
			for (const d of DIMENSIONS) for (const v of shown[d.key]) pooled[d.key].push(v)
		})
		breaks[scenario.id] = {}
		for (const d of DIMENSIONS) {
			const sorted = Float64Array.from(pooled[d.key]).sort()
			if (sorted.length === 0) {
				throw new Error(`Scenario ${scenario.id} ${d.key}: no shown values in sampled frames`)
			}
			const result = equalCountBreaks(
				sorted,
				d.scale.lowerQuantile,
				d.scale.upperQuantile,
				VTT_COLOR_STEPS
			)
			breaks[scenario.id][d.key] = result
			report(scenario.id, d.key, sorted, result)
		}
	}
	const times = [...lastModified].map((t) => new Date(t).getTime()).sort((a, b) => a - b)
	return { breaks, lastModified: times }
}

/** Print the breaks and each class's share of the pooled values. */
function report(scenarioId, key, sorted, { breaks, upper }) {
	const counts = new Array(breaks.length).fill(0)
	for (const v of sorted) {
		let i = 0
		while (i + 1 < breaks.length && breaks[i + 1] <= v) i++
		counts[i]++
	}
	const shares = counts.map((c) => `${((100 * c) / sorted.length).toFixed(1)}%`)
	console.log(
		`  scenario ${scenarioId} ${key}: breaks [${breaks.map((b) => b.toPrecision(4)).join(', ')}] upper ${upper.toPrecision(4)}; pooled shares ${shares.join(' ')} (n=${sorted.length})`
	)
}

function render({ vtt, synthetic, date }) {
	const quantiles = Object.fromEntries(
		DIMENSIONS.map((d) => [
			d.key,
			{ lowerQuantile: d.scale.lowerQuantile, upperQuantile: d.scale.upperQuantile },
		])
	)
	const iso = (t) => new Date(t).toISOString().replace('.000', '')
	const times = vtt.lastModified
	const lastModified = times.length
		? `${iso(times[0])} to ${iso(times.at(-1))} (${times.length} files)`
		: 'unknown'
	return `/**
 * @module constants/vttFloodClassBreaks
 * GENERATED by scripts/vtt-flood/derive-class-breaks.mjs on ${date}. Do not edit.
 * Regenerate: ${COMMAND}
 *
 * Colour-class breaks per data source, scenario and dimension, fixed so the
 * classes do not change while scrubbing frames. Each entry pools the shown
 * values of ${FRAMES.length} frames (every ${SAMPLE_STEP}th from ${FRAMES[0]} to ${FRAMES.at(-2)}, plus ${FRAMES.at(-1)})
 * and splits them into up to ${VTT_COLOR_STEPS} equal-count classes
 * (scripts/vtt-flood/equalCountBreaks.mjs).
 * VTT data: upstream Last-Modified ${lastModified}.
 */

export interface VttClassBreaks {
	/** Strictly increasing class lower bounds. */
	readonly breaks: readonly number[]
	/** Upper end of the last class. */
	readonly upper: number
}

export type VttClassBreaksSource = 'vtt' | 'synthetic'

/** Parameters the breaks were derived with; a test checks they still match the constants. */
export const VTT_CLASS_BREAKS_DERIVATION = ${JSON.stringify({ steps: VTT_COLOR_STEPS, frames: FRAMES, quantiles }, null, '\t')} as const

export const VTT_CLASS_BREAKS: Readonly<
	Record<VttClassBreaksSource, Readonly<Record<string, Readonly<Record<string, VttClassBreaks>>>>>
> = ${JSON.stringify({ vtt: vtt.breaks, synthetic: synthetic.breaks }, null, '\t')}
`
}

mkdirSync(CACHE_DIR, { recursive: true })
console.log(`VTT frames from ${API_URL} (cache ${CACHE_DIR}/):`)
const vtt = await deriveSource(vttFrame)
console.log('Synthetic frames:')
const synthetic = await deriveSource(async (s, f) => syntheticFrame(s, f))
const date = new Date().toISOString().slice(0, 10)
writeFileSync(OUTPUT, render({ vtt, synthetic, date }))
const format = Bun.spawnSync(['bunx', 'biome', 'format', '--write', OUTPUT])
if (format.exitCode !== 0) throw new Error(`biome format failed:\n${format.stderr}`)
console.log(`Wrote ${OUTPUT}`)
