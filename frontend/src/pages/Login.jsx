/**
 * src/pages/Login.jsx
 * Username + password login with JWT.
 * Fields: username, password
 */
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../layouts/AuthLayout'
import authService from '../services/authService'
import { useFormValidation } from '../hooks/useFormValidation'
import { authValidators } from '../utils/validators'
import LoadingSpinner from '../components/LoadingSpinner'

const RULES = {
  username: authValidators.username,
  password: authValidators.password,
}

export default function Login() {
  const { login, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { values, errors, handleChange, handleBlur, validate } = useFormValidation(
    { username: '', password: '' },
    RULES,
  )

  if (authLoading) return <LoadingSpinner fullScreen />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const data = await authService.login(values)
      toast.success(`Welcome back, ${data.user?.name || data.user?.username}! 👋`)
      login(data.user, data.token)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Check your credentials.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      {/* Card */}
      <div className="rounded-2xl p-8 animate-slide-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
            Sign In
          </h2>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            Access your dashboard to monitor performance
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Username */}
          <div className="field">
            <label>Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
                style={{ color: 'var(--text3)' }}>👤</span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={values.username}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={submitting}
                className={errors.username ? 'err' : ''}
                style={{
                  paddingLeft: 38,
                  background: 'var(--surface2)',
                  border: `1px solid ${errors.username ? 'var(--red)' : 'var(--border2)'}`,
                  color: 'var(--text)', borderRadius: 8,
                  padding: '10px 12px 10px 38px',
                  fontSize: 13, width: '100%',
                  fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
              />
            </div>
            {errors.username && <span className="err-msg">{errors.username}</span>}
          </div>

          {/* Password */}
          <div className="field">
            <label>Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
                style={{ color: 'var(--text3)' }}>🔒</span>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={submitting}
                style={{
                  paddingLeft: 38, paddingRight: 40,
                  background: 'var(--surface2)',
                  border: `1px solid ${errors.password ? 'var(--red)' : 'var(--border2)'}`,
                  color: 'var(--text)', borderRadius: 8,
                  padding: '10px 40px 10px 38px',
                  fontSize: 13, width: '100%',
                  fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className="err-msg">{errors.password}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, position: 'relative' }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text3)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Register link */}
        <p className="text-center text-sm" style={{ color: 'var(--text3)' }}>
          Don't have an account?{' '}
          <Link to="/register"
            className="font-semibold hover:underline"
            style={{ color: 'var(--cyan)' }}>
            Register here →
          </Link>
        </p>
      </div>

      {/* Demo credentials hint */}
      <div className="mt-4 rounded-xl p-4 text-xs text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)' }}>
        <strong style={{ color: 'var(--text2)' }}>Demo:</strong>&nbsp;
        Teacher → <code style={{ color: 'var(--cyan)' }}>teacher1 / pass123</code>
        &nbsp;&nbsp;Student → <code style={{ color: 'var(--cyan)' }}>student1 / pass123</code>
      </div>
    </AuthLayout>
  )
}
