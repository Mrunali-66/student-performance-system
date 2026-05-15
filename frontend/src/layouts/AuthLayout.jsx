/**
 * src/layouts/AuthLayout.jsx
 * Split-screen layout for Login and Register pages.
 * Left: animated brand panel  |  Right: form
 */
import React from 'react'

const FEATURES = [
  { icon: '📊', title: 'Real-time Analytics',   desc: 'Track student performance with live ML-powered insights' },
  { icon: '🤖', title: 'ML Predictions',         desc: 'AI-driven score predictions and risk assessment' },
  { icon: '👥', title: 'Role-based Access',       desc: 'Separate dashboards for teachers and students' },
  { icon: '📄', title: 'Export Reports',          desc: 'Download PDF and CSV reports instantly' },
]

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d1526 0%, #0a0f1e 60%, #070c19 100%)' }}>

        {/* Glow blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl font-black text-white text-xl"
              style={{ background: 'linear-gradient(135deg, var(--cyan), var(--blue))', boxShadow: '0 0 20px rgba(6,182,212,.4)' }}>
              E
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>EduTrack</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Performance Monitor</div>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 w-fit"
            style={{ background: 'rgba(6,182,212,.12)', border: '1px solid rgba(6,182,212,.3)', color: 'var(--cyan)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            AI-Powered Education Platform
          </div>

          <h1 className="text-4xl font-black tracking-tight leading-tight mb-4" style={{ color: 'var(--text)' }}>
            Student Performance<br />
            <span style={{ color: 'var(--cyan)' }}>Management System</span>
          </h1>

          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text2)' }}>
            Monitor, analyse, and improve academic outcomes with ML-powered predictions and real-time dashboards.
          </p>

          <div className="flex flex-col gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg text-base flex-shrink-0"
                  style={{ background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.2)' }}>
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{f.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 text-xs" style={{ color: 'var(--text3)' }}>
          EduTrack v3.0 · Secure · Role-based · ML-powered
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl font-black text-white text-base"
              style={{ background: 'linear-gradient(135deg, var(--cyan), var(--blue))' }}>
              E
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text)' }}>EduTrack</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
