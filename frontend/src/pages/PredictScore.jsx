/**
 * src/pages/PredictScore.jsx
 * Changes:
 *  - "Previous Score" → "Test Score"
 *  - Now calls live /teacher/predict endpoint instead of client-side formula
 *  - Improved visualization with gauges and breakdown
 */
import React, { useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const GUIDE = [
  { label: 'Excellent',       range: '80–100', color: 'var(--green)'  },
  { label: 'Good',            range: '65–79',  color: 'var(--cyan)'   },
  { label: 'Needs Attention', range: '50–64',  color: 'var(--yellow)' },
  { label: 'High Risk',       range: '0–49',   color: 'var(--red)'    },
]

function GaugeChart({ value, color, size = 180 }) {
  const cx = size / 2, cy = size / 2 + 10
  const r = size / 2 - 16
  const startAngle = -200
  const totalArc = 220
  const angle = startAngle + (value / 100) * totalArc
  const toRad = a => (a * Math.PI) / 180
  const trailPath = describeArc(cx, cy, r, startAngle, startAngle + totalArc)
  const fillPath = value > 0 ? describeArc(cx, cy, r, startAngle, angle) : null

  function describeArc(x, y, r, s, e) {
    const s1 = toRad(s), e1 = toRad(e)
    const x1 = x + r * Math.cos(s1), y1 = y + r * Math.sin(s1)
    const x2 = x + r * Math.cos(e1), y2 = y + r * Math.sin(e1)
    const large = (e - s) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <svg width={size} height={size * 0.75}>
      <path d={trailPath} fill="none" stroke="var(--surface3)" strokeWidth={14} strokeLinecap="round" />
      {fillPath && (
        <path d={fillPath} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke .6s ease' }} />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={32} fontWeight={900} fontFamily="'JetBrains Mono', monospace">
        {value.toFixed(1)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" fontSize={11}>
        predicted score
      </text>
    </svg>
  )
}

/* Mini factor bars */
function FactorBar({ label, value, max, color }) {
  const w = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: 'var(--mono)' }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .6s ease' }} />
      </div>
    </div>
  )
}

export default function PredictScore() {
  const [form, setForm] = useState({ attendance: '', study_hours: '', test_score: '', assignments: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const predict = async () => {
    const a = parseFloat(form.attendance), s = parseFloat(form.study_hours),
          t = parseFloat(form.test_score), asgn = parseFloat(form.assignments)
    if ([a, s, t, asgn].some(isNaN)) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      const res = await api.post('/teacher/predict', {
        attendance: a,
        study_hours: s,
        test_score: t,
        assignment_submitted: asgn,
      })
      setResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const score = result
    ? parseFloat(result.performance_score ?? result.predicted_performance ?? result.prediction_score ?? 0)
    : null
  const rc = score === null ? 'var(--text)' : score >= 80 ? 'var(--green)' : score >= 65 ? 'var(--cyan)' : score >= 50 ? 'var(--yellow)' : 'var(--red)'
  const rl = score === null ? '' : score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Needs Attention' : 'High Risk'

  return (
    <div className="page">
      <div className="page-header fu">
        <h1>⚡ Score Predictor</h1>
        <p>Use the live ML model to predict a student's expected performance</p>
      </div>

      <div className="predict-grid">
        {/* ── Input ── */}
        <div className="card fu">
          <div className="card-hdr"><div className="card-title">Input Parameters</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
            {[
              { name: 'attendance',   label: '📊 Attendance (%)',       ph: 'e.g. 85' },
              { name: 'study_hours',  label: '📚 Study Hours / Week',   ph: 'e.g. 18' },
              { name: 'test_score',   label: '📝 Test Score',           ph: 'e.g. 72' },
              { name: 'assignments',  label: '✅ Assignment Submitted (0-10)', ph: 'e.g. 7'  },
            ].map(f => (
              <div key={f.name} className="field">
                <label style={{ color: 'var(--text2)', textTransform: 'none', letterSpacing: 0, fontSize: 12, fontWeight: 600 }}>
                  {f.label}
                </label>
                <input name={f.name} type="number" value={form[f.name]} onChange={handle} placeholder={f.ph} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" onClick={predict} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '⏳ Running ML Model…' : '⚡ Run Prediction'}
          </button>
        </div>

        {/* ── Result ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card fu fu1" style={{ flex: 1 }}>
            <div className="predict-result">
              {score === null ? (
                <>
                  <div style={{ fontSize: 48 }}>🎯</div>
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>Enter student data and run the prediction</p>
                </>
              ) : (
                <>
                  <GaugeChart value={score} color={rc} />
                  <div style={{ fontSize: 17, fontWeight: 700, color: rc }}>{rl}</div>
                  {result?.risk_level && (
                    <span className={result.risk_level === 'Weak' ? 'badge bw' : result.risk_level === 'Top Performer' ? 'badge bt' : 'badge ba'}>
                      {result.risk_level}
                    </span>
                  )}
                  {result?.risk_percentage !== undefined && (
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Risk: <span style={{ color: rc, fontWeight: 700 }}>{parseFloat(result.risk_percentage).toFixed(1)}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Factor breakdown when result shown */}
          {score !== null && (
            <div className="card fu fu2">
              <div className="card-title" style={{ marginBottom: 14 }}>Input Breakdown</div>
              <FactorBar label="Attendance (%)"    value={parseFloat(form.attendance)}  max={100} color="var(--cyan)"   />
              <FactorBar label="Test Score"         value={parseFloat(form.test_score)}  max={100} color="var(--blue)"   />
              <FactorBar label="Study Hours/wk"    value={parseFloat(form.study_hours)} max={20}  color="var(--purple)" />
              <FactorBar label="Assignments Done"  value={parseFloat(form.assignments)} max={20}  color="var(--green)"  />
            </div>
          )}

          <div className="card fu fu3">
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 13 }}>Score Guide</div>
            <div className="score-guide">
              {GUIDE.map(g => (
                <div key={g.label} className="sg-row">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="sg-dot" style={{ background: g.color }} />{g.label}
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: 11.5 }}>{g.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
