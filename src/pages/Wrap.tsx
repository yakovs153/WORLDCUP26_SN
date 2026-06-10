import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useUserDoc } from '../hooks/useUserDoc'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAppConfig } from '../hooks/useAppConfig'
import { scorePredictionForStage } from '../lib/scoring'
import { tomPick, OCTOPUS_NAME } from '../lib/octopus'
import OctopusMark from '../components/OctopusMark'

// Preview lines shown before the tournament starts (or before Tom has data to coach on).
// Once finished matches exist, the daily job replaces this with a real, personalized line.
const PREVIEW_LINES = [
  'עוד אין נתונים אמיתיים לאמן עליהם — אבל ברגע שהמשחקים יתחילו, נגיש לך טיפ אישי על סמך הניחושים שלך.',
  'אחרי שלושה משחקים ניקח את הסטטיסטיקה שלך ונגיד לך איפה אתה מרוויח נקודות ואיפה אתה מאבד.',
  'תכניס ניחושים מגוונים — אם תמיד תנחש 1-0, נרדוף אותך עם הנתונים אחרי המשחק הראשון.',
  'אנחנו מהמרים, לא נביאים. בקרוב נגיד לך בדיוק כמה נקודות הפסדת בגלל ניחושי תיקו זהירים מדי.'
]

/** "סיכום העונה" — a per-user season review (best call, vs-Tom, rank). */
export default function Wrap() {
  const { user } = useAuth()
  const { data: userDoc } = useUserDoc(user?.uid ?? null)
  const { matches } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const { entries } = useLeaderboard(200)
  const cfg = useAppConfig()

  const stats = useMemo(() => {
    const finished = matches.filter((m) => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
    let myPts = 0, tomPts = 0, exact = 0, best: { label: string; pts: number } | null = null
    let predicted = 0
    for (const m of finished) {
      const [th, ta] = tomPick(m.homeTeam.code, m.awayTeam.code, m.id, cfg.analystOverrides)
      tomPts += scorePredictionForStage(th, ta, m.homeScore!, m.awayScore!, m.stage, cfg.scoring)
      const p = byMatchId[m.id]
      if (!p) continue
      predicted++
      const pts = scorePredictionForStage(p.homeScore, p.awayScore, m.homeScore!, m.awayScore!, m.stage, cfg.scoring)
      myPts += pts
      if (p.homeScore === m.homeScore && p.awayScore === m.awayScore) exact++
      if (!best || pts > best.pts) best = { label: `${m.homeTeam.name} ${p.homeScore}–${p.awayScore} ${m.awayTeam.name}`, pts }
    }
    const ranked = [...entries].sort((a, b) => b.totalPoints - a.totalPoints)
    const rank = ranked.findIndex((e) => e.uid === user?.uid) + 1
    return { finishedCount: finished.length, predicted, myPts, tomPts, exact, best, rank, total: ranked.length }
  }, [matches, byMatchId, entries, cfg, user?.uid])

  const beatTom = stats.myPts > stats.tomPts

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/profile" className="btn-ghost" style={{ padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>← חזרה</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 26 }}>📊 סיכום העונה שלי</h1>
      </div>

      {/* AI coach card — always visible (real line if available, else a preview) */}
      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, var(--color-bg-elevated)), var(--color-bg-elevated))' }}>
        <OctopusMark size={28} />
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
            עמוס ואביגדור · אימון אישי{!userDoc?.coach?.text && ' · תצוגה מקדימה'}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.6 }}>
            {userDoc?.coach?.text || PREVIEW_LINES[(user?.uid || 'a').charCodeAt(0) % PREVIEW_LINES.length]}
          </div>
        </div>
      </div>

      {stats.finishedCount === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
          <h3>הסיכום ייבנה תוך כדי הטורניר</h3>
          <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>חזור לכאן אחרי שיתחילו המשחקים. סטטיסטיקות, "אתה מול עמוס ואביגדור" וטיפים אישיים יופיעו כאן.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, var(--color-bg-elevated)), var(--color-bg-elevated))', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Stat label="מקום בדירוג" value={stats.rank > 0 ? `#${stats.rank} מתוך ${stats.total}` : '—'} />
            <Stat label="נקודות" value={String(stats.myPts)} />
            <Stat label="ניחושים שהוכרעו" value={String(stats.predicted)} />
            <Stat label="תוצאות בול 🎯" value={String(stats.exact)} />
          </div>

          {stats.best && (
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>🏅 הניחוש הכי טוב שלך</div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>{stats.best.label}</div>
              <div style={{ color: 'var(--color-primary)', fontWeight: 800 }}>+{stats.best.pts} נק׳</div>
            </div>
          )}

          <div className="card" style={{ textAlign: 'center', border: `1px solid ${beatTom ? 'var(--color-primary)' : 'var(--color-danger)'}` }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>🎲 אתה מול {OCTOPUS_NAME}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 6 }}>{stats.myPts} : {stats.tomPts}</div>
            <div style={{ marginTop: 6, fontWeight: 800, color: beatTom ? 'var(--color-primary)' : 'var(--color-danger)' }}>
              {beatTom ? '🎉 ניצחת את ה-AI!' : 'עמוס ואביגדור מובילים — עוד יש זמן לעקוף!'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-primary)' }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  )
}
