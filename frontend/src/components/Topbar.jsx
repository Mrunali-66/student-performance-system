import React from 'react'
import { useLocation } from 'react-router-dom'

const PAGES = {
  '/':              ['Home','Dashboard'],
  '/students':      ['Home › Students','All Students'],
  '/weak-students': ['Home › Students › At Risk','At-Risk Students'],
  '/add-student':   ['Home › Students › Add New','Add Student'],
  '/predict':       ['Home › Tools › Predict','Score Predictor'],
}

const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }
const dateStr  = () => new Date().toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'})

export default function Topbar() {
  const {pathname} = useLocation()
  const [bc, title] = PAGES[pathname] || ['Home','EduTrack']
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">
          {bc.split('›').map((b,i,a) => (
            <React.Fragment key={i}>
              {i>0 && <span style={{color:'var(--text3)'}}>›</span>}
              <span style={{color:i===a.length-1?'var(--cyan)':'var(--text3)'}}>{b.trim()}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-right">
        <div className="live-badge"><div className="live-dot"/>Live Data</div>
        <div className="topbar-greeting">
          <strong>{greeting()}</strong>
          <small>{dateStr()}</small>
        </div>
        <div className="avatar">A</div>
      </div>
    </header>
  )
}
