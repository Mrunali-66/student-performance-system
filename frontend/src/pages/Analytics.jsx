/**
 * src/pages/Analytics.jsx  [TEACHER ONLY]
 * Changes:
 *  - Removed "Students per Batch" bar chart
 *  - "Internal Marks" / "Previous Score" → "Test Score"
 *  - Improved chart layout and visualization quality
 *  - All data from live /teacher/students endpoint
 */
import React, { useEffect, useState, useRef, useMemo } from 'react'
import api from '../services/api'

const pct = (v, t) => t ? Math.round((v / t) * 100) : 0
const score = s => parseFloat(s.performance_score ?? s.predicted_performance ?? 0)

/* ── SVG Bar Chart ── */
function BarChart({ data, colorKey = 'color', valueKey = 'value', labelKey = 'label', height = 160, title }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="viz-card">
      {title && <div className="viz-title">{title}</div>}
      <div className="bar-chart" style={{ height }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (d[valueKey] / max) * (height - 40))
          return (
            <div key={i} className="bar-col">
              <div className="bar-val">{d[valueKey]}</div>
              <div className="bar-outer" style={{ height: height - 40 }}>
                <div
                  className="bar-fill"
                  style={{ height: barH, background: d[colorKey] || 'var(--cyan)', animationDelay: `${i * 0.07}s` }}
                />
              </div>
              <div className="bar-label">{d[labelKey]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── SVG Donut Chart ── */
function DonutChart({ segments, size = 130, title, centerLabel, centerValue }) {
  const r = 48, cx = size / 2, cy = size / 2, stroke = 16
  const total = segments.reduce((s, d) => s + d.value, 0)
  let cumAngle = -90
  const arcs = segments.map(seg => {
    const angle = (seg.value / (total || 1)) * 360
    const startA = cumAngle, endA = cumAngle + angle
    cumAngle += angle
    const toRad = a => (a * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startA)), y1 = cy + r * Math.sin(toRad(startA))
    const x2 = cx + r * Math.cos(toRad(endA)), y2 = cy + r * Math.sin(toRad(endA))
    const large = angle > 180 ? 1 : 0
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, angle }
  })
  return (
    <div className="viz-card donut-card">
      {title && <div className="viz-title">{title}</div>}
      <div className="donut-inner">
        <svg width={size} height={size} className="donut-svg">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
          {arcs.map((arc, i) => arc.angle > 0 && (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={stroke}
              strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease', filter: `drop-shadow(0 0 4px ${arc.color}55)` }} />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize={18} fontWeight={800}>{centerValue}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text3)" fontSize={9}>{centerLabel}</text>
        </svg>
        <div className="donut-legend">
          {segments.map((s, i) => (
            <div key={i} className="legend-row">
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-name">{s.label}</span>
              <span className="legend-pct">{pct(s.value, total)}%</span>
              <span className="legend-val">({s.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Horizontal Bar ── */
function HBar({ label, value, max, color, suffix = '' }) {
  const w = max ? Math.max(4, (value / max) * 100) : 0
  return (
    <div className="hbar-row">
      <div className="hbar-label">{label}</div>
      <div className="hbar-track">
        <div className="hbar-fill" style={{ width: `${w}%`, background: color }} />
      </div>
      <div className="hbar-val" style={{ color }}>{value}{suffix}</div>
    </div>
  )
}

/* ── Mini stat card ── */
function MiniStat({ icon, label, value, color, sub }) {
  return (
    <div className="mini-stat" style={{ borderColor: `${color}30` }}>
      <div className="mini-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <div className="mini-val" style={{ color }}>{value}</div>
        <div className="mini-label">{label}</div>
        {sub && <div className="mini-sub">{sub}</div>}
      </div>
    </div>
  )
}

/* ── Refresh button ── */
function RefreshBtn({ onClick, loading }) {
  return (
    <button className="btn btn-ghost btn-sm" onClick={onClick} disabled={loading} style={{ gap: 6 }}>
      <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none', fontSize: 13 }}>⟳</span>
      {loading ? 'Loading…' : 'Refresh'}
    </button>
  )
}

/* ── Study Hours vs Score scatter plot ── */
function StudyHoursChart({ data }) {
  const W = 320, H = 210, PL = 38, PR = 16, PT = 14, PB = 28
  const maxH = Math.max(...data.map(d => d.study_hours || 0), 20)
  const px = v => PL + (v / (maxH + 2)) * (W - PL - PR)
  const py = v => PT + ((100 - v) / 100) * (H - PT - PB)
  const colorFor = s => s < 40 ? '#ef4444' : s <= 75 ? '#f59e0b' : '#10b981'
  const [hovered, setHovered] = React.useState(null)
  const zones = [
    { y: py(100), h: py(75) - py(100), fill: '#10b98108', label: 'Top',  color: '#10b981' },
    { y: py(75),  h: py(40) - py(75),  fill: '#f59e0b08', label: 'Avg',  color: '#f59e0b' },
    { y: py(40),  h: py(0)  - py(40),  fill: '#ef444408', label: 'Weak', color: '#ef4444' },
  ]
  return (
    <div className="viz-card" style={{ position: 'relative' }}>
      <div className="viz-title">📚 Study Hours vs Score</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {zones.map((z, i) => (
          <g key={i}>
            <rect x={PL} y={z.y} width={W - PL - PR} height={z.h} fill={z.fill} />
            <text x={W - PR - 2} y={z.y + z.h / 2 + 4} textAnchor="end" fill={z.color} fontSize={8} fontWeight={700} opacity={0.6}>{z.label}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} stroke="var(--surface3)" strokeWidth={1} strokeDasharray="2,4" />
            <text x={PL - 4} y={py(v) + 3} textAnchor="end" fill="var(--text3)" fontSize={8}>{v}</text>
          </g>
        ))}
        {[0, 5, 10, 15, 20].filter(v => v <= maxH + 2).map(v => (
          <text key={v} x={px(v)} y={H - 4} textAnchor="middle" fill="var(--text3)" fontSize={8}>{v}h</text>
        ))}
        <text x={W / 2} y={H} textAnchor="middle" fill="var(--text3)" fontSize={9}>Study Hours / week</text>
        {data.map((d, i) => {
          const sc = score(d)
          const cx = px(d.study_hours || 0), cy = py(sc)
          const col = colorFor(sc)
          const isHov = hovered === i
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={isHov ? 7 : 5} fill={col} fillOpacity={isHov ? 1 : 0.7}
                stroke={col} strokeWidth={isHov ? 2 : 1} strokeOpacity={0.5} style={{ transition: 'r .15s' }} />
              {isHov && (
                <g>
                  <rect x={cx + 8} y={cy - 22} width={92} height={28} rx={4} fill="var(--surface2)" stroke={col} strokeWidth={1} />
                  <text x={cx + 13} y={cy - 10} fill="var(--text)" fontSize={9} fontWeight={700}>{d.name}</text>
                  <text x={cx + 13} y={cy + 2} fill="var(--text3)" fontSize={8}>{d.study_hours}h · Score: {sc.toFixed(0)}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Test Score distribution per student (top 10) ── */
function TestScoreChart({ data }) {
  const top10 = [...data].sort((a, b) => (b.test_score || 0) - (a.test_score || 0)).slice(0, 10)
  const max = Math.max(...top10.map(d => d.test_score || 0), 1)
  const W = 320, H = 190, PL = 72, PR = 14, PT = 10, PB = 14
  const rowH = (H - PT - PB) / (top10.length || 1)
  const colorFor = v => v < 40 ? '#ef4444' : v <= 75 ? '#f59e0b' : '#10b981'
  const [hov, setHov] = React.useState(null)
  return (
    <div className="viz-card" style={{ position: 'relative' }}>
      <div className="viz-title">📝 Test Score — Top Students</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {top10.map((d, i) => {
          const y = PT + i * rowH + rowH * 0.15
          const bh = rowH * 0.65
          const bw = Math.max(4, ((d.test_score || 0) / max) * (W - PL - PR))
          const col = colorFor(d.test_score || 0)
          const isHov = hov === i
          return (
            <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
              <text x={PL - 6} y={y + bh / 2 + 4} textAnchor="end" fill={isHov ? 'var(--text)' : 'var(--text2)'} fontSize={9} fontWeight={isHov ? 700 : 400}>
                {d.name?.split(' ')[0] || '—'}
              </text>
              <rect x={PL} y={y} width={bw} height={bh} rx={3} fill={col} fillOpacity={isHov ? 0.9 : 0.65}
                style={{ transition: 'width .5s ease, fill-opacity .15s' }} />
              <text x={PL + bw + 4} y={y + bh / 2 + 4} fill={col} fontSize={9} fontWeight={700}>{d.test_score || 0}</text>
            </g>
          )
        })}
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={PL + (v / max) * (W - PL - PR)} x2={PL + (v / max) * (W - PL - PR)}
            y1={PT} y2={H - PB} stroke="var(--surface3)" strokeWidth={1} strokeDasharray="2,3" />
        ))}
      </svg>
    </div>
  )
}

const BATCH_COLORS = ['#06b6d4','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']

export default function Analytics() {
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [batchFilter, setBatchFilter] = useState('All')
  const intervalRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const s = await api.get('/teacher/students')
      const arr = Array.isArray(s.data) ? s.data : (s.data.students || s.data.data || [])
      setStudents(arr)
      setError('')
      setLastRefresh(new Date())
    } catch {
      setError('Failed to fetch — make sure Flask backend is running')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const batches = useMemo(() =>
    ['All', ...new Set(students.map(s => s.batch || 'Unknown'))],
  [students])

  const pool = useMemo(() =>
    batchFilter === 'All' ? students : students.filter(s => (s.batch || 'Unknown') === batchFilter),
  [students, batchFilter])

  const total = pool.length

  // Category breakdown
  const weakCount = pool.filter(s => score(s) < 40).length
  const avgCount  = pool.filter(s => score(s) >= 40 && score(s) <= 75).length
  const topCount  = pool.filter(s => score(s) > 75).length
  const catSeg = [
    { label: 'Weak',          value: weakCount, color: '#ef4444' },
    { label: 'Average',       value: avgCount,  color: '#f59e0b' },
    { label: 'Top Performer', value: topCount,  color: '#10b981' },
  ].filter(d => d.value > 0)

  // Risk level breakdown
  const criticalCount = pool.filter(s => score(s) < 20).length
  const highCount     = pool.filter(s => score(s) >= 20 && score(s) < 30).length
  const moderateCount = pool.filter(s => score(s) >= 30 && score(s) < 40).length
  const safeCount     = pool.filter(s => score(s) >= 40).length
  const riskSeg = [
    { label: 'Critical (<20)',   value: criticalCount, color: '#dc2626' },
    { label: 'High (20–30)',     value: highCount,     color: '#ef4444' },
    { label: 'Moderate (30–40)', value: moderateCount, color: '#f59e0b' },
    { label: 'Safe (≥40)',       value: safeCount,     color: '#10b981' },
  ].filter(d => d.value > 0)

  // Score histogram
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 10}`, value: 0,
    color: i < 4 ? '#ef4444' : i < 8 ? '#f59e0b' : '#10b981'
  }))
  pool.forEach(s => {
    const idx = Math.min(9, Math.floor(score(s) / 10))
    buckets[idx].value++
  })

  // Attendance buckets
  const attBuckets = [
    { label: '<60%',   value: pool.filter(s => (s.attendance || 0) < 60).length,                              color: '#ef4444' },
    { label: '60-75%', value: pool.filter(s => (s.attendance || 0) >= 60 && (s.attendance || 0) < 75).length, color: '#f59e0b' },
    { label: '75-90%', value: pool.filter(s => (s.attendance || 0) >= 75 && (s.attendance || 0) < 90).length, color: '#3b82f6' },
    { label: '90%+',   value: pool.filter(s => (s.attendance || 0) >= 90).length,                             color: '#10b981' },
  ]

  // Batch map for per-batch stats
  const batchMap = {}
  students.forEach(s => { batchMap[s.batch || 'Unknown'] = (batchMap[s.batch || 'Unknown'] || 0) + 1 })

  const batchStats = Object.entries(batchMap).map(([batch]) => {
    const group = pool.filter(s => (s.batch || 'Unknown') === batch)
    if (!group.length) return null
    const avgSc  = (group.reduce((s, st) => s + score(st), 0) / group.length).toFixed(1)
    const avgAtt = Math.round(group.reduce((s, st) => s + (st.attendance || 0), 0) / group.length)
    const tc = group.filter(st => score(st) > 75).length
    const wc = group.filter(st => score(st) < 40).length
    return { batch, count: group.length, avgScore: parseFloat(avgSc), avgAtt, topCount: tc, weakCount: wc }
  }).filter(Boolean).sort((a, b) => b.avgScore - a.avgScore)

  const maxBatchScore = Math.max(...batchStats.map(b => b.avgScore), 1)

  const avgScore = total ? (pool.reduce((s, st) => s + score(st), 0) / total).toFixed(1) : 0
  const avgAtt   = total ? Math.round(pool.reduce((s, st) => s + (st.attendance || 0), 0) / total) : 0
  const avgStudy = total ? (pool.reduce((s, st) => s + (st.study_hours || 0), 0) / total).toFixed(1) : 0
  const passRate = total ? Math.round(pool.filter(s => score(s) >= 50).length / total * 100) : 0

  const topStudents  = [...pool].sort((a, b) => score(b) - score(a)).slice(0, 5)
  const weakStudents = [...pool].sort((a, b) => score(a) - score(b)).slice(0, 5)

  const scatterData = pool.map(s => ({
    name: s.name,
    study_hours: s.study_hours || 0,
    performance_score: score(s),
    test_score: s.test_score || 0,
    batch: s.batch || '—',
  }))

  return (
    <div className="page analytics-page">
      {/* Header */}
      <div className="page-header fu" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>📊 Live Analytics</h1>
          <p>Real-time data visualization — auto-refreshes every 30 seconds</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div className="live-badge">
            <span className="live-dot" />
            LIVE
          </div>
          <RefreshBtn onClick={load} loading={loading} />
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Batch Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Filter by batch:</span>
        {batches.map(b => (
          <button
            key={b}
            onClick={() => setBatchFilter(b)}
            className={batchFilter === b ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ fontSize: 12 }}
          >
            {b}
          </button>
        ))}
      </div>

      {loading && students.length === 0 ? (
        <div className="empty"><div className="empty-icon">⏳</div><p>Loading analytics…</p></div>
      ) : total === 0 ? (
        <div className="empty"><div className="empty-icon">📊</div><p>No student data available.</p></div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="kpi-row fu fu1">
            <MiniStat icon="👥" label="Total Students"   value={total}          color="var(--cyan)"   sub={`${Object.keys(batchMap).length} batches`} />
            <MiniStat icon="📈" label="Avg. Score"        value={avgScore}       color="var(--blue)"   sub="class average" />
            <MiniStat icon="✓"  label="Pass Rate"         value={`${passRate}%`} color="var(--green)"  sub="score ≥ 50" />
            <MiniStat icon="📅" label="Avg. Attendance"   value={`${avgAtt}%`}   color="var(--purple)" sub="all students" />
            <MiniStat icon="📚" label="Avg. Study Hrs"    value={`${avgStudy}h`} color="var(--yellow)" sub="per week" />
            <MiniStat icon="⚠"  label="At Risk"           value={weakCount}      color="var(--red)"    sub={`${pct(weakCount, total)}% of class`} />
          </div>

          {/* Row 1: Performance Categories + Risk Level + Score Histogram */}
          <div className="analytics-row fu fu2">
            <DonutChart segments={catSeg} size={140} title="🏷 Performance Categories" centerLabel="total" centerValue={total} />
            <DonutChart segments={riskSeg.filter(d => d.value > 0)} size={140} title="🔴 Risk Level Breakdown" centerLabel="at risk" centerValue={weakCount} />
            <BarChart data={buckets} valueKey="value" labelKey="label" colorKey="color" height={170} title="📊 Score Distribution" />
          </div>

          {/* Row 2: Attendance + Study Hours Scatter + Test Score chart */}
          <div className="analytics-row fu fu3">
            <DonutChart segments={attBuckets.filter(d => d.value > 0)} size={140} title="📅 Attendance Distribution" centerLabel="avg" centerValue={`${avgAtt}%`} />
            <StudyHoursChart data={scatterData} />
            <TestScoreChart data={pool} />
          </div>

          {/* Row 3: Batch performance table */}
          {batchStats.length > 0 && (
            <div className="card fu fu4" style={{ marginBottom: 22 }}>
              <div className="card-hdr">
                <div>
                  <div className="card-title">📋 Batch Performance Breakdown</div>
                  <div className="card-sub">Average score and attendance per batch, sorted by performance</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {batchStats.map((b, i) => (
                  <div key={i} className="batch-row">
                    <div className="batch-info">
                      <div className="batch-name" style={{ color: BATCH_COLORS[i % BATCH_COLORS.length] }}>
                        <span className="batch-rank">#{i + 1}</span>
                        {b.batch}
                      </div>
                      <div className="batch-meta">{b.count} students · {b.topCount} top · {b.weakCount} weak</div>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10, color: 'var(--text3)' }}>
                        <span>Avg Score</span>
                        <span style={{ color: BATCH_COLORS[i % BATCH_COLORS.length], fontWeight: 700 }}>{b.avgScore}</span>
                      </div>
                      <HBar label="" value={b.avgScore} max={maxBatchScore} color={BATCH_COLORS[i % BATCH_COLORS.length]} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 4, fontSize: 10, color: 'var(--text3)' }}>
                        <span>Avg Attendance</span>
                        <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{b.avgAtt}%</span>
                      </div>
                      <HBar label="" value={b.avgAtt} max={100} color="var(--text3)" />
                    </div>
                    <div className="batch-pills">
                      <span className="badge bt" style={{ fontSize: 10 }}>🏆 {b.topCount}</span>
                      <span className="badge bw" style={{ fontSize: 10 }}>⚠ {b.weakCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Top & Weak performers */}
          <div className="analytics-row-2 fu fu5">
            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">🏆 Top Performers</div><div className="card-sub">Highest predicted scores</div></div>
              </div>
              <div className="leaderboard">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="leader-row">
                    <div className="leader-rank" style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text3)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div className="s-av" style={{ flexShrink: 0 }}>{s.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{s.batch || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--green)', letterSpacing: -0.5 }}>{score(s).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.attendance}% att</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">⚠ Needs Attention</div><div className="card-sub">Students requiring immediate intervention</div></div>
              </div>
              <div className="leaderboard">
                {weakStudents.map((s, i) => {
                  const sc = score(s)
                  const riskLabel = sc < 20 ? 'Critical' : sc < 30 ? 'High' : 'Moderate'
                  const riskColor = sc < 20 ? '#dc2626' : sc < 30 ? '#ef4444' : '#f59e0b'
                  return (
                    <div key={s.id} className="leader-row">
                      <div className="leader-rank" style={{ color: riskColor }}>{i + 1}</div>
                      <div className="s-av" style={{ flexShrink: 0, background: 'var(--red-d)', color: 'var(--red)', borderColor: '#ef444430' }}>
                        {s.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
                          <span style={{ color: riskColor }}>{riskLabel}</span>
                          <span style={{ color: 'var(--text3)' }}> · {s.batch || '—'}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: riskColor, letterSpacing: -0.5 }}>{sc.toFixed(0)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.attendance}% att</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
