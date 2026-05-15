/**
 * src/components/ui/index.jsx
 * Reusable UI components: Cards, Tables, Modal, Loader, EmptyState, Badge, ScoreBar
 */
import React from 'react'

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, accent = 'cyan', link, linkLabel, onClick }) {
  const accentMap = {
    cyan:   { bg: 'var(--cyan-g)',   border: 'rgba(6,182,212,.18)',   color: 'var(--cyan)'   },
    blue:   { bg: 'var(--blue-d)',   border: 'rgba(59,130,246,.18)',  color: 'var(--blue)'   },
    green:  { bg: 'var(--green-d)',  border: 'rgba(16,185,129,.18)',  color: 'var(--green)'  },
    yellow: { bg: 'var(--yellow-d)', border: 'rgba(245,158,11,.18)',  color: 'var(--yellow)' },
    red:    { bg: 'var(--red-d)',    border: 'rgba(239,68,68,.18)',   color: 'var(--red)'    },
    purple: { bg: 'var(--purple-d)', border: 'rgba(139,92,246,.18)',  color: 'var(--purple)' },
  }
  const a = accentMap[accent] || accentMap.cyan

  return (
    <div
      onClick={onClick}
      className="stat-card fu"
      style={{
        background: `linear-gradient(135deg, var(--surface) 0%, ${a.bg} 100%)`,
        border: `1px solid ${a.border}`,
        borderRadius: 14,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', right: -14, top: -14,
        width: 80, height: 80, borderRadius: '50%',
        background: a.bg, border: `1px solid ${a.border}`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.5, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
            {value ?? '—'}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: a.bg, border: `1px solid ${a.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      {link && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${a.border}` }}>
          <a href={link} style={{ fontSize: 12, color: a.color, fontWeight: 600, textDecoration: 'none' }}>
            {linkLabel || 'View all →'}
          </a>
        </div>
      )}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, title, subtitle, actions, style, className = '' }) {
  return (
    <div className={`card fu ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-hdr">
          {title && (
            <div>
              <div className="card-title">{title}</div>
              {subtitle && <div className="card-sub">{subtitle}</div>}
            </div>
          )}
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ score, height = 5 }) {
  const p   = Math.min(100, Math.max(0, score || 0))
  const col = p < 40 ? 'var(--red)' : p <= 65 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: col, borderRadius: 99, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28, fontFamily: 'var(--mono)', textAlign: 'right' }}>
        {p.toFixed(0)}
      </span>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, type }) {
  const map = {
    'Weak':          { bg: 'var(--red-d)',    color: 'var(--red)',    border: 'rgba(239,68,68,.25)'   },
    'Top Performer': { bg: 'var(--green-d)',  color: 'var(--green)',  border: 'rgba(16,185,129,.25)'  },
    'Average':       { bg: 'var(--blue-d)',   color: 'var(--blue)',   border: 'rgba(59,130,246,.25)'  },
    'Critical':      { bg: 'var(--red-d)',    color: 'var(--red)',    border: 'rgba(239,68,68,.25)'   },
    'High':          { bg: 'var(--yellow-d)', color: 'var(--yellow)', border: 'rgba(245,158,11,.25)'  },
    'Moderate':      { bg: 'var(--blue-d)',   color: 'var(--blue)',   border: 'rgba(59,130,246,.25)'  },
  }
  const style = map[label] || { bg: 'var(--surface2)', color: 'var(--text2)', border: 'var(--border)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    }}>
      {label || '—'}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader({ message = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 56, gap: 14 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--surface3)', borderTop: '3px solid var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text3)', fontSize: 13 }}>{message}</span>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'Nothing here', description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 56, gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text2)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 280, lineHeight: 1.6 }}>{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 18, width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,.5)',
        animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, error, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="err-msg">{error}</span>}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ error, ...props }) {
  return <input className={error ? 'err' : ''} {...props} />
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ columns, data, rowKey = 'id', emptyIcon, emptyTitle, emptyDesc, loading }) {
  if (loading) return <Loader />
  if (!data || data.length === 0) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c.key || c.label}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={row[rowKey] || ri}>
              {columns.map(c => (
                <td key={c.key || c.label}>
                  {c.render ? c.render(row[c.key], row, ri) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── BranchTag ─────────────────────────────────────────────────────────────────
export function BranchTag({ branch }) {
  if (!branch) return null
  return (
    <span style={{
      fontSize: 10, color: 'var(--cyan)', background: 'rgba(6,182,212,.1)',
      border: '1px solid rgba(6,182,212,.2)', borderRadius: 6, padding: '2px 8px',
    }}>
      🏫 {branch}
    </span>
  )
}
