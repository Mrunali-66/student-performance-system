# EduTrack Frontend — v4.0 Changes

## New in v4.0: Analytics + Weak Student Prediction

---

## Files Added / Modified

### New Files
| File | Description |
|------|-------------|
| `src/services/analyticsService.js` | All analytics & prediction API calls |
| `src/components/charts/index.jsx` | Recharts wrappers (Area, Bar, Donut, Radar, Scatter) |
| `src/components/charts/ChartCard.jsx` | Chart wrapper card with loading skeleton |

### Modified Files
| File | What Changed |
|------|-------------|
| `src/pages/Analytics.jsx` | Full rebuild — Recharts, 4 sections, 13 charts |
| `src/pages/WeakStudents.jsx` | Full rebuild — risk UI, suggestions, drawer |
| `src/index.css` | Pulse animation, responsive grid, chart extras |
| `package.json` | Added recharts ^2.12.7 |

---

## Setup

```bash
npm install          # installs recharts
npm run dev
```

Set `VITE_API_URL=http://localhost:5000` in `.env`

---

## Chart Component API

```jsx
<EduAreaChart data={data} lines={[{key:'score', label:'Score', color:COLORS.cyan}]} xKey="name" height={220} />
<EduBarChart data={data} bars={[{key:'value', color:COLORS.green}]} xKey="name" layout="vertical" />
<EduDonutChart data={data} centerLabel="total" centerValue={45} height={240} />
<EduRadarChart data={data} radars={[{key:'top',color:COLORS.green},{key:'weak',color:COLORS.red}]} />
<EduScatterChart data={data} xKey="study_hours" yKey="score" color={COLORS.cyan} />
<ChartCard title="Chart Title" loading={false}>{/* chart */}</ChartCard>
```

---

## New API Endpoints Used

```
GET  /teacher/analytics             — full analytics
POST /teacher/refresh               — trigger ML refresh  
GET  /teacher/weak-students         — at-risk students
POST /teacher/predict               — score prediction
GET  /teacher/student/:id/analysis  — ML analysis
GET  /teacher/student/:id/suggestions — suggestions
```

All endpoints degrade gracefully with AppContext fallback data.
