/**
 * src/components/MLAnalysisPanel.jsx
 *
 * Reusable ML analysis display — shows strengths, weaknesses, suggestions,
 * a visual prediction gauge, and a student questions/remarks section.
 *
 * Props:
 *   analysis    { strengths[], weaknesses[], suggestions[] }
 *   score       number  (0-100 predicted score)
 *   riskLevel   string
 *   compact     boolean (default false) — smaller variant for modals
 */
import React, { useState } from 'react'

function ScoreGauge({ score }) {
  const pct   = Math.min(100, Math.max(0, score || 0))
  const col   = pct < 40 ? 'var(--red)' : pct <= 75 ? 'var(--yellow)' : 'var(--green)'
  const label = pct < 40 ? 'At Risk' : pct <= 75 ? 'Moderate' : 'Strong'

  // SVG arc gauge
  const r  = 52, cx = 70, cy = 70
  const circumference = Math.PI * r  // half-circle
  const arcLen = (pct / 100) * circumference

  const toPoint = (angle) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  })
  const startAngle = 180
  const endAngle   = 180 + (pct / 100) * 180
  const p1 = toPoint(startAngle)
  const p2 = toPoint(endAngle)
  const large = pct > 50 ? 1 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={140} height={82} viewBox="0 0 140 82">
        {/* Track */}
        <path
          d={`M ${toPoint(180).x} ${toPoint(180).y} A ${r} ${r} 0 0 1 ${toPoint(360).x} ${toPoint(360).y}`}
          fill="none" stroke="var(--surface3)" strokeWidth={10} strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`}
            fill="none" stroke={col} strokeWidth={10} strokeLinecap="round"
            style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        )}
        {/* Score */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={800}
          fill={col} fontFamily="var(--mono, monospace)">{pct.toFixed(0)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill="var(--text3)"
          fontFamily="var(--font, sans-serif)" letterSpacing="1">{label.toUpperCase()}</text>
      </svg>
      <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: -6 }}>
        Predicted Score / 100
      </div>
    </div>
  )
}

function AnalysisItem({ text, bullet, color }) {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      padding: '5px 0',
      borderBottom: '1px solid var(--border)',
      fontSize: 13, color: 'var(--text2)', lineHeight: 1.55,
    }}>
      <span style={{ color, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>{bullet}</span>
      <span>{text}</span>
    </div>
  )
}

export default function MLAnalysisPanel({ analysis, score, riskLevel, compact = false }) {
  const [studentNote, setStudentNote] = useState('')
  const [noteSaved, setNoteSaved]     = useState(false)

  const saveNote = () => {
    // Persist note locally (could be wired to API)
    if (studentNote.trim()) {
      localStorage.setItem('edutrack_student_note', studentNote)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2500)
    }
  }

  const strength = analysis?.strengths   || []
  const weakness = analysis?.weaknesses  || []
  const suggest  = analysis?.suggestions || []
  const hasData  = strength.length || weakness.length || suggest.length

  if (!hasData && !score) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Gauge + quick stats */}
      {score !== undefined && (
        <div className="card fu" style={{ padding: compact ? '14px 16px' : undefined }}>
          <div style={{
            display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <ScoreGauge score={score} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                fontSize: compact ? 11 : 10, fontWeight: 700, letterSpacing: 1.2,
                textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4,
              }}>
                Performance Breakdown
              </div>

              {[
                { label: 'Strengths Identified',  count: strength.length, color: 'var(--green)' },
                { label: 'Areas to Improve',       count: weakness.length, color: 'var(--red)' },
                { label: 'Suggestions Provided',   count: suggest.length,  color: 'var(--cyan)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.color, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{item.label}</div>
                  <div style={{
                    fontWeight: 800, fontSize: 14, color: item.color,
                    fontFamily: 'var(--mono, monospace)',
                  }}>{item.count}</div>
                </div>
              ))}

              {riskLevel && (
                <div style={{
                  marginTop: 4, padding: '4px 10px', borderRadius: 6,
                  background: riskLevel === 'Top Performer' ? 'rgba(34,197,94,0.12)'
                            : riskLevel === 'Weak' ? 'rgba(239,68,68,0.12)'
                            : 'rgba(234,179,8,0.12)',
                  color: riskLevel === 'Top Performer' ? 'var(--green)'
                       : riskLevel === 'Weak' ? 'var(--red)'
                       : 'var(--yellow)',
                  fontSize: 11, fontWeight: 700, display: 'inline-block',
                }}>
                  {riskLevel}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Strengths */}
      {strength.length > 0 && (
        <div className="analysis-box card fu" style={{ padding: compact ? '12px 14px' : '16px 20px' }}>
          <div className="analysis-box-title" style={{ color: 'var(--green)', marginBottom: 8 }}>
            ✅ Strengths
          </div>
          {strength.map((s, i) => (
            <AnalysisItem key={i} text={s} bullet="●" color="var(--green)" />
          ))}
        </div>
      )}

      {/* Weaknesses */}
      {weakness.length > 0 && (
        <div className="analysis-box card fu" style={{ padding: compact ? '12px 14px' : '16px 20px' }}>
          <div className="analysis-box-title" style={{ color: 'var(--red)', marginBottom: 8 }}>
            ⚠ Areas Needing Improvement
          </div>
          {weakness.map((w, i) => (
            <AnalysisItem key={i} text={w} bullet="●" color="var(--red)" />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggest.length > 0 && (
        <div className="analysis-box card fu" style={{ padding: compact ? '12px 14px' : '16px 20px' }}>
          <div className="analysis-box-title" style={{ color: 'var(--cyan)', marginBottom: 8 }}>
            💡 AI Suggestions
          </div>
          {suggest.map((s, i) => (
            <AnalysisItem key={i} text={s} bullet={`${i + 1}.`} color="var(--cyan)" />
          ))}
        </div>
      )}

      {/* Student questions / notes */}
      {!compact && (
        <div className="card fu" style={{ border: '1px solid var(--border2)' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: 'var(--text3)', marginBottom: 10,
          }}>
            📝 My Notes & Questions
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
            Write questions for your teacher or personal study notes:
          </div>
          <textarea
            rows={4}
            placeholder="e.g. I want to improve my attendance — what's a good schedule? / Why is my predicted score lower this week?"
            value={studentNote}
            onChange={e => setStudentNote(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface3)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13,
              resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.55,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 10, alignItems: 'center' }}>
            {noteSaved && (
              <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Saved locally</span>
            )}
            <button className="btn btn-primary btn-sm" onClick={saveNote}>
              💾 Save Note
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Notes are saved in your browser. Share with your teacher during sessions.
          </div>
        </div>
      )}
    </div>
  )
}
