/**
 * Compares the old and new building-tile selection for a pitched camera (#1074, #1214).
 *
 * Uses a real Cesium Camera over Helsinki (no WebGL) and reports, for each
 * height and pitch: the tiles each selection examined, the time it took, and
 * the share of ground pixels whose tile is selected (overall, within 10 km,
 * and per 2 km distance band from the camera). fullR is the distance out to
 * which at least 99% of ground pixels are covered.
 *
 * Usage: node scripts/tile-selection-coverage.mjs
 */
import * as Cesium from 'cesium'
function makeCamera({ lon, lat, height, pitch, heading = 0, width = 1600, h = 1000 }) {
  const scene = {
    canvas: { clientWidth: width, clientHeight: h },
    drawingBufferWidth: width, drawingBufferHeight: h,
    mapProjection: new Cesium.GeographicProjection(),
    mode: Cesium.SceneMode.SCENE3D, mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL,
    tweens: new Cesium.TweenCollection(), screenSpaceCameraController: { minimumZoomDistance: 1, maximumZoomDistance: 1e10 },
    pixelRatio: 1, ellipsoid: Cesium.Ellipsoid.WGS84, globe: { ellipsoid: Cesium.Ellipsoid.WGS84 },
    preloadFlightCamera: undefined,
  }
  const camera = new Cesium.Camera(scene)
  camera.frustum.aspectRatio = width / h
  camera.setView({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, height), orientation: { heading: Cesium.Math.toRadians(heading), pitch: Cesium.Math.toRadians(pitch), roll: 0 } })
  return { camera, scene }
}
import { selectViewTiles, footprintFromPicks } from '../src/services/viewportTileSelection.js'
const TILE = 0.01, LIMIT = 50, W = 1600, H = 1000
const D = Number(process.env.MAXD ?? 10000)
const E = Cesium.Ellipsoid.WGS84
const deg = Cesium.Math.toDegrees
function picker(camera) {
  const s = new Cesium.Cartesian2()
  return (x, y) => { s.x = x; s.y = y; const c = camera.pickEllipsoid(s, E); if (!c) return; const g = Cesium.Cartographic.fromCartesian(c); return { lon: deg(g.longitude), lat: deg(g.latitude) } }
}
function oldSelect(camera, pick) {
  const t0 = performance.now()
  const r = camera.computeViewRectangle(E)
  let b = { west: deg(r.west), south: deg(r.south), east: deg(r.east), north: deg(r.north) }
  const w = b.east - b.west, h = b.north - b.south
  b = { west: b.west - w*0.2, south: b.south - h*0.2, east: b.east + w*0.2, north: b.north + h*0.2 }
  const keys = []
  for (let x = Math.floor(b.west/TILE); x <= Math.floor(b.east/TILE); x++) for (let y = Math.floor(b.south/TILE); y <= Math.floor(b.north/TILE); y++) keys.push(`${x}_${y}`)
  const c = pick(W/2, H/2) ?? { lon: deg(camera.positionCartographic.longitude), lat: deg(camera.positionCartographic.latitude) }
  const sel = keys.map(k => { const [x,y]=k.split('_').map(Number); const dl=(x+.5)*TILE-c.lon, dt=(y+.5)*TILE-c.lat; return {k,d:dl*dl+dt*dt} }).sort((a,b)=>a.d-b.d).slice(0,LIMIT).map(o=>o.k)
  return { keys: sel, examined: keys.length, ms: performance.now()-t0 }
}
function newSelect(camera, pick) {
  const t0 = performance.now()
  const fp = footprintFromPicks(pick, W, H)
  const pc = camera.positionCartographic
  const origin = { lon: deg(pc.longitude), lat: deg(pc.latitude) }
  const r = selectViewTiles({ footprint: fp, origin, tileSize: TILE, limit: LIMIT, maxDistance: D })
  return { ...r, ms: performance.now()-t0 }
}
function coverage(camera, pick, keys) {
  const set = new Set(keys), pc = camera.positionCartographic
  const o = { lon: deg(pc.longitude), lat: deg(pc.latitude) }, mlon = 111320*Math.cos(o.lat*Math.PI/180)
  const bands = Array.from({length: 8}, () => [0,0]); const samples = []
  let tot=0, cov=0, totS=0, covS=0
  for (let px = 2.5; px < W; px += 5) for (let py = 2.5; py < H; py += 5) {
    const p = pick(px, py); if (!p) continue
    const d = Math.hypot((p.lon-o.lon)*mlon, (p.lat-o.lat)*111320)
    const hit = set.has(`${Math.floor(p.lon/TILE)}_${Math.floor(p.lat/TILE)}`)
    tot++; if (hit) cov++
    if (d <= 10000) { totS++; if (hit) covS++ }
    const bi = Math.min(7, Math.floor(d/2000)); bands[bi][0]++; if (hit) bands[bi][1]++
    samples.push([d, hit])
  }
  samples.sort((a,b)=>a[0]-b[0]); let R = 0, miss = 0
  for (let i = 0; i < samples.length; i++) { if (!samples[i][1]) miss++; if (miss <= 0.01*(i+1)) R = samples[i][0] }
  return { all: (100*cov/tot).toFixed(1), within10km: (100*covS/totS).toFixed(1), fullR: (R/1000).toFixed(1), bands: bands.map(([t,c]) => t ? Math.round(100*c/t) : '-').join('/') }
}
const rows = []
for (const height of [800, 1500, 2800]) for (const pitch of [-60, -45, -35, -25, -20, -15]) {
  const { camera } = makeCamera({ lon: 24.94, lat: 60.165, height, pitch, width: W, h: H })
  const pick = picker(camera)
  const a = oldSelect(camera, pick), b = newSelect(camera, pick)
  const ca = coverage(camera, pick, a.keys), cb = coverage(camera, pick, b.keys)
  rows.push({ height, pitch, oldExamined: a.examined, newExamined: b.examined, oldMs: a.ms.toFixed(1), newMs: b.ms.toFixed(2), newTiles: b.keys.length,
    oldCov: ca.all, newCov: cb.all, old10: ca.within10km, new10: cb.within10km, oldR: ca.fullR, newR: cb.fullR, oldBands: ca.bands, newBands: cb.bands })
}
console.table(rows)
