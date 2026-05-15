import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setAuthToken, setLogoutCallback } from './utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // ─── logout ────────────────────────────────────────────────────────────────
  // Defined with useCallback so it's stable as a reference — safe to pass to
  // setLogoutCallback and use in useEffect deps.
  const logout = useCallback(() => {
    localStorage.removeItem('edutrack_token')
    localStorage.removeItem('edutrack_user')
    setAuthToken(null)         // clear axios token
    setUser(null)
    navigate('/login')
  }, [navigate])

  // ─── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Register logout as the 401 handler for the axios interceptor.
    // This means any expired-token 401 calls the real React logout, not a
    // hard window.location redirect that would leave React state stale.
    setLogoutCallback(logout)

    const savedToken = localStorage.getItem('edutrack_token')
    const savedUser  = localStorage.getItem('edutrack_user')

    if (!savedToken || !savedUser) {
      setLoading(false)
      return
    }

    // Optimistically hydrate the token into axios so the verify call itself
    // can carry the Authorization header.
    setAuthToken(savedToken)

    // Validate the token server-side before trusting it.
    // If your backend doesn't have /auth/verify yet, swap this for a lightweight
    // authenticated endpoint like GET /auth/me or GET /health.
    api.get('/auth/verify')
      .then(res => {
        // Server confirmed token is valid. Use the fresh user object from the
        // server response if available, otherwise fall back to localStorage.
        const freshUser = res.data?.user ?? JSON.parse(savedUser)
        setUser(freshUser)
        // Keep localStorage in sync with any server-side field updates
        localStorage.setItem('edutrack_user', JSON.stringify(freshUser))
      })
      .catch(() => {
        // Token is expired or invalid — clean up and force re-login.
        // Note: the 401 interceptor will also fire here, but logout() is
        // idempotent so calling it twice is safe.
        logout()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [logout])

  // ─── login ─────────────────────────────────────────────────────────────────
  const login = (userData, jwtToken) => {
    localStorage.setItem('edutrack_token', jwtToken)
    localStorage.setItem('edutrack_user', JSON.stringify(userData))
    setAuthToken(jwtToken)     // inject into axios immediately
    setUser(userData)
    // Role-based redirect
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
