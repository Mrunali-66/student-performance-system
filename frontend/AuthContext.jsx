/**
 * src/context/AuthContext.jsx
 * RBAC-aware auth context with JWT persistence.
 *
 * FIXES:
 *  1. logout() now calls POST /api/auth/logout to revoke token on backend
 *     before clearing local state (previously only cleared localStorage).
 *  2. login() normalises user object: backend returns { id, username, name,
 *     role, branch, batch } — both 'username' and 'name' are present now
 *     (User.to_dict() returns both). Safe either way.
 *  3. Redirect after login: teacher → /teacher-dashboard,
 *     student → /student-dashboard. Already correct.
 *
 * Stored in localStorage under:
 *   edutrack_token  — raw JWT string
 *   edutrack_user   — JSON-serialised user object
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAuthToken, setLogoutCallback } from '../services/api'
import authService from '../services/authService'

const AuthContext = createContext(null)

const TOKEN_KEY = 'edutrack_token'
const USER_KEY  = 'edutrack_user'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Try to revoke token on backend (best-effort — ignore errors)
    try {
      await authService.logout()
    } catch (_) {
      // Token may already be expired — still clear local state
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAuthToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    setLogoutCallback(logout)

    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser  = localStorage.getItem(USER_KEY)

    if (!savedToken || !savedUser) {
      setLoading(false)
      return
    }

    setAuthToken(savedToken)

    authService.verify()
      .then(res => {
        const freshUser = res?.user ?? JSON.parse(savedUser)
        setUser(freshUser)
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      })
      .catch(() => {
        // Token invalid/expired — clear everything silently
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setAuthToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [logout])

  // ── login ──────────────────────────────────────────────────────────────────
  const login = (userData, jwtToken) => {
    // Normalise: ensure both 'name' and 'username' are set
    const normalisedUser = {
      ...userData,
      name:     userData.name     || userData.username,
      username: userData.username || userData.name,
    }
    localStorage.setItem(TOKEN_KEY, jwtToken)
    localStorage.setItem(USER_KEY,  JSON.stringify(normalisedUser))
    setAuthToken(jwtToken)
    setUser(normalisedUser)

    // Role-based redirect
    if (normalisedUser.role === 'teacher') {
      navigate('/teacher-dashboard', { replace: true })
    } else {
      navigate('/student-dashboard', { replace: true })
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isTeacher: user?.role === 'teacher',
      isStudent:  user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
