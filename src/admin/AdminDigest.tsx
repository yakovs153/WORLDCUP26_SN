import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMatches } from '../hooks/useMatches'
import { useAppConfig } from '../hooks/useAppConfig'
import { octopusEntry, OCTOPUS_UID, OCTOPUS_NAME } from '../lib/octopus'
import { useToast } from '../components/Toast'

const APP_URL = 'https://storenext-wc2026.web.app'

/** One-tap daily summary for sharing to WhatsApp / company chat. Pulls the
 *  same data the app already shows and formats it as a copy-friendly Hebrew
 *  message with WhatsApp-flavoured markdown (*bold*). */
export default function AdminDigest() {
  const toast = useToast()
  const cfg = useAppConfig()
  const { entries } = useLeaderboard(50)
  const { matches } = useMatches()
  const [pundit, setPundit] = useState<{ text?: string; preview?: string }>({})
  const [extra, setExtra] = useState('') // optional admin add-on text

  useEffect(() => {
    if (DEMO_MODE) { setPundit({ text: 'הקרב בטבלה מתחיל להתחמם — מי יחזיק מעמד עד הגמר?', preview: 'משחק היום: ברזיל מול ארגנטינה — דרמה מובטחת!' }); return }
    return onSnapshot(doc(db, 'appState', 'pundit'), (s) => setPundit((s.data() || {}) as { text?: string; preview?: string }))
  }, [])

  const text = useMemo(() => buildDigest({ entries, matches, cfg, pundit, extra }), [entries, matches, cfg, pundit, extra])

  const open = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.show('הועתק ללוח ✓', 'success') }
    catch { toast.show('העתקה נכשלה', 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>📣 סיכום יומי לשיתוף</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>
          הטקסט שלמטה מתעדכן אוטומטית מהמצב בזמן אמת. לחץ "שתף ב-WhatsApp" כדי לפתוח את אפליקציית WhatsApp ולבחור את הקבוצה — ההודעה כבר תהיה מוכנה. אופציונלי: הוסף הערה אישית בסוף.
        </p>

        <textarea
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="הערה אישית להוספה לסוף ההודעה (אופציונלי, למשל: 'אל תשכחו לנחש על משחק הערב 22:00!')"
          style={{ width: '100%', padding: '10px 12px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
        />

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14, fontFamily: 'inherit', maxHeight: 320, overflowY: 'auto' }}>
          {text}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={open} className="btn" style={{ padding: '10px 16px', fontSize: 14, background: '#25D366', color: '#fff' }}>
            📲 שתף ב-WhatsApp
          </button>
          <button onClick={copy} className="btn-ghost" style={{ padding: '10px 14px', fontSize: 13, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
            📋 העתק טקסט
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
          💡 הטיפ: בלחיצה על "שתף ב-WhatsApp" יפתח חלון לבחירת הקבוצה. בנייד — ישירות באפליקציה. במחשב — דרך WhatsApp Web (בודק שאתה מחובר).
        </p>
      </section>
    </div>
  )
}

function buildDigest({
  entries, matches, cfg, pundit, extra
}: {
  entries: import('../types').LeaderboardEntry[]
  matches: import('../types').Match[]
  cfg: import('../types').AppConfig
  pundit: { text?: string; preview?: string }
  extra: string
}): string {
  const dateHe = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  // Top 5 — fold in Tom as an extra player
  const tom = octopusEntry(matches, cfg.scoring, undefined, cfg.analystOverrides)
  const all = [...entries.filter((e) => e.uid !== OCTOPUS_UID), tom].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5)
  const topLines = all.map((e, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
    const isTom = e.uid === OCTOPUS_UID
    return `${medal} ${e.displayName}${isTom ? ' 🤖' : ''} — ${e.totalPoints} נק׳`
  })

  // Today's matches
  const now = Date.now(), DAY = 86_400_000
  const todayMatches = matches.filter((m) => {
    const t = m.kickoff.toMillis()
    return t > now && t - now < DAY
  }).sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
  const liveNow = matches.filter((m) => m.status === 'LIVE')

  const lines: string[] = []
  lines.push(`🏆 *${cfg.content.tournamentName || 'מונדיאל 2026'} — סיכום יומי*`)
  lines.push(`📅 ${dateHe}`)
  lines.push('')

  if (liveNow.length) {
    lines.push('🔴 *משחקים חיים כעת:*')
    for (const m of liveNow.slice(0, 3)) {
      lines.push(`   ${m.homeTeam.name} ${m.homeScore ?? 0}–${m.awayScore ?? 0} ${m.awayTeam.name}${m.minute != null ? ` (${m.minute}')` : ''}`)
    }
    lines.push('')
  }

  if (all.length && all[0].totalPoints > 0) {
    lines.push('📊 *מובילים בטבלה:*')
    lines.push(...topLines)
    lines.push('')
  }

  if (pundit.text) {
    lines.push(`🤖 *${OCTOPUS_NAME} אומר:*`)
    lines.push(pundit.text)
    lines.push('')
  }

  if (pundit.preview) {
    lines.push(`🔮 *תחזית היום:*`)
    lines.push(pundit.preview)
    lines.push('')
  } else if (todayMatches.length) {
    lines.push('⚽ *משחקים היום:*')
    for (const m of todayMatches.slice(0, 5)) {
      const t = m.kickoff.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      lines.push(`   ${t} — ${m.homeTeam.name} נגד ${m.awayTeam.name}`)
    }
    lines.push('')
  }

  if (extra.trim()) {
    lines.push(extra.trim())
    lines.push('')
  }

  lines.push(`🎯 נחשו עכשיו: ${APP_URL}`)

  return lines.join('\n')
}
