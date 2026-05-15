/**
 * src/AuthContext.jsx — RBAC-aware auth context (single canonical version)
 *
 * FIXES:
 *  1. Duplicate file: pages/AuthContext.jsx imported from './utils/api' (wrong path).
 *     pages/AuthContext.jsx is now DELETED — only this file remains.
 *  2. /auth/verify endpoint is now present in backend (auth_routes.py), so the
 *     token validation call on mount will succeed instead of always 404-ing.
 *  3. setLogoutCallback wired correctly before the token validation call so
 *     the 401 interceptor calls React logout (not window.location fallback).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setAuthToken, setLogoutCallback } from './utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('edutrack_token')
    localStorage.removeItem('edutrack_user')
    setAuthToken(null)
    setUser(null)
    navigate('/login')
  }, [navigate])

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Register logout BEFORE the verify call so the 401 interceptor uses it
    setLogoutCallback(logout)

    const savedToken = localStorage.getItem('edutrack_token')
    const savedUser  = localStorage.getItem('edutrack_user')

    if (!savedToken || !savedUser) {
      setLoading(false)
      return
    }

    // Inject token into axios so the verify call carries Authorization header
    setAuthToken(savedToken)

    // Validate with backend — endpoint added in auth_routes.py
    api.get('/auth/verify')
      .then(res => {
        const freshUser = res.data?.user ?? JSON.parse(savedUser)
        setUser(freshUser)
        localStorage.setItem('edutrack_user', JSON.stringify(freshUser))
      })
      .catch(() => {
        // Token expired or invalid — force re-login
        logout()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [logout])

  // ── login ─────────────────────────────────────────────────────────────────
  const login = (userData, jwtToken) => {
    localStorage.setItem('edutrack_token', jwtToken)
    localStorage.setItem('edutrack_user', JSON.stringify(userData))
    setAuthToken(jwtToken)
    setUser(userData)
    if (userData.role === 'teacher') {
      navigate('/teacher-dashboard')
    } else {
      navigate('/student-dashboard')
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
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
