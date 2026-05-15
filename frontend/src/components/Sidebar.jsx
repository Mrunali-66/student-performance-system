import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TEACHER_NAV = [
  { to: '/teacher-dashboard', label: 'Dashboard',      icon: '⊞', end: true },
  { to: '/analytics',         label: 'Analytics',      icon: '📊' },
  { to: '/students',          label: 'All Students',   icon: '👥' },
  { to: '/weak-students',     label: 'Weak Students',  icon: '⚠️' },
  { to: '/predict',           label: 'Predict Score',  icon: '⚡' },
]

const STUDENT_NAV = [
  { to: '/student-dashboard', label: 'My Dashboard', icon: '⊞', end: true },
]

// Edit Profile is shared across all roles
const PROFILE_NAV = [
  { to: '/profile', label: 'Edit Profile', icon: '✏️' },
]

export default function Sidebar({ apiOk }) {
  const { user, logout } = useAuth()
  const NAV = user?.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">E</div>
        <div className="logo-text">
          <strong>EduTrack</strong>
          <span>Performance Monitor</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">
          {user?.role === 'teacher' ? 'Teacher Menu' : 'Student Menu'}
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}

        <div className="nav-label" style={{ marginTop: 16 }}>Account</div>
        {PROFILE_NAV.map(n => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{
            marginBottom: 12, padding: '10px 12px',
            background: 'var(--surface2)', borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                {(user.username || user.name)?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 12 }}>
                  {user.username || user.name}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: 10, textTransform: 'capitalize' }}>
                  {user.role}
                </div>
              </div>
            </div>
            {user.branch && (
              <div style={{
                fontSize: 10, color: 'var(--cyan)', background: 'rgba(6,182,212,.1)',
                border: '1px solid rgba(6,182,212,.2)', borderRadius: 6,
                padding: '2px 8px', display: 'inline-block',
              }}>
                🏫 {user.branch}
              </div>
            )}
          </div>
        )}

        <div className="api-status">
          <div className={`api-dot ${apiOk ? 'on' : 'off'}`} />
          <div>
            <div style={{ color: apiOk ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 10.5 }}>
              {apiOk ? 'API Connected' : 'API Disconnected'}
            </div>
            <div>localhost:5000</div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            marginTop: 10, width: '100%', padding: '8px',
            background: 'var(--surface3)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, transition: 'all .15s',
          }}
          onMouseOver={e => { e.target.style.background = 'var(--red-d)'; e.target.style.color = 'var(--red)' }}
          onMouseOut={e => { e.target.style.background = 'var(--surface3)'; e.target.style.color = 'var(--text2)' }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}
