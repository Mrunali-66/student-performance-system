/**
 * src/context/AuthContext.jsx
 * RBAC-aware auth context with JWT persistence.
 *
 * Stored in localStorage under:
 *   edutrack_token  — raw JWT string
 *   edutrack_user   — JSON-serialised user object
 *       { id, username, name, role, branch }
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
  const logout = useCallback(() => {
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
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  // ── login ──────────────────────────────────────────────────────────────────
  const login = (userData, jwtToken) => {
    localStorage.setItem(TOKEN_KEY, jwtToken)
    localStorage.setItem(USER_KEY,  JSON.stringify(userData))
    setAuthToken(jwtToken)
    setUser(userData)
    navigate(userData.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard', { replace: true })
  }

  // ── updateUser — refresh auth state without navigation ────────────────────
  const updateUser = (userData, jwtToken) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    if (jwtToken) {
      localStorage.setItem(TOKEN_KEY, jwtToken)
      setAuthToken(jwtToken)
    }
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUser,
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
