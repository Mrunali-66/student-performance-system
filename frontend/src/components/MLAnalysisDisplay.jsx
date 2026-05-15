/**
 * src/components/MLAnalysisDisplay.jsx
 * Reusable ML analysis display – full and compact modes
 */
import React from 'react'

export default function MLAnalysisDisplay({ analysis, compact = false }) {
  if (!analysis) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
      📊 No analysis available yet
    </div>
  )

  const { strengths = [], weaknesses = [], suggestions = [] } = analysis

  if (compact) return (
    <div className="analysis-grid">
      <div className="analysis-box">
        <div className="analysis-box-title" style={{ color: 'var(--green)' }}>✅ Strengths</div>
        {strengths.map((s, i) => <div key={i} className="analysis-item">● {s}</div>)}
      </div>
      <div className="analysis-box">
        <div className="analysis-box-title" style={{ color: 'var(--red)' }}>⚠ Weaknesses</div>
        {weaknesses.map((w, i) => <div key={i} className="analysis-item">● {w}</div>)}
      </div>
    </div>
  )

  return (
    <div>
      <div className="analysis-grid">
        {strengths.length > 0 && (
          <div className="analysis-box">
            <div className="analysis-box-title" style={{ color: 'var(--green)' }}>✅ Strengths ({strengths.length})</div>
            {strengths.map((s, i) => (
              <div key={i} className="analysis-item" style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>●</span><span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="analysis-box">
            <div className="analysis-box-title" style={{ color: 'var(--red)' }}>⚠ Weaknesses ({weaknesses.length})</div>
            {weaknesses.map((w, i) => (
              <div key={i} className="analysis-item" style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>●</span><span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="analysis-box" style={{ marginTop: 12 }}>
          <div className="analysis-box-title" style={{ color: 'var(--cyan)' }}>💡 Suggestions ({suggestions.length})</div>
          {suggestions.map((s, i) => (
            <div key={i} className="analysis-item" style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{i + 1}.</span><span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}