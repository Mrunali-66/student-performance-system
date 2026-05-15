import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const PAGES = {
  '/':                  ['Home', 'Dashboard'],
  '/teacher-dashboard': ['Home › Teacher', 'Teacher Dashboard'],
  '/student-dashboard': ['Home › Student', 'My Dashboard'],
  '/analytics':         ['Home › Analytics', 'Analytics'],
  '/students':          ['Home › Students', 'All Students'],
  '/weak-students':     ['Home › Students › At Risk', 'At-Risk Students'],
  '/add-student':       ['Home › Students › Add New', 'Add Student'],
  '/predict':           ['Home › Tools › Predict', 'Score Predictor'],
  '/dashboard':         ['Home › Dashboard', 'Dashboard'],
  '/profile':           ['Home › Account', 'Edit Profile'],
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const dateStr = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Topbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [bc, title] = PAGES[pathname] || ['Home', 'EduTrack']
  const { isDark, toggle } = useTheme()

  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">
          {bc.split('›').map((b, i, a) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--text3)' }}>›</span>}
              <span style={{ color: i === a.length - 1 ? 'var(--cyan)' : 'var(--text3)' }}>
                {b.trim()}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="topbar-title">{title}</div>
      </div>

      <div className="topbar-right">
        <div className="live-badge">
          <div className="live-dot" />
          Live Data
        </div>

        <button className="theme-toggle" onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {isDark ? '☀️' : '🌙'}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <div className="topbar-greeting">
          <strong>{greeting()}, {(user?.username || user?.name)?.split(' ')[0] || 'User'}</strong>
          <small>{dateStr()}</small>
        </div>

        {user?.branch && (
          <div style={{
            fontSize: 10, color: 'var(--cyan)',
            background: 'rgba(6,182,212,.1)',
            border: '1px solid rgba(6,182,212,.25)',
            borderRadius: 20, padding: '3px 10px', fontWeight: 600,
          }}>
            {user.branch}
          </div>
        )}

        <div
          className="avatar"
          title={`${user?.username} · ${user?.role} — Click to edit profile`}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
        >
          {(user?.username || user?.name)?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
