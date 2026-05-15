/**
 * src/hooks/useFormValidation.js
 * Generic form state + validation hook.
 *
 * Usage:
 *   const { values, errors, handleChange, validate, reset } = useFormValidation(
 *     initialValues,
 *     validationRules,
 *   )
 *
 * validationRules is an object where each key maps to a validation fn:
 *   { username: v => !v && 'Username is required' }
 */
import { useState } from 'react'

export function useFormValidation(initialValues, rules = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    if (rules[name]) {
      const err = rules[name](values[name], values)
      setErrors(prev => ({ ...prev, [name]: err || '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    for (const [field, rule] of Object.entries(rules)) {
      const err = rule(values[field], values)
      if (err) newErrors[field] = err
    }
    setErrors(newErrors)
    setTouched(Object.keys(rules).reduce((acc, k) => ({ ...acc, [k]: true }), {}))
    return Object.keys(newErrors).length === 0
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return { values, errors, touched, handleChange, handleBlur, validate, reset, setValues }
}
