/**
 * R4C Health Check Service
 *
 * Provides comprehensive health and status endpoints for monitoring the R4C application.
 * Checks database connectivity, PyGeoAPI availability, and external service health.
 *
 * Endpoints:
 *   /health  - Returns healthy only when ALL critical dependencies are working
 *   /ready   - Readiness probe (same as health)
 *   /live    - Liveness probe (always returns ok if service is running)
 *   /status  - Detailed status of all components
 */

const PORT = Number(process.env.PORT) || 5051
const DB_HOST = process.env.DB_HOST || 'postgresql'
const DB_PORT = Number(process.env.DB_PORT) || 5432
const DB_NAME = process.env.DB_NAME || 'regions4climate'
const DB_USER = process.env.DB_USER || 'regions4climate_user'
const DB_PASSWORD = process.env.DB_PASSWORD || 'regions4climate_pass'
const PYGEOAPI_URL = process.env.PYGEOAPI_URL || 'http://pygeoapi:80'
const CHECK_EXTERNAL_SERVICES = process.env.CHECK_EXTERNAL_SERVICES === 'true'

interface ComponentStatus {
	name: string
	status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
	responseTime?: number
	message?: string
	details?: Record<string, unknown>
}

interface HealthResponse {
	status: 'healthy' | 'unhealthy' | 'degraded'
	timestamp: string
	version: string
	uptime: number
	components: ComponentStatus[]
}

const startTime = Date.now()

/**
 * Check PostgreSQL database connectivity
 */
async function checkDatabase(): Promise<ComponentStatus> {
	const start = Date.now()

	try {
		// Use pg library for proper PostgreSQL connection
		const connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`

		// Simple TCP connection check first
		const response = await fetch(`http://${DB_HOST}:${DB_PORT}`, {
			signal: AbortSignal.timeout(5000),
		}).catch(() => null)

		// For actual database check, we'll use a simple query via shell
		// This is a workaround since Bun doesn't have native pg support yet
		const proc = Bun.spawn(
			[
				'psql',
				connectionString,
				'-c',
				'SELECT 1 as health_check;',
				'-t',
				'-A',
			],
			{
				stdout: 'pipe',
				stderr: 'pipe',
			}
		)

		const exitCode = await proc.exited
		const stdout = await new Response(proc.stdout).text()

		if (exitCode === 0 && stdout.trim() === '1') {
			// Also check if critical tables exist
			const tableCheck = Bun.spawn(
				[
					'psql',
					connectionString,
					'-c',
					"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'r4c_hsy_building_mat';",
					'-t',
					'-A',
				],
				{
					stdout: 'pipe',
					stderr: 'pipe',
				}
			)

			const tableExitCode = await tableCheck.exited
			const tableStdout = await new Response(tableCheck.stdout).text()
			const tableExists = tableExitCode === 0 && parseInt(tableStdout.trim()) > 0

			return {
				name: 'database',
				status: tableExists ? 'healthy' : 'degraded',
				responseTime: Date.now() - start,
				message: tableExists
					? 'Connected and critical tables present'
					: 'Connected but critical tables missing',
				details: {
					host: DB_HOST,
					port: DB_PORT,
					database: DB_NAME,
					criticalTablesPresent: tableExists,
				},
			}
		}

		return {
			name: 'database',
			status: 'unhealthy',
			responseTime: Date.now() - start,
			message: 'Failed to connect to database',
			details: {
				host: DB_HOST,
				port: DB_PORT,
				database: DB_NAME,
			},
		}
	} catch (error) {
		return {
			name: 'database',
			status: 'unhealthy',
			responseTime: Date.now() - start,
			message: error instanceof Error ? error.message : 'Unknown error',
			details: {
				host: DB_HOST,
				port: DB_PORT,
				database: DB_NAME,
			},
		}
	}
}

/**
 * Check PyGeoAPI availability
 */
async function checkPyGeoAPI(): Promise<ComponentStatus> {
	const start = Date.now()

	try {
		const response = await fetch(`${PYGEOAPI_URL}/collections`, {
			signal: AbortSignal.timeout(10000),
		})

		if (response.ok) {
			const data = (await response.json()) as { collections?: unknown[] }
			const collectionCount = data.collections?.length || 0

			return {
				name: 'pygeoapi',
				status: 'healthy',
				responseTime: Date.now() - start,
				message: `PyGeoAPI responding with ${collectionCount} collections`,
				details: {
					url: PYGEOAPI_URL,
					collectionCount,
				},
			}
		}

		return {
			name: 'pygeoapi',
			status: 'unhealthy',
			responseTime: Date.now() - start,
			message: `PyGeoAPI returned status ${response.status}`,
			details: {
				url: PYGEOAPI_URL,
				statusCode: response.status,
			},
		}
	} catch (error) {
		return {
			name: 'pygeoapi',
			status: 'unhealthy',
			responseTime: Date.now() - start,
			message: error instanceof Error ? error.message : 'Unknown error',
			details: {
				url: PYGEOAPI_URL,
			},
		}
	}
}

/**
 * Check external WMS service (HSY)
 */
async function checkHSYWMS(): Promise<ComponentStatus> {
	const start = Date.now()

	try {
		const wmsUrl =
			'https://kartta.hsy.fi/geoserver/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities'
		const response = await fetch(wmsUrl, {
			signal: AbortSignal.timeout(15000),
		})

		return {
			name: 'hsy_wms',
			status: response.ok ? 'healthy' : 'degraded',
			responseTime: Date.now() - start,
			message: response.ok
				? 'HSY WMS service available'
				: `HSY WMS returned status ${response.status}`,
			details: {
				url: 'kartta.hsy.fi',
			},
		}
	} catch (error) {
		return {
			name: 'hsy_wms',
			status: 'degraded',
			responseTime: Date.now() - start,
			message: 'HSY WMS service unreachable (external dependency)',
			details: {
				url: 'kartta.hsy.fi',
			},
		}
	}
}

/**
 * Check Statistics Finland API
 */
async function checkStatFi(): Promise<ComponentStatus> {
	const start = Date.now()

	try {
		const response = await fetch(
			'https://geo.stat.fi/geoserver/postialue/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities',
			{
				signal: AbortSignal.timeout(15000),
			}
		)

		return {
			name: 'stat_fi',
			status: response.ok ? 'healthy' : 'degraded',
			responseTime: Date.now() - start,
			message: response.ok
				? 'Statistics Finland WFS available'
				: `Statistics Finland WFS returned status ${response.status}`,
			details: {
				url: 'geo.stat.fi',
			},
		}
	} catch (error) {
		return {
			name: 'stat_fi',
			status: 'degraded',
			responseTime: Date.now() - start,
			message: 'Statistics Finland WFS unreachable (external dependency)',
			details: {
				url: 'geo.stat.fi',
			},
		}
	}
}

/**
 * Perform all health checks
 */
async function performHealthChecks(
	includeExternal: boolean = false
): Promise<HealthResponse> {
	const checks: Promise<ComponentStatus>[] = [checkDatabase(), checkPyGeoAPI()]

	if (includeExternal) {
		checks.push(checkHSYWMS(), checkStatFi())
	}

	const components = await Promise.all(checks)

	// Determine overall status
	// - healthy: all critical components healthy
	// - degraded: external services unhealthy but critical components ok
	// - unhealthy: any critical component (database, pygeoapi) unhealthy
	const criticalComponents = components.filter((c) =>
		['database', 'pygeoapi'].includes(c.name)
	)
	const hasCriticalFailure = criticalComponents.some(
		(c) => c.status === 'unhealthy'
	)
	const hasAnyFailure = components.some((c) => c.status === 'unhealthy')
	const hasDegraded = components.some((c) => c.status === 'degraded')

	let overallStatus: 'healthy' | 'unhealthy' | 'degraded'
	if (hasCriticalFailure) {
		overallStatus = 'unhealthy'
	} else if (hasAnyFailure || hasDegraded) {
		overallStatus = 'degraded'
	} else {
		overallStatus = 'healthy'
	}

	return {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		version: process.env.npm_package_version || '1.0.0',
		uptime: Math.floor((Date.now() - startTime) / 1000),
		components,
	}
}

/**
 * Simple liveness check - just confirms the service is running
 */
function livenessCheck(): { status: string; timestamp: string } {
	return {
		status: 'ok',
		timestamp: new Date().toISOString(),
	}
}

const server = Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url)
		const path = url.pathname

		// CORS headers for all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		}

		// CORS preflight
		if (req.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders })
		}

		// Liveness probe - always returns ok if service is running
		if (path === '/live' || path === '/livez') {
			return Response.json(livenessCheck(), {
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			})
		}

		// Health check - returns healthy only when all critical components work
		if (path === '/' || path === '/health' || path === '/healthz') {
			const health = await performHealthChecks(false)
			const statusCode = health.status === 'unhealthy' ? 503 : 200

			return Response.json(health, {
				status: statusCode,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			})
		}

		// Readiness probe - same as health check
		if (path === '/ready' || path === '/readyz') {
			const health = await performHealthChecks(false)
			const statusCode = health.status === 'unhealthy' ? 503 : 200

			return Response.json(health, {
				status: statusCode,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			})
		}

		// Detailed status - includes all components and external services
		if (path === '/status') {
			const includeExternal =
				url.searchParams.get('external') !== 'false' && CHECK_EXTERNAL_SERVICES
			const health = await performHealthChecks(includeExternal)

			return Response.json(
				{
					...health,
					environment: process.env.NODE_ENV || 'development',
					checkExternalServices: CHECK_EXTERNAL_SERVICES,
				},
				{
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				}
			)
		}

		// 404 for unmatched routes
		return Response.json(
			{
				error: 'Not found',
				availableEndpoints: [
					'/health - Health check (returns 503 if unhealthy)',
					'/ready - Readiness probe',
					'/live - Liveness probe',
					'/status - Detailed status of all components',
				],
			},
			{
				status: 404,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			}
		)
	},
})

console.log(`
  R4C Health Check Service
  ========================

  Running on: http://localhost:${PORT}

  Endpoints:
    /health  - Health check (returns 503 if unhealthy)
    /ready   - Readiness probe (K8s)
    /live    - Liveness probe (K8s)
    /status  - Detailed status of all components

  Configuration:
    DB_HOST: ${DB_HOST}
    DB_PORT: ${DB_PORT}
    DB_NAME: ${DB_NAME}
    PYGEOAPI_URL: ${PYGEOAPI_URL}
    CHECK_EXTERNAL_SERVICES: ${CHECK_EXTERNAL_SERVICES}

  Press Ctrl+C to stop
`)
