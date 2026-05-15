/**
 * src/services/teacherService.js
 * All teacher-facing API calls (authenticated teacher role).
 */
import api from './api'

export const teacherService = {
  getStudents:    ()       => api.get('/teacher/students').then(r => r.data),
  getAnalytics:   ()       => api.get('/teacher/analytics').then(r => r.data),
  getWeakStudents:()       => api.get('/teacher/weak-students').then(r => r.data),
  getReport:      (id)     => api.get(`/teacher/student-report/${id}`).then(r => r.data),
  addStudent:     (data)   => api.post('/teacher/add-student', data).then(r => r.data),
  updateStudent:  (id, d)  => api.put(`/teacher/student/${id}`, d).then(r => r.data),
  deleteStudent:  (id)     => api.delete(`/teacher/student/${id}`).then(r => r.data),
}

export default teacherService
