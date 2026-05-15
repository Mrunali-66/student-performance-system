/**
 * src/pages/EditProfile.jsx
 * Allows any authenticated user (teacher or student) to update their
 * username, branch/batch, and password.
 */
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { setAuthToken } from '../services/api'
import toast from 'react-hot-toast'

export default function EditProfile() {
  const { user, updateUser } = useAuth()

  // ── form state ─────────────────────────────────────────────────────────────
  const [username,         setUsername]         = useState(user?.username || '')
  const [branch,           setBranch]           = useState(user?.branch   || '')
  const [currentPassword,  setCurrentPassword]  = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [saving,           setSaving]           = useState(false)
  const [showCurrent,      setShowCurrent]      = useState(false)
  const [showNew,          setShowNew]          = useState(false)
  const [showConfirm,      setShowConfirm]      = useState(false)

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }

    const payload = {}
    if (username.trim() && username.trim() !== user.username) payload.username = username.trim()
    if (branch.trim()   && branch.trim()   !== user.branch)   payload.branch   = branch.trim()
    if (newPassword) {
      payload.current_password = currentPassword
      payload.new_password     = newPassword
    }

    if (Object.keys(payload).length === 0) {
      toast('No changes detected.', { icon: 'ℹ️' })
      return
    }

    try {
      setSaving(true)
      const res = await api.put('/api/auth/profile', payload)
      const { token, user: updatedUser } = res.data

      // Persist new token + user, update AuthContext without navigating
      updateUser(updatedUser, token)

      toast.success('Profile updated!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update profile.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 24px', maxWidth: 560 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          Edit Profile
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text3)' }}>
          Update your username, branch, or password.
        </p>
      </div>

      {/* Avatar card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px', marginBottom: 24,
        background: 'var(--surface2)', borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {(user?.username || user?.name)?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
            {user?.username || user?.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cyan)', textTransform: 'capitalize', marginTop: 2 }}>
            {user?.role} · {user?.branch || '—'}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Account Info section ── */}
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--border)', paddingBottom: 6,
        }}>
          Account Info
        </div>

        {/* Username */}
        <div>
          <label style={labelStyle}>Username</label>
          <input
            style={inputStyle}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter new username"
            autoComplete="username"
          />
        </div>

        {/* Branch */}
        <div>
          <label style={labelStyle}>Branch / Batch</label>
          <input
            style={inputStyle}
            type="text"
            value={branch}
            onChange={e => setBranch(e.target.value)}
            placeholder="e.g. CSE, EEE, 2025"
            autoComplete="off"
          />
        </div>

        {/* ── Change Password section ── */}
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--border)', paddingBottom: 6,
          marginTop: 8,
        }}>
          Change Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </div>

        {/* Current password */}
        <div>
          <label style={labelStyle}>Current Password</label>
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent(p => !p)}
            placeholder="Required only if changing password"
            autoComplete="current-password"
          />
        </div>

        {/* New password */}
        <div>
          <label style={labelStyle}>New Password</label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew(p => !p)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
          />
        </div>

        {/* Confirm new password */}
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm(p => !p)}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div style={{ marginTop: 5, fontSize: 12, color: 'var(--red)' }}>
              Passwords do not match.
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: 8,
            padding: '11px 28px',
            background: saving ? 'var(--surface3)' : 'var(--cyan)',
            color: saving ? 'var(--text3)' : '#fff',
            border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all .15s', alignSelf: 'flex-start',
          }}
        >
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </form>
    </div>
  )
}

// ── small reusable sub-components ─────────────────────────────────────────────

const labelStyle = {
  display: 'block',
  fontSize: 12, fontWeight: 600, color: 'var(--text2)',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)',
  fontSize: 13, outline: 'none',
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, autoComplete }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        style={{ ...inputStyle, paddingRight: 42 }}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', fontSize: 15, padding: 0,
        }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
