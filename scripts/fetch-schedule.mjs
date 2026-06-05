/**
 * Fetch the real FIFA World Cup 2026 schedule from football-data.org and write
 * it to src/data/wc2026.json (consumed by the app as the canonical fixture list).
 *
 * Usage:  node scripts/fetch-schedule.mjs <API_TOKEN>
 * The token is NOT stored in the output (only match data is written).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const token = process.argv[2] || process.env.FOOTBALL_DATA_TOKEN
if (!token) { console.error('Provide the API token as the first argument.'); process.exit(1) }

const HE = {
  ALG: 'אלג׳יריה', ARG: 'ארגנטינה', AUS: 'אוסטרליה', AUT: 'אוסטריה', BEL: 'בלגיה',
  BIH: 'בוסניה', BRA: 'ברזיל', CAN: 'קנדה', CIV: 'חוף השנהב', COD: 'קונגו',
  COL: 'קולומביה', CPV: 'כף ורדה', CRO: 'קרואטיה', CUW: 'קוראסאו', CZE: 'צ׳כיה',
  ECU: 'אקוודור', EGY: 'מצרים', ENG: 'אנגליה', ESP: 'ספרד', FRA: 'צרפת',
  GER: 'גרמניה', GHA: 'גאנה', HAI: 'האיטי', IRN: 'איראן', IRQ: 'עיראק',
  JOR: 'ירדן', JPN: 'יפן', KOR: 'קוריאה הדרומית', KSA: 'ערב הסעודית', MAR: 'מרוקו',
  MEX: 'מקסיקו', NED: 'הולנד', NOR: 'נורבגיה', NZL: 'ניו זילנד', PAN: 'פנמה',
  PAR: 'פרגוואי', POR: 'פורטוגל', QAT: 'קטאר', RSA: 'דרום אפריקה', SCO: 'סקוטלנד',
  SEN: 'סנגל', SUI: 'שווייץ', SWE: 'שוודיה', TUN: 'תוניסיה', TUR: 'טורקיה',
  URY: 'אורוגוואי', USA: 'ארה״ב', UZB: 'אוזבקיסטן'
}

const STAGE = {
  GROUP_STAGE: 'GROUP', LEAGUE_STAGE: 'GROUP', LAST_32: 'R32', LAST_16: 'R16',
  QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', THIRD_PLACE: 'TP', FINAL: 'F'
}
const statusOf = (s) =>
  s === 'IN_PLAY' || s === 'PAUSED' ? 'LIVE'
  : s === 'FINISHED' ? 'FINISHED'
  : s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED' ? 'POSTPONED'
  : 'SCHEDULED'

const team = (t) => ({ name: HE[t.tla] || t.shortName || t.name || '', code: t.tla || '', flag: '' })

const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', { headers: { 'X-Auth-Token': token } })
if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(1) }
const json = await res.json()

const matches = json.matches.map((m) => ({
  id: String(m.id),
  home: team(m.homeTeam),
  away: team(m.awayTeam),
  kickoff: m.utcDate,
  stage: STAGE[m.stage] || 'GROUP',
  group: m.group ? String(m.group).replace('GROUP_', '') : null,
  status: statusOf(m.status),
  homeScore: m.score?.fullTime?.home ?? null,
  awayScore: m.score?.fullTime?.away ?? null
}))

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, '..', 'src', 'data')
mkdirSync(outDir, { recursive: true })
const out = join(outDir, 'wc2026.json')
writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString(), count: matches.length, matches }, null, 2))
console.log(`Wrote ${matches.length} matches to ${out}`)
