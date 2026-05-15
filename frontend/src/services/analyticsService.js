/**
 * src/services/analyticsService.js
 * All analytics & prediction API calls in one place.
 */
import api from './api'

// ── Analytics APIs ────────────────────────────────────────────────────────────

/** Full analytics summary from backend */
export const getAnalytics = () => api.get('/teacher/analytics')

/** Per-batch breakdown */
export const getBatchAnalytics = (batch) =>
  api.get('/teacher/analytics/batch', { params: { batch } })

/** Attendance analytics */
export const getAttendanceAnalytics = () =>
  api.get('/teacher/analytics/attendance')

/** Marks / score analytics */
export const getMarksAnalytics = () =>
  api.get('/teacher/analytics/marks')

/** Branch performance comparison */
export const getBranchPerformance = () =>
  api.get('/teacher/analytics/branch-performance')

/** Dashboard refresh — re-triggers ML recalculation */
export const refreshDashboard = () =>
  api.post('/teacher/refresh')

// ── Prediction APIs ───────────────────────────────────────────────────────────

/** Predict score for a set of inputs */
export const predictScore = (payload) =>
  api.post('/teacher/predict', payload)

/** Get at-risk students list with ML risk scores */
export const getWeakStudents = () =>
  api.get('/teacher/weak-students')

/** Get detailed ML analysis for a specific student */
export const getStudentAnalysis = (studentId) =>
  api.get(`/teacher/student/${studentId}/analysis`)

/** Get improvement suggestions for a student */
export const getImprovementSuggestions = (studentId) =>
  api.get(`/teacher/student/${studentId}/suggestions`)

/** Bulk predict for all students (refresh ML scores) */
export const bulkPredict = () =>
  api.post('/teacher/predict/bulk')
