import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { scorePrediction, applyStage } from '../lib/scoring'
import { octoPredict, AUTO_FACTOR } from '../lib/octopus'
import type { Match, Prediction, ScoringConfig, StageMultipliers } from '../types'

/**
 * Provisional points from LIVE matches, per user — so the leaderboard moves in
 * real time during a game. A user without a prediction is scored on the
 * Octopus's pick (matching the auto-fill rule). Predictions are static once a
 * match locks, so we fetch them per live match and recompute as scores change.
 */
export function useLivePoints(matches: Match[], scoring: ScoringConfig, uids: string[], stageMult?: StageMultipliers): Map<string, number> {
  const liveIds = matches.filter((m) => m.status === 'LIVE' && m.homeScore != null && m.awayScore != null).map((m) => m.id)
  const key = liveIds.join(',')
  const [predsByMatch, setPredsByMatch] = useState<Record<string, Record<string, Prediction>>>({})

  useEffect(() => {
    if (DEMO_MODE || liveIds.length === 0) { setPredsByMatch({}); return }
    let cancelled = false
    Promise.all(liveIds.map((id) =>
      getDocs(query(collection(db, 'predictions'), where('matchId', '==', id)))
        .then((s) => [id, Object.fromEntries(s.docs.map((d) => { const p = d.data() as Prediction; return [p.uid, p] }))] as const)
    )).then((arr) => { if (!cancelled) setPredsByMatch(Object.fromEntries(arr)) }).catch(() => {})
    return () => { cancelled = true }
  }, [key])

  const uidKey = uids.join(',')
  return useMemo(() => {
    const delta = new Map<string, number>()
    for (const m of matches) {
      if (m.status !== 'LIVE' || m.homeScore == null || m.awayScore == null) continue
      const pm = predsByMatch[m.id] || {}
      const [oh, oa] = octoPredict(m.id)
      for (const uid of uids) {
        const p = pm[uid]
        const ph = p ? p.homeScore : oh
        const pa = p ? p.awayScore : oa
        const isAuto = !p || p.auto // Tom filled it (live) or it was auto-filled
        const base = applyStage(scorePrediction(ph, pa, m.homeScore, m.awayScore, scoring), m.stage, stageMult)
        delta.set(uid, (delta.get(uid) || 0) + Math.round(base * (isAuto ? AUTO_FACTOR : 1)))
      }
    }
    return delta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predsByMatch, matches, scoring, uidKey])
}
