/**
 * Wrapper ל-football-data.org.
 *
 * הרשמה חינמית: https://www.football-data.org/client/register
 * תוכנית חינמית כוללת את 'WC' (FIFA World Cup).
 *
 * הגדרת המפתח (לא נחשף ל-client):
 *   firebase functions:config:set football.token="YOUR_TOKEN"
 *   או דרך משתנה סביבה: FOOTBALL_DATA_TOKEN
 */
import { defineSecret } from 'firebase-functions/params'

export const footballToken = defineSecret('FOOTBALL_DATA_TOKEN')

const BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC' // FIFA World Cup

export interface ApiMatch {
  id: number
  utcDate: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED'
  stage: string // e.g. 'GROUP_STAGE', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL', 'THIRD_PLACE'
  group: string | null // e.g. 'GROUP_A'
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string }
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string }
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime: { home: number | null; away: number | null }
  }
}

interface ApiResponse {
  matches: ApiMatch[]
}

export async function fetchAllMatches(token: string): Promise<ApiMatch[]> {
  const url = `${BASE}/competitions/${COMPETITION}/matches`
  const res = await fetch(url, { headers: { 'X-Auth-Token': token } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`football-data ${res.status}: ${body}`)
  }
  const json = (await res.json()) as ApiResponse
  return json.matches
}

const STAGE_MAP: Record<string, 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'TP' | 'F'> = {
  GROUP_STAGE: 'GROUP',
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: 'TP',
  FINAL: 'F'
}

export function mapStage(s: string) {
  return STAGE_MAP[s] || 'GROUP'
}

export function mapStatus(s: ApiMatch['status']): 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' {
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'LIVE'
  if (s === 'FINISHED') return 'FINISHED'
  if (s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED') return 'POSTPONED'
  return 'SCHEDULED'
}

// ISO 3166-1 alpha-3 -> emoji flag (best-effort).
// football-data משתמש ב-`tla` (3 אותיות) שעבור נבחרות לאומיות בדרך כלל לא ISO תקני.
// לחלופין משתמשים ב-crest URL שמגיע ב-API. נחזיר את ה-crest כפלט הראשי.
export function teamFlag(crest: string | undefined): string {
  return crest || ''
}
