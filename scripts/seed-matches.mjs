/**
 * Seed Firestore with sample World Cup matches (for dev / emulator).
 *
 * שימוש:
 *   # מול emulator (FIRESTORE_EMULATOR_HOST מוגדר):
 *   $env:FIRESTORE_EMULATOR_HOST="localhost:8080"; node scripts/seed-matches.mjs <project-id>
 *
 *   # מול Firestore אמיתי (דורש GOOGLE_APPLICATION_CREDENTIALS):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="path\to\service-account.json"
 *   node scripts/seed-matches.mjs <project-id>
 *
 * הערה: לסנכרון נתוני אמת ב-production, השתמש ב-Cloud Function `syncMatchesNow`
 * (פונה ל-football-data.org). הסקריפט הזה הוא לפיתוח/בדיקה בלבד.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = process.argv[2] || process.env.GCLOUD_PROJECT || 'demo-mundial'

initializeApp({
  projectId,
  credential: process.env.GOOGLE_APPLICATION_CREDENTIALS ? applicationDefault() : undefined
})

const db = getFirestore()

const TEAMS = {
  bra: { name: 'ברזיל',    code: 'BRA', flag: '🇧🇷' },
  arg: { name: 'ארגנטינה', code: 'ARG', flag: '🇦🇷' },
  fra: { name: 'צרפת',     code: 'FRA', flag: '🇫🇷' },
  eng: { name: 'אנגליה',   code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  esp: { name: 'ספרד',     code: 'ESP', flag: '🇪🇸' },
  por: { name: 'פורטוגל',  code: 'POR', flag: '🇵🇹' },
  ger: { name: 'גרמניה',   code: 'GER', flag: '🇩🇪' },
  ned: { name: 'הולנד',    code: 'NED', flag: '🇳🇱' },
  bel: { name: 'בלגיה',    code: 'BEL', flag: '🇧🇪' },
  cro: { name: 'קרואטיה',  code: 'CRO', flag: '🇭🇷' },
  ita: { name: 'איטליה',   code: 'ITA', flag: '🇮🇹' },
  usa: { name: 'ארה"ב',    code: 'USA', flag: '🇺🇸' },
  mex: { name: 'מקסיקו',   code: 'MEX', flag: '🇲🇽' },
  can: { name: 'קנדה',     code: 'CAN', flag: '🇨🇦' },
  mar: { name: 'מרוקו',    code: 'MAR', flag: '🇲🇦' },
  jpn: { name: 'יפן',      code: 'JPN', flag: '🇯🇵' },
  sen: { name: 'סנגל',     code: 'SEN', flag: '🇸🇳' },
  uru: { name: 'אורוגוואי', code: 'URY', flag: '🇺🇾' }
}

// Specs identical to src/lib/demoData.ts — WC 2026 schedule (June 11 – July 19, 2026).
const YEAR = 2026
const SPECS = [
  // Matchday 1
  { id: 'm01', home: 'mex', away: 'bra', stage: 'GROUP', group: 'A', month: 6, day: 11, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm02', home: 'usa', away: 'fra', stage: 'GROUP', group: 'B', month: 6, day: 12, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm03', home: 'can', away: 'arg', stage: 'GROUP', group: 'C', month: 6, day: 13, hour: 20, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm04', home: 'eng', away: 'sen', stage: 'GROUP', group: 'D', month: 6, day: 13, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm05', home: 'esp', away: 'jpn', stage: 'GROUP', group: 'E', month: 6, day: 14, hour: 20, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm06', home: 'ger', away: 'cro', stage: 'GROUP', group: 'F', month: 6, day: 14, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm07', home: 'por', away: 'mar', stage: 'GROUP', group: 'G', month: 6, day: 15, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm08', home: 'ned', away: 'ita', stage: 'GROUP', group: 'H', month: 6, day: 16, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  // Matchday 2
  { id: 'm09', home: 'bra', away: 'bel', stage: 'GROUP', group: 'A', month: 6, day: 17, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm10', home: 'fra', away: 'uru', stage: 'GROUP', group: 'B', month: 6, day: 18, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm11', home: 'arg', away: 'mex', stage: 'GROUP', group: 'C', month: 6, day: 19, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm12', home: 'esp', away: 'eng', stage: 'GROUP', group: 'D', month: 6, day: 20, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  // Matchday 3
  { id: 'm13', home: 'por', away: 'ned', stage: 'GROUP', group: 'G', month: 6, day: 24, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm14', home: 'mar', away: 'usa', stage: 'GROUP', group: 'G', month: 6, day: 25, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  // Knockout
  { id: 'm15', home: 'bra', away: 'jpn', stage: 'R16', group: null, month: 6, day: 29, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm16', home: 'fra', away: 'sen', stage: 'R16', group: null, month: 6, day: 30, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm17', home: 'arg', away: 'esp', stage: 'QF',  group: null, month: 7, day: 5,  hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm18', home: 'eng', away: 'ger', stage: 'SF',  group: null, month: 7, day: 9,  hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm19', home: 'bra', away: 'fra', stage: 'F',   group: null, month: 7, day: 19, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null }
]

function kickoff(month, day, hour) {
  return new Date(YEAR, month - 1, day, hour, 0, 0, 0)
}

async function main() {
  console.log(`Seeding ${SPECS.length} matches to project '${projectId}'...`)
  const batch = db.batch()
  for (const s of SPECS) {
    const ref = db.collection('matches').doc(s.id)
    batch.set(ref, {
      homeTeam: TEAMS[s.home],
      awayTeam: TEAMS[s.away],
      kickoff: Timestamp.fromDate(kickoff(s.month, s.day, s.hour)),
      stage: s.stage,
      group: s.group,
      status: s.status,
      homeScore: s.homeScore,
      awayScore: s.awayScore,
      lastUpdated: Timestamp.now()
    })
  }
  await batch.commit()
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
