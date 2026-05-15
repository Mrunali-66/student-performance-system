/**
 * src/pages/Register.jsx
 * Fields: username · password · role (student/teacher) · branch dropdown
 *
 * Branches:
 *   Data Science | Python Development | Java Development | AI & Machine Learning
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

const BRANCHES = [
  'Data Science',
  'Python Development',
  'Java Development',
  'AI & Machine Learning',
]

const ROLES = [
  { value: 'student', label: '🎓 Student', desc: 'Track my own performance' },
  { value: 'teacher', label: '📚 Teacher', desc: 'Manage students & analytics' },
]

const RULES = {
  username: authValidators.username,
  password: authValidators.password,
  role:     authValidators.role,
  branch:   authValidators.branch,
}

export default function Register() {
  const { login, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1) // 2-step form

  const { values, errors, handleChange, handleBlur, validate, setValues } =
    useFormValidation(
      { username: '', password: '', role: '', branch: '' },
      RULES,
    )

  if (authLoading) return <LoadingSpinner fullScreen />

  // ── Step 1 partial validation ─────────────────────────────────────────────
  const canProceed = values.username.length >= 3 && values.password.length >= 6

  const handleRoleSelect = (role) => {
    setValues(prev => ({ ...prev, role }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const data = await authService.register(values)
      toast.success('Account created! Welcome to EduTrack 🎉')
      login(data.user, data.token)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Registration failed.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-2xl p-8 animate-slide-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
            Create Account
          </h2>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            Join EduTrack to track academic performance
          </p>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s
                      ? 'text-white'
                      : ''
                  }`}
                    style={{
                      background: step >= s ? 'var(--cyan)' : 'var(--surface3)',
                      color:      step >= s ? '#fff' : 'var(--text3)',
                    }}>
                    {step > s ? '✓' : s}
                  </div>
                  <span className="text-xs font-medium" style={{ color: step >= s ? 'var(--text)' : 'var(--text3)' }}>
                    {s === 1 ? 'Credentials' : 'Role & Branch'}
                  </span>
                </div>
                {s < 2 && (
                  <div className="flex-1 h-px mx-1" style={{ background: step > s ? 'var(--cyan)' : 'var(--border)', transition: 'background .3s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* ── Step 1: Username + Password ─────────────────────────────── */}
          {step === 1 && (
            <>
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
                    placeholder="Choose a username (min 3 chars, no spaces)"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
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
                    autoComplete="new-password"
                    placeholder="Min 6 characters"
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
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                             background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <span className="err-msg">{errors.password}</span>}

                {/* Password strength indicator */}
                {values.password && (
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          background: values.password.length > i * 3 + 2
                            ? (values.password.length >= 10 ? 'var(--green)' : values.password.length >= 6 ? 'var(--yellow)' : 'var(--red)')
                            : 'var(--surface3)',
                        }} />
                    ))}
                    <span className="text-xs ml-1" style={{
                      color: values.password.length >= 10 ? 'var(--green)' : values.password.length >= 6 ? 'var(--yellow)' : 'var(--red)',
                    }}>
                      {values.password.length >= 10 ? 'Strong' : values.password.length >= 6 ? 'Good' : 'Weak'}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep(2)}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                Continue →
              </button>
            </>
          )}

          {/* ── Step 2: Role + Branch ─────────────────────────────────────── */}
          {step === 2 && (
            <>
              {/* Role selection */}
              <div className="field">
                <label>Select Your Role</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRoleSelect(r.value)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: values.role === r.value ? 'rgba(6,182,212,.12)' : 'var(--surface2)',
                        border: `1px solid ${values.role === r.value ? 'var(--cyan)' : 'var(--border)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div className="text-base mb-0.5">{r.label.split(' ')[0]}</div>
                      <div className="text-xs font-semibold" style={{ color: values.role === r.value ? 'var(--cyan)' : 'var(--text)' }}>
                        {r.label.split(' ').slice(1).join(' ')}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
                {errors.role && <span className="err-msg">{errors.role}</span>}
              </div>

              {/* Branch dropdown */}
              <div className="field">
                <label>Branch / Department</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
                    style={{ color: 'var(--text3)' }}>🏫</span>
                  <select
                    name="branch"
                    value={values.branch}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
                    style={{
                      paddingLeft: 38,
                      background: 'var(--surface2)',
                      border: `1px solid ${errors.branch ? 'var(--red)' : 'var(--border2)'}`,
                      color: values.branch ? 'var(--text)' : 'var(--text3)',
                      borderRadius: 8,
                      padding: '10px 12px 10px 38px',
                      fontSize: 13, width: '100%',
                      fontFamily: 'var(--font)', outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    <option value="" disabled>Select your branch…</option>
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
                    style={{ color: 'var(--text3)' }}>▼</span>
                </div>
                {errors.branch && <span className="err-msg">{errors.branch}</span>}
              </div>

              {/* Summary chip */}
              {values.username && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'rgba(6,182,212,.08)', border: '1px solid rgba(6,182,212,.2)', color: 'var(--text2)' }}>
                  <span>👤</span>
                  <span><strong style={{ color: 'var(--cyan)' }}>{values.username}</strong> · {values.role || '…'} · {values.branch || '…'}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-ghost btn-lg"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : (
                    'Create Account ✓'
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text3)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text3)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--cyan)' }}>
            Sign in here →
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
