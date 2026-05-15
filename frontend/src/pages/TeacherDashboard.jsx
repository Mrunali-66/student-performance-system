/**
 * src/pages/TeacherDashboard.jsx  [TEACHER ONLY]
 * Changes:
 *  - "Internal Marks" column renamed to "Test Score"
 *  - Edit form field renamed to "Test Score"
 *  - Sends test_score (not internal_marks) to backend
 *  - Modal breakdown label updated
 *  - Improved dashboard UI, responsive layout, spacing
 *  - Removed /add-student link
 */
import React, { useEffect, useState, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import MLAnalysisPanel from '../components/MLAnalysisPanel'
import {
  exportToCSV,
  STUDENT_CSV_COLUMNS,
  STUDENT_CSV_HEADERS,
  downloadStudentPDF,
  downloadBatchPDF,
} from '../utils/exportUtils'

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const cls = level === 'Weak' ? 'badge bw' : level === 'Top Performer' ? 'badge bt' : 'badge ba'
  return <span className={cls}>{level || '—'}</span>
}

function SBar({ score }) {
  const p   = Math.min(100, Math.max(0, score || 0))
  const col = p < 40 ? 'var(--red)' : p <= 75 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="sbar">
      <div className="sbar-track" style={{ flex: 1 }}>
        <div className="sbar-fill" style={{ width: `${p}%`, background: col }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28, fontFamily: 'var(--mono)' }}>
        {p.toFixed(0)}
      </span>
    </div>
  )
}

function LeaderCard({ title, icon, students, scoreKey, colorFn }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-hdr">
        <div>
          <div className="card-title">{icon} {title}</div>
          <div className="card-sub">Top 5 by predicted score</div>
        </div>
      </div>
      <div className="leaderboard">
        {students.map((s, i) => {
          const sc = parseFloat(s[scoreKey] || 0)
          return (
            <div key={s.id} className="leader-row">
              <div className="leader-rank" style={{ color: colorFn(i) }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="s-av" style={{ flexShrink: 0 }}>{s.name?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.batch || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: colorFn(i), letterSpacing: -0.5 }}>
                  {sc.toFixed(0)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.attendance ?? '—'}% att</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BatchAnalysisPanel({ students }) {
  const batches = [...new Set(students.map(s => s.batch || 'Unknown'))]
  const stats = batches.map(b => {
    const pool   = students.filter(s => (s.batch || 'Unknown') === b)
    const scores = pool.map(s => parseFloat(s.predicted_performance || 0))
    const avg    = scores.reduce((a, x) => a + x, 0) / (scores.length || 1)
    return {
      batch: b,
      total: pool.length,
      avg:   avg.toFixed(1),
      top:   pool.filter(s => parseFloat(s.predicted_performance || 0) >= 76).length,
      weak:  pool.filter(s => parseFloat(s.predicted_performance || 0) < 40).length,
    }
  }).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))

  if (stats.length === 0) return null

  return (
    <div className="card fu" style={{ marginBottom: 22 }}>
      <div className="card-hdr">
        <div>
          <div className="card-title">📈 Batch Performance Analysis</div>
          <div className="card-sub">Comparative breakdown across all batches</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Students</th>
              <th>Avg Score</th>
              <th>Top Performers</th>
              <th>At Risk</th>
              <th>Score Bar</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={s.batch}>
                <td style={{ fontWeight: 600 }}>
                  {i === 0 && <span style={{ marginRight: 4 }}>🏆</span>}
                  {s.batch}
                </td>
                <td>{s.total}</td>
                <td>
                  <span style={{
                    fontWeight: 800, fontFamily: 'var(--mono)',
                    color: parseFloat(s.avg) >= 76 ? 'var(--green)' : parseFloat(s.avg) < 40 ? 'var(--red)' : 'var(--yellow)',
                  }}>{s.avg}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{s.top}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 4 }}>
                    ({s.total > 0 ? Math.round((s.top / s.total) * 100) : 0}%)
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--red)', fontWeight: 700 }}>{s.weak}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 4 }}>
                    ({s.total > 0 ? Math.round((s.weak / s.total) * 100) : 0}%)
                  </span>
                </td>
                <td style={{ minWidth: 120 }}>
                  <SBar score={parseFloat(s.avg)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const { user, logout } = useAuth()

  const [students,       setStudents]       = useState([])
  const [analytics,      setAnalytics]      = useState({})
  const [search,         setSearch]         = useState('')
  const [batchFilter,    setBatchFilter]    = useState('All')
  const [editId,         setEditId]         = useState(null)
  const [editData,       setEditData]       = useState({})
  const [reportId,       setReportId]       = useState(null)
  const [report,         setReport]         = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [batchPdfBusy,   setBatchPdfBusy]   = useState(false)
  const [studentPdfBusy, setStudentPdfBusy] = useState(false)
  const [showBatchAnalysis, setShowBatchAnalysis] = useState(false)
  const [error,          setError]          = useState('')

  const load = () => {
    Promise.all([
      api.get('/teacher/students'),
      api.get('/teacher/analytics'),
    ])
      .then(([s, a]) => {
        setStudents(Array.isArray(s.data) ? s.data : (s.data?.students || []))
        setAnalytics(a.data || {})
        setError('')
      })
      .catch(() => setError('Failed to load student data. Check API connection.'))
  }

  useEffect(() => {
    load()
    // Live update: re-fetch every 60 seconds
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const batches = useMemo(() =>
    ['All', ...new Set(students.map(s => s.batch || 'Unknown'))],
  [students])

  const visibleStudents = useMemo(() => {
    return students.filter(s => {
      const matchBatch  = batchFilter === 'All' || (s.batch || 'Unknown') === batchFilter
      const matchSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
      return matchBatch && matchSearch
    })
  }, [students, batchFilter, search])

  const batchPool = batchFilter === 'All' ? students : students.filter(s => (s.batch || 'Unknown') === batchFilter)

  const batchAnalytics = useMemo(() => {
    const pool = batchPool
    if (!pool.length) return { total: 0, top: 0, weak: 0, average: 0, avg_score: 0, critical: 0 }
    const scores = pool.map(s => parseFloat(s.predicted_performance || 0))
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length
    return {
      total:    pool.length,
      top:      pool.filter(s => parseFloat(s.predicted_performance || 0) >= 76).length,
      weak:     pool.filter(s => parseFloat(s.predicted_performance || 0) < 40).length,
      average:  avg.toFixed(1),
      critical: pool.filter(s => parseFloat(s.predicted_performance || 0) < 20).length,
    }
  }, [students, batchFilter])

  const topPerformers = [...batchPool].sort((a, b) => (b.predicted_performance || 0) - (a.predicted_performance || 0)).slice(0, 5)
  const weakStudents  = [...batchPool].sort((a, b) => (a.predicted_performance || 0) - (b.predicted_performance || 0)).slice(0, 5)

  // ── Actions ──────────────────────────────────────────────────────────────────
  const startEdit = s => {
    setEditId(s.id)
    setEditData({
      attendance:       s.attendance       || 0,
      study_hours:      s.study_hours      || 0,
      assignment_submitted: s.assignment_submitted ?? s.assignment_score ?? 0,
      test_score:       s.test_score       || s.internal_marks || 0,
      remarks:          s.remarks          || '',
      recommendations:  s.recommendations  || '',
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await api.put(`/teacher/student/${editId}`, editData)
      toast.success('Student updated! ML re-ran automatically.')
      setEditId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  const deleteStudent = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await api.delete(`/teacher/student/${id}`)
      toast.success(`${name} deleted.`)
      load()
    } catch { toast.error('Delete failed') }
  }

  const openReport = async id => {
    setReportId(id); setReport(null)
    try {
      const r = await api.get(`/teacher/student-report/${id}`)
      setReport(r.data)
    } catch { toast.error('Could not load report') }
  }

  const handleExportCSV = () => {
    try {
      const label   = batchFilter === 'All' ? 'all' : batchFilter.replace(/\s+/g, '_')
      const dataset = batchFilter === 'All' ? students : batchPool
      exportToCSV(dataset, STUDENT_CSV_COLUMNS, STUDENT_CSV_HEADERS, `students_${label}.csv`)
      toast.success('CSV downloaded!')
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Export failed')
    }
  }

  const handleBatchPDF = async () => {
    setBatchPdfBusy(true)
    try {
      const dataset = batchFilter === 'All' ? students : batchPool
      await downloadBatchPDF(dataset, batchFilter)
      toast.success('Batch PDF downloaded!')
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'PDF failed')
    } finally { setBatchPdfBusy(false) }
  }

  const handleStudentPDF = async () => {
    if (!report) return
    setStudentPdfBusy(true)
    try {
      await downloadStudentPDF(report, report.analysis, report.name)
      toast.success('PDF downloaded!')
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'PDF failed')
    } finally { setStudentPdfBusy(false) }
  }

  const inp = (key, placeholder, textarea = false) => textarea
    ? <textarea
        placeholder={placeholder}
        value={editData[key] || ''}
        rows={2}
        onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
        style={{
          background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 6,
          padding: '6px 10px', color: 'var(--text)', width: '100%', fontSize: 12,
          resize: 'vertical', fontFamily: 'var(--font)',
        }}
      />
    : <input
        type="number" step="0.1" min="0" placeholder={placeholder}
        value={editData[key] || 0}
        onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
        style={{
          background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 6,
          padding: '5px 8px', color: 'var(--text)', width: 70, fontSize: 12,
        }}
      />

  return (
    <div className="page">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="page-header fu" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Teacher Dashboard</h1>
          <p>Logged in as <strong style={{ color: 'var(--cyan)' }}>{user?.name}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBatchAnalysis(v => !v)}>
            📈 {showBatchAnalysis ? 'Hide' : 'Batch'} Analysis
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} title="Export CSV">
            📥 CSV
          </button>
          <button className="btn btn-green btn-sm" onClick={handleBatchPDF} disabled={batchPdfBusy}>
            {batchPdfBusy ? '⏳ Generating…' : '📄 Batch PDF'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* ── Batch filter bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginRight: 4 }}>Filter by batch:</span>
        {batches.map(b => (
          <button
            key={b}
            onClick={() => setBatchFilter(b)}
            className={batchFilter === b ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ fontSize: 12 }}
          >
            {b}
          </button>
        ))}
      </div>

      {/* ── Batch analysis (collapsible) ──────────────────────────────────────── */}
      {showBatchAnalysis && <BatchAnalysisPanel students={students} />}

      {/* ── Analytics Cards ───────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {[
          { cls: 'c-cyan', icon: '👥', lbl: 'Total Students', val: batchAnalytics.total },
          { cls: 'c-grn',  icon: '🏆', lbl: 'Top Performers', val: batchAnalytics.top },
          { cls: 'c-blu',  icon: '📊', lbl: 'Avg. Score',     val: batchAnalytics.average },
          { cls: 'c-red',  icon: '⚠',  lbl: 'At Risk',        val: batchAnalytics.weak },
          { cls: 'c-pur',  icon: '🔴', lbl: 'Critical (<20)', val: batchAnalytics.critical },
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

      {/* ── Leaderboards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
        <LeaderCard
          title="Top Performers" icon="🏆"
          students={topPerformers} scoreKey="predicted_performance"
          colorFn={i => i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text3)'}
        />
        <LeaderCard
          title="Needs Attention" icon="⚠"
          students={weakStudents} scoreKey="predicted_performance"
          colorFn={() => 'var(--red)'}
        />
      </div>

      {/* ── Students Table ───────────────────────────────────────────────────── */}
      <div className="card fu">
        <div className="card-hdr" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="card-title">
              {batchFilter === 'All' ? 'All Students' : `Batch: ${batchFilter}`}
            </div>
            <div className="card-sub">
              {visibleStudents.length} of {students.length} — Edit to update performance & teacher remarks
            </div>
          </div>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {visibleStudents.length === 0 ? (
          <div className="empty"><div className="empty-icon">🎓</div><p>No students found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Batch</th><th>Attendance</th><th>Study Hrs</th>
                  <th>Assign. Submitted</th><th>Test Score</th><th>Score</th><th>Risk</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map(s => (
                  <React.Fragment key={s.id}>
                    <tr>
                      {editId === s.id ? (
                        <>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <strong style={{ fontSize: 13 }}>{s.name}</strong>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.email}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text3)' }}>{s.batch || '—'}</td>
                          <td>{inp('attendance', '0-100')}</td>
                          <td>{inp('study_hours', 'hrs/wk')}</td>
                          <td>{inp('assignment_submitted', '0-10')}</td>
                          <td>{inp('test_score', '0-100')}</td>
                          <td colSpan={2} />
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                                {saving ? '⏳' : 'Save'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <div className="s-name">
                              <div className="s-av">{s.name?.[0]?.toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text3)' }}>{s.batch || '—'}</td>
                          <td>{s.attendance ?? '—'}%</td>
                          <td>{s.study_hours ?? '—'}h</td>
                          <td>{s.assignment_submitted ?? s.assignment_score ?? '—'} /10</td>
                          <td>{s.test_score ?? s.internal_marks ?? '—'}</td>
                          <td style={{ minWidth: 110 }}><SBar score={s.predicted_performance} /></td>
                          <td><RiskBadge level={s.risk_level} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <button className="btn btn-edit btn-sm" onClick={() => startEdit(s)}>Edit</button>
                              <button className="btn btn-green btn-sm" onClick={() => openReport(s.id)} title="View report">📊</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteStudent(s.id, s.name)}>Del</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {editId === s.id && (
                      <tr>
                        <td colSpan={9} style={{ background: 'var(--surface2)', padding: '12px 18px' }}>
                          <div className="form-grid" style={{ marginBottom: 0 }}>
                            <div className="field">
                              <label>📝 Teacher Remarks</label>
                              {inp('remarks', 'Write your remarks for this student…', true)}
                            </div>
                            <div className="field">
                              <label>💡 Recommendations</label>
                              {inp('recommendations', 'Write recommendations for improvement…', true)}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                            ℹ Remarks and recommendations will be visible to the student in their dashboard.
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Student Report Modal ─────────────────────────────────────────────── */}
      {reportId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReportId(null)}>
          <div className="modal fu" style={{ maxWidth: 660, maxHeight: '88vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setReportId(null)}>✕</button>

            {!report ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>⏳ Loading report…</div>
            ) : (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="s-av" style={{ width: 44, height: 44, fontSize: 16, borderRadius: 10 }}>
                      {report.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="modal-name">{report.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{report.email} · {report.batch || '—'}</div>
                      <RiskBadge level={report.risk_level} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-green btn-sm" onClick={handleStudentPDF} disabled={studentPdfBusy}>
                      {studentPdfBusy ? '⏳ Generating…' : '📄 Download PDF'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        exportToCSV([report], STUDENT_CSV_COLUMNS, STUDENT_CSV_HEADERS,
                          `${(report.name || 'student').replace(/\s+/g, '_')}_report.csv`)
                        toast.success('CSV downloaded!')
                      }}
                    >
                      📥 Download CSV
                    </button>
                  </div>
                </div>

                <div className="breakdown-grid" style={{ marginTop: 16 }}>
                  {[
                    { label: 'Attendance',    val: `${report.attendance || 0}%` },
                    { label: 'Study Hours',   val: `${report.study_hours || 0}h` },
                    { label: 'Assign. Submitted', val: report.assignment_submitted ?? report.assignment_score ?? 0 },
                    { label: 'Test Score',    val: report.test_score ?? report.internal_marks ?? 0 },
                    { label: 'Predicted',     val: parseFloat(report.predicted_performance || 0).toFixed(1) },
                    { label: 'Risk',          val: report.risk_level || '—' },
                  ].map((b, i) => (
                    <div key={i} className="breakdown-card">
                      <div className="breakdown-val">{b.val}</div>
                      <div className="breakdown-lbl">{b.label}</div>
                    </div>
                  ))}
                </div>

                {report.analysis && (
                  <div style={{ marginTop: 16 }}>
                    <MLAnalysisPanel
                      analysis={report.analysis}
                      score={report.predicted_performance}
                      riskLevel={report.risk_level}
                      compact
                    />
                  </div>
                )}

                {report.remarks && (
                  <div className="analysis-box" style={{ marginTop: 12 }}>
                    <div className="analysis-box-title" style={{ color: 'var(--yellow)' }}>📝 Teacher Remarks</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{report.remarks}</p>
                  </div>
                )}
                {report.recommendations && (
                  <div className="analysis-box" style={{ marginTop: 12 }}>
                    <div className="analysis-box-title" style={{ color: 'var(--cyan)' }}>💡 Recommendations</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{report.recommendations}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
