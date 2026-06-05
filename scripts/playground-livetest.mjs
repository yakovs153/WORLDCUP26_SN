/**
 * Playground LIVE TEST — proves the real external-feed → Firestore → live UI
 * pipeline using ESPN's free public scoreboard (any sport, no key). Pulls
 * whatever is live right now (or today's games if nothing is in play) into the
 * `playgroundMatches` collection. Watch it on /playground.
 *
 * Run via the Playground workflow with comp = LIVE. Loop it (live_minutes) to
 * see scores tick. Reuses the same keyless Firebase auth.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const LEAGUES = [
  ['soccer/usa.1', 'MLS'], ['soccer/bra.1', 'ברזיל'], ['soccer/eng.1', 'פרמייר ליג'],
  ['soccer/esp.1', 'לה ליגה'], ['basketball/nba', 'NBA'], ['baseball/mlb', 'MLB'], ['hockey/nhl', 'NHL']
]
const stateMap = (s) => (s === 'in' ? 'LIVE' : s === 'post' ? 'FINISHED' : 'SCHEDULED')

const all = []
for (const [path, label] of LEAGUES) {
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`)
    if (!r.ok) continue
    const j = await r.json()
    for (const ev of (j.events || [])) {
      const c = ev.competitions?.[0]; if (!c) continue
      const home = c.competitors?.find((x) => x.homeAway === 'home')
      const away = c.competitors?.find((x) => x.homeAway === 'away')
      if (!home || !away) continue
      const status = stateMap(ev.status?.type?.state)
      all.push({
        id: `espn-${ev.id}`,
        homeTeam: { name: home.team?.shortDisplayName || home.team?.displayName || '?', code: home.team?.abbreviation || '', flag: '' },
        awayTeam: { name: away.team?.shortDisplayName || away.team?.displayName || '?', code: away.team?.abbreviation || '', flag: '' },
        kickoff: Timestamp.fromDate(new Date(ev.date || Date.now())),
        status,
        homeScore: home.score != null && home.score !== '' ? parseInt(home.score, 10) : null,
        awayScore: away.score != null && away.score !== '' ? parseInt(away.score, 10) : null,
        minute: null,
        scorers: [],
        competition: `${label} · ${ev.status?.type?.shortDetail || ''}`.trim(),
        live: status === 'LIVE'
      })
    }
  } catch { /* skip a league that errors */ }
}

const live = all.filter((x) => x.live)
const pick = (live.length ? live : all).slice(0, 12)
const batch = db.batch()
for (const m of pick) {
  const { live: _l, ...doc } = m
  batch.set(db.collection('playgroundMatches').doc(m.id), { ...doc, lastUpdated: Timestamp.now() }, { merge: true })
}
batch.set(db.collection('playgroundMeta').doc('main'), { updatedAt: Timestamp.now(), count: pick.length, competition: live.length ? 'חי (ESPN)' : 'ESPN — משחקי היום' }, { merge: true })
await batch.commit()
console.log(`livetest: ${all.length} events, ${live.length} live, wrote ${pick.length}`)
