import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { useBonus } from '../hooks/useBonus'
import { useAppConfig } from '../hooks/useAppConfig'
import FlagIcon from '../components/FlagIcon'
import PlayerAvatar from '../components/PlayerAvatar'
import GoldenBootRace from '../components/GoldenBootRace'
import { useGoldenBoot } from '../hooks/useGoldenBoot'
import { useToast } from '../components/Toast'
import { saveBonus } from '../lib/bonus'
import { TOP_SCORER_CANDIDATES, type PlayerOption } from '../lib/players'
import { MatchCardSkeleton } from '../components/Skeleton'
import { DEMO_MODE } from '../firebase'
import type { TeamRef } from '../types'

export default function Bonus() {
  const { user } = useAuth()
  const { matches, loading: lm } = useMatches()
  const { data: bonus, loading: lb } = useBonus(user?.uid ?? null)
  const cfg = useAppConfig()
  const goldenBoot = useGoldenBoot()
  const toast = useToast()

  // Get admin-uploaded photo if present, else fall back to player's hard-coded photoUrl
  const photoFor = (name: string, fallback?: string) => cfg.playerPhotos[name] || fallback

  const [championCode, setChampionCode] = useState<string | null>(null)
  const [topScorer, setTopScorer] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (bonus) {
      setChampionCode(bonus.championTeamCode)
      setTopScorer(bonus.topScorer)
    }
  }, [bonus?.championTeamCode, bonus?.topScorer])

  // Unique teams from matches data, sorted A-Z (Hebrew)
  const teams = useMemo<TeamRef[]>(() => {
    const seen = new Map<string, TeamRef>()
    for (const m of matches) {
      if (!seen.has(m.homeTeam.code)) seen.set(m.homeTeam.code, m.homeTeam)
      if (!seen.has(m.awayTeam.code)) seen.set(m.awayTeam.code, m.awayTeam)
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [matches])

  // Lock once tournament starts (first match kickoff in the past).
  // In demo mode we never lock — so the user can explore and edit.
  const lockedAt = useMemo(() => {
    const first = matches
      .slice()
      .sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())[0]
    return first?.kickoff?.toDate() ?? null
  }, [matches])

  const locked = !DEMO_MODE && lockedAt ? lockedAt.getTime() <= Date.now() : false

  const dirty =
    championCode !== (bonus?.championTeamCode ?? null) ||
    topScorer !== (bonus?.topScorer ?? null)

  // Combine hard-coded candidates with admin-added custom players
  const allPlayers = useMemo<PlayerOption[]>(() => {
    const hidden = new Set(cfg.hiddenScorers || [])
    return [
      ...TOP_SCORER_CANDIDATES,
      ...cfg.customPlayers.map<PlayerOption>((cp) => ({
        name: cp.name,
        countryCode: cp.countryCode,
        display: `${cp.name} · ${cp.countryCode}`
      }))
    ].filter((p) => !hidden.has(p.name))
  }, [cfg.customPlayers, cfg.hiddenScorers])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await saveBonus(user.uid, championCode, topScorer)
      toast.show('בונוס נשמר ✓', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (lm || lb)
    return (
      <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>ניחושי בונוס</h1>
        <MatchCardSkeleton />
      </div>
    )

  const selectedTeam = teams.find((t) => t.code === championCode)
  const selectedPlayer = allPlayers.find((p) => p.name === topScorer)

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 28 }}>ניחושי בונוס</h1>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {locked ? (
            <>נעול — הטורניר התחיל. הניחושים שלך נשמרו לחישוב סופי.</>
          ) : (
            <>בחר את הזוכה במונדיאל ואת מלך השערים. ניתן לעדכן עד למשחק הראשון.</>
          )}
        </p>
      </header>

      {/* Summary card */}
      <div
        className="card animate-in"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-bg-elevated)) 0%, var(--color-bg-elevated) 100%)',
          border: '1px solid var(--color-border-strong)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SummaryCell
            title="🏆 הזוכה"
            value={selectedTeam ? selectedTeam.name : 'לא נבחר'}
            badge="20 נק'"
            icon={selectedTeam && <FlagIcon flag={selectedTeam.flag} code={selectedTeam.code} size={28} />}
          />
          <SummaryCell
            title="⚽ מלך שערים"
            value={selectedPlayer ? selectedPlayer.name : 'לא נבחר'}
            badge="15 נק'"
            icon={selectedPlayer && <PlayerAvatar name={selectedPlayer.name} countryCode={selectedPlayer.countryCode} photoUrl={photoFor(selectedPlayer.name, selectedPlayer.photoUrl)} size={36} shape="logo" />}
          />
        </div>
      </div>

      {/* Champion picker */}
      <section className="card animate-in">
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18, marginBottom: 4 }}>
          הזוכה במונדיאל
        </h2>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          בחר נבחרת אחת. נקודות יוענקו רק אם תזכה בגמר.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))',
            gap: 8
          }}
        >
          {teams.map((t) => {
            const selected = championCode === t.code
            return (
              <button
                key={t.code}
                onClick={() => !locked && setChampionCode(selected ? null : t.code)}
                disabled={locked}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  background: selected ? 'color-mix(in srgb, var(--color-primary) 18%, transparent)' : 'var(--color-bg-elevated)',
                  border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FlagIcon flag={t.flag} code={t.code} size={32} />
                <span style={{ fontSize: 12, fontWeight: selected ? 800 : 600 }}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Top scorer — Golden Boot race */}
      <GoldenBootRace
        players={allPlayers}
        goals={goldenBoot}
        selected={topScorer}
        photoFor={photoFor}
        onPick={(n) => !locked && setTopScorer(n)}
        locked={locked}
      />

      {!locked && (
        <button
          className="btn btn-block"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{ fontSize: 16, padding: '14px 16px' }}
        >
          {saving ? 'שומר…' : 'שמירת ניחושי הבונוס'}
        </button>
      )}
    </div>
  )
}

function SummaryCell({
  title,
  value,
  badge,
  icon
}: {
  title: string
  value: string
  badge: string
  icon?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', background: 'rgba(225,29,72,0.15)', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
          {badge}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 14 }}>{value}</span>
      </div>
    </div>
  )
}
