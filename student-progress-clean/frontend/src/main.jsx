import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './ThemeContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style:{fontFamily:'Plus Jakarta Sans,sans-serif',background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',fontSize:'13px'}
        }}/>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
