import heTeams from '../data/heTeams.json'
import type { TeamRef } from '../types'

const MAP = heTeams as Record<string, string>

/** Hebrew team name for a FIFA code, falling back to the given name (e.g. the
 * English name the live API supplies, or a TBD placeholder). */
export function heName(code: string | undefined | null, fallback: string): string {
  if (!code) return fallback
  return MAP[code.toUpperCase()] ?? fallback
}

/** Return a TeamRef with its display name localized to Hebrew. */
export function localizeTeam(team: TeamRef): TeamRef {
  return { ...team, name: heName(team.code, team.name) }
}
