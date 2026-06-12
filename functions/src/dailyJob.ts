/**
 * Daily job — counts + Hall of Fame + bonus awarding + Tom recap/coach lines.
 * Triggered once a day by Cloud Scheduler.
 * Mirrors scripts/daily-stats.mjs + scripts/octopus-pundit.mjs.
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import { Timestamp, getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SYNC_SECRET } from './liveSync'

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

interface UserAgg { exact: number; predGoals: number; predCount: number; draws: number; points: number }

async function geminiCall(key: string, model: string, prompt: string, opts: { maxTokens?: number; json?: boolean } = {}) {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: opts.maxTokens ?? 200, temperature: 1.0 }
  if (opts.json) generationConfig.responseMimeType = 'application/json'
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig })
    })
    if (!res.ok) { logger.warn('gemini', res.status, (await res.text()).slice(0, 200)); return null }
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch (e) { logger.warn('gemini error', e); return null }
}

async function runDaily(geminiKey: string) {
  const db = getFirestore()

  const allPreds = await db.collection('predictions').get()

  // predictionsCount per user
  const counts = new Map<string, number>()
  for (const d of allPreds.docs) { const uid = d.data().uid; counts.set(uid, (counts.get(uid) || 0) + 1) }
  const cBatch = db.batch()
  for (const [uid, n] of counts) cBatch.set(db.collection('users').doc(uid), { predictionsCount: n }, { merge: true })
  await cBatch.commit()

  // Hall of Fame & Shame
  const results = new Map<string, { h: number; a: number }>()
  ;(await db.collection('matches').where('status', '==', 'FINISHED').get()).forEach((d) => {
    const m = d.data()
    if (typeof m.homeScore === 'number' && typeof m.awayScore === 'number') results.set(d.id, { h: m.homeScore, a: m.awayScore })
  })
  const agg = new Map<string, UserAgg>()
  for (const d of allPreds.docs) {
    const p = d.data()
    const a = agg.get(p.uid) || { exact: 0, predGoals: 0, predCount: 0, draws: 0, points: 0 }
    if (p.homeScore === p.awayScore) a.draws++
    const res = results.get(p.matchId)
    if (res) {
      a.predCount++
      a.predGoals += p.homeScore + p.awayScore
      a.points += p.points || 0
      if (p.homeScore === res.h && p.awayScore === res.a) a.exact++
    }
    agg.set(p.uid, a)
  }
  const names = new Map<string, string>()
  ;(await db.collection('users').get()).forEach((d) => names.set(d.id, d.data().displayName || 'משתמש'))
  const nm = (uid: string) => names.get(uid) || 'משתמש'
  const arr = [...agg.entries()]
  const hof: Record<string, { name: string; detail: string }> = {}
  const prophet = arr.filter(([, a]) => a.exact > 0).sort((x, y) => y[1].exact - x[1].exact)[0]
  if (prophet) hof.prophet = { name: nm(prophet[0]), detail: `${prophet[1].exact} תוצאות בול` }
  const opt = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => y[1].predGoals / y[1].predCount - x[1].predGoals / x[1].predCount)[0]
  if (opt) hof.optimist = { name: nm(opt[0]), detail: `ממוצע ${(opt[1].predGoals / opt[1].predCount).toFixed(1)} שערים למשחק` }
  const drw = arr.filter(([, a]) => a.draws >= 2).sort((x, y) => y[1].draws - x[1].draws)[0]
  if (drw) hof.draw = { name: nm(drw[0]), detail: `${drw[1].draws} ניחושי תיקו` }
  const dis = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => x[1].points - y[1].points)[0]
  if (dis) hof.disaster = { name: nm(dis[0]), detail: `${dis[1].points} נק׳ מ-${dis[1].predCount} משחקים` }
  await db.collection('stats').doc('hallOfFame').set(hof, { merge: true })

  // ===== Bonus awarding (incl. penalty-shootout fix) =====
  const cfgSnap = await db.collection('appConfig').doc('main').get()
  const cfg = cfgSnap.exists ? cfgSnap.data() || {} : {}
  const bonusPts = cfg.bonus || { champion: 20, topScorer: 15, runnerUp: 8, surprise: 8, flop: 8 }
  // Top scorer can be a single string OR an array OR comma-separated — when
  // multiple players tie on goals, every user who picked any of them scores.
  const tsRaw = cfg.bonusResults?.topScorers ?? cfg.bonusResults?.topScorer ?? []
  const adminTopScorers = new Set<string>(
    (Array.isArray(tsRaw) ? tsRaw : String(tsRaw).split(','))
      .map((s: string) => String(s).trim())
      .filter(Boolean)
  )
  const up = (s: string | undefined | null) => String(s || '').toUpperCase()
  const codeOf = (t: { code?: string } | undefined) => up(t?.code)

  const allMatchesDocs = (await db.collection('matches').get()).docs.map((d) => d.data())
  const final = allMatchesDocs.find((m) => m.stage === 'F' && m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
  let champion: string | null = null
  let runnerUp: string | null = null
  if (final) {
    const h = codeOf(final.homeTeam), a = codeOf(final.awayTeam)
    if (final.homeScore > final.awayScore) { champion = h; runnerUp = a }
    else if (final.awayScore > final.homeScore) { champion = a; runnerUp = h }
    else if (final.winner === 'HOME_TEAM') { champion = h; runnerUp = a }
    else if (final.winner === 'AWAY_TEAM') { champion = a; runnerUp = h }
  }
  const reachedIn = (stages: string[]) => {
    const s = new Set<string>()
    for (const m of allMatchesDocs) if (stages.includes(m.stage)) { const h = codeOf(m.homeTeam), a = codeOf(m.awayTeam); if (h) s.add(h); if (a) s.add(a) }
    return s
  }
  const qfReachers = reachedIn(['QF', 'SF', 'TP', 'F'])
  // "Disappointment" = a favourite that fails to reach the quarter-finals.
  // Only evaluable once QF participants are known (i.e. QF stage exists).
  const qfStarted = qfReachers.size > 0

  const bps = await db.collection('bonusPredictions').get()
  const bonusDelta = new Map<string, number>()
  for (const d of bps.docs) {
    const b = d.data()
    let pts = 0
    if (champion && up(b.championTeamCode) === champion) pts += bonusPts.champion || 0
    if (runnerUp && up(b.runnerUpCode) === runnerUp) pts += bonusPts.runnerUp || 0
    if (adminTopScorers.size && b.topScorer && adminTopScorers.has(b.topScorer)) pts += bonusPts.topScorer || 0
    if (b.surpriseTeamCode && qfReachers.has(up(b.surpriseTeamCode))) pts += bonusPts.surprise || 0
    if (qfStarted && b.flopTeamCode && !qfReachers.has(up(b.flopTeamCode))) pts += bonusPts.flop || 0
    const prev = b.awardedPoints || 0
    if (pts !== prev) {
      bonusDelta.set(b.uid, (bonusDelta.get(b.uid) || 0) + (pts - prev))
      await d.ref.set({ awardedPoints: pts }, { merge: true })
    }
  }
  for (const [uid, delta] of bonusDelta) if (delta) await db.collection('users').doc(uid).set({ totalPoints: FieldValue.increment(delta) }, { merge: true })

  // ===== Tom recap + survey suggestions + HoF blurbs + coach lines =====
  let punditOK = false, suggestionsOK = false, coachWritten = 0
  if (geminiKey) {
    const GMODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

    const top = (await db.collection('users').orderBy('totalPoints', 'desc').limit(5).get())
      .docs.map((d) => ({ name: d.data().displayName || 'משתמש', pts: d.data().totalPoints || 0 })).filter((u) => u.pts > 0)
    const now = Date.now(), DAY = 86_400_000
    const todayFixtures: string[] = []
    const todayMeta: Array<{ hn: string; an: string; hc: string; ac: string }> = []
    let live = 0, finishedToday = 0
    ;(await db.collection('matches').get()).forEach((d) => {
      const m = d.data(); const k = m.kickoff?.toMillis?.() ?? 0
      if (m.status === 'LIVE') live++
      if (m.status === 'FINISHED' && now - k < DAY && now - k > 0) finishedToday++
      if (m.status === 'SCHEDULED' && k > now && k - now < DAY) {
        todayFixtures.push(`${m.homeTeam?.name} נגד ${m.awayTeam?.name}`)
        todayMeta.push({ hn: m.homeTeam?.name || '', an: m.awayTeam?.name || '', hc: m.homeTeam?.code || '', ac: m.awayTeam?.code || '' })
      }
    })

    // Market favorite among today's games (best-effort — from snapshot/odds, written by liveSync).
    let oddsHint = ''
    try {
      const oddsDoc = await db.collection('snapshot').doc('odds').get()
      const oItems = ((oddsDoc.exists ? (oddsDoc.data() as { items?: Record<string, { home: number; away: number }> }).items : {}) || {})
      const alias = (c: string) => { const u = (c || '').toUpperCase(); return u === 'CUR' ? 'CUW' : u }
      const pk = (a: string, b: string) => [alias(a), alias(b)].sort().join('_')
      let best: { name: string; pct: number } | null = null
      for (const m of todayMeta) {
        const o = oItems[pk(m.hc, m.ac)]
        if (!o) continue
        const favPct = Math.max(o.home, o.away)
        const favName = o.home >= o.away ? m.hn : m.an
        if (!best || favPct > best.pct) best = { name: favName, pct: favPct }
      }
      if (best) oddsHint = ` לפי שוק ההימורים, הפייבוריט הבולט היום הוא ${best.name} (${best.pct}%) — אפשר להתייחס לזה בנימה של "השוק אומר…".`
    } catch { /* ignore — odds are optional */ }
    const standings = top.length ? top.map((t) => `${t.name} ${t.pts}`).join(', ') : 'אין עדיין נקודות'
    const summary = `מובילים: ${standings}. חי כעת: ${live}. הסתיימו היום: ${finishedToday}. צפויים היום: ${todayFixtures.length}.`

    const recap = await geminiCall(geminiKey, GMODEL,
      `אתה "עמוס ואביגדור", צמד אנליסטים כדורגל מבוסס-AI של StoreNext — חד, מדויק, שנון וקליל, מדבר בלשון רבים. ` +
      `כתוב "מבזק יומי" בעברית שעוסק אך ורק במונדיאל 2026 (גביע העולם בכדורגל) — לא בליגות מקומיות, אירופיות או כל תחרות אחרת. ` +
      `2–3 שורות קצרות, כל שורה מתחילה באימוג'י, מתייחס למוביל בטבלת הניחושים ולמה שמעניין היום במונדיאל. ` +
      `שמור על טון חיובי וקליל — בלי לעלוב במשתתפים. ` +
      `חובה לשלב באחת השורות, באופן טבעי וחלק, אחד מהביטויים האופייניים שלכם (בניסוח מדויק): ` +
      `באור שאני רואה / זה באנקר! / נביא את הבוחטיות / את הילד שלי אני שם על זה / תביא את הג'ובות. ` +
      `מדי פעם שלבו "מודיעין" קומי ובדוי מקרוב משפחה — בן גיסי או בן אחותי — שעובד בעבודה משעשעת באחת המארחות (קנדה / מקסיקו / ארה"ב) ומוסר "טיפ פנימי" על נבחרת בנימת ביטחון (למשל "בדוק חתום" / "בדוק נעול"). קצר והומוריסטי. ` +
      `בלי האשטגים/מרכאות, עד 320 תווים.\nנתונים: ${summary}`, { maxTokens: 240 })
    let preview: string | null = null
    if (todayFixtures.length) {
      preview = await geminiCall(geminiKey, GMODEL,
        `אתה עמוס ואביגדור (צמד אנליסטים, לשון רבים). מדובר אך ורק במונדיאל 2026 בכדורגל. ` +
        `המארחות הן ארה"ב, קנדה ומקסיקו בלבד — אף נבחרת אחרת אינה מארחת, אל תניח שמישהי מהן משחקת בביתה. ` +
        `מבין משחקי היום: ${todayFixtures.join(', ')}. בחר את המשחק הכי מסקרן וכתוב משפט הייפ אחד קצר בעברית (עד 150 תווים) ` +
        `על המשחק עצמו. אפשר לתבל ב"טיפ פנימי" קומי ובדוי מבן גיסי / בן אחותי שעובד באחת המארחות, ולסיים בביטחון: "זה באנקר!" / "בדוק נעול" / "את הילד שלי אני שם על זה". ` +
        `אל תמציא עובדות אמיתיות (מארחת, דירוג, פציעות) שאינך בטוח בהן — ה"מודיעין מהמשפחה" הוא בדיחה ברורה. בלי מרכאות.${oddsHint}`, { maxTokens: 110 })
    }
    await db.collection('appState').doc('pundit').set({ text: recap || '', preview: preview || '', updatedAt: Timestamp.now() }, { merge: true })
    punditOK = !!recap

    const sJson = await geminiCall(geminiKey, GMODEL,
      `הצע 6 שאלות סקר כיפיות וקצרות בעברית בנושא מונדיאל 2026 לעובדי חברה. ` +
      `החזר JSON: מערך של אובייקטים { "title": string, "options": string[] } עם 2–4 אפשרויות קצרות לכל שאלה.`,
      { maxTokens: 500, json: true })
    if (sJson) {
      try {
        const items = JSON.parse(sJson)
        if (Array.isArray(items) && items.length) {
          await db.collection('appState').doc('surveySuggestions').set({ items, updatedAt: Timestamp.now() })
          suggestionsOK = true
        }
      } catch { /* bad JSON */ }
    }

    const coachable = arr.filter(([, a]) => a.predCount >= 1).slice(0, 25)
    for (const [uid, a] of coachable) {
      const cSummary = `דיוק: ${a.exact} תוצאות בול, ${a.points} נק' מ-${a.predCount} משחקים, ${a.draws} ניחושי תיקו, ממוצע ${(a.predGoals / Math.max(1, a.predCount)).toFixed(1)} שערים למשחק`
      const text = await geminiCall(geminiKey, GMODEL,
        `אתה "עמוס ואביגדור" (צמד אנליסטים, לשון רבים). כתוב משפט אחד בעברית (עד 140 תווים), עוקצני אך מועיל, עם טיפ קונקרטי אחד, לשחקן לפי הנתונים. בלי מרכאות.\n${cSummary}`,
        { maxTokens: 90 })
      if (text) { await db.collection('users').doc(uid).set({ coach: { text } }, { merge: true }); coachWritten++ }
    }
  }

  return {
    users: counts.size, predictions: allPreds.size, hof: Object.keys(hof).length,
    bonusAdjusted: bonusDelta.size, champion: champion || '-',
    pundit: punditOK, suggestions: suggestionsOK, coach: coachWritten
  }
}

export const dailyJob = onRequest(
  { secrets: [SYNC_SECRET, GEMINI_API_KEY], region: 'europe-west1', timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    const provided = String(req.header('X-Sync-Secret') || '')
    if (!provided || provided !== SYNC_SECRET.value()) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      const result = await runDaily(GEMINI_API_KEY.value())
      logger.info('dailyJob', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('dailyJob failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
