/**
 * סטורי התמנון — daily AI pundit. Reads the current standings + fixtures and
 * asks Gemini for a short, cheeky Hebrew one-liner, then stores it for the app
 * to show. One call per day → trivial token usage (well within the free tier).
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

const top = (await db.collection('users').orderBy('totalPoints', 'desc').limit(5).get())
  .docs.map((d) => ({ name: d.data().displayName || 'משתמש', pts: d.data().totalPoints || 0 }))
  .filter((u) => u.pts > 0)

let live = 0, finishedToday = 0, upcomingToday = 0
const now = Date.now(), DAY = 86_400_000
;(await db.collection('matches').get()).forEach((d) => {
  const m = d.data(); const k = m.kickoff?.toMillis?.() ?? 0
  if (m.status === 'LIVE') live++
  if (m.status === 'FINISHED' && now - k < DAY && now - k > 0) finishedToday++
  if (m.status === 'SCHEDULED' && k > now && k - now < DAY) upcomingToday++
})

const standings = top.length ? top.map((t) => `${t.name} ${t.pts}`).join(', ') : 'אין עדיין נקודות'
const summary = `מובילים: ${standings}. חי כעת: ${live}. הסתיימו היום: ${finishedToday}. צפויים היום: ${upcomingToday}.`

const prompt = `אתה "סטורי התמנון", מנחה שולחן פרשנים שנון, עוקצני ומצחיק של StoreNext — כלי ניחושים פנימי לעובדים. ` +
  `כתוב "מבזק יומי" קצר בעברית: 2–3 שורות קצרות (שורה לכל נקודה), כל שורה מתחילה באימוג'י. ` +
  `התייחס למוביל/ים, לעקיצה קלה על מי שמפגר, ולמה שמעניין היום. שנון וקליל, בלי האשטגים, בלי מרכאות, עד 300 תווים סה"כ.\nנתונים: ${summary}`

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 220, temperature: 1.0 } })
})
if (!res.ok) { console.error('gemini error', res.status, await res.text()); process.exit(1) }
const data = await res.json()
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
if (!text) { console.error('no text from gemini', JSON.stringify(data).slice(0, 300)); process.exit(1) }

await db.collection('appState').doc('pundit').set({ text, updatedAt: Timestamp.now() })
console.log('pundit:', text)
