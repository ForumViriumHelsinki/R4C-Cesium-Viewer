import { defineStore } from 'pinia'
import logger from '@/utils/logger'

interface UserState {
	email: string | null
	domain: string | null
	isAuthenticated: boolean
	initialized: boolean
}

const COMPANY_DOMAIN = 'forumvirium.fi'

export const useUserStore = defineStore('user', {
	state: (): UserState => ({
		email: null,
		domain: null,
		isAuthenticated: false,
		initialized: false,
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
					this.initialized = true
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
