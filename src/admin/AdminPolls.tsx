import { useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import type { Poll } from '../types'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function AdminPolls() {
  const cfg = useAppConfig()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])

  const create = async () => {
    const filtered = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim() || filtered.length < 2) {
      toast.show('יש להזין שאלה ולפחות 2 אפשרויות', 'error')
      return
    }
    const newPoll: Poll = {
      id: uid(),
      question: question.trim(),
      options: filtered.map((label) => ({ id: uid(), label })),
      active: true,
      createdAt: Date.now()
    }
    await patchAppConfig({ polls: [newPoll, ...cfg.polls] })
    toast.show('סקר נוסף ✓')
    setQuestion('')
    setOptions(['', ''])
    setCreating(false)
  }

  const toggleActive = async (id: string) => {
    const next = cfg.polls.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    await patchAppConfig({ polls: next })
  }

  const remove = async (id: string) => {
    const next = cfg.polls.filter((p) => p.id !== id)
    await patchAppConfig({ polls: next })
    toast.show('סקר נמחק', 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>
            סקרים פעילים
          </h3>
          {!creating && (
            <button
              className="btn"
              onClick={() => setCreating(true)}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              + סקר חדש
            </button>
          )}
        </div>

        {creating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 12, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <input
              placeholder="שאלת הסקר (לדוגמה: מי תזכה בגמר?)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={inputStyle}
            />
            {options.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder={`אפשרות ${i + 1}`}
                  value={o}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    style={{ padding: '0 10px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 18 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setOptions([...options, ''])}
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12, border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', alignSelf: 'flex-start' }}
            >
              + הוספת אפשרות
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn" onClick={create} style={{ flex: 1 }}>פרסום</button>
              <button onClick={() => setCreating(false)} className="btn-ghost" style={{ padding: '10px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>ביטול</button>
            </div>
          </div>
        )}

        {cfg.polls.length === 0 && !creating && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: 12 }}>
            עדיין אין סקרים. צור סקר ראשון שיוצג למשתמשים במסך הבית.
          </p>
        )}

        {cfg.polls.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 8,
              border: p.active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: 14 }}>{p.question}</strong>
              <span style={{ fontSize: 11, color: p.active ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 800 }}>
                {p.active ? 'פעיל' : 'מושבת'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {p.options.map((o) => o.label).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => toggleActive(p.id)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
                {p.active ? 'השבת' : 'הפעל'}
              </button>
              <button onClick={() => remove(p.id)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)' }}>
                מחק
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

const inputStyle = {
  padding: '10px 12px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  outline: 'none',
  fontSize: 14
} as const
