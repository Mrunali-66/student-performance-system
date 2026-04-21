import React, { useState } from 'react'
import toast from 'react-hot-toast'

const GUIDE = [
  { label:'Excellent',       range:'80–100', color:'var(--green)'  },
  { label:'Good',            range:'65–79',  color:'var(--cyan)'   },
  { label:'Needs Attention', range:'50–64',  color:'var(--yellow)' },
  { label:'High Risk',       range:'0–49',   color:'var(--red)'    },
]

export default function PredictScore() {
  const [form,setForm]     = useState({attendance:'',study_hours:'',prev_score:'',assignments:''})
  const [result,setResult] = useState(null)
  const [loading,setLoading] = useState(false)

  const handle = e => setForm(f=>({...f,[e.target.name]:e.target.value}))

  const predict = () => {
    const a=parseFloat(form.attendance),s=parseFloat(form.study_hours),
          p=parseFloat(form.prev_score),asgn=parseFloat(form.assignments)
    if([a,s,p,asgn].some(isNaN)){toast.error('Please fill all fields');return}
    setLoading(true)
    setTimeout(()=>{
      const score=Math.min(100,Math.max(0,a*0.30+Math.min(s*1.5,25)+p*0.30+Math.min(asgn*2,15)))
      setResult(parseFloat(score.toFixed(1))); setLoading(false)
    },800)
  }

  const rc = result===null?'var(--text)':result>=80?'var(--green)':result>=65?'var(--cyan)':result>=50?'var(--yellow)':'var(--red)'
  const rl = result===null?'':result>=80?'Excellent':result>=65?'Good':result>=50?'Needs Attention':'High Risk'

  return (
    <div className="page">
      <div className="page-header fu"><h1>Score Predictor</h1><p>Use the ML model to predict a student's expected score</p></div>

      <div className="predict-grid">
        {/* Input */}
        <div className="card fu">
          <div className="card-hdr"><div className="card-title">Input Parameters</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:22}}>
            {[
              {name:'attendance',  label:'📊 Attendance (%)',        ph:'e.g. 85'},
              {name:'study_hours', label:'📚 Study Hours / Week',    ph:'e.g. 18'},
              {name:'prev_score',  label:'📝 Previous Score',        ph:'e.g. 72'},
              {name:'assignments', label:'✅ Assignments Completed',  ph:'e.g. 9' },
            ].map(f=>(
              <div key={f.name} className="field">
                <label style={{color:'var(--text2)',textTransform:'none',letterSpacing:0,fontSize:12,fontWeight:600}}>{f.label}</label>
                <input name={f.name} type="number" value={form[f.name]} onChange={handle} placeholder={f.ph}/>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" onClick={predict} disabled={loading}>
            {loading?'⏳ Calculating...':'⚡ Run Prediction'}
          </button>
        </div>

        {/* Result */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card fu fu1" style={{flex:1}}>
            <div className="predict-result">
              {result===null?(
                <>
                  <div style={{fontSize:44}}>🎯</div>
                  <p style={{color:'var(--text3)',fontSize:13}}>Enter student data and run the prediction</p>
                </>
              ):(
                <>
                  <div className="predict-big" style={{color:rc}}>{result}</div>
                  <div style={{fontSize:17,fontWeight:700,color:rc}}>{rl}</div>
                  <div style={{width:'100%',marginTop:14}}>
                    <div className="sbar-track" style={{height:7}}>
                      <div className="sbar-fill" style={{width:`${result}%`,background:rc}}/>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>Predicted performance score</div>
                </>
              )}
            </div>
          </div>

          <div className="card fu fu2">
            <div style={{fontSize:9.5,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text3)',marginBottom:13}}>Score Guide</div>
            <div className="score-guide">
              {GUIDE.map(g=>(
                <div key={g.label} className="sg-row">
                  <div style={{display:'flex',alignItems:'center'}}>
                    <span className="sg-dot" style={{background:g.color}}/>{g.label}
                  </div>
                  <span style={{fontFamily:'var(--mono)',color:'var(--text3)',fontSize:11.5}}>{g.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
