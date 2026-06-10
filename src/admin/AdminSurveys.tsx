import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import type { Survey, SurveyQuestion } from '../types'

function rid() {
  return Math.random().toString(36).slice(2, 10)
}

interface Suggestion { title: string; options: string[] }
const DEMO_SUGGESTIONS: Suggestion[] = [
  { title: 'מי תרים את הגביע ב-2026?', options: ['ברזיל', 'צרפת', 'ארגנטינה', 'אחר'] },
  { title: 'מי יהיה מלך השערים?', options: ['מבאפה', 'קיין', 'הולאנד', 'אחר'] },
  { title: 'איזו מחלקה תנצח בתחרות?', options: ['פיתוח', 'מוצר', 'מכירות', 'דאטה'] }
]

type DraftQ = { id: string; text: string; options: string[] }

export default function AdminSurveys() {
  const cfg = useAppConfig()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<DraftQ[]>([{ id: rid(), text: '', options: ['', ''] }])
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEMO_MODE ? DEMO_SUGGESTIONS : [])
  const [sIdx, setSIdx] = useState(0)

  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'appState', 'surveySuggestions'), (s) => {
      const items = s.data()?.items
      if (Array.isArray(items)) setSuggestions(items.filter((x) => x?.title && Array.isArray(x.options)))
    })
  }, [])

  const applySuggestion = () => {
    if (!suggestions.length) { toast.show('עדיין אין הצעות — עמוס ואביגדור יכינו כמה בבוקר', 'info'); return }
    const sug = suggestions[sIdx % suggestions.length]
    setSIdx((i) => i + 1)
    if (!title.trim()) setTitle('סקר מונדיאל 2026')
    setQuestions([{ id: rid(), text: sug.title, options: sug.options.length >= 2 ? [...sug.options] : [...sug.options, ''] }])
    toast.show('הצעה מעמוס ואביגדור נטענה ✨', 'success')
  }

  const reset = () => {
    setTitle('')
    setQuestions([{ id: rid(), text: '', options: ['', ''] }])
    setCreating(false)
  }

  const setQ = (qid: string, patch: Partial<DraftQ>) =>
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)))

  const create = async () => {
    const cleanQs: SurveyQuestion[] = questions
      .map((q) => ({ id: q.id, text: q.text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.text && q.options.length >= 2)
    if (!title.trim() || cleanQs.length === 0) {
      toast.show('יש להזין כותרת ולפחות שאלה אחת עם 2 אפשרויות', 'error')
      return
    }
    const survey: Survey = { id: rid(), title: title.trim(), active: true, questions: cleanQs }
    await patchAppConfig({ surveys: [survey, ...cfg.surveys] })
    toast.show('סקר נוסף ✓')
    reset()
  }

  const toggleActive = async (id: string) => {
    await patchAppConfig({ surveys: cfg.surveys.map((s) => (s.id === id ? { ...s, active: !s.active } : s)) })
  }

  const remove = async (id: string) => {
    await patchAppConfig({ surveys: cfg.surveys.filter((s) => s.id !== id) })
    toast.show('סקר נמחק', 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>סקרים</h3>
          {!creating && (
            <button className="btn" onClick={() => setCreating(true)} style={{ padding: '6px 14px', fontSize: 13 }}>+ סקר חדש</button>
          )}
        </div>

        {creating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, padding: 12, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <input placeholder="כותרת הסקר (לדוגמה: סקר אמצע טורניר)" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

            <button type="button" onClick={applySuggestion} className="btn-ghost"
              style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12, border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)' }}>
              ✨ הצע שאלה (עמוס ואביגדור)
            </button>

            {questions.map((q, qi) => (
              <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input placeholder={`שאלה ${qi + 1}`} value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} style={removeBtn} title="מחק שאלה">×</button>
                  )}
                </div>
                {q.options.map((o, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 6, paddingInlineStart: 12 }}>
                    <input placeholder={`אפשרות ${oi + 1}`} value={o} onChange={(e) => setQ(q.id, { options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} style={{ ...inputStyle, flex: 1 }} />
                    {q.options.length > 2 && (
                      <button onClick={() => setQ(q.id, { options: q.options.filter((_, j) => j !== oi) })} style={removeBtn}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setQ(q.id, { options: [...q.options, ''] })} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: 12, border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', marginInlineStart: 12 }}>+ אפשרות</button>
              </div>
            ))}

            <button onClick={() => setQuestions((qs) => [...qs, { id: rid(), text: '', options: ['', ''] }])} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12, border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>+ הוספת שאלה</button>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn" onClick={create} style={{ flex: 1 }}>פרסום</button>
              <button onClick={reset} className="btn-ghost" style={{ padding: '10px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>ביטול</button>
            </div>
          </div>
        )}

        {cfg.surveys.length === 0 && !creating && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: 12 }}>
            עדיין אין סקרים. צור סקר רב-שאלתי שיוצג למשתמשים במסך הבית. התוצאות תמיד פומביות.
          </p>
        )}

        {cfg.surveys.map((s) => (
          <div key={s.id} style={{ padding: 12, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 8, border: s.active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: 14 }}>{s.title}</strong>
              <span style={{ fontSize: 11, color: s.active ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 800 }}>{s.active ? 'פעיל' : 'מושבת'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>{s.questions.length} שאלות</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => toggleActive(s.id)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>{s.active ? 'השבת' : 'הפעל'}</button>
              <button onClick={() => remove(s.id)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)' }}>מחק</button>
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

const removeBtn = {
  padding: '0 10px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-danger)',
  fontSize: 18
} as const
