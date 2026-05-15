/**
 * src/pages/AddStudent.jsx
 *
 * FIXES:
 *  1. Form fields renamed to match new backend schema:
 *       prev_score → test_score
 *       assignments_completed → assignment_score
 *     Backend's POST /teacher/add-student accepts both old AND new names,
 *     but this page now sends the canonical new names.
 *  2. Branch selector added — required by backend (student needs a branch).
 *  3. Prediction logic updated to use the correct formula weights:
 *       attendance*0.30 + min(study_hours*1.5,25) + test_score*0.30 + min(assignment_score*0.15,15)
 */
import React, { useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const BRANCHES = [
  'Data Science',
  'Python Development',
  'Java Development',
  'AI & Machine Learning',
]

const EMPTY = {
  username: '',
  branch: '',
  attendance: '',
  study_hours: '',
  test_score: '',
  assignment_score: '',
}

export default function AddStudent() {
  const [form, setForm]           = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const navigate = useNavigate()

  const handle = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Required'
    if (!form.branch) errs.branch = 'Required';
    ['attendance', 'study_hours', 'test_score', 'assignment_score'].forEach(f => {
      const v = parseFloat(form[f])
      if (isNaN(v)) errs[f] = 'Must be a number'
      else if (f === 'attendance' && (v < 0 || v > 100)) errs[f] = '0–100'
      else if (f === 'test_score' && (v < 0 || v > 100)) errs[f] = '0–100'
      else if (f === 'assignment_score' && (v < 0 || v > 100)) errs[f] = '0–100'
    })
    return errs
  }

  const predict = () => {
    const a = parseFloat(form.attendance)
    const s = parseFloat(form.study_hours)
    const t = parseFloat(form.test_score)
    const asgn = parseFloat(form.assignment_score)
    if ([a, s, t, asgn].some(isNaN)) {
      toast.error('Fill all numeric fields to predict')
      return
    }
    setPredicting(true)
    setTimeout(() => {
      // Spec composite formula
      const score = Math.min(100, Math.max(0,
        a * 0.30 + Math.min(s * 1.5, 25) + t * 0.30 + Math.min(asgn * 0.15, 15)
      ))
      setPrediction(parseFloat(score.toFixed(2)))
      setPredicting(false)
    }, 600)
  }

  const submit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await api.post('/teacher/add-student', {
        username:         form.username.trim(),
        branch:           form.branch,
        attendance:       parseFloat(form.attendance),
        study_hours:      parseFloat(form.study_hours),
        test_score:       parseFloat(form.test_score),
        assignment_score: parseFloat(form.assignment_score),
        password:         'student123', // default password; teacher sets it later
      })
      toast.success('Student added successfully!')
      navigate('/students')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const pc = prediction === null
    ? 'var(--text3)'
    : prediction >= 80 ? 'var(--green)'
    : prediction >= 65 ? 'var(--cyan)'
    : prediction >= 50 ? 'var(--yellow)'
    : 'var(--red)'
  const pl = prediction === null
    ? '—'
    : prediction >= 80 ? 'Excellent'
    : prediction >= 65 ? 'Good'
    : prediction >= 50 ? 'Needs Attention'
    : 'High Risk'

  return (
    <div className="page">
      <div className="page-header fu">
        <h1>Add Student</h1>
        <p>Register a new student and optionally predict their performance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22 }}>
        {/* Form card */}
        <div className="card fu">
          <div className="card-hdr"><div className="card-title">Student Information</div></div>
          <form onSubmit={submit}>

            {/* Row 1: Username + Branch */}
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Username (login name)</label>
                <input
                  name="username" value={form.username} onChange={handle}
                  placeholder="e.g. riya_sharma" className={errors.username ? 'err' : ''}
                />
                {errors.username && <span className="err-msg">{errors.username}</span>}
              </div>
              <div className="field">
                <label>Branch</label>
                <select
                  name="branch" value={form.branch} onChange={handle}
                  style={{
                    background: 'var(--surface2)', border: `1px solid ${errors.branch ? 'var(--red)' : 'var(--border2)'}`,
                    color: form.branch ? 'var(--text)' : 'var(--text3)', borderRadius: 8,
                    padding: '10px 12px', fontSize: 13, width: '100%', fontFamily: 'var(--font)',
                  }}
                >
                  <option value="" disabled>Select branch…</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {errors.branch && <span className="err-msg">{errors.branch}</span>}
              </div>
            </div>

            {/* Row 2: Attendance + Study Hours */}
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Attendance (%)</label>
                <input
                  name="attendance" type="number" min="0" max="100" step="0.1"
                  value={form.attendance} onChange={handle} placeholder="0–100"
                  className={errors.attendance ? 'err' : ''}
                />
                <span className="field-hint">Enter percentage (0–100)</span>
                {errors.attendance && <span className="err-msg">{errors.attendance}</span>}
              </div>
              <div className="field">
                <label>Study Hours / Week</label>
                <input
                  name="study_hours" type="number" min="0" step="0.5"
                  value={form.study_hours} onChange={handle} placeholder="e.g. 20"
                  className={errors.study_hours ? 'err' : ''}
                />
                {errors.study_hours && <span className="err-msg">{errors.study_hours}</span>}
              </div>
            </div>

            {/* Row 3: Test Score + Assignment Score */}
            <div className="form-grid" style={{ marginBottom: 22 }}>
              <div className="field">
                <label>Test Score (0–100)</label>
                <input
                  name="test_score" type="number" min="0" max="100" step="0.1"
                  value={form.test_score} onChange={handle} placeholder="0–100"
                  className={errors.test_score ? 'err' : ''}
                />
                {errors.test_score && <span className="err-msg">{errors.test_score}</span>}
              </div>
              <div className="field">
                <label>Assignment Score (0–100)</label>
                <input
                  name="assignment_score" type="number" min="0" max="100" step="0.1"
                  value={form.assignment_score} onChange={handle} placeholder="0–100"
                  className={errors.assignment_score ? 'err' : ''}
                />
                {errors.assignment_score && <span className="err-msg">{errors.assignment_score}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? '⏳ Adding...' : 'Add Student'}
              </button>
              <button
                type="button"
                className="btn btn-yellow"
                style={{ padding: '12px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600 }}
                onClick={predict} disabled={predicting}
              >
                {predicting ? '...' : '⚡ Predict'}
              </button>
            </div>
          </form>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Score prediction */}
          <div className="card fu fu1">
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }}>
              Score Prediction
            </div>
            <div className="predict-result" style={{ minHeight: 160 }}>
              {prediction === null ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>⚡</div>
                  <p style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
                    Fill in the numeric fields and click <strong style={{ color: 'var(--cyan)' }}>Predict</strong> to estimate.
                  </p>
                </>
              ) : (
                <>
                  <div className="predict-big" style={{ color: pc }}>{prediction}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: pc }}>{pl}</div>
                  <div style={{ width: '100%', marginTop: 10 }}>
                    <div className="sbar-track" style={{ height: 6 }}>
                      <div className="sbar-fill" style={{ width: `${prediction}%`, background: pc }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="card fu fu2">
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['📊', 'Attendance should be a percentage (0–100)'],
                ['📚', 'Study hours is the weekly average'],
                ['📝', 'Test score is the latest exam result (0–100)'],
                ['✅', 'Assignment score is completion rate (0–100)'],
              ].map(([icon, text], i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
