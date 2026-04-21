import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import AnalysisModal from '../components/AnalysisModal'

function catBadge(c){return c==='Weak'?'badge bw':c==='Top Performer'?'badge bt':'badge ba'}
function SBar({score}){const p=Math.min(100,Math.max(0,score||0));const col=p<40?'var(--red)':p<=75?'var(--yellow)':'var(--green)';return<div className="sbar"><div className="sbar-track"><div className="sbar-fill" style={{width:`${p}%`,background:col}}/></div><span style={{fontSize:11,color:'var(--text3)',minWidth:28,fontFamily:'var(--mono)'}}>{p.toFixed(0)}</span></div>}

const EMPTY_EDIT = {name:'',batch:'',attendance:'',study_hours:'',prev_score:'',assignments_completed:''}

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState('')
  const [editId, setEditId]     = useState(null)
  const [editData, setEditData] = useState({})
  const [modalId, setModalId]   = useState(null)

  const load = () => api.get('/students').then(r=>{setStudents(r.data);setError('')}).catch(()=>setError('Failed to fetch'))
  useEffect(()=>{load()},[])

  const filtered = students.filter(s=>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.batch?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id,name) => {
    if(!window.confirm(`Delete ${name}?`)) return
    try{await api.delete(`/students/${id}`);toast.success('Deleted!');load()}
    catch{toast.error('Delete failed')}
  }

  const saveEdit = async () => {
    try{await api.put(`/students/${editId}`,editData);toast.success('Updated!');setEditId(null);load()}
    catch(e){toast.error(e.response?.data?.error||'Update failed')}
  }

  const inp = (val,key,w=80) => (
    <input value={val} onChange={e=>setEditData({...editData,[key]:e.target.value})}
      style={{background:'var(--surface3)',border:'1px solid var(--border2)',borderRadius:6,padding:'4px 8px',color:'var(--text)',width:w,fontFamily:'var(--font)',fontSize:12}}/>
  )

  return (
    <div className="page">
      <div className="page-header fu"><h1>All Students</h1><p>{filtered.length} of {students.length} students</p></div>
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="card fu">
        <div className="card-hdr">
          <div><div className="card-title">Student Records</div><div className="card-sub">Click 📊 Analyse for individual performance breakdown</div></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <Link to="/add-student" className="btn btn-primary btn-sm">+ Add Student</Link>
          </div>
        </div>

        {filtered.length===0 ? (
          <div className="empty"><div className="empty-icon">🔍</div><p>No students found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Attendance</th><th>Study Hrs</th><th>Prev Score</th><th>Assignments</th><th>Performance</th><th>Category</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id}>
                    {editId===s.id ? (
                      <>
                        <td>{inp(editData.name,'name',110)}</td>
                        <td>{inp(editData.batch,'batch',80)}</td>
                        <td>{inp(editData.attendance,'attendance',60)}</td>
                        <td>{inp(editData.study_hours,'study_hours',60)}</td>
                        <td>{inp(editData.prev_score,'prev_score',60)}</td>
                        <td>{inp(editData.assignments_completed,'assignments_completed',60)}</td>
                        <td colSpan={2}/>
                        <td><div style={{display:'flex',gap:6}}><button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button><button className="btn btn-ghost btn-sm" onClick={()=>setEditId(null)}>Cancel</button></div></td>
                      </>
                    ):(
                      <>
                        <td><div className="s-name"><div className="s-av">{s.name?.[0]?.toUpperCase()}</div><span style={{fontWeight:600}}>{s.name}</span></div></td>
                        <td style={{color:'var(--text3)',fontFamily:'var(--mono)'}}>{s.batch||'—'}</td>
                        <td>{s.attendance}%</td>
                        <td>{s.study_hours}h</td>
                        <td>{s.prev_score}</td>
                        <td>{s.assignments_completed}</td>
                        <td style={{minWidth:110}}><SBar score={s.performance_score}/></td>
                        <td><span className={catBadge(s.category)}>{s.category||'—'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:5}}>
                            <button className="btn btn-green btn-sm" onClick={()=>setModalId(s.id)}>📊</button>
                            <button className="btn btn-edit btn-sm" onClick={()=>{setEditId(s.id);setEditData({...s})}}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(s.id,s.name)}>Del</button>
                          </div>
                        </td>
                      </>
                    )}
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
