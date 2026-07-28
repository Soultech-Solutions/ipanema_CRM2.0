import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055'
const staticToken = import.meta.env.VITE_DIRECTUS_TOKEN || ''

export const directus = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

directus.interceptors.request.use(config => {
  const token = localStorage.getItem('directus_token') || staticToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function tryRefresh (): Promise<string | null> {
  const refresh = localStorage.getItem('directus_refresh_token')
  if (!refresh) return null

  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, {
      refresh_token: refresh,
      mode: 'json',
    })
    const access = data.data.access_token as string
    const nextRefresh = (data.data.refresh_token as string) || refresh
    localStorage.setItem('directus_token', access)
    localStorage.setItem('directus_refresh_token', nextRefresh)
    return access
  } catch {
    localStorage.removeItem('directus_token')
    localStorage.removeItem('directus_refresh_token')
    localStorage.removeItem('directus_user')
    return null
  }
}

directus.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status
    const url = original?.url || ''

    if (
      status === 401
      && original
      && !original._retry
      && !url.includes('/auth/login')
      && !url.includes('/auth/refresh')
      && !url.includes('/auth/logout')
    ) {
      original._retry = true
      refreshPromise ??= tryRefresh().finally(() => {
        refreshPromise = null
      })
      const access = await refreshPromise
      if (access) {
        original.headers.Authorization = `Bearer ${access}`
        return directus(original)
      }
    }

    return Promise.reject(error)
  },
)
