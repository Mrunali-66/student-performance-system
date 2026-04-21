import React, { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar    from './components/Sidebar'
import Topbar     from './components/Topbar'
import Dashboard  from './pages/Dashboard'
import Students   from './pages/Students'
import WeakStudents from './pages/WeakStudents'
import AddStudent from './pages/AddStudent'
import PredictScore from './pages/PredictScore'
import api from './utils/api'

export default function App() {
  const [apiOk, setApiOk] = useState(false)

  useEffect(() => {
    api.get('/health').then(()=>setApiOk(true)).catch(()=>setApiOk(false))
  }, [])

  return (
    <div className="app">
      <Sidebar apiOk={apiOk}/>
      <div className="main">
        <Topbar/>
        <Routes>
          <Route path="/"              element={<Dashboard/>}/>
          <Route path="/students"      element={<Students/>}/>
          <Route path="/weak-students" element={<WeakStudents/>}/>
          <Route path="/add-student"   element={<AddStudent/>}/>
          <Route path="/predict"       element={<PredictScore/>}/>
        </Routes>
      </div>
    </div>
  )
}
