import axios from 'axios'

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
