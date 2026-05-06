import React, { useEffect, useState, useRef } from 'react'
import api from '../utils/api'

/* ── tiny helpers ── */
const pct = (v, t) => t ? Math.round((v / t) * 100) : 0

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

/* ── Study Hours vs Score: Bubble Zone Chart ── */
function StudyHoursChart({ data }) {
  const W = 320, H = 210, PL = 38, PR = 16, PT = 14, PB = 28
  const maxH = Math.max(...data.map(d => d.study_hours || 0), 20)
  const px = v => PL + (v / (maxH + 2)) * (W - PL - PR)
  const py = v => PT + ((100 - v) / 100) * (H - PT - PB)
  const colorFor = s => s < 40 ? '#ef4444' : s <= 75 ? '#f59e0b' : '#10b981'
  const [hovered, setHovered] = React.useState(null)
  const zones = [
    { y: py(100), h: py(75) - py(100), fill: '#10b98108', label: 'Top', color: '#10b981' },
    { y: py(75),  h: py(40) - py(75),  fill: '#f59e0b08', label: 'Avg', color: '#f59e0b' },
    { y: py(40),  h: py(0)  - py(40),  fill: '#ef444408', label: 'Weak', color: '#ef4444' },
  ]
  return (
    <div className="viz-card" style={{ position: 'relative' }}>
      <div className="viz-title">📚 Study Hours vs Score</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, display: 'flex', gap: 12 }}>
        {[['#10b981','Top Performer'],['#f59e0b','Average'],['#ef4444','Weak']].map(([c,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            {l}
          </span>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {zones.map((z, i) => (
          <g key={i}>
            <rect x={PL} y={z.y} width={W - PL - PR} height={z.h} fill={z.fill} />
            <text x={W - PR - 2} y={z.y + z.h / 2 + 4} textAnchor="end" fill={z.color} fontSize={8} fontWeight={700} opacity={0.6}>{z.label}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} stroke="var(--surface3)" strokeWidth={v === 40 || v === 75 ? 1.5 : 1} strokeDasharray={v === 40 || v === 75 ? '4,3' : '2,4'} />
            <text x={PL - 4} y={py(v) + 3} textAnchor="end" fill="var(--text3)" fontSize={8}>{v}</text>
          </g>
        ))}
        {[0, 5, 10, 15, 20].filter(v => v <= maxH + 2).map(v => (
          <text key={v} x={px(v)} y={H - 4} textAnchor="middle" fill="var(--text3)" fontSize={8}>{v}h</text>
        ))}
        <text x={W / 2} y={H} textAnchor="middle" fill="var(--text3)" fontSize={9}>Study Hours / week</text>
        <text x={10} y={H / 2} textAnchor="middle" fill="var(--text3)" fontSize={9} transform={`rotate(-90,10,${H/2})`}>Score</text>
        {data.map((d, i) => {
          const score = d.performance_score || 0
          const cx = px(d.study_hours || 0), cy = py(score)
          const col = colorFor(score)
          const isHov = hovered === i
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={isHov ? 7 : 5} fill={col} fillOpacity={isHov ? 1 : 0.7}
                stroke={col} strokeWidth={isHov ? 2 : 1} strokeOpacity={0.5}
                style={{ transition: 'r .15s' }} />
              {isHov && (
                <g>
                  <rect x={cx + 8} y={cy - 22} width={92} height={28} rx={4} fill="var(--surface2)" stroke={col} strokeWidth={1} />
                  <text x={cx + 13} y={cy - 10} fill="var(--text)" fontSize={9} fontWeight={700}>{d.name}</text>
                  <text x={cx + 13} y={cy + 2} fill="var(--text3)" fontSize={8}>{d.study_hours}h · Score: {score.toFixed(0)}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Attendance vs Score: SVG Line + Dot Chart ── */
function AttendanceChart({ data }) {
  const [hovered, setHovered] = React.useState(null)

  const W = 340, H = 220, PL = 36, PR = 16, PT = 16, PB = 32
  const iW = W - PL - PR, iH = H - PT - PB

  const px = att   => PL + (att / 100) * iW
  const py = score => PT + ((100 - score) / 100) * iH

  const scoreColor = s => s < 40 ? '#ef4444' : s <= 75 ? '#f59e0b' : '#10b981'

  // Sort by attendance for line drawing
  const sorted = [...data]
    .filter(d => d.attendance != null && d.performance_score != null)
    .sort((a, b) => (a.attendance || 0) - (b.attendance || 0))

  // Build polyline points
  const linePoints = sorted.map(d => `${px(d.attendance || 0)},${py(d.performance_score || 0)}`).join(' ')

  // Y gridlines at 0, 25, 40, 50, 75, 100
  const yGrid = [0, 25, 40, 50, 75, 100]
  // X gridlines at 0, 25, 50, 75, 100
  const xGrid = [0, 25, 50, 75, 100]

  return (
    <div className="viz-card">
      <div className="viz-title">📅 Attendance vs Score</div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginBottom:8, flexWrap:'wrap' }}>
        {[['#10b981','Top Performer (>75)'],['#f59e0b','Average (40–75)'],['#ef4444','Weak (<40)']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'var(--text3)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block', boxShadow:`0 0 4px ${c}` }}/>
            {l}
          </span>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
        {/* Zone fills */}
        <rect x={PL} y={py(100)} width={iW} height={py(75)-py(100)} fill="#10b98106" />
        <rect x={PL} y={py(75)}  width={iW} height={py(40)-py(75)}  fill="#f59e0b06" />
        <rect x={PL} y={py(40)}  width={iW} height={py(0)-py(40)}   fill="#ef444406" />

        {/* Zone labels on right */}
        <text x={W-PR+2} y={py(87)+3}  fill="#10b981" fontSize={8} fontWeight={700} opacity={0.5}>Top</text>
        <text x={W-PR+2} y={py(57)+3}  fill="#f59e0b" fontSize={8} fontWeight={700} opacity={0.5}>Avg</text>
        <text x={W-PR+2} y={py(20)+3}  fill="#ef4444" fontSize={8} fontWeight={700} opacity={0.5}>Weak</text>

        {/* Y gridlines */}
        {yGrid.map(v => (
          <g key={v}>
            <line x1={PL} x2={W-PR} y1={py(v)} y2={py(v)}
              stroke={v===40||v===75 ? '#ffffff18' : '#ffffff0d'}
              strokeWidth={v===40||v===75 ? 1.5 : 1}
              strokeDasharray={v===40||v===75 ? '4,3' : '2,5'} />
            <text x={PL-4} y={py(v)+3} textAnchor="end" fill="var(--text3)" fontSize={8}>{v}</text>
          </g>
        ))}

        {/* X gridlines */}
        {xGrid.map(v => (
          <g key={v}>
            <line x1={px(v)} x2={px(v)} y1={PT} y2={PT+iH}
              stroke="#ffffff0d" strokeWidth={1} strokeDasharray="2,5" />
            <text x={px(v)} y={H-4} textAnchor="middle" fill="var(--text3)" fontSize={8}>{v}%</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PL+iW/2} y={H} textAnchor="middle" fill="var(--text3)" fontSize={9}>Attendance %</text>
        <text x={9} y={PT+iH/2} textAnchor="middle" fill="var(--text3)" fontSize={9}
          transform={`rotate(-90,9,${PT+iH/2})`}>Score</text>

        {/* Axes */}
        <line x1={PL} x2={PL}    y1={PT} y2={PT+iH} stroke="var(--surface3)" strokeWidth={1.5} />
        <line x1={PL} x2={W-PR}  y1={PT+iH} y2={PT+iH} stroke="var(--surface3)" strokeWidth={1.5} />

        {/* Connecting line with gradient feel */}
        {sorted.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--text3)"
            strokeWidth={1.5}
            strokeOpacity={0.25}
            strokeDasharray="4,3"
          />
        )}

        {/* Dots */}
        {sorted.map((d, i) => {
          const att   = d.attendance || 0
          const score = d.performance_score || 0
          const cx    = px(att)
          const cy    = py(score)
          const col   = scoreColor(score)
          const isHov = hovered === i
          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}>
              {/* Glow ring on hover */}
              {isHov && <circle cx={cx} cy={cy} r={12} fill={col} fillOpacity={0.12} />}
              {/* Outer ring */}
              <circle cx={cx} cy={cy} r={isHov ? 7 : 5}
                fill="var(--surface)" stroke={col}
                strokeWidth={isHov ? 2.5 : 1.5}
                style={{ transition: 'r .15s' }} />
              {/* Inner fill */}
              <circle cx={cx} cy={cy} r={isHov ? 4 : 3}
                fill={col} fillOpacity={isHov ? 1 : 0.8}
                style={{ filter: isHov ? `drop-shadow(0 0 4px ${col})` : 'none', transition: 'r .15s' }} />

              {/* Tooltip */}
              {isHov && (() => {
                const tipW = 108, tipH = 44
                const tipX = cx + 10 > W - tipW - PR ? cx - tipW - 10 : cx + 10
                const tipY = cy - tipH / 2 < PT ? PT : cy - tipH / 2
                return (
                  <g>
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6}
                      fill="var(--surface2)" stroke={col} strokeWidth={1} />
                    <text x={tipX+8} y={tipY+14} fill="var(--text)" fontSize={10} fontWeight={700}>
                      {d.name}
                    </text>
                    <text x={tipX+8} y={tipY+26} fill="var(--text3)" fontSize={9}>
                      Attendance: <tspan fill={col} fontWeight={700}>{att}%</tspan>
                    </text>
                    <text x={tipX+8} y={tipY+38} fill="var(--text3)" fontSize={9}>
                      Score: <tspan fill={col} fontWeight={700}>{score.toFixed(1)}</tspan>
                      <tspan fill="var(--text3)"> · {d.batch}</tspan>
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── OLD Scatter Dot (kept for reference, unused) ── */
function ScatterPlot({ data, xKey, yKey, xLabel, yLabel, title }) {
  const W = 320, H = 200, PAD = 32
  const xs = data.map(d => d[xKey]), ys = data.map(d => d[yKey])
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs, 100)
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 100)
  const px = v => PAD + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD * 2)
  const py = v => H - PAD - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD * 2)
  const colorFor = d => (d.performance_score || 0) < 40 ? '#ef4444' : (d.performance_score || 0) <= 75 ? '#f59e0b' : '#10b981'
  return (
    <div className="viz-card">
      {title && <div className="viz-title">{title}</div>}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="scatter-svg">
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1={PAD} x2={W - PAD} y1={py(v * (yMax / 100))} y2={py(v * (yMax / 100))}
            stroke="var(--surface3)" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        {data.map((d, i) => (
          <circle key={i} cx={px(d[xKey])} cy={py(d[yKey])} r={4}
            fill={colorFor(d)} fillOpacity={0.75}
            style={{ transition: `all .4s ease ${i * 0.01}s` }}>
            <title>{d.name}: {xLabel}={d[xKey]}, {yLabel}={d[yKey]}</title>
          </circle>
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--text3)" fontSize={9}>{xLabel}</text>
        <text x={8} y={H / 2} textAnchor="middle" fill="var(--text3)" fontSize={9}
          transform={`rotate(-90, 8, ${H / 2})`}>{yLabel}</text>
      </svg>
    </div>
  )
}

/* ── Stat mini card ── */
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
    <button className="btn btn-ghost btn-sm" onClick={onClick} disabled={loading}
      style={{ gap: 6 }}>
      <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none', fontSize: 13 }}>⟳</span>
      {loading ? 'Loading…' : 'Refresh'}
    </button>
  )
}

/* ═══════════════════════════════════════════ */
export default function Analytics() {
  const [students, setStudents] = useState([])
  const [analysis, setAnalysis] = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const intervalRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([api.get('/students?limit=1000'), api.get('/analysis')])
      const arr = Array.isArray(s.data) ? s.data : (s.data.students || s.data.data || [])
      setStudents(arr)
      setAnalysis(a.data)
      setError('')
      setLastRefresh(new Date())
    } catch {
      setError('Failed to fetch — make sure Flask backend is running on port 5000')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30000) // live refresh every 30s
    return () => clearInterval(intervalRef.current)
  }, [])

  /* ── Derived data ── */
  const total = students.length

  // Batch distribution
  const batchMap = {}
  students.forEach(s => { batchMap[s.batch || 'Unknown'] = (batchMap[s.batch || 'Unknown'] || 0) + 1 })
  const BATCH_COLORS = ['#06b6d4','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']
  const batchData = Object.entries(batchMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: BATCH_COLORS[i % BATCH_COLORS.length] }))

  // Category breakdown
  const weak   = students.filter(s => s.category === 'Weak').length
  const avg    = students.filter(s => s.category === 'Average').length
  const top    = students.filter(s => s.category === 'Top Performer').length
  const catSeg = [
    { label: 'Weak',         value: weak, color: '#ef4444' },
    { label: 'Average',      value: avg,  color: '#f59e0b' },
    { label: 'Top Performer',value: top,  color: '#10b981' },
  ].filter(d => d.value > 0)

  // Score histogram (buckets of 10)
  const buckets = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}–${i * 10 + 10}`, value: 0, color: '#3b82f6' }))
  students.forEach(s => {
    const idx = Math.min(9, Math.floor((s.performance_score || 0) / 10))
    buckets[idx].value++
    buckets[idx].color = (s.performance_score || 0) < 40 ? '#ef4444' : (s.performance_score || 0) <= 75 ? '#f59e0b' : '#10b981'
  })

  // Attendance distribution
  const attBuckets = [
    { label: '<50%', value: 0, color: '#ef4444' },
    { label: '50–70%', value: 0, color: '#f59e0b' },
    { label: '70–90%', value: 0, color: '#06b6d4' },
    { label: '90–100%', value: 0, color: '#10b981' },
  ]
  students.forEach(s => {
    const a = s.attendance || 0
    if (a < 50) attBuckets[0].value++
    else if (a < 70) attBuckets[1].value++
    else if (a < 90) attBuckets[2].value++
    else attBuckets[3].value++
  })

  // Per-batch stats
  const batchStats = Object.entries(batchMap).map(([batch]) => {
    const group = students.filter(s => (s.batch || 'Unknown') === batch)
    const avgScore = group.length ? (group.reduce((s, st) => s + (st.performance_score || 0), 0) / group.length).toFixed(1) : 0
    const avgAtt   = group.length ? Math.round(group.reduce((s, st) => s + (st.attendance || 0), 0) / group.length) : 0
    const topCount = group.filter(st => st.category === 'Top Performer').length
    const weakCount= group.filter(st => st.category === 'Weak').length
    return { batch, count: group.length, avgScore: parseFloat(avgScore), avgAtt, topCount, weakCount }
  }).sort((a, b) => b.avgScore - a.avgScore)

  const maxBatchScore = Math.max(...batchStats.map(b => b.avgScore), 1)

  // Averages
  const avgScore = total ? (students.reduce((s, st) => s + (st.performance_score || 0), 0) / total).toFixed(1) : 0
  const avgAtt   = total ? Math.round(students.reduce((s, st) => s + (st.attendance || 0), 0) / total) : 0
  const avgStudy = total ? (students.reduce((s, st) => s + (st.study_hours || 0), 0) / total).toFixed(1) : 0
  const passRate = total ? Math.round(students.filter(s => (s.performance_score || 0) >= 50).length / total * 100) : 0

  // Top & bottom performers
  const topStudents  = [...students].sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0)).slice(0, 5)
  const weakStudents = [...students].sort((a, b) => (a.performance_score || 0) - (b.performance_score || 0)).slice(0, 5)

  // Study hours vs score correlation
  const scatterData = students.map(s => ({
    name: s.name,
    study_hours: s.study_hours || 0,
    performance_score: s.performance_score || 0,
    attendance: s.attendance || 0,
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

      {loading && students.length === 0 ? (
        <div className="empty"><div className="empty-icon">⏳</div><p>Loading analytics…</p></div>
      ) : total === 0 ? (
        <div className="empty"><div className="empty-icon">📊</div><p>No student data yet. Add students to see analytics.</p></div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="kpi-row fu fu1">
            <MiniStat icon="👥" label="Total Students" value={total}         color="var(--cyan)"   sub={`${Object.keys(batchMap).length} batches`} />
            <MiniStat icon="📈" label="Avg. Score"     value={avgScore}      color="var(--blue)"   sub="class average" />
            <MiniStat icon="✓"  label="Pass Rate"      value={`${passRate}%`}color="var(--green)"  sub="score ≥ 50" />
            <MiniStat icon="📅" label="Avg. Attendance"value={`${avgAtt}%`}  color="var(--purple)" sub="all students" />
            <MiniStat icon="📚" label="Avg. Study Hrs" value={`${avgStudy}h`}color="var(--yellow)" sub="per week" />
            <MiniStat icon="⚠"  label="At Risk"        value={weak}          color="var(--red)"    sub={`${pct(weak, total)}% of class`} />
          </div>

          {/* Row 1: Batch students + Category donut */}
          <div className="analytics-row fu fu2">
            <BarChart
              data={batchData}
              valueKey="value"
              labelKey="label"
              colorKey="color"
              height={180}
              title="👥 Students per Batch"
            />
            <DonutChart
              segments={catSeg}
              size={140}
              title="🏷 Performance Categories"
              centerLabel="total"
              centerValue={total}
            />
            <DonutChart
              segments={attBuckets.filter(d => d.value > 0)}
              size={140}
              title="📅 Attendance Distribution"
              centerLabel="avg"
              centerValue={`${avgAtt}%`}
            />
          </div>

          {/* Row 2: Score histogram */}
          <div className="analytics-row fu fu3">
            <BarChart
              data={buckets}
              valueKey="value"
              labelKey="label"
              colorKey="color"
              height={170}
              title="📊 Score Distribution (Histogram)"
            />
            <StudyHoursChart data={scatterData} />
            <AttendanceChart data={scatterData} />
          </div>

          {/* Row 3: Batch performance table */}
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
                      <span>Avg Score</span><span style={{ color: BATCH_COLORS[i % BATCH_COLORS.length], fontWeight: 700 }}>{b.avgScore}</span>
                    </div>
                    <HBar label="" value={b.avgScore} max={maxBatchScore} color={BATCH_COLORS[i % BATCH_COLORS.length]} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 4, fontSize: 10, color: 'var(--text3)' }}>
                      <span>Avg Attendance</span><span style={{ color: 'var(--text2)', fontWeight: 700 }}>{b.avgAtt}%</span>
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

          {/* Row 4: Top & Bottom performers */}
          <div className="analytics-row-2 fu fu5">
            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">🏆 Top Performers</div><div className="card-sub">Highest scoring students</div></div>
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
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{s.batch}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--green)', letterSpacing: -0.5 }}>{(s.performance_score || 0).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.attendance}% att</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-hdr">
                <div><div className="card-title">⚠ Needs Attention</div><div className="card-sub">Students requiring intervention</div></div>
              </div>
              <div className="leaderboard">
                {weakStudents.map((s, i) => (
                  <div key={s.id} className="leader-row">
                    <div className="leader-rank" style={{ color: 'var(--red)' }}>{i + 1}</div>
                    <div className="s-av" style={{ flexShrink: 0, background: 'var(--red-d)', color: 'var(--red)', borderColor: '#ef444430' }}>{s.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{s.batch}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--red)', letterSpacing: -0.5 }}>{(s.performance_score || 0).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.attendance}% att</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}