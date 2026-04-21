import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to:'/',              label:'Dashboard',     icon:'⊞', end:true },
  { to:'/students',      label:'Students',      icon:'👥' },
  { to:'/weak-students', label:'Weak Students', icon:'⚠' },
  { to:'/add-student',   label:'Add Student',   icon:'✦' },
  { to:'/predict',       label:'Predict Score', icon:'⚡' },
]

export default function Sidebar({ apiOk }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">E</div>
        <div className="logo-text">
          <strong>EduTrack</strong>
          <span>Performance Monitor</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-label">Main Menu</div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({isActive}) => `nav-item${isActive?' active':''}`}>
            <span style={{fontSize:15}}>{n.icon}</span>
            {n.label}
            {({isActive}) => isActive ? <span className="nav-dot"/> : null}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="api-status">
          <div className={`api-dot ${apiOk?'on':'off'}`}/>
          <div>
            <div style={{color:apiOk?'var(--green)':'var(--red)',fontWeight:600,fontSize:10.5}}>
              {apiOk?'Flask API Connected':'API Disconnected'}
            </div>
            <div>localhost:5000</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
