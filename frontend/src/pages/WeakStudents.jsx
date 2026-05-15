/**
 * src/pages/WeakStudents.jsx  [TEACHER ONLY]
 *
 * Fixed & Improved:
 *  - API response correctly reads r.data.students (backend returns {students:[...], count:N})
 *  - Added loading state with spinner
 *  - Added retry button on error
 *  - Shows test_score, assignment_submitted, attendance, study_hours
 *  - Updated labels: "Assignment Submitted" (0-10)
 *  - Better risk classification with color coding
 *  - Improved performance insights per student
 */
import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import AnalysisModal from '../components/AnalysisModal'

function riskInfo(score) {
  const s = parseFloat(score || 0)
  if (s < 20) return { label: 'Critical', color: 'var(--red)',    bg: '#ef444418' }
  if (s < 35) return { label: 'High',     color: '#f97316',       bg: '#f9731618' }
  return              { label: 'Moderate', color: 'var(--yellow)', bg: '#eab30818' }
}

function perfBar(score, max = 100) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const col  = pct < 40 ? 'var(--red)' : pct < 60 ? '#f97316' : 'var(--yellow)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface3)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: col, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: col, minWidth: 28 }}>
        {parseFloat(score || 0).toFixed(1)}
      </span>
    </div>
  )
}

export default function WeakStudents() {
  const [students,    setStudents]    = useState([])
  const [batchFilter, setBatchFilter] = useState('All')
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [modalId,     setModalId]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/teacher/weak-students')
      .then(r => {
        // Backend returns { students: [...], count: N }
        const data = Array.isArray(r.data) ? r.data : (r.data?.students || [])
        setStudents(data)
      })
      .catch(e => setError('Failed to load: ' + (e?.response?.data?.error || e.message)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const batches  = ['All', ...new Set(students.map(s => s.batch || 'Unknown'))]
  const filtered = batchFilter === 'All'
    ? students
    : students.filter(s => (s.batch || 'Unknown') === batchFilter)

  // Summary stats
  const critical = filtered.filter(s => parseFloat(s.performance_score || 0) < 20).length
  const high     = filtered.filter(s => {
    const sc = parseFloat(s.performance_score || 0); return sc >= 20 && sc < 35
  }).length

  return (
    <div className="page">
      <div className="page-header fu">
        <h1>⚠ At-Risk Students</h1>
        <p>Students who need immediate academic intervention — performance score below 40</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Flagged', val: filtered.length, color: 'var(--red)',    icon: '🚨' },
          { label: 'Critical',      val: critical,         color: '#ef4444',       icon: '🔴' },
          { label: 'High Risk',     val: high,             color: '#f97316',       icon: '🟠' },
          { label: 'Moderate',      val: filtered.length - critical - high, color: 'var(--yellow)', icon: '🟡' },
        ].map(c => (
          <div key={c.label} className="card" style={{ flex: '1 1 120px', padding: '14px 18px', minWidth: 120 }}>
            <div style={{ fontSize: 22 }}>{c.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button className="btn btn-sm" onClick={load} style={{ marginLeft: 12 }}>Retry</button>
        </div>
      )}

      <div className="card fu">
        <div className="card-hdr">
          <div>
            <div className="card-title">Risk Report</div>
            <div className="card-sub">Sorted by severity — lowest performance first</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 13,
              }}
            >
              {batches.map(b => <option key={b}>{b}</option>)}
            </select>
            <div className="badge bw" style={{ padding: '4px 12px', fontSize: 12 }}>
              {filtered.length} flagged
            </div>
            <button className="btn btn-sm" onClick={load} disabled={loading} style={{ fontSize: 12 }}>
              {loading ? '⟳' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <p>Loading at-risk students…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
            <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 15 }}>All students on track!</p>
            <p style={{ marginTop: 4 }}>No at-risk students found for this filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Attendance %</th>
                  <th>Study Hrs/wk</th>
                  <th>Test Score</th>
                  <th>Assignments (0-10)</th>
                  <th>Perf. Score</th>
                  <th>Risk Level</th>
                  <th>Analysis</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sc   = parseFloat(s.performance_score || s.predicted_performance || 0)
                  const risk = riskInfo(sc)
                  return (
                    <tr key={s.id || i}>
                      <td style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{i + 1}</td>
                      <td>
                        <div className="s-name">
                          <div className="s-av" style={{ background: 'var(--red-d)', color: 'var(--red)', border: '1px solid #ef444430' }}>
                            {s.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>ID: {s.student_id || s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text3)' }}>{s.batch || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {perfBar(s.attendance, 100)}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                        {parseFloat(s.study_hours || 0).toFixed(1)}h
                      </td>
                      <td>{perfBar(s.test_score, 100)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface3)' }}>
                            <div style={{
                              width: `${Math.min(100, (parseFloat(s.assignment_submitted ?? s.assignment_score ?? 0) / 10) * 100)}%`,
                              height: '100%', borderRadius: 3, background: 'var(--blue)', transition: 'width .3s'
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--blue)', minWidth: 24 }}>
                            {parseFloat(s.assignment_submitted ?? s.assignment_score ?? 0).toFixed(1)}/10
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--mono)', color: risk.color, fontWeight: 700 }}>
                          {sc.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: risk.bg, color: risk.color, border: `1px solid ${risk.color}33`
                        }}>
                          ● {risk.label}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-green btn-sm" onClick={() => setModalId(s.id)}>
                          📊 Analyse
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalId && <AnalysisModal studentId={modalId} onClose={() => setModalId(null)} />}
    </div>
  )
}
