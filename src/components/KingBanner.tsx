import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { watchKing, setKingMessage, type KingState } from '../lib/king'
import { useToast } from './Toast'

/** Leader perk: spotlights the current king and lets them broadcast one line. */
export default function KingBanner() {
  const { user } = useAuth()
  const toast = useToast()
  const [king, setKing] = useState<KingState | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => watchKing(setKing), [])
  if (!king || !king.uid || king.totalPoints <= 0) return null
  const isKing = !!user && user.uid === king.uid

  const save = async () => {
    if (!user) return
    setBusy(true)
    try { await setKingMessage(user.uid, draft.trim().slice(0, 120)); toast.show('הודעת המלך פורסמה 👑'); setEditing(false) }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)', padding: '12px 16px',
      background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 30%, var(--color-bg-elevated)), var(--color-bg-elevated))',
      border: '1px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong))'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>👑</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>מלך/ת הניחושים</div>
          <div style={{ fontWeight: 800 }}>{king.name} · {king.totalPoints} נק׳ {isKing && <span style={{ color: 'var(--color-primary)', fontSize: 12 }}>(אתה 👑)</span>}</div>
        </div>
      </div>

      {king.message && !editing && (
        <div style={{ marginTop: 8, fontSize: 14, fontStyle: 'italic' }}>📣 “{king.message}”</div>
      )}

      {isKing && !editing && (
        <button onClick={() => { setDraft(king.message); setEditing(true) }} className="btn-ghost"
          style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
          📣 {king.message ? 'ערוך הודעת מלך' : 'פרסם הודעת מלך'}
        </button>
      )}

      {isKing && editing && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input value={draft} maxLength={120} onChange={(e) => setDraft(e.target.value)} placeholder="הודעה קצרה לכולם…"
            style={{ flex: 1, padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }} />
          <button className="btn" onClick={save} disabled={busy} style={{ padding: '8px 14px' }}>{busy ? '…' : 'פרסם'}</button>
          <button onClick={() => setEditing(false)} className="btn-ghost" style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>✕</button>
        </div>
      )}
    </div>
  )
}
