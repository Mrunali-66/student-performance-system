import React, { useEffect, useState } from 'react'
import api from '../utils/api'

function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 65 ? 'var(--cyan)' : score >= 50 ? 'var(--yellow)' : 'var(--red)'
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : 'At Risk'
  return (
    <div className="score-ring" style={{ borderColor: color, color }}>
      <div className="score-ring-num">{score?.toFixed(1)}</div>
      <div className="score-ring-lbl">{label}</div>
    </div>
  )
}

function Bar({ val, max = 100, color }) {
  const pct = Math.min(100, (val / max) * 100)
  return (
    <div className="score-meta-bar">
      <div className="sbar-track" style={{ flex: 1 }}>
        <div className="sbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', minWidth: 32 }}>
        {val?.toFixed?.(1) ?? val}
      </span>
    </div>
  )
}

export default function AnalysisModal({ studentId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/students/${studentId}/analysis`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [studentId])

  if (!data && !loading) return null

  const scoreColor = !data ? 'var(--text3)'
    : data.performance_score >= 80 ? 'var(--green)'
    : data.performance_score >= 65 ? 'var(--cyan)'
    : data.performance_score >= 50 ? 'var(--yellow)'
    : 'var(--red)'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fu">
        <button className="modal-close" onClick={onClose}>✕</button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>⏳ Loading analysis...</div>
        ) : (
          <>
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="s-av" style={{ width: 44, height: 44, fontSize: 16, borderRadius: 10 }}>
                  {data.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="modal-name">{data.name}</div>
                  <div className="modal-batch">
                    {data.batch && <span style={{ marginRight: 12 }}>📚 Batch: {data.batch}</span>}
                    <span className={`badge ${data.category === 'Weak' ? 'bw' : data.category === 'Top Performer' ? 'bt' : 'ba'}`}>
                      {data.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score + bars */}
            <div className="score-ring-wrap">
              <ScoreRing score={data.performance_score} />
              <div className="score-meta" style={{ flex: 1 }}>
                {[
                  { label: 'Attendance',    val: data.attendance,            max: 100, color: 'var(--cyan)'   },
                  { label: 'Study Hours/wk',val: data.study_hours,           max: 40,  color: 'var(--blue)'   },
                  { label: 'Prev Score',    val: data.prev_score,            max: 100, color: 'var(--purple)' },
                  { label: 'Assignments',   val: data.assignments_completed, max: 15,  color: 'var(--green)'  },
                ].map(row => (
                  <div key={row.label} className="score-meta-row">
                    <div className="score-meta-label" style={{ minWidth: 110 }}>{row.label}</div>
                    <Bar val={row.val} max={row.max} color={row.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>
                Score Breakdown
              </div>
              <div className="breakdown-grid">
                {[
                  { label: 'Attendance', val: data.score_breakdown?.attendance_contribution,  color: 'var(--cyan)'   },
                  { label: 'Study Hrs',  val: data.score_breakdown?.study_contribution,       color: 'var(--blue)'   },
                  { label: 'Prev Score', val: data.score_breakdown?.prev_score_contribution,  color: 'var(--purple)' },
                  { label: 'Assignments',val: data.score_breakdown?.assignments_contribution, color: 'var(--green)'  },
                ].map(b => (
                  <div key={b.label} className="breakdown-card">
                    <div className="breakdown-val" style={{ color: b.color }}>{b.val?.toFixed(1)}</div>
                    <div className="breakdown-lbl">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="analysis-grid">
              <div className="analysis-box">
                <div className="analysis-box-title" style={{ color: 'var(--green)' }}>✅ Strengths</div>
                {data.strengths?.length ? data.strengths.map((s, i) => (
                  <div key={i} className="analysis-item">
                    <span style={{ color: 'var(--green)', marginTop: 1 }}>●</span> {s}
                  </div>
                )) : <div className="analysis-item" style={{ color: 'var(--text3)' }}>None identified</div>}
              </div>
              <div className="analysis-box">
                <div className="analysis-box-title" style={{ color: 'var(--red)' }}>⚠ Weaknesses</div>
                {data.weaknesses?.length ? data.weaknesses.map((w, i) => (
                  <div key={i} className="analysis-item">
                    <span style={{ color: 'var(--red)', marginTop: 1 }}>●</span> {w}
                  </div>
                )) : <div className="analysis-item" style={{ color: 'var(--text3)' }}>None identified</div>}
              </div>
            </div>

            {/* Suggestions */}
            <div className="analysis-box">
              <div className="analysis-box-title" style={{ color: 'var(--cyan)' }}>💡 Suggestions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.suggestions?.map((s, i) => (
                  <div key={i} className="analysis-item">
                    <span style={{ color: 'var(--cyan)', marginTop: 1 }}>{i + 1}.</span> {s}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
