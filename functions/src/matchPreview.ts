/**
 * matchPreview — pulls free, no-key match context from ESPN's hidden WC API
 * and writes it to matchPreviews/{matchId}, which the match room reads on
 * demand. Updated periodically by Cloud Scheduler (data changes daily, not
 * live — form / head-to-head / news).
 *
 * Source: site.api.espn.com — no API key, no account. ESPN team abbreviations
 * align with our FIFA TLA codes (MEX/RSA/KOR/CZE verified), so we match events
 * to our matches by the sorted team-code pair.
 *
 * Protected by the shared X-Sync-Secret header (same as liveSync).
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { SYNC_SECRET } from './liveSync'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

// ESPN abbreviation → our team code, for any that differ. ESPN uses FIFA codes
// that match football-data TLAs for the teams checked; add overrides if a team
// turns out to differ. CUR/CUW (Curaçao) handled here defensively.
const CODE_ALIAS: Record<string, string> = { CUR: 'CUW' }
const norm = (c: string | undefined | null) => {
  const u = (c || '').toUpperCase()
  return CODE_ALIAS[u] || u
}

function ymd(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '')
}

interface RecentResult { result: string; score: string; opp: string; date: string }
interface H2HResult { date: string; home: string; away: string; hs: string; as: string; comp: string }
interface NewsItem { headline: string; link: string }

type EspnComp = { homeAway?: string; form?: string; team?: { abbreviation?: string } }
type EspnEvent = { id?: string; competitions?: Array<{ competitors?: EspnComp[] }> }

async function runPreview() {
  const db = getFirestore()
  const now = Date.now()
  const DAY = 86_400_000

  // 1) Our SCHEDULED matches in the next 3 days.
  type MatchDoc = { id: string; status?: string; kickoff?: { toMillis?: () => number }; homeTeam?: { code?: string }; awayTeam?: { code?: string } }
  const matchesSnap = await db.collection('matches').get()
  const upcoming = (matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as MatchDoc[])
    .filter((m) => {
      const ms = m.kickoff?.toMillis?.() ?? 0
      return m.status === 'SCHEDULED' && ms > now && ms - now < 3 * DAY
    })
  if (!upcoming.length) return { previews: 0, reason: 'no upcoming matches' }

  // 2) ESPN scoreboard for today..+3 → map sorted-code-pair → { eventId, forms }.
  const dates = [...new Set([0, 1, 2, 3].map((off) => ymd(now + off * DAY)))]
  const byPair = new Map<string, { eventId: string; codeForm: Record<string, string> }>()
  for (const date of dates) {
    try {
      const r = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}`)
      if (!r.ok) continue
      const data = (await r.json()) as { events?: EspnEvent[] }
      for (const ev of data.events || []) {
        const cs = ev.competitions?.[0]?.competitors || []
        if (cs.length !== 2 || !ev.id) continue
        const a = norm(cs[0].team?.abbreviation), b = norm(cs[1].team?.abbreviation)
        if (!a || !b) continue
        byPair.set([a, b].sort().join('_'), {
          eventId: ev.id,
          codeForm: { [a]: cs[0].form || '', [b]: cs[1].form || '' }
        })
      }
    } catch (e) { logger.warn('scoreboard fetch failed', { date, e }) }
  }

  // 3) For each upcoming match, find its ESPN event, pull the summary, write preview.
  let count = 0
  for (const m of upcoming) {
    const hc = norm(m.homeTeam?.code), ac = norm(m.awayTeam?.code)
    if (!hc || !ac) continue
    const hit = byPair.get([hc, ac].sort().join('_'))
    if (!hit) continue

    const homeForm = hit.codeForm[hc] || ''
    const awayForm = hit.codeForm[ac] || ''
    let homeRecent: RecentResult[] = [], awayRecent: RecentResult[] = []
    let h2h: H2HResult[] = [], news: NewsItem[] = []

    try {
      const sr = await fetch(`${ESPN_BASE}/summary?event=${hit.eventId}`)
      if (sr.ok) {
        const s = await sr.json() as {
          boxscore?: { form?: Array<{ team?: { abbreviation?: string }; events?: Array<Record<string, unknown>> }> }
          headToHeadGames?: Array<{ team?: { id?: string }; events?: Array<Record<string, unknown>> }>
          news?: { articles?: Array<{ headline?: string; links?: { web?: { href?: string } } }> }
        }

        // Recent form (detailed) — one block per team, matched by abbreviation.
        for (const block of s.boxscore?.form || []) {
          const code = norm(block.team?.abbreviation)
          const recent: RecentResult[] = (block.events || []).slice(0, 5).map((ev) => ({
            result: String(ev.gameResult || ''),
            score: String(ev.score || ''),
            opp: String((ev.opponent as { displayName?: string })?.displayName || ''),
            date: String(ev.gameDate || '')
          }))
          if (code === hc) homeRecent = recent
          else if (code === ac) awayRecent = recent
        }

        // Head-to-head — take the first block's events (last few meetings).
        const h2hBlock = s.headToHeadGames?.[0]
        const tId = h2hBlock?.team?.id
        h2h = (h2hBlock?.events || []).slice(0, 4).map((ev) => {
          const homeIsT = String(ev.homeTeamId) === String(tId)
          const tName = (h2hBlock?.team as { displayName?: string })?.displayName || ''
          const oppName = (ev.opponent as { displayName?: string })?.displayName || ''
          return {
            date: String(ev.gameDate || ''),
            home: homeIsT ? tName : oppName,
            away: homeIsT ? oppName : tName,
            hs: String(ev.homeTeamScore ?? ''),
            as: String(ev.awayTeamScore ?? ''),
            comp: String(ev.competitionName || '')
          }
        })

        news = (s.news?.articles || []).slice(0, 3)
          .map((a) => ({ headline: a.headline || '', link: a.links?.web?.href || '' }))
          .filter((n) => n.headline)
      }
    } catch (e) { logger.warn('summary fetch failed', { eventId: hit.eventId, e }) }

    await db.collection('matchPreviews').doc(m.id).set({
      homeForm, awayForm, homeRecent, awayRecent, h2h, news, updatedAt: Timestamp.now()
    }, { merge: true })
    count++
  }
  return { previews: count, upcoming: upcoming.length }
}

export const matchPreview = onRequest(
  { secrets: [SYNC_SECRET], region: 'europe-west1', timeoutSeconds: 120 },
  async (req, res) => {
    const provided = String(req.header('X-Sync-Secret') || '')
    if (!provided || provided !== SYNC_SECRET.value()) { res.status(401).json({ error: 'unauthorized' }); return }
    try {
      const result = await runPreview()
      logger.info('matchPreview', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('matchPreview failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
