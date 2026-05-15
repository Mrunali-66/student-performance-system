/**
 * src/services/studentService.js
 * All student-facing API calls (authenticated student role).
 *
 * FIXES:
 *  1. Added getDashboard() → GET /student/dashboard (canonical)
 *  2. updateRecord() body now maps internal_marks → assignment_score alias
 *     so both old and new field names work.
 */
import api from './api'

export const studentService = {
  /** GET /student/report — full report with ML analysis */
  getReport:    ()     => api.get('/student/report').then(r => r.data),

  /** GET /student/dashboard — same data, different endpoint */
  getDashboard: ()     => api.get('/student/dashboard').then(r => r.data),

  /** GET /student/me — user profile */
  getMe:        ()     => api.get('/student/me').then(r => r.data),

  /**
   * PUT /student/update
   * @param {{ attendance, study_hours, test_score, assignment_score }} data
   */
  updateRecord: (data) => api.put('/student/update', data).then(r => r.data),
}

export default studentService
