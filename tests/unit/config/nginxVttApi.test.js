/**
 * The VTT API answers with `Content-Type: application/octet-stream` and no
 * Content-Encoding, so the server-level `gzip_types` list (JSON/GeoJSON only)
 * skipped it and each ~6 MB frame crossed the wire uncompressed (measured in
 * production on 2026-10-08). The /vtt-api location must name that type.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const conf = readFileSync('nginx/default.conf.template', 'utf8')

/** Body of `location /vtt-api { ... }` (no nested blocks inside it). */
function vttApiLocation() {
	const match = /location \/vtt-api \{([\s\S]*?)\n {4}\}/.exec(conf)
	if (!match) throw new Error('location /vtt-api not found in nginx/default.conf.template')
	return match[1]
}

describe('nginx /vtt-api location', () => {
	it('finds the location block (guards against a vacuous pass)', () => {
		expect(vttApiLocation()).toContain('proxy_pass')
	})

	it('gzips the upstream application/octet-stream frames', () => {
		const types = /^\s*gzip_types ([^;]+);/m.exec(vttApiLocation())
		expect(types).not.toBeNull()
		expect(types?.[1].split(/\s+/)).toContain('application/octet-stream')
	})

	it('keeps compressing JSON if the upstream starts labelling it correctly', () => {
		const types = /^\s*gzip_types ([^;]+);/m.exec(vttApiLocation())
		expect(types?.[1].split(/\s+/)).toEqual(
			expect.arrayContaining(['application/json', 'application/geo+json'])
		)
	})
})
