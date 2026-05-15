/**
 * src/services/authService.js
 * Centralised auth API calls.
 *
 * Endpoints expected from Flask backend:
 *   POST /login    { username, password }
 *   POST /register { username, password, role, branch }
 *   GET  /auth/verify  (requires JWT)
 */
import api from './api'

export const authService = {
  /**
   * Login
   * @param {{ username: string, password: string }} credentials
   * @returns {{ user, token }}
   */
  login: async ({ username, password }) => {
    const res = await api.post('/login', { username, password })
    return res.data
  },

  /**
   * Register
   * @param {{ username: string, password: string, role: string, branch: string }} data
   * @returns {{ user, token }}
   */
  register: async ({ username, password, role, branch }) => {
    const res = await api.post('/register', { username, password, role, branch })
    return res.data
  },

  /**
   * Verify stored JWT with backend
   * @returns {{ user }}
   */
  verify: async () => {
    const res = await api.get('/auth/verify')
    return res.data
  },
}

export default authService
