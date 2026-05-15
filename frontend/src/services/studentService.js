/**
 * src/services/studentService.js
 * All student-facing API calls (authenticated student role).
 */
import api from './api'

export const studentService = {
  getReport:    ()     => api.get('/student/report').then(r => r.data),
  updateRecord: (data) => api.put('/student/update', data).then(r => r.data),
}

export default studentService
