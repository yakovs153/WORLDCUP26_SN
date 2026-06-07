/**
 * Playground live test — invoked by Cloud Scheduler every few minutes via HTTPS.
 * Mirrors scripts/playground-livetest.mjs: fetches today's games from ESPN's
 * free public scoreboard and writes the playgroundSnapshot doc.
 *
 * Protected by the same X-Sync-Secret header as liveSync.
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { SYNC_SECRET } from './liveSync'

const LEAGUES: Array<[string, string]> = [
  ['soccer/usa.1', 'MLS'], ['soccer/bra.1', 'ברזיל'], ['soccer/eng.1', 'פרמייר ליג'],
  ['soccer/esp.1', 'לה ליגה'], ['basketball/nba', 'NBA'], ['baseball/mlb', 'MLB'], ['hockey/nhl', 'NHL']
]
const stateMap = (s: string) => (s === 'in' ? 'LIVE' : s === 'post' ? 'FINISHED' : 'SCHEDULED')

async function runPlayground() {
  const db = getFirestore()
  // Query today's date so off-season leagues correctly return nothing instead of
  // stale end-of-season games.
  const d = new Date()
  const today = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`

  type Item = {
    id: string
    homeTeam: { name: string; code: string; flag: string }
    awayTeam: { name: string; code: string; flag: string }
    kickoffMs: number
    status: string
    homeScore: number | null
    awayScore: number | null
    minute: number | null
    scorers: Array<unknown>
    competition: string
    live: boolean
  }
  const all: Item[] = []
  for (const [path, label] of LEAGUES) {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${today}`)
      if (!r.ok) continue
      const j = (await r.json()) as { events?: Array<Record<string, unknown>> }
      for (const ev of (j.events || [])) {
        const c = (ev as { competitions?: Array<Record<string, unknown>> }).competitions?.[0]
        if (!c) continue
        const competitors = (c as { competitors?: Array<{ homeAway?: string; team?: { shortDisplayName?: string; displayName?: string; abbreviation?: string }; score?: string }> }).competitors
        const home = competitors?.find((x) => x.homeAway === 'home')
        const away = competitors?.find((x) => x.homeAway === 'away')
        if (!home || !away) continue
        const evStatus = (ev as { status?: { type?: { state?: string; shortDetail?: string } }; id?: string; date?: string }).status
        const status = stateMap(evStatus?.type?.state || '')
        const id = (ev as { id?: string }).id
        const date = (ev as { date?: string }).date
        all.push({
          id: `espn-${id}`,
          homeTeam: { name: home.team?.shortDisplayName || home.team?.displayName || '?', code: home.team?.abbreviation || '', flag: '' },
          awayTeam: { name: away.team?.shortDisplayName || away.team?.displayName || '?', code: away.team?.abbreviation || '', flag: '' },
          kickoffMs: new Date(date || Date.now()).getTime(),
          status,
          homeScore: home.score != null && home.score !== '' ? parseInt(home.score, 10) : null,
          awayScore: away.score != null && away.score !== '' ? parseInt(away.score, 10) : null,
          minute: null,
          scorers: [],
          competition: `${label} · ${evStatus?.type?.shortDetail || ''}`.trim(),
          live: status === 'LIVE'
        })
      }
    } catch { /* skip a league that errors */ }
  }

  const live = all.filter((x) => x.live)
  const pick = (live.length ? live : all).slice(0, 12).map(({ live: _l, ...doc }) => doc)
  await db.collection('playgroundSnapshot').doc('current').set({ items: pick, updatedAt: Timestamp.now() })
  return { total: all.length, live: live.length, written: pick.length }
}

export const playgroundLive = onRequest(
  { secrets: [SYNC_SECRET], region: 'europe-west1', timeoutSeconds: 60 },
  async (req, res) => {
    const provided = String(req.header('X-Sync-Secret') || '')
    if (!provided || provided !== SYNC_SECRET.value()) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      const result = await runPlayground()
      logger.info('playgroundLive', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('playgroundLive failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
