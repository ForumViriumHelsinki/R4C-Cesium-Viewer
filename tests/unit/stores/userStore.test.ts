import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from '@/stores/userStore'

type FetchMock = ReturnType<typeof vi.fn>

const mockResponse = (
	body: string,
	{ status = 200, contentType = 'application/json' }: { status?: number; contentType?: string } = {}
) =>
	new Response(body, {
		status,
		headers: { 'content-type': contentType },
	})

describe('userStore.fetchUserInfo', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		setActivePinia(createPinia())
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		;(global.fetch as FetchMock).mockReset()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('parses authenticated user from JSON 200', async () => {
		;(global.fetch as FetchMock).mockResolvedValueOnce(
			mockResponse(JSON.stringify({ email: 'lauri.gates@forumvirium.fi' }))
		)

		const store = useUserStore()
		await store.fetchUserInfo()

		expect(store.isAuthenticated).toBe(true)
		expect(store.email).toBe('lauri.gates@forumvirium.fi')
		expect(store.domain).toBe('forumvirium.fi')
		expect(store.initialized).toBe(true)
	})

	it('treats non-2xx response as anonymous without warning', async () => {
		;(global.fetch as FetchMock).mockResolvedValueOnce(mockResponse('', { status: 401 }))

		const store = useUserStore()
		await store.fetchUserInfo()

		expect(store.isAuthenticated).toBe(false)
		expect(store.email).toBeNull()
		expect(store.initialized).toBe(true)
		expect(warnSpy).not.toHaveBeenCalled()
	})

	// Regression: production R4C hosts return 200 OK with index.html when the
	// OIDC proxy isn't in front of the SPA. The old implementation called
	// response.json() unconditionally and swallowed the SyntaxError in a bare
	// catch{}, leaving the failure invisible. See issue #799.
	it('treats 200 text/html response as anonymous and warns once', async () => {
		;(global.fetch as FetchMock).mockResolvedValueOnce(
			mockResponse('<!doctype html><html></html>', { contentType: 'text/html' })
		)

		const store = useUserStore()
		await store.fetchUserInfo()

		expect(store.isAuthenticated).toBe(false)
		expect(store.email).toBeNull()
		expect(store.domain).toBeNull()
		expect(store.initialized).toBe(true)
		expect(warnSpy).toHaveBeenCalledTimes(1)
		expect(warnSpy.mock.calls[0].join(' ')).toMatch(/oauth2.*userinfo/i)
	})

	it('treats 200 with missing content-type as anonymous and warns', async () => {
		;(global.fetch as FetchMock).mockResolvedValueOnce(
			new Response('not json', { status: 200, headers: {} })
		)

		const store = useUserStore()
		await store.fetchUserInfo()

		expect(store.isAuthenticated).toBe(false)
		expect(warnSpy).toHaveBeenCalledTimes(1)
	})

	it('only warns once across repeated non-JSON 200 responses', async () => {
		;(global.fetch as FetchMock)
			.mockResolvedValueOnce(mockResponse('<html></html>', { contentType: 'text/html' }))
			.mockResolvedValueOnce(mockResponse('<html></html>', { contentType: 'text/html' }))

		const store = useUserStore()
		await store.fetchUserInfo()
		await store.fetchUserInfo()

		expect(warnSpy).toHaveBeenCalledTimes(1)
	})

	it('handles fetch network error without throwing', async () => {
		;(global.fetch as FetchMock).mockRejectedValueOnce(new TypeError('network'))

		const store = useUserStore()
		await expect(store.fetchUserInfo()).resolves.toBeUndefined()
		expect(store.isAuthenticated).toBe(false)
		expect(store.initialized).toBe(true)
	})
})
