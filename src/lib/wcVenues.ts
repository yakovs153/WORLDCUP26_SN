import schedule from '../data/wc2026Schedule.json'

/**
 * Hardcoded WC2026 schedule lookup — gives the Hebrew stadium name for any
 * group-stage match based on (date, team codes). Used as a fallback when
 * football-data.org doesn't return a venue (which is most of the time).
 *
 * Knockout stage matches are intentionally NOT in the lookup map — until the
 * brackets fill in, we can't know which "Winner Match 73" is which real team.
 * Admin can set those manually via the Admin → Matches venue field.
 */

interface ScheduleEntry {
  matchNum:  number
  stage:     string
  group:     string | null
  date:      string                 // YYYY-MM-DD (ET)
  kickoffET: string
  team1:     string
  team2:     string
  team1Code: string | null          // null for KO bracket placeholders
  team2Code: string | null
  stadium:   string
  city:      string
  country:   string
  stadiumHe: string
}

const SCHEDULE = schedule as ScheduleEntry[]

// (date, sorted_TLA_pair) -> Hebrew stadium name. Group stage only.
const BY_DATE_TEAMS = new Map<string, string>()
for (const m of SCHEDULE) {
  if (m.team1Code && m.team2Code) {
    const [a, b] = [m.team1Code, m.team2Code].sort()
    BY_DATE_TEAMS.set(`${m.date}_${a}_${b}`, m.stadiumHe)
  }
}

/** YYYY-MM-DD for a given UTC ms, computed in the ET timezone (matches the schedule's calendar). */
function etDateKey(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/**
 * Look up the Hebrew venue for a match by team codes + kickoff time.
 * Returns null when no match is found (KO bracket, code mismatch, etc.).
 */
export function venueFor(homeCode: string | null | undefined, awayCode: string | null | undefined, kickoffMs: number): string | null {
  if (!homeCode || !awayCode) return null
  const date = etDateKey(kickoffMs)
  const [a, b] = [homeCode.toUpperCase(), awayCode.toUpperCase()].sort()
  return BY_DATE_TEAMS.get(`${date}_${a}_${b}`) || null
}
