/**
 * src/utils/exportUtils.js
 *
 * Client-side export helpers for EduTrack.
 * - exportToCSV()      – browser-side CSV download (no backend call)
 * - downloadPDFReport() – generates a styled PDF via jsPDF (no backend call)
 *
 * Both functions fall back gracefully and surface errors as thrown strings
 * so callers can toast them.
 */

// ─── CSV ─────────────────────────────────────────────────────────────────────

/**
 * Convert an array of objects to a CSV blob and trigger download.
 * @param {Object[]} rows        – data rows
 * @param {string[]} columns     – ordered list of column keys
 * @param {Object}   headers     – { key: 'Display Header' } map
 * @param {string}   filename    – e.g. 'student_report.csv'
 */
export function exportToCSV(rows, columns, headers, filename = 'export.csv') {
  if (!rows || rows.length === 0) throw 'No data to export'

  const escape = v => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const headerRow = columns.map(c => escape(headers[c] || c)).join(',')
  const dataRows  = rows.map(r => columns.map(c => escape(r[c])).join(','))
  const csv       = [headerRow, ...dataRows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Student CSV columns ──────────────────────────────────────────────────────

export const STUDENT_CSV_COLUMNS = [
  'name', 'email', 'batch', 'attendance', 'study_hours',
  'assignment_submitted', 'assignment_score', 'internal_marks', 'predicted_performance',
  'risk_level', 'remarks', 'recommendations',
]

export const STUDENT_CSV_HEADERS = {
  name:                   'Name',
  email:                  'Email',
  batch:                  'Batch',
  attendance:             'Attendance (%)',
  study_hours:            'Study Hours/Week',
  assignment_submitted:    'Assignment Submitted',
  assignment_score:       'Assignment Submitted',  // backward compat
  internal_marks:         'Internal Marks',
  predicted_performance:  'Predicted Score',
  risk_level:             'Risk Level',
  remarks:                'Teacher Remarks',
  recommendations:        'Recommendations',
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Dynamically load jsPDF from CDN if not already present.
 */
async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload = res
    s.onerror = () => rej('Failed to load PDF library')
    document.head.appendChild(s)
  })
  return window.jspdf.jsPDF
}

/**
 * Generate a styled single-student PDF report.
 * @param {Object} record     – student data object from /student/report
 * @param {Object} analysis   – { strengths[], weaknesses[], suggestions[] }
 * @param {string} studentName
 */
export async function downloadStudentPDF(record, analysis, studentName) {
  const JsPDF = await loadJsPDF()
  const doc   = new JsPDF({ unit: 'mm', format: 'a4' })

  const PAGE_W = 210, MARGIN = 18
  const COL    = PAGE_W - MARGIN * 2
  let y        = MARGIN

  // ── helpers ───────────────────────────────────────────────────────────────
  const nextLine = (gap = 5) => { y += gap }
  const checkPage = (needed = 20) => {
    if (y + needed > 280) { doc.addPage(); y = MARGIN }
  }

  const riskColor = level => {
    if (level === 'Top Performer') return [34, 197, 94]
    if (level === 'Weak')          return [239, 68, 68]
    return [234, 179, 8]
  }

  // ── Header band ───────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, PAGE_W, 42, 'F')

  doc.setTextColor(6, 182, 212)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('EduTrack', MARGIN, 17)

  doc.setFontSize(10)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text('Student Performance Report', MARGIN, 25)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, MARGIN, 32)

  // Risk badge top-right
  const [rc, gc, bc] = riskColor(record.risk_level)
  doc.setFillColor(rc, gc, bc)
  const badgeTxt = record.risk_level || 'Unanalyzed'
  const bW = doc.getTextWidth(badgeTxt) + 8
  doc.roundedRect(PAGE_W - MARGIN - bW, 13, bW, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeTxt, PAGE_W - MARGIN - bW + 4, 19)

  y = 50

  // ── Student name / meta ───────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(record.name || studentName || 'Student', MARGIN, y)
  nextLine(7)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  const meta = [record.email, record.batch].filter(Boolean).join('  ·  ')
  if (meta) { doc.text(meta, MARGIN, y); nextLine(10) }

  // ── KPI grid (2 × 3) ─────────────────────────────────────────────────────
  const kpis = [
    { label: 'Attendance',       value: `${record.attendance ?? 0}%` },
    { label: 'Study Hrs/Week',   value: `${record.study_hours ?? 0}h` },
    { label: 'Assignment Submitted', value: `${record.assignment_submitted ?? record.assignment_score ?? 0}/10` },
    { label: 'Internal Marks',   value: String(record.internal_marks ?? 0) },
    { label: 'Predicted Score',  value: parseFloat(record.predicted_performance ?? 0).toFixed(1) },
    { label: 'Risk Level',       value: record.risk_level || '—' },
  ]

  const kpiW = COL / 3, kpiH = 18
  kpis.forEach((k, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    const kx  = MARGIN + col * kpiW
    const ky  = y + row * (kpiH + 4)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(kx, ky, kpiW - 3, kpiH, 2, 2, 'F')

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(k.label.toUpperCase(), kx + 4, ky + 5)

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(k.value, kx + 4, ky + 13)
  })

  y += kpiH * 2 + 4 * 2 + 8

  // ── Progress bar: predicted score ─────────────────────────────────────────
  const pScore = parseFloat(record.predicted_performance ?? 0)
  checkPage(16)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('PREDICTED PERFORMANCE', MARGIN, y)
  nextLine(4)

  doc.setFillColor(226, 232, 240)
  doc.roundedRect(MARGIN, y, COL, 5, 2, 2, 'F')

  const barColor = pScore < 40 ? [239, 68, 68] : pScore <= 75 ? [234, 179, 8] : [34, 197, 94]
  doc.setFillColor(...barColor)
  doc.roundedRect(MARGIN, y, COL * (pScore / 100), 5, 2, 2, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...barColor)
  doc.text(`${pScore.toFixed(1)} / 100`, MARGIN + COL + 2, y + 4)
  nextLine(12)

  // ── ML Analysis ───────────────────────────────────────────────────────────
  if (analysis) {
    const sections = [
      { title: 'Strengths',    color: [34, 197, 94],   items: analysis.strengths    || [] },
      { title: 'Weaknesses',   color: [239, 68, 68],   items: analysis.weaknesses   || [] },
      { title: 'Suggestions',  color: [6, 182, 212],   items: analysis.suggestions  || [] },
    ]

    for (const sec of sections) {
      if (sec.items.length === 0) continue
      checkPage(20)

      doc.setFillColor(...sec.color, 20)
      doc.setDrawColor(...sec.color)
      doc.setLineWidth(0.3)
      const secH = 8 + sec.items.length * 7
      doc.roundedRect(MARGIN, y, COL, Math.min(secH, 60), 3, 3, 'FD')

      doc.setTextColor(...sec.color)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(sec.title.toUpperCase(), MARGIN + 5, y + 6)
      nextLine(9)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)

      for (const item of sec.items) {
        checkPage(8)
        const bullet = sec.title === 'Suggestions' ? `${sec.items.indexOf(item) + 1}.` : '•'
        const lines  = doc.splitTextToSize(`${bullet} ${item}`, COL - 12)
        doc.text(lines, MARGIN + 6, y)
        y += lines.length * 5.5
      }
      y += 5
    }
  }

  // ── Remarks ───────────────────────────────────────────────────────────────
  if (record.remarks) {
    checkPage(24)
    doc.setFillColor(254, 252, 232)
    doc.setDrawColor(234, 179, 8)
    doc.setLineWidth(0.5)
    doc.rect(MARGIN, y, COL, 22, 'FD')

    doc.setTextColor(161, 98, 7)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('TEACHER REMARKS', MARGIN + 5, y + 6)

    doc.setTextColor(51, 65, 85)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const rLines = doc.splitTextToSize(record.remarks, COL - 10)
    doc.text(rLines.slice(0, 2), MARGIN + 5, y + 12)
    nextLine(28)
  }

  if (record.recommendations) {
    checkPage(24)
    doc.setFillColor(236, 254, 255)
    doc.setDrawColor(6, 182, 212)
    doc.setLineWidth(0.5)
    doc.rect(MARGIN, y, COL, 22, 'FD')

    doc.setTextColor(14, 116, 144)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('RECOMMENDATIONS', MARGIN + 5, y + 6)

    doc.setTextColor(51, 65, 85)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const recLines = doc.splitTextToSize(record.recommendations, COL - 10)
    doc.text(recLines.slice(0, 2), MARGIN + 5, y + 12)
    nextLine(28)
  }

  // ── Student question/note box (blank for student to fill if printed) ───────
  checkPage(30)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.rect(MARGIN, y, COL, 28, 'FD')

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('STUDENT NOTES / QUESTIONS', MARGIN + 5, y + 6)
  ;[13, 19, 25].forEach(dy => {
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.2)
    doc.line(MARGIN + 5, y + dy, MARGIN + COL - 5, y + dy)
  })
  nextLine(34)

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('EduTrack — Confidential Academic Report', MARGIN, 292)
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN - 18, 292)
  }

  const safeName = (record.name || studentName || 'student').replace(/\s+/g, '_')
  doc.save(`${safeName}_report.pdf`)
}

/**
 * Generate a batch PDF for all students (teacher download).
 * Creates a summary table + per-student mini-cards.
 * @param {Object[]} students
 * @param {string}   batchLabel – e.g. 'All' or 'Batch A'
 */
export async function downloadBatchPDF(students, batchLabel = 'All') {
  if (!students || students.length === 0) throw 'No students to export'
  const JsPDF = await loadJsPDF()
  const doc   = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  const PAGE_W = 297, PAGE_H = 210, MARGIN = 14
  let y = MARGIN

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, PAGE_W, 30, 'F')

  doc.setTextColor(6, 182, 212)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('EduTrack — Batch Report', MARGIN, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Batch: ${batchLabel}  ·  Students: ${students.length}  ·  ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, MARGIN, 23)

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  y = 38
  const scores = students.map(s => parseFloat(s.predicted_performance || 0))
  const avg    = scores.reduce((a, b) => a + b, 0) / (scores.length || 1)
  const top    = students.filter(s => parseFloat(s.predicted_performance || 0) >= 76).length
  const weak   = students.filter(s => parseFloat(s.predicted_performance || 0) < 40).length

  const kpis = [
    { label: 'Total Students',  value: students.length, color: [6, 182, 212] },
    { label: 'Top Performers',  value: top,             color: [34, 197, 94] },
    { label: 'At Risk',         value: weak,            color: [239, 68, 68] },
    { label: 'Avg Score',       value: avg.toFixed(1),  color: [168, 85, 247] },
  ]
  const kW = 45
  kpis.forEach((k, i) => {
    const kx = MARGIN + i * (kW + 4)
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(kx, y, kW, 16, 2, 2, 'F')
    doc.setTextColor(...k.color)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(String(k.value), kx + 4, y + 11)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(k.label, kx + 4, y + 4)
  })
  y += 24

  // ── Table header ─────────────────────────────────────────────────────────
  const cols = [
    { label: '#',              w: 8  },
    { label: 'Name',           w: 42 },
    { label: 'Email',          w: 52 },
    { label: 'Batch',          w: 22 },
    { label: 'Att%',           w: 14 },
    { label: 'Study',          w: 14 },
    { label: 'Assign',         w: 14 },
    { label: 'Internal',       w: 16 },
    { label: 'Predicted',      w: 18 },
    { label: 'Risk',           w: 24 },
    { label: 'Remarks',        w: 58 },
  ]

  doc.setFillColor(30, 41, 59)
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')

  let cx = MARGIN + 2
  cols.forEach(c => {
    doc.text(c.label, cx, y + 5.5)
    cx += c.w
  })
  y += 8

  // ── Table rows ────────────────────────────────────────────────────────────
  const riskColor = level => {
    if (level === 'Top Performer') return [34, 197, 94]
    if (level === 'Weak')          return [239, 68, 68]
    return [234, 179, 8]
  }

  students.forEach((s, idx) => {
    if (y + 8 > PAGE_H - 12) {
      doc.addPage('landscape')
      y = 20
    }

    doc.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249)
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 7.5, 'F')

    doc.setTextColor(51, 65, 85)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')

    const vals = [
      String(idx + 1),
      (s.name || '').substring(0, 20),
      (s.email || '').substring(0, 28),
      (s.batch || '—').substring(0, 10),
      String(s.attendance ?? '—'),
      `${s.study_hours ?? '—'}h`,
      String(s.assignment_submitted ?? s.assignment_score ?? '—'),
      String(s.internal_marks ?? '—'),
      parseFloat(s.predicted_performance || 0).toFixed(1),
      '',
      (s.remarks || '').substring(0, 30),
    ]

    cx = MARGIN + 2
    vals.forEach((v, vi) => {
      doc.text(v, cx, y + 5)
      cx += cols[vi].w
    })

    // Risk badge
    const riskX = MARGIN + cols.slice(0, 9).reduce((a, c) => a + c.w, 0) + 2
    doc.setFillColor(...riskColor(s.risk_level))
    const rW = doc.getTextWidth(s.risk_level || '—') + 4
    doc.roundedRect(riskX, y + 1.5, rW, 4.5, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.text(s.risk_level || '—', riskX + 2, y + 5)

    y += 7.5
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(6.5)
    doc.setTextColor(148, 163, 184)
    doc.text('EduTrack — Confidential Batch Report', MARGIN, PAGE_H - 6)
    doc.text(`Page ${p} / ${totalPages}`, PAGE_W - MARGIN - 16, PAGE_H - 6)
  }

  const label = batchLabel.replace(/\s+/g, '_')
  doc.save(`batch_${label}_report.pdf`)
}
