import type { Match, TeamRef } from '../types'

export interface TeamStanding {
  team: TeamRef
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

export interface GroupStanding {
  group: string
  rows: TeamStanding[]
}

function blank(team: TeamRef): TeamStanding {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
}

/**
 * Build group-stage standings from match results. Only GROUP matches with a
 * group letter are counted; LIVE and FINISHED scores both contribute (so the
 * table updates as games play out).
 */
export function computeGroupStandings(matches: Match[]): GroupStanding[] {
  const groups = new Map<string, Map<string, TeamStanding>>()

  const ensure = (g: string, t: TeamRef) => {
    if (!groups.has(g)) groups.set(g, new Map())
    const gm = groups.get(g)!
    if (!gm.has(t.code)) gm.set(t.code, blank(t))
    return gm.get(t.code)!
  }

  for (const m of matches) {
    if (m.stage !== 'GROUP' || !m.group) continue
    // register both teams even before they've played, so the group shows all 4
    ensure(m.group, m.homeTeam)
    ensure(m.group, m.awayTeam)

    const scored = m.homeScore !== null && m.awayScore !== null && (m.status === 'LIVE' || m.status === 'FINISHED')
    if (!scored) continue

    const h = ensure(m.group, m.homeTeam)
    const a = ensure(m.group, m.awayTeam)
    const hs = m.homeScore!, as = m.awayScore!
    h.played++; a.played++
    h.gf += hs; h.ga += as
    a.gf += as; a.ga += hs
    if (hs > as) { h.won++; h.points += 3; a.lost++ }
    else if (hs < as) { a.won++; a.points += 3; h.lost++ }
    else { h.drawn++; a.drawn++; h.points++; a.points++ }
  }

  const out: GroupStanding[] = []
  for (const [group, gm] of groups) {
    const rows = [...gm.values()]
    rows.forEach((r) => (r.gd = r.gf - r.ga))
    rows.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.team.name.localeCompare(y.team.name, 'he'))
    out.push({ group, rows })
  }
  out.sort((x, y) => x.group.localeCompare(y.group))
  return out
}
