import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import AnalysisModal from '../components/AnalysisModal'

function catBadge(c) { return c==='Weak'?'badge bw':c==='Top Performer'?'badge bt':'badge ba' }

function SBar({ score }) {
  const p = Math.min(100, Math.max(0, score||0))
  const col = p<40?'var(--red)':p<=75?'var(--yellow)':'var(--green)'
  return <div className="sbar"><div className="sbar-track"><div className="sbar-fill" style={{width:`${p}%`,background:col}}/></div><span style={{fontSize:11,color:'var(--text3)',minWidth:28,fontFamily:'var(--mono)'}}>{p.toFixed(0)}</span></div>
}

export default function Dashboard() {
  const [students, setStudents] = useState([])
  const [analysis, setAnalysis] = useState({})
  const [error, setError]       = useState('')
  const [modalId, setModalId]   = useState(null)

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/analysis')])
      .then(([s,a]) => { setStudents(s.data); setAnalysis(a.data); setError('') })
      .catch(() => setError('Failed to fetch — make sure Flask backend is running on port 5000'))
  }, [])

  const avgScore  = students.length ? (students.reduce((s,st)=>s+(st.performance_score||0),0)/students.length).toFixed(1) : 0
  const passRate  = students.length ? Math.round(students.filter(s=>(s.performance_score||0)>=50).length/students.length*100) : 0
  const avgAtt    = students.length ? Math.round(students.reduce((s,st)=>s+(st.attendance||0),0)/students.length) : 0
  const recent    = [...students].slice(-5).reverse()

  return (
    <div className="page">
      <div className="page-header fu"><h1>Dashboard</h1><p>Overview of your student performance metrics</p></div>
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="stats-grid">
        {[
          {cls:'c-cyan', icon:'👥', lbl:'Total Students',  val:analysis.total_students||0,      sub:'Enrolled this term',   link:'/students',       ll:'View all →'},
          {cls:'c-red',  icon:'⚠', lbl:'At Risk',         val:analysis.weak_students_count||0, sub:'Need intervention',    link:'/weak-students',  ll:'View all →'},
          {cls:'c-grn',  icon:'📈', lbl:'Avg. Score',      val:avgScore,                        sub:'Class average',         link:null},
          {cls:'c-blu',  icon:'✓', lbl:'Pass Rate',        val:`${passRate}%`,                  sub:'Score ≥ 50',            link:null},
          {cls:'c-pur',  icon:'📅', lbl:'Avg. Attendance', val:`${avgAtt}%`,                    sub:'Class average',         link:null},
        ].map((s,i) => (
          <div key={i} className={`stat-card ${s.cls} fu fu${i+1}`}>
            <div className="stat-top">
              <div><div className="stat-lbl">{s.lbl}</div><div className="stat-val">{s.val}</div><div className="stat-sub">{s.sub}</div></div>
              <div className="stat-icon">{s.icon}</div>
            </div>
            {s.link && <Link to={s.link} className="stat-link">{s.ll}</Link>}
          </div>
        ))}
      </div>

      <div className="card fu">
        <div className="card-hdr">
          <div><div className="card-title">Recent Students</div><div className="card-sub">Latest entries — click Analyse for individual insights</div></div>
          <Link to="/students" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        {recent.length===0 ? (
          <div className="empty"><div className="empty-icon">🎓</div><p>No students found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Attendance</th><th>Study Hrs</th><th>Prev Score</th><th>Assignments</th><th>Performance</th><th>Category</th><th>Analysis</th></tr></thead>
              <tbody>
                {recent.map(s => (
                  <tr key={s.id}>
                    <td><div className="s-name"><div className="s-av">{s.name?.[0]?.toUpperCase()}</div><span style={{fontWeight:600}}>{s.name}</span></div></td>
                    <td style={{color:'var(--text3)'}}>{s.batch||'—'}</td>
                    <td>{s.attendance}%</td>
                    <td>{s.study_hours}h</td>
                    <td>{s.prev_score}</td>
                    <td>{s.assignments_completed}</td>
                    <td style={{minWidth:110}}><SBar score={s.performance_score}/></td>
                    <td><span className={catBadge(s.category)}>{s.category||'—'}</span></td>
                    <td><button className="btn btn-green btn-sm" onClick={()=>setModalId(s.id)}>📊 Analyse</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalId && <AnalysisModal studentId={modalId} onClose={()=>setModalId(null)}/>}
    </div>
  )
}
