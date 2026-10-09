/**
 * Lighthouse render-profile gate (ADR-011). Run from the repo root after
 * `lhci collect`: `bun scripts/lighthouse/check-render-profile.mjs [dir]`
 * (default `.lighthouseci`). `just lighthouse-local` and lighthouse.yml run it.
 *
 * Fails when any run lacks the render-profile mark, or rendered with a
 * different WebGL renderer or frame cap than the profile pins. Writes the
 * renderer to $GITHUB_OUTPUT when set, for the PR comment.
 */
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkRenderProfiles } from './renderProfilePolicy.mjs'

const dir = process.argv[2] ?? '.lighthouseci'

let files = []
try {
	files = readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name))
} catch {
	// A missing directory is reported below as "no Lighthouse results".
}
const runs = files.map((file) => ({ file, lhr: JSON.parse(readFileSync(join(dir, file), 'utf8')) }))

const { problems, profiles } = checkRenderProfiles(runs)

for (const { file, fps, renderer } of profiles) {
	console.log(`${file}: ${renderer} | Cesium capped at ${fps} fps`)
}

if (process.env.GITHUB_OUTPUT && profiles.length > 0) {
	const renderers = [...new Set(profiles.map((p) => p.renderer))].join('; ')
	appendFileSync(process.env.GITHUB_OUTPUT, `renderer=${renderers}\nfps=${profiles[0].fps}\n`)
}

if (problems.length > 0) {
	console.error('Lighthouse render profile check failed (ADR-011):')
	for (const problem of problems) console.error(`  - ${problem}`)
	process.exit(1)
}
console.log(`Render profile OK in ${profiles.length} run(s).`)
