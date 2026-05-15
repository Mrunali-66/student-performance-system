/**
 * src/services/authService.js
 * Centralised auth API calls.
 *
 * FIXES:
 *  - verify() was calling GET /auth/verify (without /api prefix).
 *    The backend now serves BOTH /auth/verify AND /api/auth/verify so this
 *    continues to work — no URL change needed here.
 *    Kept as /auth/verify to match existing backend alias route.
 *
 * Endpoints:
 *   POST /login         { username, password }   → alias route
 *   POST /register      { username, password, role, branch }  → alias route
 *   GET  /auth/verify   (requires JWT)           → alias route
 */
import api from './api'

export const authService = {
  /**
   * Login
   * @param {{ username: string, password: string }} credentials
   * @returns {{ user, token, message }}
   */
  login: async ({ username, password }) => {
    const res = await api.post('/login', { username, password })
    return res.data
  },

  /**
   * Register
   * @param {{ username: string, password: string, role: string, branch: string }} data
   * @returns {{ user, token, message }}
   */
  register: async ({ username, password, role, branch }) => {
    const res = await api.post('/register', { username, password, role, branch })
    return res.data
  },

  /**
   * Verify stored JWT with backend.
   * Called by AuthContext on every page refresh.
   * Backend serves GET /auth/verify as alias of GET /api/auth/verify.
   * @returns {{ valid: boolean, user }}
   */
  verify: async () => {
    const res = await api.get('/auth/verify')
    return res.data
  },

  /**
   * Logout — revoke current JWT on backend.
   */
  logout: async () => {
    const res = await api.post('/api/auth/logout')
    return res.data
  },
}

export default authService
