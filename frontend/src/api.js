import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:5000', timeout: 10000 })

// ─── Module-level token store ────────────────────────────────────────────────
// AuthContext calls setAuthToken(jwt) on login and setAuthToken(null) on logout.
// This avoids reading localStorage on every request (race-condition-safe).
let _token = null
let _logoutCallback = null

export function setAuthToken(token) {
  _token = token
}

// AuthContext registers its logout() here so the 401 interceptor can call
// the real React logout instead of using window.location.href (which skips
// clearing React state).
export function setLogoutCallback(fn) {
  _logoutCallback = fn
}

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(config => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

// ─── Response interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Call the AuthContext logout (clears state + localStorage + navigates)
      if (_logoutCallback) {
        _logoutCallback()
      } else {
        // Fallback before AuthContext has registered its callback
        localStorage.removeItem('edutrack_token')
        localStorage.removeItem('edutrack_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
