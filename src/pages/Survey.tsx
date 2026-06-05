import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { useToast } from '../components/Toast'
import { submitSurvey, watchSurvey, type SurveyResponse } from '../lib/surveys'

export default function Survey() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()
  const survey = useMemo(() => cfg.surveys.find((s) => s.id === id), [cfg.surveys, id])

  const [responses, setResponses] = useState<SurveyResponse[]>([])
  useEffect(() => watchSurvey(id, setResponses), [id])

  const mine = responses.find((r) => r.uid === user?.uid)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const showResults = !!mine

  const submit = async () => {
    if (!user || !survey) return
    if (Object.keys(answers).length < survey.questions.length) { toast.show('יש לענות על כל השאלות', 'error'); return }
    setBusy(true)
    try { await submitSurvey(user.uid, survey.id, answers); toast.show('תודה! התשובות נשמרו ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" className="btn-ghost" style={{ padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>← חזרה</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 24 }}>📋 {survey?.title || 'סקר'}</h1>
      </div>

      {!survey && <div className="card" style={{ textAlign: 'center' }}>הסקר לא נמצא.</div>}

      {survey?.questions.map((q) => {
        const counts = q.options.map((_, oi) => responses.filter((r) => r.answers[q.id] === oi).length)
        const total = counts.reduce((a, b) => a + b, 0)
        return (
          <section key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>{q.text}</h3>
            {q.options.map((opt, oi) => {
              const chosen = (showResults ? mine?.answers[q.id] : answers[q.id]) === oi
              const pct = total ? Math.round((counts[oi] / total) * 100) : 0
              return (
                <button
                  key={oi}
                  onClick={() => !showResults && setAnswers((p) => ({ ...p, [q.id]: oi }))}
                  disabled={showResults}
                  style={{
                    position: 'relative', overflow: 'hidden', textAlign: 'right',
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    border: chosen ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: 'var(--glass-bg-hi)', cursor: showResults ? 'default' : 'pointer'
                  }}
                >
                  {showResults && (
                    <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${pct}%`,
                      background: chosen ? 'color-mix(in srgb, var(--color-primary) 28%, transparent)' : 'var(--glass-bg)', transition: 'width .4s' }} />
                  )}
                  <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontWeight: chosen ? 800 : 600 }}>
                    <span>{opt}{chosen ? ' ✓' : ''}</span>
                    {showResults && <span style={{ color: 'var(--color-text-muted)' }}>{pct}% · {counts[oi]}</span>}
                  </span>
                </button>
              )
            })}
          </section>
        )
      })}

      {survey && !showResults && (
        <button className="btn btn-block" onClick={submit} disabled={busy} style={{ padding: '14px' }}>
          {busy ? 'שולח…' : 'שליחה'}
        </button>
      )}
      {showResults && <div className="text-muted" style={{ textAlign: 'center', fontSize: 13 }}>תודה שהשתתפת! התוצאות מתעדכנות בזמן אמת · {responses.length} משתתפים</div>}
    </div>
  )
}
