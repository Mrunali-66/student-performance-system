import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import AnalysisModal from '../components/AnalysisModal'

export default function WeakStudents() {
  const [students, setStudents] = useState([])
  const [error, setError]       = useState('')
  const [modalId, setModalId]   = useState(null)

  useEffect(() => {
    api.get('/weak-students').then(r=>{setStudents(r.data);setError('')}).catch(()=>setError('Failed to fetch'))
  }, [])

  return (
    <div className="page">
      <div className="page-header fu"><h1>At-Risk Students</h1><p>Students who need immediate academic intervention</p></div>
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="card fu">
        <div className="card-hdr">
          <div><div className="card-title">Risk Report</div><div className="card-sub">Performance score below 40</div></div>
          <div className="badge bw" style={{padding:'4px 12px',fontSize:12}}>{students.length} flagged</div>
        </div>

        {students.length===0 ? (
          <div className="empty">
            <div style={{fontSize:52,marginBottom:10}}>✅</div>
            <p style={{color:'var(--green)',fontWeight:600,fontSize:15}}>All students on track!</p>
            <p style={{marginTop:4}}>No at-risk students found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Batch</th><th>Attendance</th><th>Study Hrs</th><th>Prev Score</th><th>Assignments</th><th>Score</th><th>Risk</th><th>Analysis</th></tr></thead>
              <tbody>
                {students.map((s,i)=>{
                  const sc=parseFloat(s.performance_score||0)
                  const risk=sc<20?'Critical':sc<30?'High':'Moderate'
                  const rc=sc<20?'var(--red)':sc<30?'var(--yellow)':'var(--blue)'
                  return(
                    <tr key={i}>
                      <td style={{color:'var(--text3)',fontFamily:'var(--mono)'}}>{i+1}</td>
                      <td><div className="s-name"><div className="s-av" style={{background:'var(--red-d)',color:'var(--red)',border:'1px solid #ef444430'}}>{s.name?.[0]?.toUpperCase()}</div><span style={{fontWeight:600}}>{s.name}</span></div></td>
                      <td style={{color:'var(--text3)'}}>{s.batch||'—'}</td>
                      <td>{s.attendance}%</td>
                      <td>{s.study_hours}h</td>
                      <td>{s.prev_score}</td>
                      <td>{s.assignments_completed}</td>
                      <td><span style={{fontFamily:'var(--mono)',color:'var(--red)',fontWeight:700}}>{sc.toFixed(1)}</span></td>
                      <td><span className="badge" style={{background:rc+'22',color:rc,border:`1px solid ${rc}33`}}>● {risk}</span></td>
                      <td><button className="btn btn-green btn-sm" onClick={()=>setModalId(s.id)}>📊 Analyse</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modalId && <AnalysisModal studentId={modalId} onClose={()=>setModalId(null)}/>}
    </div>
  )
}
