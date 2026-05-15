/**
 * src/pages/Students.jsx  [TEACHER ONLY]
 * Changes:
 *  - "Prev Score" column renamed to "Test Score"
 *  - Edit sends test_score instead of prev_score
 *  - Removed "+ Add Student" link
 *  - Improved alignment and card UI
 */
import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import AnalysisModal from '../components/AnalysisModal'

function catBadge(c) {
  return c === 'Weak' ? 'badge bw' : c === 'Top Performer' ? 'badge bt' : 'badge ba'
}
function SBar({ score }) {
  const p = Math.min(100, Math.max(0, score || 0))
  const col = p < 40 ? 'var(--red)' : p <= 75 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="sbar">
      <div className="sbar-track">
        <div className="sbar-fill" style={{ width: `${p}%`, background: col }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28, fontFamily: 'var(--mono)' }}>
        {p.toFixed(0)}
      </span>
    </div>
  )
}

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch]     = useState('')
  const [batchFilter, setBatchFilter] = useState('All')
  const [error, setError]       = useState('')
  const [editId, setEditId]     = useState(null)
  const [editData, setEditData] = useState({})
  const [modalId, setModalId]   = useState(null)

  const load = () =>
    api.get('/teacher/students').then(r => {
      const data = Array.isArray(r.data) ? r.data : (r.data.students || r.data.data || [])
      setStudents(data)
      setError('')
    }).catch(() => setError('Failed to fetch students'))

  useEffect(() => { load() }, [])

  const batches = ['All', ...new Set(students.map(s => s.batch || 'Unknown').filter(Boolean))]

  const filtered = students.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.batch?.toLowerCase().includes(search.toLowerCase())
    const matchBatch = batchFilter === 'All' || (s.batch || 'Unknown') === batchFilter
    return matchSearch && matchBatch
  })

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return
    try {
      await api.delete(`/teacher/student/${id}`)
      toast.success('Deleted!')
      load()
    } catch { toast.error('Delete failed') }
  }

  const saveEdit = async () => {
    try {
      await api.put(`/teacher/student/${editId}`, editData)
      toast.success('Updated!')
      setEditId(null)
      load()
    } catch (e) { toast.error(e.response?.data?.error || 'Update failed') }
  }

  const inp = (val, key, w = 80) => (
    <input
      value={val}
      onChange={e => setEditData({ ...editData, [key]: e.target.value })}
      style={{
        background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 6,
        padding: '4px 8px', color: 'var(--text)', width: w, fontFamily: 'var(--font)', fontSize: 12,
      }}
    />
  )

  return (
    <div className="page">
      <div className="page-header fu">
        <h1>All Students</h1>
        <p>{filtered.length} of {students.length} students</p>
      </div>
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="card fu">
        <div className="card-hdr" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="card-title">Student Records</div>
            <div className="card-sub">Click 📊 to view individual performance breakdown</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">🎓</div><p>No students found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Batch</th><th>Attendance</th><th>Study Hrs</th>
                  <th>Test Score</th><th>Assignments</th><th>Performance</th>
                  <th>Category</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <React.Fragment key={s.id}>
                    <tr>
                      {editId === s.id ? (
                        <>
                          <td>{inp(editData.name || s.name, 'name', 120)}</td>
                          <td>{inp(editData.batch || s.batch, 'batch', 80)}</td>
                          <td>{inp(editData.attendance ?? s.attendance, 'attendance')}</td>
                          <td>{inp(editData.study_hours ?? s.study_hours, 'study_hours')}</td>
                          <td>{inp(editData.test_score ?? (s.test_score || s.prev_score || 0), 'test_score')}</td>
                          <td>{inp(editData.assignment_score ?? s.assignment_score, 'assignment_score')}</td>
                          <td colSpan={2} />
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <div className="s-name">
                              <div className="s-av">{s.name?.[0]?.toUpperCase()}</div>
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text3)' }}>{s.batch || '—'}</td>
                          <td>{s.attendance ?? '—'}%</td>
                          <td>{s.study_hours ?? '—'}h</td>
                          <td>{s.test_score ?? s.prev_score ?? '—'}</td>
                          <td>{s.assignment_score ?? s.assignments_completed ?? '—'}</td>
                          <td style={{ minWidth: 110 }}>
                            <SBar score={s.performance_score ?? s.predicted_performance} />
                          </td>
                          <td>
                            <span className={catBadge(s.category || s.risk_level)}>
                              {s.category || s.risk_level || '—'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <button className="btn btn-edit btn-sm"
                                onClick={() => { setEditId(s.id); setEditData({}) }}>Edit</button>
                              <button className="btn btn-green btn-sm"
                                onClick={() => setModalId(s.id)}>📊</button>
                              <button className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(s.id, s.name)}>Del</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalId && <AnalysisModal studentId={modalId} onClose={() => setModalId(null)} />}
    </div>
  )
}
