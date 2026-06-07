import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { useBonus } from '../hooks/useBonus'
import { useAppConfig } from '../hooks/useAppConfig'
import FlagIcon from '../components/FlagIcon'
import PlayerAvatar from '../components/PlayerAvatar'
import GoldenBootRace from '../components/GoldenBootRace'
import MyPicksSubTabs from '../components/MyPicksSubTabs'
import { useGoldenBoot } from '../hooks/useGoldenBoot'
import { useToast } from '../components/Toast'
import { saveBonus } from '../lib/bonus'
import { TOP_SCORER_CANDIDATES, type PlayerOption } from '../lib/players'
import { MatchCardSkeleton } from '../components/Skeleton'
import { DEMO_MODE } from '../firebase'
import type { TeamRef } from '../types'

// The 8 favourites — excluded from the "surprise" pool, and the only options
// for the "biggest flop" bonus.
const GIANT_CODES = new Set(['ESP', 'FRA', 'GER', 'NED', 'POR', 'BRA', 'ARG', 'ENG'])

// Teams that did NOT qualify for WC2026 — hide from every bonus pool. They
// can still leak in from seed/strength data; this guard is the safety net.
const NOT_IN_WC2026 = new Set(['BEL', 'CRO'])

export default function Bonus() {
  const { user } = useAuth()
  const { matches, loading: lm } = useMatches()
  const { data: bonus, loading: lb } = useBonus(user?.uid ?? null)
  const cfg = useAppConfig()
  const goldenBoot = useGoldenBoot()
  const toast = useToast()
  const location = useLocation()
  // Used by the "#empty" deep-link from the home reminder card: once the user
  // arrives we scroll them to the first section they haven't filled. Once-only
  // per visit so further state changes don't yank the page around.
  const scrolledRef = useRef(false)

  // Get admin-uploaded photo if present, else fall back to player's hard-coded photoUrl
  const photoFor = (name: string, fallback?: string) => cfg.playerPhotos[name] || fallback

  const [championCode, setChampionCode] = useState<string | null>(null)
  const [topScorer, setTopScorer] = useState<string | null>(null)
  const [runnerUpCode, setRunnerUpCode] = useState<string | null>(null)
  const [surpriseCode, setSurpriseCode] = useState<string | null>(null)
  const [flopCode, setFlopCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (bonus) {
      setChampionCode(bonus.championTeamCode)
      setTopScorer(bonus.topScorer)
      setRunnerUpCode(bonus.runnerUpCode ?? null)
      setSurpriseCode(bonus.surpriseTeamCode ?? null)
      setFlopCode(bonus.flopTeamCode ?? null)
    }
  }, [bonus?.championTeamCode, bonus?.topScorer, bonus?.runnerUpCode, bonus?.surpriseTeamCode, bonus?.flopTeamCode])

  // Deep-link "#empty" → scroll to the first section the user hasn't filled.
  // Runs once after data finishes loading.
  useEffect(() => {
    if (scrolledRef.current) return
    if (location.hash !== '#empty') return
    if (lb || lm) return
    scrolledRef.current = true
    const order = [
      { id: 'bonus-champion',   empty: !bonus?.championTeamCode },
      { id: 'bonus-runner-up',  empty: !bonus?.runnerUpCode },
      { id: 'bonus-surprise',   empty: !bonus?.surpriseTeamCode },
      { id: 'bonus-flop',       empty: !bonus?.flopTeamCode },
      { id: 'bonus-top-scorer', empty: !bonus?.topScorer }
    ]
    const target = order.find((o) => o.empty)
    if (!target) return
    // Wait one tick for the sections to render before scrolling.
    setTimeout(() => {
      document.getElementById(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }, [location.hash, lb, lm, bonus])

  // Unique teams from matches data, sorted A-Z (Hebrew)
  const teams = useMemo<TeamRef[]>(() => {
    const seen = new Map<string, TeamRef>()
    for (const m of matches) {
      if (!seen.has(m.homeTeam.code)) seen.set(m.homeTeam.code, m.homeTeam)
      if (!seen.has(m.awayTeam.code)) seen.set(m.awayTeam.code, m.awayTeam)
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [matches])

  // Filter out teams that didn't qualify for WC2026 from every pool.
  const eligibleTeams = useMemo(() => teams.filter((t) => !NOT_IN_WC2026.has(t.code)), [teams])
  const surpriseTeams = useMemo(() => eligibleTeams.filter((t) => !GIANT_CODES.has(t.code)), [eligibleTeams])
  const giantTeams = useMemo(() => eligibleTeams.filter((t) => GIANT_CODES.has(t.code)), [eligibleTeams])

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
    topScorer !== (bonus?.topScorer ?? null) ||
    surpriseCode !== (bonus?.surpriseTeamCode ?? null) ||
    runnerUpCode !== (bonus?.runnerUpCode ?? null) ||
    flopCode !== (bonus?.flopTeamCode ?? null)

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
      await saveBonus(user.uid, championCode, topScorer, runnerUpCode, surpriseCode, flopCode)
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
        <MyPicksSubTabs />
        <MatchCardSkeleton />
      </div>
    )

  const selectedTeam = teams.find((t) => t.code === championCode)
  const selectedPlayer = allPlayers.find((p) => p.name === topScorer)
  const runnerUpTeam = teams.find((t) => t.code === runnerUpCode)
  const surpriseTeam = teams.find((t) => t.code === surpriseCode)
  const flopTeam = teams.find((t) => t.code === flopCode)

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <MyPicksSubTabs />
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
          <SummaryCell
            title="🥈 סגנית (מפסידת הגמר)"
            value={runnerUpTeam ? runnerUpTeam.name : 'לא נבחר'}
            badge={`${cfg.bonus.runnerUp} נק׳`}
            icon={runnerUpTeam && <FlagIcon flag={runnerUpTeam.flag} code={runnerUpTeam.code} size={28} />}
          />
          <SummaryCell
            title="🐎 הפתעה"
            value={surpriseTeam ? surpriseTeam.name : 'לא נבחר'}
            badge={`${cfg.bonus.surprise} נק׳`}
            icon={surpriseTeam && <FlagIcon flag={surpriseTeam.flag} code={surpriseTeam.code} size={28} />}
          />
          <SummaryCell
            title="📉 האכזבה"
            value={flopTeam ? flopTeam.name : 'לא נבחר'}
            badge={`${cfg.bonus.flop} נק׳`}
            icon={flopTeam && <FlagIcon flag={flopTeam.flag} code={flopTeam.code} size={28} />}
          />
        </div>
      </div>

      {/* Champion picker */}
      <section id="bonus-champion" className="card animate-in" style={{ scrollMarginTop: 'calc(var(--header-height) + 12px)' }}>
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
          {eligibleTeams.map((t) => {
            const selected = championCode === t.code
            return (
              <button
                key={t.code}
                onClick={() => {
                  if (locked) return
                  const next = selected ? null : t.code
                  setChampionCode(next)
                  if (next && runnerUpCode === next) setRunnerUpCode(null)
                }}
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

      {/* Runner-up (loser of the final) */}
      <section id="bonus-runner-up" className="card animate-in" style={{ scrollMarginTop: 'calc(var(--header-height) + 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>🥈 הסגנית</h2>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{cfg.bonus.runnerUp} נק׳</span>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>בחר את הנבחרת שתפסיד בגמר (הזוכה כבר נבחר למעלה).</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
          {eligibleTeams.map((t) => {
            const sel = runnerUpCode === t.code
            const isChampion = championCode === t.code
            return (
              <button key={t.code} onClick={() => !locked && !isChampion && setRunnerUpCode(sel ? null : t.code)} disabled={locked || isChampion}
                title={isChampion ? 'כבר נבחרה כזוכה' : undefined}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 'var(--radius-md)',
                  background: sel ? 'color-mix(in srgb, var(--color-primary) 18%, transparent)' : 'var(--color-bg-elevated)',
                  border: sel ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  opacity: isChampion ? 0.35 : 1, cursor: locked || isChampion ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                <FlagIcon flag={t.flag} code={t.code} size={32} />
                <span style={{ fontSize: 12, fontWeight: sel ? 800 : 600 }}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Surprise of the tournament — outsiders only (the 8 favourites are excluded) */}
      <section id="bonus-surprise" className="card animate-in" style={{ scrollMarginTop: 'calc(var(--header-height) + 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>🐎 הפתעת הטורניר</h2>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{cfg.bonus.surprise} נק׳</span>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>בחר נבחרת «אאוטסיידר» שתפתיע ותגיע לפחות לרבע הגמר. הפייבוריטיות הגדולות לא ברשימה.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
          {surpriseTeams.map((t) => {
            const sel = surpriseCode === t.code
            return (
              <button key={t.code} onClick={() => !locked && setSurpriseCode(sel ? null : t.code)} disabled={locked}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 'var(--radius-md)',
                  background: sel ? 'color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'var(--color-bg-elevated)',
                  border: sel ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  cursor: locked ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                <FlagIcon flag={t.flag} code={t.code} size={32} />
                <span style={{ fontSize: 12, fontWeight: sel ? 800 : 600 }}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Biggest flop — a favourite that crashes out early (the 8 giants only) */}
      <section id="bonus-flop" className="card animate-in" style={{ scrollMarginTop: 'calc(var(--header-height) + 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>📉 האכזבה הגדולה</h2>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{cfg.bonus.flop} נק׳</span>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>איזו מהנבחרות הגדולות תיפול ראשונה ותודח מוקדם (לפני שלב הנוקאאוט)?</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
          {giantTeams.map((t) => {
            const sel = flopCode === t.code
            return (
              <button key={t.code} onClick={() => !locked && setFlopCode(sel ? null : t.code)} disabled={locked}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 'var(--radius-md)',
                  background: sel ? 'color-mix(in srgb, var(--color-danger) 20%, transparent)' : 'var(--color-bg-elevated)',
                  border: sel ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                  cursor: locked ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                <FlagIcon flag={t.flag} code={t.code} size={32} />
                <span style={{ fontSize: 12, fontWeight: sel ? 800 : 600 }}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Top scorer — Golden Boot race */}
      <div id="bonus-top-scorer" style={{ scrollMarginTop: 'calc(var(--header-height) + 12px)' }}>
      <GoldenBootRace
        players={allPlayers}
        goals={goldenBoot}
        selected={topScorer}
        photoFor={photoFor}
        onPick={(n) => !locked && setTopScorer(n)}
        locked={locked}
      />
      </div>

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
