import React, { useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const EMPTY = {name:'',batch:'',attendance:'',study_hours:'',prev_score:'',assignments_completed:''}

export default function AddStudent() {
  const [form,setForm]         = useState(EMPTY)
  const [errors,setErrors]     = useState({})
  const [loading,setLoading]   = useState(false)
  const [prediction,setPrediction] = useState(null)
  const [predicting,setPredicting] = useState(false)
  const navigate = useNavigate()

  const handle = e => { setForm(f=>({...f,[e.target.name]:e.target.value})); setErrors(er=>({...er,[e.target.name]:''})) }

  const validate = () => {
    const errs={}
    if(!form.name.trim()) errs.name='Required'
    ;['attendance','study_hours','prev_score','assignments_completed'].forEach(f=>{
      const v=parseFloat(form[f])
      if(isNaN(v)) errs[f]='Must be a number'
      else if(f==='attendance'&&(v<0||v>100)) errs[f]='0–100'
      else if(f==='prev_score'&&(v<0||v>100)) errs[f]='0–100'
    })
    return errs
  }

  const predict = () => {
    const a=parseFloat(form.attendance),s=parseFloat(form.study_hours),
          p=parseFloat(form.prev_score),asgn=parseFloat(form.assignments_completed)
    if([a,s,p,asgn].some(isNaN)){toast.error('Fill all numeric fields to predict');return}
    setPredicting(true)
    setTimeout(()=>{
      const score=Math.min(100,Math.max(0,a*0.30+Math.min(s*1.5,25)+p*0.30+Math.min(asgn*2,15)))
      setPrediction(parseFloat(score.toFixed(2))); setPredicting(false)
    },600)
  }

  const submit = async e => {
    e.preventDefault()
    const errs=validate()
    if(Object.keys(errs).length){setErrors(errs);return}
    setLoading(true)
    try{await api.post('/students',form);toast.success('Student added!');navigate('/students')}
    catch(err){toast.error(err.response?.data?.error||'Something went wrong')}
    finally{setLoading(false)}
  }

  const pc = prediction===null?'var(--text3)':prediction>=80?'var(--green)':prediction>=65?'var(--cyan)':prediction>=50?'var(--yellow)':'var(--red)'
  const pl = prediction===null?'—':prediction>=80?'Excellent':prediction>=65?'Good':prediction>=50?'Needs Attention':'High Risk'

  return (
    <div className="page">
      <div className="page-header fu"><h1>Add Student</h1><p>Register a new student and optionally predict their performance</p></div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:22}}>
        {/* Form card */}
        <div className="card fu">
          <div className="card-hdr"><div className="card-title">Student Information</div></div>
          <form onSubmit={submit}>
            {/* Row 1: Full Name + Batch */}
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Full Name</label>
                <input name="name" value={form.name} onChange={handle} placeholder="e.g. Riya Sharma" className={errors.name?'err':''}/>
                {errors.name&&<span className="err-msg">{errors.name}</span>}
              </div>
              <div className="field">
                <label>Batch</label>
                <input name="batch" value={form.batch} onChange={handle} placeholder="e.g. 2024-A"/>
              </div>
            </div>

            {/* Row 2: Attendance + Study Hours */}
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Attendance (%)</label>
                <input name="attendance" type="number" min="0" max="100" step="0.1"
                  value={form.attendance} onChange={handle} placeholder="0–100" className={errors.attendance?'err':''}/>
                <span className="field-hint">Enter percentage (0–100)</span>
                {errors.attendance&&<span className="err-msg">{errors.attendance}</span>}
              </div>
              <div className="field">
                <label>Study Hours / Week</label>
                <input name="study_hours" type="number" min="0" step="0.5"
                  value={form.study_hours} onChange={handle} placeholder="e.g. 20" className={errors.study_hours?'err':''}/>
                {errors.study_hours&&<span className="err-msg">{errors.study_hours}</span>}
              </div>
            </div>

            {/* Row 3: Previous Score + Assignments */}
            <div className="form-grid" style={{marginBottom:22}}>
              <div className="field">
                <label>Previous Score</label>
                <input name="prev_score" type="number" min="0" max="100" step="0.1"
                  value={form.prev_score} onChange={handle} placeholder="0–100" className={errors.prev_score?'err':''}/>
                {errors.prev_score&&<span className="err-msg">{errors.prev_score}</span>}
              </div>
              <div className="field">
                <label>Assignments Completed</label>
                <input name="assignments_completed" type="number" min="0" step="1"
                  value={form.assignments_completed} onChange={handle} placeholder="e.g. 8" className={errors.assignments_completed?'err':''}/>
                {errors.assignments_completed&&<span className="err-msg">{errors.assignments_completed}</span>}
              </div>
            </div>

            {/* Buttons */}
            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading?'⏳ Adding...':'Add Student'}
              </button>
              <button type="button" className="btn btn-yellow" style={{padding:'12px 20px',borderRadius:9,fontSize:14,fontWeight:600}}
                onClick={predict} disabled={predicting}>
                {predicting?'...':'⚡ Predict'}
              </button>
            </div>
          </form>
        </div>

        {/* Right panel */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Score prediction */}
          <div className="card fu fu1">
            <div style={{fontSize:9.5,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text3)',marginBottom:14}}>
              Score Prediction
            </div>
            <div className="predict-result" style={{minHeight:160}}>
              {prediction===null?(
                <>
                  <div style={{fontSize:36,marginBottom:6}}>⚡</div>
                  <p style={{color:'var(--text3)',fontSize:12,textAlign:'center',lineHeight:1.5}}>
                    Fill in the numeric fields and click <strong style={{color:'var(--cyan)'}}>Predict</strong> to estimate the student's score.
                  </p>
                </>
              ):(
                <>
                  <div className="predict-big" style={{color:pc}}>{prediction}</div>
                  <div style={{fontSize:14,fontWeight:700,color:pc}}>{pl}</div>
                  <div style={{width:'100%',marginTop:10}}>
                    <div className="sbar-track" style={{height:6}}>
                      <div className="sbar-fill" style={{width:`${prediction}%`,background:pc}}/>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="card fu fu2">
            <div style={{fontSize:9.5,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text3)',marginBottom:12}}>Tips</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                ['📊','Attendance should be a percentage (0–100)'],
                ['📚','Study hours is the weekly average'],
                ['📝','Previous score helps improve prediction accuracy'],
              ].map(([icon,text],i)=>(
                <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:12,color:'var(--text2)'}}>
                  <span style={{fontSize:14,flexShrink:0}}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
