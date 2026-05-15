/**
 * src/utils/api.js — backwards-compat re-export.
 * All new code should import from '../services/api'.
 */
export { default, setAuthToken, setLogoutCallback } from '../services/api'
