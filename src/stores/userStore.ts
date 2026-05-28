import { defineStore } from 'pinia'
import logger from '@/utils/logger'

interface UserState {
	email: string | null
	domain: string | null
	isAuthenticated: boolean
	initialized: boolean
	nonJsonWarningEmitted: boolean
}

const COMPANY_DOMAIN = 'forumvirium.fi'

export const useUserStore = defineStore('user', {
	state: (): UserState => ({
		email: null,
		domain: null,
		isAuthenticated: false,
		initialized: false,
		nonJsonWarningEmitted: false,
	}),

	getters: {
		isCompanyUser: (state): boolean => {
			return state.domain === COMPANY_DOMAIN
		},

		targetingKey: (state): string => {
			return state.email ?? 'anonymous'
		},
	},

	actions: {
		async fetchUserInfo(): Promise<void> {
			try {
				const response = await fetch('/oauth2/userinfo')
				if (!response.ok) {
					logger.debug(
						'OAuth2 userinfo not available (status %d), using anonymous context',
						response.status
					)
					return
				}

				// Guard against the SPA's nginx catch-all returning index.html with a
				// 200 OK when no /oauth2/* route is configured upstream. Without this
				// check, response.json() throws a SyntaxError that the bare catch
				// below would swallow, leaving every visitor reported as anonymous
				// and the misconfiguration invisible in logs. See issue #799.
				const contentType = response.headers.get('content-type') ?? ''
				if (!contentType.toLowerCase().includes('application/json')) {
					if (!this.nonJsonWarningEmitted) {
						this.nonJsonWarningEmitted = true
						logger.warn(
							'OAuth2 /oauth2/userinfo returned non-JSON response (content-type: %s); ' +
								'the OIDC proxy is likely not in front of the app. Treating user as anonymous.',
							contentType || '(missing)'
						)
					}
					return
				}

				const data = await response.json()
				const email = data.email || data.preferredUsername || null

				if (email && typeof email === 'string') {
					this.email = email
					this.domain = email.split('@')[1] ?? null
					this.isAuthenticated = true
				}
			} catch {
				// Expected in local development without OAuth2 proxy
				logger.debug('OAuth2 proxy not available, using anonymous context')
			} finally {
				this.initialized = true
			}
		},
	},
})
