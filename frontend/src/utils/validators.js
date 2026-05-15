/**
 * src/utils/validators.js
 * Reusable field-level validators for useFormValidation.
 */

export const required = (label = 'This field') =>
  (v) => (!v || !String(v).trim()) ? `${label} is required` : ''

export const minLength = (min, label = 'Value') =>
  (v) => v && v.length < min ? `${label} must be at least ${min} characters` : ''

export const maxLength = (max, label = 'Value') =>
  (v) => v && v.length > max ? `${label} must be at most ${max} characters` : ''

export const noSpaces = (label = 'Value') =>
  (v) => v && /\s/.test(v) ? `${label} must not contain spaces` : ''

export const range = (min, max, label = 'Value') =>
  (v) => {
    const n = parseFloat(v)
    if (isNaN(n)) return `${label} must be a number`
    if (n < min || n > max) return `${label} must be between ${min} and ${max}`
    return ''
  }

/** Chain multiple validators, return first error */
export const compose = (...validators) =>
  (v, all) => validators.reduce((err, fn) => err || fn(v, all), '')

/** Auth field validators */
export const authValidators = {
  username: compose(
    required('Username'),
    minLength(3, 'Username'),
    noSpaces('Username'),
  ),
  password: compose(
    required('Password'),
    minLength(6, 'Password'),
  ),
  role:   required('Role'),
  branch: required('Branch'),
}
