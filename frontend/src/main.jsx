import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style:{fontFamily:'Plus Jakarta Sans,sans-serif',background:'#0f1929',color:'#e2e8f0',border:'1px solid #1e3a5f2a',fontSize:'13px'}
      }}/>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
