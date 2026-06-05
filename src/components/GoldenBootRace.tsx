import { useMemo } from 'react'
import PlayerCard from './PlayerCard'
import type { PlayerOption } from '../lib/players'

/**
 * The Golden Boot race — candidate players as collectible cards, ranked by
 * live goal tally. Clicking a card picks that player as your top-scorer bet.
 */
export default function GoldenBootRace({
  players,
  goals,
  selected,
  photoFor,
  onPick,
  locked,
  mode = 'select'
}: {
  players: PlayerOption[]
  goals: Record<string, number>
  selected: string | null
  photoFor: (name: string, fallback?: string) => string | undefined
  onPick?: (name: string | null) => void
  locked?: boolean
  /** 'select' = clickable picker (Bonus); 'watch' = read-only live race (e.g. Teams hub). */
  mode?: 'select' | 'watch'
}) {
  const ranked = useMemo(() => {
    return players
      .map((p) => ({ p, g: goals[p.name] ?? 0 }))
      .sort((a, b) => b.g - a.g || a.p.name.localeCompare(b.p.name, 'he'))
  }, [players, goals])

  const watch = mode === 'watch'

  return (
    <section className="card animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>
          {watch ? '🥇 מירוץ נעל הזהב' : '⚽ בחירת מלך השערים'}
        </h2>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
          {watch ? 'מתעדכן לפי גולים' : '15 נק׳'}
        </span>
      </div>
      <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {watch
          ? 'דירוג הכובשים המובילים בטורניר. הכרטיס המסומן הוא הבחירה שלך.'
          : 'לחץ על שחקן כדי לבחור אותו כמלך השערים (בחירה אחת, ננעלת עם תחילת הטורניר).'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {ranked.map(({ p, g }, i) => (
          <PlayerCard
            key={p.name}
            name={p.name}
            countryCode={p.countryCode}
            countryLabel={p.display.split('·')[1]?.trim() || p.countryCode}
            photoUrl={photoFor(p.name, p.photoUrl)}
            goals={g}
            rank={i + 1}
            selected={selected === p.name}
            onClick={watch || locked || !onPick ? undefined : () => onPick(selected === p.name ? null : p.name)}
          />
        ))}
      </div>
    </section>
  )
}
