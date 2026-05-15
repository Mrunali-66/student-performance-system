/**
 * src/context/AppContext.jsx
 * Global state management for EduTrack.
 * Provides: user state, dashboard data, analytics data, student performance data.
 * All pages sync automatically after CRUD actions via this context.
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

// ── Action Types ──────────────────────────────────────────────────────────────
const A = {
  SET_STUDENTS:        'SET_STUDENTS',
  SET_ANALYTICS:       'SET_ANALYTICS',
  SET_WEAK_STUDENTS:   'SET_WEAK_STUDENTS',
  SET_STUDENT_RECORD:  'SET_STUDENT_RECORD',
  SET_LOADING:         'SET_LOADING',
  SET_ERROR:           'SET_ERROR',
  ADD_STUDENT:         'ADD_STUDENT',
  UPDATE_STUDENT:      'UPDATE_STUDENT',
  DELETE_STUDENT:      'DELETE_STUDENT',
  INVALIDATE:          'INVALIDATE',
}

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  students:      [],
  analytics:     null,
  weakStudents:  [],
  studentRecord: null,  // for student role
  loading: {
    students:      false,
    analytics:     false,
    weakStudents:  false,
    studentRecord: false,
  },
  errors: {},
  // Cache invalidation flags
  dirty: {
    students:     true,
    analytics:    true,
    weakStudents: true,
    studentRecord:true,
  },
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, { type, payload }) {
  switch (type) {
    case A.SET_STUDENTS:
      return {
        ...state,
        students: payload,
        dirty: { ...state.dirty, students: false, analytics: true, weakStudents: true },
      }
    case A.SET_ANALYTICS:
      return { ...state, analytics: payload, dirty: { ...state.dirty, analytics: false } }
    case A.SET_WEAK_STUDENTS:
      return { ...state, weakStudents: payload, dirty: { ...state.dirty, weakStudents: false } }
    case A.SET_STUDENT_RECORD:
      return { ...state, studentRecord: payload, dirty: { ...state.dirty, studentRecord: false } }
    case A.SET_LOADING:
      return { ...state, loading: { ...state.loading, ...payload } }
    case A.SET_ERROR:
      return { ...state, errors: { ...state.errors, ...payload } }
    case A.ADD_STUDENT:
      return {
        ...state,
        students: [...state.students, payload],
        dirty: { ...state.dirty, analytics: true, weakStudents: true },
      }
    case A.UPDATE_STUDENT:
      return {
        ...state,
        students: state.students.map(s => s.id === payload.id ? { ...s, ...payload } : s),
        weakStudents: state.weakStudents.map(s => s.id === payload.id ? { ...s, ...payload } : s),
        dirty: { ...state.dirty, analytics: true },
      }
    case A.DELETE_STUDENT:
      return {
        ...state,
        students: state.students.filter(s => s.id !== payload),
        weakStudents: state.weakStudents.filter(s => s.id !== payload),
        dirty: { ...state.dirty, analytics: true },
      }
    case A.INVALIDATE:
      return {
        ...state,
        dirty: {
          students:      true,
          analytics:     true,
          weakStudents:  true,
          studentRecord: true,
          ...payload,
        },
      }
    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user, isTeacher, isStudent } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const fetchingRef = useRef({})

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (force = false) => {
    if (!isTeacher) return
    if (!force && !state.dirty.students) return
    if (fetchingRef.current.students) return
    fetchingRef.current.students = true
    dispatch({ type: A.SET_LOADING, payload: { students: true } })
    try {
      const r = await api.get('/teacher/students')
      const data = Array.isArray(r.data) ? r.data : (r.data.students || r.data.data || [])
      dispatch({ type: A.SET_STUDENTS, payload: data })
      dispatch({ type: A.SET_ERROR, payload: { students: null } })
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to fetch students'
      dispatch({ type: A.SET_ERROR, payload: { students: msg } })
    } finally {
      dispatch({ type: A.SET_LOADING, payload: { students: false } })
      fetchingRef.current.students = false
    }
  }, [isTeacher, state.dirty.students])

  const fetchAnalytics = useCallback(async (force = false) => {
    if (!isTeacher) return
    if (!force && !state.dirty.analytics) return
    if (fetchingRef.current.analytics) return
    fetchingRef.current.analytics = true
    dispatch({ type: A.SET_LOADING, payload: { analytics: true } })
    try {
      const r = await api.get('/teacher/analytics')
      dispatch({ type: A.SET_ANALYTICS, payload: r.data })
      dispatch({ type: A.SET_ERROR, payload: { analytics: null } })
    } catch (e) {
      dispatch({ type: A.SET_ERROR, payload: { analytics: e?.response?.data?.error || 'Failed to fetch analytics' } })
    } finally {
      dispatch({ type: A.SET_LOADING, payload: { analytics: false } })
      fetchingRef.current.analytics = false
    }
  }, [isTeacher, state.dirty.analytics])

  const fetchWeakStudents = useCallback(async (force = false) => {
    if (!isTeacher) return
    if (!force && !state.dirty.weakStudents) return
    if (fetchingRef.current.weakStudents) return
    fetchingRef.current.weakStudents = true
    dispatch({ type: A.SET_LOADING, payload: { weakStudents: true } })
    try {
      const r = await api.get('/teacher/weak-students')
      dispatch({ type: A.SET_WEAK_STUDENTS, payload: Array.isArray(r.data) ? r.data : [] })
      dispatch({ type: A.SET_ERROR, payload: { weakStudents: null } })
    } catch (e) {
      dispatch({ type: A.SET_ERROR, payload: { weakStudents: e?.response?.data?.error || 'Failed to fetch' } })
    } finally {
      dispatch({ type: A.SET_LOADING, payload: { weakStudents: false } })
      fetchingRef.current.weakStudents = false
    }
  }, [isTeacher, state.dirty.weakStudents])

  const fetchStudentRecord = useCallback(async (force = false) => {
    if (!isStudent) return
    if (!force && !state.dirty.studentRecord) return
    if (fetchingRef.current.studentRecord) return
    fetchingRef.current.studentRecord = true
    dispatch({ type: A.SET_LOADING, payload: { studentRecord: true } })
    try {
      const r = await api.get('/student/report')
      dispatch({ type: A.SET_STUDENT_RECORD, payload: r.data })
      dispatch({ type: A.SET_ERROR, payload: { studentRecord: null } })
    } catch (e) {
      dispatch({ type: A.SET_ERROR, payload: { studentRecord: e?.response?.data?.error || 'Failed to load data' } })
    } finally {
      dispatch({ type: A.SET_LOADING, payload: { studentRecord: false } })
      fetchingRef.current.studentRecord = false
    }
  }, [isStudent, state.dirty.studentRecord])

  // ── CRUD actions ───────────────────────────────────────────────────────────
  const addStudent = useCallback(async (data) => {
    const r = await api.post('/teacher/add-student', data)
    dispatch({ type: A.ADD_STUDENT, payload: r.data?.student || { ...data, id: Date.now() } })
    dispatch({ type: A.INVALIDATE, payload: { analytics: true, weakStudents: true } })
    toast.success('Student added!')
    return r.data
  }, [])

  const updateStudent = useCallback(async (id, data) => {
    const r = await api.put(`/teacher/student/${id}`, data)
    dispatch({ type: A.UPDATE_STUDENT, payload: { id, ...data } })
    dispatch({ type: A.INVALIDATE, payload: { analytics: true, weakStudents: true } })
    toast.success('Updated!')
    return r.data
  }, [])

  const deleteStudent = useCallback(async (id) => {
    await api.delete(`/teacher/student/${id}`)
    dispatch({ type: A.DELETE_STUDENT, payload: id })
    dispatch({ type: A.INVALIDATE, payload: { analytics: true, weakStudents: true } })
    toast.success('Deleted!')
  }, [])

  const updateStudentRecord = useCallback(async (data) => {
    const r = await api.put('/student/update', data)
    dispatch({ type: A.SET_STUDENT_RECORD, payload: { ...state.studentRecord, ...data } })
    toast.success('Updated! ML score recalculated.')
    return r.data
  }, [state.studentRecord])

  const invalidateAll = useCallback(() => {
    dispatch({ type: A.INVALIDATE, payload: {} })
  }, [])

  // ── Auto-fetch on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (isTeacher) {
      fetchStudents()
      fetchAnalytics()
    }
    if (isStudent) {
      fetchStudentRecord()
    }
  // eslint-disable-next-line
  }, [user])

  const value = {
    ...state,
    fetchStudents,
    fetchAnalytics,
    fetchWeakStudents,
    fetchStudentRecord,
    addStudent,
    updateStudent,
    deleteStudent,
    updateStudentRecord,
    invalidateAll,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>')
  return ctx
}
