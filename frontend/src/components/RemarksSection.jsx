/**
 * src/components/RemarksSection.jsx
 * Teacher remarks, student questions, and compact modal display
 */
import React from 'react'

const textareaStyle = {
  width: '100%', minHeight: 80, padding: 10, borderRadius: 6,
  border: '1px solid var(--surface3)', background: 'var(--surface2)',
  fontFamily: 'inherit', fontSize: 13, resize: 'vertical',
}

export function TeacherRemarksSection({ remarks, recommendations, isEditing, onChange, onEdit, saving }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card fu fu1">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
          📝 Teacher Remarks
        </div>
        {isEditing
          ? <textarea value={remarks || ''} onChange={e => onChange('remarks', e.target.value)}
              placeholder="Teacher remarks here..." style={textareaStyle} />
          : <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {remarks || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>No remarks yet</span>}
            </p>
        }
      </div>

      <div className="card fu fu2">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
          💡 Recommendations
        </div>
        {isEditing
          ? <textarea value={recommendations || ''} onChange={e => onChange('recommendations', e.target.value)}
              placeholder="Recommendations here..." style={textareaStyle} />
          : <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {recommendations || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>No recommendations yet</span>}
            </p>
        }
      </div>

      {isEditing && onEdit && (
        <button className="btn btn-primary btn-sm" onClick={onEdit} disabled={saving}>
          {saving ? '⏳ Saving...' : '✓ Save'}
        </button>
      )}
    </div>
  )
}

export function StudentRemarksSection({ studentQuestions, isEditing, onChange, onEdit, saving }) {
  return (
    <div className="card fu" style={{ marginTop: 20 }}>
      <div className="card-hdr">
        <div>
          <div className="card-title">❓ Questions & Concerns</div>
          <div className="card-sub">Ask your teacher about your performance</div>
        </div>
        {!isEditing && onEdit && (
          <button className="btn btn-edit btn-sm" onClick={() => onEdit(true)}>✏ Add</button>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={studentQuestions || ''}
            onChange={e => onChange('student_questions', e.target.value)}
            placeholder="What would you like to ask your teacher? Share any concerns..."
            style={{ ...textareaStyle, minHeight: 100 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={onEdit} disabled={saving}>
              {saving ? '⏳' : '✓ Save'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(false)}>✕ Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, minHeight: 40, display: 'flex', alignItems: 'center' }}>
          {studentQuestions || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>No questions yet — click "Add" to ask your teacher!</span>}
        </p>
      )}
    </div>
  )
}

export function CompactRemarksDisplay({ remarks, recommendations, studentQuestions }) {
  if (!remarks && !recommendations && !studentQuestions) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {remarks && (
        <div className="analysis-box">
          <div className="analysis-box-title" style={{ color: 'var(--yellow)' }}>📝 Teacher Remarks</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{remarks}</p>
        </div>
      )}
      {recommendations && (
        <div className="analysis-box">
          <div className="analysis-box-title" style={{ color: 'var(--cyan)' }}>💡 Recommendations</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{recommendations}</p>
        </div>
      )}
      {studentQuestions && (
        <div className="analysis-box">
          <div className="analysis-box-title" style={{ color: 'var(--blue)' }}>❓ Student Questions</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{studentQuestions}</p>
        </div>
      )}
    </div>
  )
}