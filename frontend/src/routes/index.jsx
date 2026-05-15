/**
 * src/routes/index.jsx — Centralised route definitions for EduTrack.
 * Removed: /add-student, /dashboard (legacy)
 */
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ProtectedRoute from '../components/ProtectedRoute'
import AppLayout from '../layouts/AppLayout'

import Login    from '../pages/Login'
import Register from '../pages/Register'

import StudentDashboard from '../pages/StudentDashboard'
import TeacherDashboard from '../pages/TeacherDashboard'

import Students     from '../pages/Students'
import WeakStudents from '../pages/WeakStudents'
import PredictScore from '../pages/PredictScore'
import Analytics    from '../pages/Analytics'
import EditProfile  from '../pages/EditProfile'

function TeacherPage({ children }) {
  return (
    <ProtectedRoute requiredRole="teacher">
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

function AnyAuthPage({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen />

  const roleHome = user
    ? (user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard')
    : '/login'

  return (
    <Routes>
      <Route path="/login"
        element={!user ? <Login /> : <Navigate to={roleHome} replace />}
      />
      <Route path="/register"
        element={!user ? <Register /> : <Navigate to={roleHome} replace />}
      />

      <Route path="/student-dashboard" element={
        <ProtectedRoute requiredRole="student">
          <div className="app">
            <div className="main" style={{ marginLeft: 0 }}>
              <StudentDashboard />
            </div>
          </div>
        </ProtectedRoute>
      } />

      <Route path="/teacher-dashboard" element={<TeacherPage><TeacherDashboard /></TeacherPage>} />
      <Route path="/analytics"         element={<TeacherPage><Analytics /></TeacherPage>} />
      <Route path="/students"          element={<TeacherPage><Students /></TeacherPage>} />
      <Route path="/weak-students"     element={<TeacherPage><WeakStudents /></TeacherPage>} />
      <Route path="/predict"           element={<TeacherPage><PredictScore /></TeacherPage>} />
      <Route path="/profile"           element={<AnyAuthPage><EditProfile /></AnyAuthPage>} />

      <Route path="/"  element={<Navigate to={roleHome} replace />} />
      <Route path="*"  element={<Navigate to={roleHome} replace />} />
    </Routes>
  )
}
