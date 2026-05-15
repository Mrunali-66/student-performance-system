/**
 * src/pages/StudentDashboard.jsx  [STUDENT ONLY]
 *
 * Improvements:
 *  1. Fixed API response handling (analysis from r.data.analysis)
 *  2. "Assignment Score" -> "Assignment Submitted" (0-10 scale)
 *  3. Added Personal Analysis tab with charts and insights
 *  4. Performance trend visualization (radar/bar charts using SVG)
 *  5. Strengths, weaknesses, and recommendations clearly displayed
 *  6. Loading/error states properly handled
 *  7. Prediction status with confidence and risk info
 */
import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import MLAnalysisPanel from '../components/MLAnalysisPanel'
import {
  exportToCSV,
  STUDENT_CSV_COLUMNS,
  STUDENT_CSV_HEADERS,
  downloadStudentPDF,
} from '../utils/exportUtils'

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const cls = level === 'Weak' ? 'badge bw' : level === 'Top Performer' ? 'badge bt' : 'badge ba'
  return <span className={cls}>{level || 'Unanalyzed'}</span>
}

function ScoreBar({ score }) {
  const p   = Math.min(100, Math.max(0, score || 0))
  const col = p < 40 ? 'var(--red)' : p <= 75 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="sbar">
      <div className="sbar-track" style={{ flex: 1 }}>
        <div className="sbar-fill" style={{ width: `${p}%`, background: col }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: col, minWidth: 32 }}>
        {p.toFixed(1)}
      </span>
    </div>
  )
}

/** Circular gauge for performance score */
function PerformanceGauge({ score, label }) {
  const p    = Math.min(100, Math.max(0, score || 0))
  const r    = 52
  const circ = 2 * Math.PI * r
  const dash = (p / 100) * circ
  const col  = p < 40 ? '#ef4444' : p <= 75 ? '#eab308' : '#22c55e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--surface3)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r}
          fill="none" stroke={col} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dasharray .6s ease' }}
        />
        <text x="65" y="60" textAnchor="middle" fill={col} fontSize="22" fontWeight="800" fontFamily="var(--mono)">
          {p.toFixed(0)}
        </text>
        <text x="65" y="78" textAnchor="middle" fill="var(--text3)" fontSize="10">
          / 100
        </text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  )
}

/** Horizontal bar chart for score breakdown */
function BreakdownChart({ breakdown }) {
  if (!breakdown || !Object.keys(breakdown).length) return null
  const items = Object.entries(breakdown)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(([key, val]) => {
        const pct = Math.min(100, Math.max(0, val || 0))
        const col = pct < 40 ? '#ef4444' : pct <= 75 ? '#eab308' : '#22c55e'
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text2)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--mono)', color: col, fontWeight: 700 }}>{pct.toFixed(1)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 4,
                background: col, transition: 'width .5s ease'
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Probability distribution bar */
function ProbabilityBars({ probabilities }) {
  if (!probabilities || !Object.keys(probabilities).length) return null
  const colors = { Weak: '#ef4444', Average: '#eab308', Strong: '#22c55e' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(probabilities).map(([label, pct]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ minWidth: 60, fontSize: 12, color: colors[label] || 'var(--text2)', fontWeight: 600 }}>{label}</span>
          <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--surface3)' }}>
            <div style={{
              width: `${Math.min(100, pct || 0)}%`, height: '100%', borderRadius: 5,
              background: colors[label] || 'var(--blue)', transition: 'width .5s ease'
            }} />
          </div>
          <span style={{ minWidth: 36, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
            {parseFloat(pct || 0).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user, logout } = useAuth()

  const [record,    setRecord]    = useState(null)
  const [analysis,  setAnalysis]  = useState(null)
  const [form,      setForm]      = useState({})
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // ─── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/student/report')
      .then(r => {
        const d = r.data
        setRecord(d)
        setAnalysis(d.analysis || null)
        setForm({
          attendance:          d.attendance          || 0,
          study_hours:         d.study_hours         || 0,
          assignment_submitted: d.assignment_submitted ?? d.assignment_score ?? 0,
          internal_marks:      d.internal_marks      || d.test_score || 0,
        })
      })
      .catch(() => setError('Failed to load your performance data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // ─── Save edits ─────────────────────────────────────────────────────────────
  const saveUpdates = async () => {
    setSaving(true)
    try {
      await api.put('/student/update', form)
      toast.success('Updated! ML score recalculated.')
      setEditing(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  // ─── CSV export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!record) return toast.error('No data loaded yet')
    try {
      exportToCSV(
        [record],
        STUDENT_CSV_COLUMNS,
        STUDENT_CSV_HEADERS,
        `${(record.name || 'student').replace(/\s+/g, '_')}_report.csv`,
      )
      toast.success('CSV downloaded!')
    } catch (e) { toast.error('Export failed') }
  }

  // ─── PDF download ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!record) return toast.error('No data loaded yet')
    setExporting(true)
    try {
      await downloadStudentPDF(record, analysis, user?.name)
      toast.success('PDF downloaded!')
    } catch (e) { toast.error('PDF generation failed') }
    finally { setExporting(false) }
  }

  // ─── Field input helper ──────────────────────────────────────────────────────
  const inp = (key, label, max = '') => (
    <div className="field">
      <label>{label}</label>
      <input
        type="number" step="0.1" min="0" max={max || undefined}
        value={form[key] || 0}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
        disabled={!editing}
        style={{
          background: editing ? 'var(--surface2)' : 'var(--surface3)',
          opacity: editing ? 1 : 0.7,
        }}
      />
    </div>
  )

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'analysis',  label: '🔬 Personal Analysis' },
    { id: 'remarks',   label: '💬 Remarks' },
  ]

  const perfScore = parseFloat(record?.predicted_performance || record?.performance_score || 0)
  const predResult = record?.prediction_result || record?.risk_level || 'Unanalyzed'

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header fu" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Dashboard</h1>
          <p>Welcome back, <strong style={{ color: 'var(--cyan)' }}>{user?.name}</strong> — here's your performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} title="Download CSV">
            📥 CSV
          </button>
          <button className="btn btn-green btn-sm" onClick={handleDownloadPDF} disabled={exporting}>
            {exporting ? '⏳ Generating…' : '📄 PDF Report'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button className="btn btn-sm" onClick={load} style={{ marginLeft: 12 }}>Retry</button>
        </div>
      )}

      {loading && !record && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div>Loading your data…</div>
        </div>
      )}

      {record && (
        <>
          {/* ── Stats row ─────────────────────────────────────────────────── */}
          <div className="stats-grid">
            {[
              { cls: 'c-cyan', icon: '📅', lbl: 'Attendance',            val: `${record.attendance || 0}%` },
              { cls: 'c-blu',  icon: '📚', lbl: 'Study Hours/week',      val: `${record.study_hours || 0}h` },
              { cls: 'c-pur',  icon: '📝', lbl: 'Assignment Submitted',  val: `${(record.assignment_submitted ?? record.assignment_score ?? 0)}/10` },
              { cls: 'c-grn',  icon: '🎯', lbl: 'Test Score',            val: `${record.test_score || record.internal_marks || 0}/100` },
              { cls: 'c-red',  icon: '⚡', lbl: 'Predicted Score',       val: perfScore.toFixed(1) },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.cls} fu fu${i + 1}`}>
                <div className="stat-top">
                  <div>
                    <div className="stat-lbl">{s.lbl}</div>
                    <div className="stat-val">{s.val}</div>
                  </div>
                  <div className="stat-icon">{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab bar ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={activeTab === t.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setActiveTab(t.id)}
                style={{ fontSize: 12 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ──────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

              {/* Edit form */}
              <div className="card fu">
                <div className="card-hdr">
                  <div>
                    <div className="card-title">My Performance Data</div>
                    <div className="card-sub">Update your data to recalculate ML prediction</div>
                  </div>
                  {!editing
                    ? <button className="btn btn-edit btn-sm" onClick={() => setEditing(true)}>✏ Edit</button>
                    : <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={saveUpdates} disabled={saving}>
                          {saving ? '⏳' : 'Save'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                      </div>
                  }
                </div>
                <div className="form-grid">
                  {inp('attendance',           'Attendance (%)',           100)}
                  {inp('study_hours',           'Study Hours / Week',       168)}
                  {inp('assignment_submitted',  'Assignment Submitted (0–10)', 10)}
                  {inp('internal_marks',        'Test Score (0–100)',       100)}
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                    Predicted Performance
                  </div>
                  <ScoreBar score={perfScore} />
                  <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <RiskBadge level={predResult} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Risk: {parseFloat(record.risk_percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick ML snapshot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {analysis ? (
                  <MLAnalysisPanel
                    analysis={analysis}
                    score={perfScore}
                    riskLevel={predResult}
                    compact
                  />
                ) : (
                  <div className="card fu fu1" style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                    <div style={{ fontSize: 13 }}>ML analysis loading…</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Update your data to trigger analysis</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Personal Analysis tab ─────────────────────────────────────── */}
          {activeTab === 'analysis' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Performance Gauge + prediction */}
              <div className="card fu fu1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Overall Performance Score
                </div>
                <PerformanceGauge score={perfScore} label="Predicted Score" />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Prediction Status</span>
                    <RiskBadge level={predResult} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Risk Percentage</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 700 }}>
                      {parseFloat(record.risk_percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                  {analysis?.confidence !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text3)' }}>ML Confidence</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 700 }}>
                        {parseFloat(analysis.confidence || 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="card fu fu2">
                <div className="card-title" style={{ marginBottom: 14 }}>📊 Score Breakdown</div>
                {analysis?.score_breakdown && Object.keys(analysis.score_breakdown).length > 0 ? (
                  <BreakdownChart breakdown={analysis.score_breakdown} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Attendance',            val: parseFloat(record.attendance || 0) * 0.30, max: 30,  raw: `${record.attendance}%` },
                      { label: 'Test Score',            val: parseFloat(record.test_score || 0) * 0.30, max: 30,  raw: `${record.test_score}/100` },
                      { label: 'Study Hours',           val: Math.min(parseFloat(record.study_hours || 0) * 1.5, 25), max: 25, raw: `${record.study_hours}h/wk` },
                      { label: 'Assignment Submitted',  val: Math.min((record.assignment_submitted ?? record.assignment_score ?? 0) * 1.5, 15), max: 15, raw: `${record.assignment_submitted ?? record.assignment_score ?? 0}/10` },
                    ].map(({ label, val, max, raw }) => {
                      const pct = (val / max) * 100
                      const col = pct < 40 ? '#ef4444' : pct <= 70 ? '#eab308' : '#22c55e'
                      return (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text2)' }}>{label} <span style={{ color: 'var(--text3)' }}>({raw})</span></span>
                            <span style={{ fontFamily: 'var(--mono)', color: col, fontWeight: 700 }}>{val.toFixed(1)}/{max}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)' }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 4, background: col }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ML Probabilities */}
              {analysis?.probabilities && Object.keys(analysis.probabilities).length > 0 && (
                <div className="card fu fu3">
                  <div className="card-title" style={{ marginBottom: 14 }}>🎲 Category Probabilities</div>
                  <ProbabilityBars probabilities={analysis.probabilities} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>
                    Predicted by ML model based on your current performance data.
                  </div>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="card fu fu4">
                <div className="card-title" style={{ marginBottom: 14 }}>💪 Strengths &amp; Areas to Improve</div>
                {analysis?.strengths?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      ✅ Strengths
                    </div>
                    {(analysis.strengths || []).map((s, i) => (
                      <div key={i} style={{
                        background: '#22c55e15', border: '1px solid #22c55e30',
                        borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: 'var(--text2)'
                      }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {analysis?.weaknesses?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      ⚠ Weak Areas
                    </div>
                    {(analysis.weaknesses || []).map((w, i) => (
                      <div key={i} style={{
                        background: '#ef444415', border: '1px solid #ef444430',
                        borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: 'var(--text2)'
                      }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
                {(!analysis?.strengths?.length && !analysis?.weaknesses?.length) && (
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>Update your data to generate strengths and weak area analysis.</p>
                )}
              </div>

              {/* Recommendations */}
              {analysis?.suggestions?.length > 0 && (
                <div className="card fu" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-title" style={{ marginBottom: 14 }}>💡 Personalized Recommendations</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {(analysis.suggestions || []).map((s, i) => (
                      <div key={i} style={{
                        background: 'var(--surface3)', border: '1px solid var(--border2)',
                        borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text2)',
                        display: 'flex', gap: 10, alignItems: 'flex-start'
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                        <span style={{ lineHeight: 1.55 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick metrics summary */}
              <div className="card fu" style={{ gridColumn: '1 / -1' }}>
                <div className="card-title" style={{ marginBottom: 14 }}>📋 Performance Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Attendance',           val: `${record.attendance || 0}%`,           status: parseFloat(record.attendance) >= 75 ? 'good' : 'bad' },
                    { label: 'Test Score',            val: `${record.test_score || 0}/100`,         status: parseFloat(record.test_score) >= 50 ? 'good' : 'bad' },
                    { label: 'Assignment Submitted',  val: `${record.assignment_submitted ?? record.assignment_score ?? 0}/10`, status: parseFloat(record.assignment_submitted ?? record.assignment_score ?? 0) >= 6 ? 'good' : 'bad' },
                    { label: 'Study Hours/week',      val: `${record.study_hours || 0}h`,           status: parseFloat(record.study_hours) >= 10 ? 'good' : 'bad' },
                  ].map(({ label, val, status }) => (
                    <div key={label} style={{
                      background: status === 'good' ? '#22c55e12' : '#ef444412',
                      border: `1px solid ${status === 'good' ? '#22c55e30' : '#ef444430'}`,
                      borderRadius: 10, padding: '14px 16px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{status === 'good' ? '✅' : '⚠️'}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: status === 'good' ? 'var(--green)' : 'var(--red)' }}>
                        {val}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Remarks tab ───────────────────────────────────────────────── */}
          {activeTab === 'remarks' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
              <div className="card fu fu1">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
                  📋 Teacher Remarks
                </div>
                {record.remarks
                  ? <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{record.remarks}</p>
                  : <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>No remarks added yet by your teacher.</p>
                }
              </div>
              <div className="card fu fu2">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
                  💡 Teacher Recommendations
                </div>
                {record.recommendations
                  ? <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{record.recommendations}</p>
                  : <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>No recommendations yet.</p>
                }
              </div>
              <div className="card fu fu3" style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
                  🙋 My Notes &amp; Self-Remarks
                </div>
                <StudentNoteBox />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Student self-note box ────────────────────────────────────────────────────

function StudentNoteBox() {
  const STORAGE_KEY = 'edutrack_student_notes'
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)

  const addNote = () => {
    if (!draft.trim()) return
    const updated = [
      { id: Date.now(), text: draft.trim(), date: new Date().toLocaleDateString('en-IN') },
      ...notes,
    ]
    setNotes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setDraft('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const deleteNote = id => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <div>
      <textarea
        rows={3}
        placeholder="e.g. 'Why did my predicted score drop?' / 'I plan to study 2 more hours this week'"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        style={{
          width: '100%', background: 'var(--surface3)', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13,
          resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.55, outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', marginTop: 8 }}>
        {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Note added</span>}
        <button className="btn btn-primary btn-sm" onClick={addNote}>+ Add Note</button>
      </div>
      {notes.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} style={{
              background: 'var(--surface3)', borderRadius: 8, padding: '10px 14px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{n.text}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{n.date}</div>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 0 }}
                title="Delete note"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
