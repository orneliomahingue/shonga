import { defineStore } from 'pinia'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'

const AUTH_FIELDS = gql`
  fragment AuthFields on AuthPayload {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      email
      firstName
      lastName
      phone
      roles
    }
  }
`
const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ...AuthFields
    }
  }
  ${AUTH_FIELDS}
`
const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ...AuthFields
    }
  }
  ${AUTH_FIELDS}
`
const LOGOUT = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`
const REFRESH = gql`
  mutation Refresh($token: String!) {
    refreshToken(token: $token) {
      ...AuthFields
    }
  }
  ${AUTH_FIELDS}
`

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('shonga_user') ?? 'null'),
    accessToken:
      localStorage.getItem('shonga_access_token') ?? sessionStorage.getItem('shonga_access_token'),
    accessTokenExpiresAt: Number(localStorage.getItem('shonga_access_token_expires_at')) || 0,
    loading: false,
    restoring: null,
    refreshTimer: null,
  }),
  getters: { isAuthenticated: (state) => Boolean(state.user && state.accessToken) },
  actions: {
    saveSession(payload) {
      this.user = payload.user
      this.accessToken = payload.accessToken
      this.accessTokenExpiresAt = Date.now() + payload.expiresIn * 1000
      localStorage.setItem('shonga_access_token', payload.accessToken)
      localStorage.setItem('shonga_access_token_expires_at', String(this.accessTokenExpiresAt))
      sessionStorage.removeItem('shonga_access_token')
      localStorage.setItem('shonga_refresh_token', payload.refreshToken)
      localStorage.setItem('shonga_user', JSON.stringify(payload.user))
      this.scheduleRefresh()
    },
    async login(input) {
      this.loading = true
      try {
        const { data } = await apolloClient.mutate({ mutation: LOGIN, variables: { input } })
        this.saveSession(data.login)
      } finally {
        this.loading = false
      }
    },
    async register(input) {
      this.loading = true
      try {
        const { data } = await apolloClient.mutate({ mutation: REGISTER, variables: { input } })
        this.saveSession(data.register)
      } finally {
        this.loading = false
      }
    },
    scheduleRefresh() {
      if (this.refreshTimer) window.clearTimeout(this.refreshTimer)
      if (!this.accessTokenExpiresAt) return
      const delay = Math.max(this.accessTokenExpiresAt - Date.now() - 60_000, 0)
      this.refreshTimer = window.setTimeout(() => this.restoreSession(true), delay)
    },
    async restoreSession(force = false) {
      const tokenIsFresh = this.isAuthenticated && this.accessTokenExpiresAt > Date.now() + 60_000
      if (!force && tokenIsFresh) {
        this.scheduleRefresh()
        return true
      }
      const refreshToken = localStorage.getItem('shonga_refresh_token')
      if (!refreshToken) {
        this.clearSession()
        return false
      }
      if (!this.restoring) {
        this.restoring = apolloClient
          .mutate({ mutation: REFRESH, variables: { token: refreshToken } })
          .then(({ data }) => {
            this.saveSession(data.refreshToken)
            return true
          })
          .catch((error) => {
            const graphQLErrors = error?.errors ?? error?.graphQLErrors ?? []
            const refreshWasRejected = graphQLErrors.some(
              (item) => item.extensions?.code === 'UNAUTHENTICATED',
            )
            if (refreshWasRejected) {
              this.clearSession()
              return false
            }
            // Uma falha temporária de rede/API não deve terminar a sessão do utilizador.
            if (this.refreshTimer) window.clearTimeout(this.refreshTimer)
            this.refreshTimer = window.setTimeout(() => this.restoreSession(true), 30_000)
            return this.isAuthenticated
          })
          .finally(() => {
            this.restoring = null
          })
      }
      return this.restoring
    },
    clearSession() {
      this.user = null
      this.accessToken = null
      this.accessTokenExpiresAt = 0
      if (this.refreshTimer) window.clearTimeout(this.refreshTimer)
      this.refreshTimer = null
      sessionStorage.removeItem('shonga_access_token')
      localStorage.removeItem('shonga_access_token')
      localStorage.removeItem('shonga_access_token_expires_at')
      localStorage.removeItem('shonga_refresh_token')
      localStorage.removeItem('shonga_user')
    },
    async logout() {
      const refreshToken = localStorage.getItem('shonga_refresh_token')
      this.loading = true
      try {
        if (refreshToken)
          await apolloClient.mutate({ mutation: LOGOUT, variables: { refreshToken } })
      } catch {
        // A sessão local deve terminar mesmo quando a API estiver indisponível.
      } finally {
        this.clearSession()
        await apolloClient.clearStore().catch(() => undefined)
        this.loading = false
      }
    },
  },
})
