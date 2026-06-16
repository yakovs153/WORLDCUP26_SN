/**
 * Shared pundit generation — the daily "מבזק יומי" recap + the next-match
 * prediction tip. Used by dailyJob (scheduled) and runPundit (admin on-demand),
 * so the prompt logic lives in exactly one place.
 *
 * The persona/voice is admin-editable (appConfig/main.punditVoice); the "what to
 * write" structure + live data are appended here in code.
 */
import { logger } from 'firebase-functions/v2'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { tomPick, punditVoiceOf } from './liveSync'

async function geminiCall(key: string, model: string, prompt: string, maxTokens = 240): Promise<string | null> {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 1.0 } })
    })
    if (!r.ok) { logger.warn('gemini (pundit)', r.status); return null }
    const data = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch (e) { logger.warn('gemini error (pundit)', e); return null }
}

/**
 * Generate the daily recap (text) + next-match prediction tip (preview) and
 * write them to appState/pundit. Best-effort per field.
 */
export async function generateDailyPundit(geminiKey: string): Promise<{ recapOK: boolean; previewOK: boolean }> {
  const db = getFirestore()
  const GMODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

  const cfgSnap = await db.collection('appConfig').doc('main').get()
  const cfg = cfgSnap.exists ? cfgSnap.data() || {} : {}
  const voice = punditVoiceOf(cfg)
  const analystOverrides = (cfg.analystOverrides || {}) as Record<string, [number, number]>

  const top = (await db.collection('users').orderBy('totalPoints', 'desc').limit(5).get())
    .docs.map((d) => ({ name: d.data().displayName || 'משתמש', pts: d.data().totalPoints || 0 })).filter((u) => u.pts > 0)
  const now = Date.now(), DAY = 86_400_000
  let live = 0, finishedToday = 0, todayCount = 0
  let nextMatch: { id: string; hn: string; an: string; hc: string; ac: string; k: number } | null = null
  ;(await db.collection('matches').get()).forEach((d) => {
    const m = d.data(); const k = m.kickoff?.toMillis?.() ?? 0
    if (m.status === 'LIVE') live++
    if (m.status === 'FINISHED' && now - k < DAY && now - k > 0) finishedToday++
    if (m.status === 'SCHEDULED' && k > now && k - now < DAY) todayCount++
    if (m.status === 'SCHEDULED' && k > now && (!nextMatch || k < nextMatch.k)) {
      nextMatch = { id: d.id, hn: m.homeTeam?.name || '', an: m.awayTeam?.name || '', hc: m.homeTeam?.code || '', ac: m.awayTeam?.code || '', k }
    }
  })
  const standings = top.length ? top.map((t) => `${t.name} ${t.pts}`).join(', ') : 'אין עדיין נקודות'
  const summary = `מובילים: ${standings}. חי כעת: ${live}. הסתיימו היום: ${finishedToday}. צפויים היום: ${todayCount}.`

  const recap = await geminiCall(geminiKey, GMODEL,
    `${voice} כתוב "מבזק יומי", 2–3 שורות קצרות, כל שורה מתחילה באימוג'י: אחת על המוביל בטבלת הניחושים, ` +
    `ואחת-שתיים על מה שמעניין היום במונדיאל. עד 320 תווים.\nנתונים: ${summary}`, 260)

  let preview: string | null = null
  if (nextMatch) {
    const nm: { id: string; hn: string; an: string; hc: string; ac: string; k: number } = nextMatch
    const [ph, pa] = tomPick(nm.hc, nm.ac, nm.id, analystOverrides)
    let oddsLine = ''
    try {
      const oddsDoc = await db.collection('snapshot').doc('odds').get()
      const oItems = ((oddsDoc.exists ? (oddsDoc.data() as { items?: Record<string, { home: number; away: number }> }).items : {}) || {})
      const alias = (c: string) => { const u = (c || '').toUpperCase(); return u === 'CUR' ? 'CUW' : u }
      const o = oItems[[alias(nm.hc), alias(nm.ac)].sort().join('_')]
      if (o) oddsLine = ` (שוק ההימורים: ${nm.hn} ${o.home}%, ${nm.an} ${o.away}%)`
    } catch { /* odds optional */ }
    preview = await geminiCall(geminiKey, GMODEL,
      `${voice} המשחק הקרוב: ${nm.hn} נגד ${nm.an}.${oddsLine} הניחוש הרשמי שלכם לתוצאה: ${ph}-${pa}. ` +
      `כתוב משפט תחזית אחד, חד ובטוח, שמציין במפורש את התוצאה שניחשתם (${nm.hn} ${ph}-${pa} ${nm.an}) ` +
      `ומסתיים בביטוי ביטחון. משפט אחד שלם — אל תיחתך באמצע. עד 200 תווים.`, 220)
  }

  const patch: Record<string, unknown> = { updatedAt: Timestamp.now() }
  if (recap) patch.text = recap
  if (preview) patch.preview = preview
  if (recap || preview) await db.collection('appState').doc('pundit').set(patch, { merge: true })
  return { recapOK: !!recap, previewOK: !!preview }
}
