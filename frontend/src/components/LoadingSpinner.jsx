import React from 'react'

export default function LoadingSpinner({ fullScreen = false, size = 36, label = 'Loading…' }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size} height={size} viewBox="0 0 24 24"
        className="animate-spin"
        style={{ color: 'var(--cyan)' }}
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <path className="opacity-80" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label && (
        <span className="text-sm font-medium" style={{ color: 'var(--text3)' }}>{label}</span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)', zIndex: 9999 }}>
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  )
}
