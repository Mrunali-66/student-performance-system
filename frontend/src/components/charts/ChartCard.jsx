/**
 * src/components/charts/ChartCard.jsx
 * Wrapper card for any chart with header, subtitle, optional actions, and loading skeleton.
 */
import React from 'react'

export default function ChartCard({ title, subtitle, actions, children, loading, minHeight = 260, style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      minHeight,
      ...style,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2, color: 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? <ChartSkeleton /> : children}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: '100%', minHeight: 160, padding: '0 8px' }}>
      {[65, 40, 80, 55, 90, 35, 70, 50, 85, 45].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0',
            background: 'var(--surface2)',
            animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
