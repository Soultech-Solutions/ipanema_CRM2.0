import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { directus } from '@/api/directusClient'

const ACCESS_KEY = 'directus_token'
const REFRESH_KEY = 'directus_refresh_token'
const USER_KEY = 'directus_user'

export interface AuthUser {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

function readUser (): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))
  const user = ref<AuthUser | null>(readUser())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const displayName = computed(() => {
    if (!user.value) return ''
    const name = [user.value.first_name, user.value.last_name].filter(Boolean).join(' ')
    return name || user.value.email
  })

  function persistSession (access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  }

  function clearSession () {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function fetchMe () {
    const { data } = await directus.get('/users/me', {
      params: { fields: ['id', 'email', 'first_name', 'last_name'] },
    })
    const me = data.data as AuthUser
    user.value = me
    localStorage.setItem(USER_KEY, JSON.stringify(me))
    return me
  }

  async function login (email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await directus.post('/auth/login', {
        email: email.trim(),
        password,
      })
      const access = data.data.access_token as string
      const refresh = data.data.refresh_token as string
      persistSession(access, refresh)
      await fetchMe()
    } catch (error_) {
      clearSession()
      const message = (error_ as { response?: { data?: { errors?: { message?: string }[] } } })
        ?.response?.data?.errors?.[0]?.message
        || (error_ instanceof Error ? error_.message : 'Falha no login')
      error.value = message
      throw new Error(message)
    } finally {
      loading.value = false
    }
  }

  async function refreshAccessToken (): Promise<string | null> {
    if (!refreshToken.value) return null
    try {
      const { data } = await directus.post('/auth/refresh', {
        refresh_token: refreshToken.value,
        mode: 'json',
      })
      const access = data.data.access_token as string
      const refresh = (data.data.refresh_token as string) || refreshToken.value
      persistSession(access, refresh)
      return access
    } catch {
      clearSession()
      return null
    }
  }

  async function logout () {
    const refresh = refreshToken.value
    clearSession()
    if (refresh) {
      try {
        await directus.post('/auth/logout', { refresh_token: refresh })
      } catch {
        // ignore — session already cleared locally
      }
    }
  }

  async function hydrate () {
    if (!accessToken.value) return false
    try {
      await fetchMe()
      return true
    } catch {
      const next = await refreshAccessToken()
      if (!next) return false
      try {
        await fetchMe()
        return true
      } catch {
        clearSession()
        return false
      }
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    error,
    isAuthenticated,
    displayName,
    login,
    logout,
    refreshAccessToken,
    hydrate,
    clearSession,
  }
})
