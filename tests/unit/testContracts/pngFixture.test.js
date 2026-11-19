/**
 * TRANSPARENT_PNG must be a PNG a browser can decode (#1142).
 *
 * The E2E WMS mocks answer every tile request with it. Until #1142 the
 * same-origin mocks never ran, so nobody noticed that the old literal had a
 * corrupt IDAT chunk; once they did, Cesium rejected every Helsinki WMS tile
 * and the app logged "failed after 3 retries" for each one.
 */
import { crc32, inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { TRANSPARENT_PNG } from '../../setup/api-mocks/fixtures'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function readChunks(png) {
	const chunks = []
	let offset = SIGNATURE.length
	while (offset < png.length) {
		const length = png.readUInt32BE(offset)
		const type = png.subarray(offset + 4, offset + 8)
		const data = png.subarray(offset + 8, offset + 8 + length)
		const crc = png.readUInt32BE(offset + 8 + length)
		chunks.push({
			type: type.toString('ascii'),
			data,
			crcOk: crc32(Buffer.concat([type, data])) === crc,
		})
		offset += 12 + length
	}
	return chunks
}

describe('TRANSPARENT_PNG fixture', () => {
	it('is a well-formed 1×1 PNG with valid chunk CRCs and image data', () => {
		expect(TRANSPARENT_PNG.subarray(0, 8).equals(SIGNATURE)).toBe(true)

		const chunks = readChunks(TRANSPARENT_PNG)
		expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND'])
		for (const chunk of chunks) {
			expect(chunk.crcOk, `${chunk.type} CRC`).toBe(true)
		}

		const ihdr = chunks[0].data
		const width = ihdr.readUInt32BE(0)
		const height = ihdr.readUInt32BE(4)
		const bitDepth = ihdr[8]
		const colorType = ihdr[9]
		expect([width, height]).toEqual([1, 1])

		// One filter byte per row plus the pixel bytes; RGBA 8-bit is 4 bytes.
		expect([bitDepth, colorType]).toEqual([8, 6])
		const pixels = inflateSync(chunks[1].data)
		expect(pixels).toHaveLength(1 + 4)
		// Fully transparent
		expect(pixels[4]).toBe(0)
	})
})
