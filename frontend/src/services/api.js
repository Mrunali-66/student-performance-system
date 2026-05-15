/**
 * src/services/api.js
 * Single Axios instance for EduTrack — every service imports from here.
 *
 * Features:
 *  - JWT auto-attach via request interceptor
 *  - 401 → auto-logout via response interceptor
 *  - Base URL from VITE_API_URL env var (defaults to localhost:5000)
 *  - 12s timeout
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Module-level auth state ───────────────────────────────────────────────────
let _token          = null
let _logoutCallback = null

/** Called by AuthContext on login / logout */
export function setAuthToken(token) {
  _token = token
}

/** Called by AuthContext once on mount — registers its logout() fn */
export function setLogoutCallback(fn) {
  _logoutCallback = fn
}

// ── Request interceptor: inject JWT ──────────────────────────────────────────
api.interceptors.request.use(
  config => {
    if (_token) {
      config.headers.Authorization = `Bearer ${_token}`
    } else {
      delete config.headers.Authorization
    }
    return config
  },
  err => Promise.reject(err),
)

// ── Response interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      if (_logoutCallback) {
        _logoutCallback()
      } else {
        localStorage.removeItem('edutrack_token')
        localStorage.removeItem('edutrack_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
