/**
 * src/layouts/AppLayout.jsx
 * Wraps authenticated pages with Sidebar + Topbar.
 */
import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import api from '../services/api'

export default function AppLayout({ children }) {
  const [apiOk, setApiOk] = useState(false)

  useEffect(() => {
    api.get('/health')
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <div className="app">
      <Sidebar apiOk={apiOk} />
      <div className="main">
        <Topbar />
        {children}
      </div>
    </div>
  )
}
