import React from 'react'

/**
 * FormField — labeled input/select/textarea with error display.
 *
 * Props: label, error, icon, as ('input'|'select'|'textarea'), ...rest
 */
export default function FormField({ label, error, icon, as: Tag = 'input', children, className = '', ...rest }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: 'var(--text3)' }}>
            {icon}
          </span>
        )}
        <Tag
          className={`${error ? 'err' : ''} ${icon ? 'pl-9' : ''} ${className}`}
          style={{
            background:   'var(--surface2)',
            border:       `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`,
            color:        'var(--text)',
            borderRadius: 8,
            padding:      icon ? '10px 12px 10px 36px' : '10px 12px',
            fontSize:     13,
            width:        '100%',
            fontFamily:   'var(--font)',
            outline:      'none',
            transition:   'border-color .2s, box-shadow .2s',
          }}
          {...rest}
        >
          {children}
        </Tag>
      </div>
      {error && <span className="err-msg">{error}</span>}
    </div>
  )
}
