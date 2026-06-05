/**
 * טום האנליסט — daily AI tasks via Gemini (one workflow run, a few small calls →
 * well within the free tier). Produces:
 *   • appState/pundit.text     — daily studio recap (Anchor Desk)
 *   • appState/pundit.preview  — one-line hype for today's biggest fixture
 *   • appState/surveySuggestions.items — fun poll questions for the admin
 *   • stats/hallOfFame[*].blurb — witty caption per award (only if awards exist)
 *
 * Env: GEMINI_API_KEY (required), GEMINI_MODEL (default gemini-flash-lite-latest).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

async function gemini(prompt, { maxTokens = 200, json = false } = {}) {
  const generationConfig = { maxOutputTokens: maxTokens, temperature: 1.0 }
  if (json) generationConfig.responseMimeType = 'application/json'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig })
  })
  if (!res.ok) { console.error('gemini', res.status, (await res.text()).slice(0, 200)); return null }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

// ---- gather data ----
const top = (await db.collection('users').orderBy('totalPoints', 'desc').limit(5).get())
  .docs.map((d) => ({ name: d.data().displayName || 'משתמש', pts: d.data().totalPoints || 0 })).filter((u) => u.pts > 0)

const now = Date.now(), DAY = 86_400_000
const todayFixtures = []
let live = 0, finishedToday = 0
;(await db.collection('matches').get()).forEach((d) => {
  const m = d.data(); const k = m.kickoff?.toMillis?.() ?? 0
  if (m.status === 'LIVE') live++
  if (m.status === 'FINISHED' && now - k < DAY && now - k > 0) finishedToday++
  if (m.status === 'SCHEDULED' && k > now && k - now < DAY) todayFixtures.push(`${m.homeTeam?.name} נגד ${m.awayTeam?.name}`)
})
const standings = top.length ? top.map((t) => `${t.name} ${t.pts}`).join(', ') : 'אין עדיין נקודות'
const summary = `מובילים: ${standings}. חי כעת: ${live}. הסתיימו היום: ${finishedToday}. צפויים היום: ${todayFixtures.length}.`

// ---- 1) daily recap ----
const recap = await gemini(
  `אתה "טום האנליסט", אנליסט כדורגל מבוסס-AI של StoreNext — חד, מדויק, שנון וקליל. ` +
  `כתוב "מבזק יומי" בעברית: 2–3 שורות קצרות, כל שורה מתחילה באימוג'י, מתייחס למוביל, עוקץ קלות את המפגרים ומה שמעניין היום. ` +
  `בלי האשטגים/מרכאות, עד 300 תווים.\nנתונים: ${summary}`, { maxTokens: 220 })

// ---- 2) matchday preview (today's biggest fixture) ----
let preview = null
if (todayFixtures.length) {
  preview = await gemini(
    `אתה טום האנליסט. מבין משחקי היום: ${todayFixtures.join(', ')}. ` +
    `בחר את המשחק הכי מסקרן וכתוב משפט הייפ אחד קצר בעברית (עד 120 תווים), בלי מרכאות.`, { maxTokens: 80 })
}

await db.collection('appState').doc('pundit').set(
  { text: recap || '', preview: preview || '', updatedAt: Timestamp.now() }, { merge: true })

// ---- 3) survey question suggestions (for the admin) ----
const sJson = await gemini(
  `הצע 6 שאלות סקר כיפיות וקצרות בעברית בנושא מונדיאל 2026 לעובדי חברה. ` +
  `החזר JSON: מערך של אובייקטים { "title": string, "options": string[] } עם 2–4 אפשרויות קצרות לכל שאלה.`,
  { maxTokens: 500, json: true })
if (sJson) {
  try {
    const items = JSON.parse(sJson)
    if (Array.isArray(items) && items.length) {
      await db.collection('appState').doc('surveySuggestions').set({ items, updatedAt: Timestamp.now() })
    }
  } catch { console.error('survey suggestions: bad JSON') }
}

// ---- 4) Hall of Fame blurbs (only if awards exist) ----
const hofSnap = await db.collection('stats').doc('hallOfFame').get()
const hof = hofSnap.exists ? hofSnap.data() : {}
const awards = Object.entries(hof).filter(([, v]) => v && v.name)
if (awards.length) {
  const bJson = await gemini(
    `כתוב כיתוב שנון וקצר (עד 60 תווים, בלי מרכאות) לכל פרס בהיכל התהילה. ` +
    `החזר JSON אובייקט {key: caption}. הפרסים: ` +
    JSON.stringify(awards.map(([k, v]) => ({ key: k, name: v.name, detail: v.detail }))),
    { maxTokens: 300, json: true })
  if (bJson) {
    try {
      const caps = JSON.parse(bJson)
      const merged = {}
      for (const [k, v] of awards) merged[k] = { ...v, blurb: caps[k] || v.blurb || '' }
      await db.collection('stats').doc('hallOfFame').set(merged, { merge: true })
    } catch { console.error('hof blurbs: bad JSON') }
  }
}

console.log(`pundit done — recap:${!!recap} preview:${!!preview} suggestions:${!!sJson} awards:${awards.length}`)
