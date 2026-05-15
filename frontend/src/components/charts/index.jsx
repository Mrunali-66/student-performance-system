/**
 * src/components/charts/index.jsx
 * Reusable, memoised chart components built on Recharts.
 * All charts honour the CSS variable colour palette for dark/light themes.
 */
import React, { memo } from 'react'
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts'

// ── Design tokens (mirror CSS vars for Recharts which can't use vars) ─────────
export const COLORS = {
  cyan:   '#06b6d4',
  blue:   '#3b82f6',
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
  purple: '#8b5cf6',
  pink:   '#ec4899',
  teal:   '#14b8a6',
  orange: '#f97316',
  indigo: '#6366f1',
}

export const COLOR_ARRAY = Object.values(COLORS)

const GRID_COLOR = 'rgba(148,163,184,0.08)'
const AXIS_COLOR = '#475569'
const TEXT_COLOR = '#94a3b8'
const BG_TOOLTIP = '#0f1929'
const BORDER_TOOLTIP = 'rgba(30,58,95,0.5)'

// ── Shared Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: BG_TOOLTIP, border: `1px solid ${BORDER_TOOLTIP}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    }}>
      {label !== undefined && (
        <div style={{ color: TEXT_COLOR, marginBottom: 7, fontWeight: 600, fontSize: 11 }}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, display: 'inline-block' }} />
          <span style={{ color: '#94a3b8', fontWeight: 400, minWidth: 80 }}>{p.name}:</span>
          <span>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Area Chart ─────────────────────────────────────────────────────────────────
export const EduAreaChart = memo(function EduAreaChart({
  data, lines, xKey = 'name', height = 220, gradientId = 'eduarea',
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          {lines.map((l, i) => (
            <linearGradient key={i} id={`${gradientId}_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={l.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={l.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {lines.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />}
        {lines.map((l, i) => (
          <Area
            key={i} type="monotone" dataKey={l.key} name={l.label || l.key}
            stroke={l.color} strokeWidth={2.5}
            fill={`url(#${gradientId}_${i})`}
            dot={false} activeDot={{ r: 5, fill: l.color, stroke: BG_TOOLTIP, strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
})

// ── Bar Chart ──────────────────────────────────────────────────────────────────
export const EduBarChart = memo(function EduBarChart({
  data, bars, xKey = 'name', height = 220, layout = 'horizontal',
  stacked = false, referenceValue,
}) {
  const isVertical = layout === 'vertical'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data} layout={layout}
        margin={{ top: 8, right: 8, bottom: 0, left: isVertical ? 90 : -20 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 4" stroke={GRID_COLOR} horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <YAxis dataKey={xKey} type="category" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} width={85} />
            <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
        {bars.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />}
        {referenceValue !== undefined && (
          <ReferenceLine
            x={isVertical ? undefined : referenceValue}
            y={isVertical ? referenceValue : undefined}
            stroke={COLORS.yellow} strokeDasharray="4 3" strokeWidth={1.5}
          />
        )}
        {bars.map((b, i) => (
          <Bar
            key={i} dataKey={b.key} name={b.label || b.key}
            fill={b.color || COLOR_ARRAY[i % COLOR_ARRAY.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? [0,0,0,0] : (isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0])}
            maxBarSize={isVertical ? 18 : 50}
          >
            {b.cellColors && data.map((_, di) => (
              <Cell key={di} fill={b.cellColors[di % b.cellColors.length]} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
})

// ── Line Chart ─────────────────────────────────────────────────────────────────
export const EduLineChart = memo(function EduLineChart({
  data, lines, xKey = 'name', height = 220,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {lines.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />}
        {lines.map((l, i) => (
          <Line
            key={i} type="monotone" dataKey={l.key} name={l.label || l.key}
            stroke={l.color || COLOR_ARRAY[i]} strokeWidth={2.5}
            dot={{ r: 3, fill: l.color, stroke: BG_TOOLTIP, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
})

// ── Donut / Pie Chart ──────────────────────────────────────────────────────────
export const EduDonutChart = memo(function EduDonutChart({
  data, nameKey = 'name', valueKey = 'value', height = 200,
  innerRadius = 55, outerRadius = 80, centerLabel, centerValue,
}) {
  const [activeIndex, setActiveIndex] = React.useState(null)

  const PieLabelLine = false
  const renderCustomLabel = ({ cx, cy }) => (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#e2e8f0" fontSize={22} fontWeight={800}>
        {centerValue}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={TEXT_COLOR} fontSize={10}>
        {centerLabel}
      </text>
    </>
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data} dataKey={valueKey} nameKey={nameKey}
          cx="50%" cy="50%"
          innerRadius={innerRadius} outerRadius={outerRadius}
          paddingAngle={3}
          labelLine={PieLabelLine}
          label={centerValue !== undefined ? renderCustomLabel : false}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color || COLOR_ARRAY[i % COLOR_ARRAY.length]}
              opacity={activeIndex === null || activeIndex === i ? 1 : 0.55}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 11, color: TEXT_COLOR, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
})

// ── Radar Chart ────────────────────────────────────────────────────────────────
export const EduRadarChart = memo(function EduRadarChart({
  data, radars, angleKey = 'subject', height = 250, fullMark = 100,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke={GRID_COLOR} />
        <PolarAngleAxis dataKey={angleKey} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        {radars.map((r, i) => (
          <Radar
            key={i} name={r.label || r.key} dataKey={r.key}
            stroke={r.color || COLOR_ARRAY[i]}
            fill={r.color || COLOR_ARRAY[i]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        {radars.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />}
      </RadarChart>
    </ResponsiveContainer>
  )
})

// ── Scatter Chart ──────────────────────────────────────────────────────────────
export const EduScatterChart = memo(function EduScatterChart({
  data, xKey, yKey, xLabel, yLabel, color = COLORS.cyan, height = 220, name = 'Students',
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: -20 }}>
        <CartesianGrid strokeDasharray="3 4" stroke={GRID_COLOR} />
        <XAxis
          dataKey={xKey} name={xLabel || xKey} type="number"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false}
          label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: TEXT_COLOR, fontSize: 10 }}
        />
        <YAxis
          dataKey={yKey} name={yLabel || yKey} type="number"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: GRID_COLOR, strokeDasharray: '3 3' }}
        />
        <Scatter name={name} data={data} fill={color} fillOpacity={0.75} r={4} />
      </ScatterChart>
    </ResponsiveContainer>
  )
})
