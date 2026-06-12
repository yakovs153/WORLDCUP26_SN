import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db, auth, DEMO_MODE } from '../firebase'

const ADMIN_SET_PASSWORD_URL = 'https://europe-west1-world-cup-2026-c145b.cloudfunctions.net/adminSetPassword'

/** Generate a readable temp password the admin can relay (no ambiguous chars). */
function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const arr = new Uint32Array(10)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 10; i++) s += chars[arr[i] % chars.length]
  return s
}
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { logActivity } from '../lib/activity'
import { useToast } from '../components/Toast'
import type { UserDoc } from '../types'

/** Admin can delete non-admin users. Wipes their docs + blocks the email so
 * they can't simply re-register. The Firebase Auth account stays orphaned but
 * harmless (blocked at sign-in). */
export default function AdminUsers() {
  const { user: me, resetPassword } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()
  const [users, setUsers] = useState<UserDoc[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [resettingUid, setResettingUid] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  // uids whose bonus picks are COMPLETE (have both champion + top scorer —
  // same rule the app uses for needsBonus). Everyone else "didn't fill yet".
  const [completeBonusUids, setCompleteBonusUids] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(collection(db, 'users'), (s) => {
      setUsers(s.docs.map((d) => ({ ...(d.data() as UserDoc), uid: d.id })).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'he')))
    })
  }, [])

  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(collection(db, 'bonusPredictions'), (s) => {
      const done = new Set<string>()
      s.docs.forEach((d) => {
        const b = d.data()
        if (b.championTeamCode && b.topScorer) done.add(d.id)
      })
      setCompleteBonusUids(done)
    })
  }, [])

  // Real participants who haven't completed their bonus picks yet.
  const missingBonus = users.filter((u) => u.uid && !completeBonusUids.has(u.uid))
  const copyMissing = () => {
    const names = missingBonus.map((u) => u.displayName || u.email || '').filter(Boolean).join(', ')
    navigator.clipboard?.writeText(names).then(
      () => toast.show(`${missingBonus.length} שמות הועתקו ✓`, 'success'),
      () => toast.show('העתקה נכשלה', 'error')
    )
  }

  const isAdmin = (email: string | null | undefined) => !!email && cfg.adminEmails.map((e) => e.toLowerCase()).includes(email.toLowerCase())

  const remove = async (u: UserDoc) => {
    if (DEMO_MODE) { toast.show('המחיקה זמינה רק בפרודקשן', 'info'); return }
    if (!u.uid) return
    if (isAdmin(u.email)) { toast.show('לא ניתן למחוק אדמין', 'error'); return }
    if (me?.uid === u.uid) { toast.show('לא ניתן למחוק את עצמך', 'error'); return }
    if (!confirm(`למחוק את ${u.displayName || u.email}? פעולה זו מוחקת את כל הניחושים שלו וחוסמת את כתובת המייל מהרשמה מחדש.`)) return
    setBusy(u.uid)
    try {
      // 1) delete user's predictions
      const ps = await getDocs(query(collection(db, 'predictions'), where('uid', '==', u.uid)))
      await Promise.all(ps.docs.map((d) => deleteDoc(d.ref)))
      // 2) delete user's bonus prediction (key = uid)
      await deleteDoc(doc(db, 'bonusPredictions', u.uid)).catch(() => { /* maybe absent */ })
      // 3) delete the user doc
      await deleteDoc(doc(db, 'users', u.uid))
      // 4) block the email so they can't simply re-register
      if (u.email) {
        const next = [...new Set([...(cfg.blockedEmails || []), u.email.toLowerCase()])]
        await patchAppConfig({ blockedEmails: next })
      }
      logActivity('admin_delete_user', { targetUid: u.uid, targetName: u.displayName || '', targetEmail: u.email || '' })
      toast.show(`${u.displayName || u.email} נמחק ✓`, 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'מחיקה נכשלה', 'error')
    } finally { setBusy(null) }
  }

  // Admin sets a user's password directly (no email). Generates a temp
  // password, sets it via the privileged Cloud Function, and shows it to the
  // admin to relay to the user in person / Slack.
  const setUserPassword = async (u: UserDoc) => {
    if (DEMO_MODE) { toast.show('איפוס סיסמה זמין רק בפרודקשן', 'info'); return }
    if (!u.uid) return
    if (!confirm(`להגדיר סיסמה זמנית חדשה ל${u.displayName || u.email}? הסיסמה תוצג לך כדי שתעביר אותה למשתמש.`)) return
    setResettingUid(u.uid)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('לא מחובר')
      const tempPw = genTempPassword()
      const res = await fetch(ADMIN_SET_PASSWORD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: u.uid, newPassword: tempPw })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `שגיאה ${res.status}`)
      logActivity('admin_password_set', { targetUid: u.uid, targetEmail: u.email || '' })
      // Show the temp password so the admin can copy + relay it.
      window.prompt(`הסיסמה הזמנית ל${u.displayName || u.email} (העתק ומסור למשתמש):`, tempPw)
      toast.show('הסיסמה הוגדרה ✓ — מסור אותה למשתמש', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'הגדרת סיסמה נכשלה', 'error')
    } finally { setResettingUid(null) }
  }

  // Fallback: email reset link (kept for users who prefer it / are reachable).
  const sendReset = async (u: UserDoc) => {
    if (!u.email) { toast.show('למשתמש אין כתובת מייל', 'error'); return }
    if (DEMO_MODE) { toast.show('איפוס סיסמה זמין רק בפרודקשן', 'info'); return }
    if (!confirm(`לשלוח קישור איפוס סיסמה במייל אל ${u.email}?`)) return
    setResettingUid(u.uid)
    try {
      await resetPassword(u.email)
      logActivity('admin_password_reset', { targetUid: u.uid, targetEmail: u.email })
      toast.show(`קישור איפוס נשלח אל ${u.email} ✓`, 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שליחה נכשלה', 'error')
    } finally { setResettingUid(null) }
  }

  // Set a user's gender (drives מלך/מלכה titles on the leaderboard + king banner).
  const setGender = async (u: UserDoc, gender: 'male' | 'female' | null) => {
    if (DEMO_MODE || !u.uid) return
    try { await setDoc(doc(db, 'users', u.uid), { gender }, { merge: true }); toast.show('מגדר עודכן ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'עדכון נכשל', 'error') }
  }

  const unblock = async (email: string) => {
    const next = (cfg.blockedEmails || []).filter((e) => e.toLowerCase() !== email.toLowerCase())
    try { await patchAppConfig({ blockedEmails: next }); logActivity('admin_unblock_email', { email }); toast.show('בוטל החסימה ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'הסרה נכשלה', 'error') }
  }

  const filtered = users.filter((u) => {
    const q = filter.trim().toLowerCase()
    return !q || (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Who hasn't filled their bonus picks yet — pre-kickoff nudge list */}
      {!DEMO_MODE && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🏆 לא מילאו ניחושי בונוס ({missingBonus.length})</h3>
            <button onClick={copyMissing} disabled={missingBonus.length === 0}
              className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)' }}>
              📋 העתק שמות
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: 12 }}>משתמשים שנרשמו אך טרם בחרו זוכה + מלך שערים. שלח להם תזכורת לפני נעילת הבונוס.</p>
          {missingBonus.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>כולם מילאו ✓</p>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {missingBonus.map((u) => (
                <span key={u.uid} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                  {u.displayName || u.email}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>👥 ניהול משתמשים</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>
          🔑 מגדיר סיסמה זמנית חדשה ומציג אותה לך למסירה למשתמש · ✉️ שולח קישור איפוס במייל (חלופה) · מחיקה מוחקת את כל הניחושים וחוסמת את המייל. אדמינים לא ניתנים למחיקה.
        </p>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="חיפוש לפי שם או מייל…"
          style={{ padding: '10px 12px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }} />
        {DEMO_MODE && <p className="text-muted" style={{ fontSize: 12 }}>(מצב דמו — אין משתמשים אמיתיים)</p>}
        <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((u) => {
            const admin = isAdmin(u.email)
            const self = me?.uid === u.uid
            return (
              <div key={u.uid} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.displayName || 'משתמש'}
                    {admin && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', background: 'rgba(225,29,72,0.15)', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>אדמין</span>}
                    {self && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(אתה)</span>}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email} · {u.department || 'ללא מחלקה'} · {u.totalPoints || 0} נק׳</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={u.gender || ''} onChange={(e) => setGender(u, (e.target.value || null) as 'male' | 'female' | null)}
                    title="מגדר — לתואר מלך/מלכה" disabled={DEMO_MODE}
                    style={{ padding: '6px 6px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg-hi)', color: 'var(--color-text)', outline: 'none' }}>
                    <option value="">מגדר —</option>
                    <option value="male">מלך ♂</option>
                    <option value="female">מלכה ♀</option>
                  </select>
                  <button onClick={() => setUserPassword(u)} disabled={resettingUid === u.uid}
                    title="הגדר סיסמה זמנית חדשה (מוצגת לך למסירה)"
                    className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)' }}>
                    {resettingUid === u.uid ? '…' : '🔑 סיסמה'}
                  </button>
                  <button onClick={() => sendReset(u)} disabled={!u.email || resettingUid === u.uid}
                    title="שלח קישור איפוס במייל (חלופה)"
                    className="btn-ghost" style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                    ✉️
                  </button>
                  <button onClick={() => remove(u)} disabled={admin || self || busy === u.uid}
                    className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', opacity: admin || self ? 0.4 : 1, cursor: admin || self ? 'not-allowed' : 'pointer' }}>
                    {busy === u.uid ? '…' : 'מחק'}
                  </button>
                </div>
              </div>
            )
          })}
          {!DEMO_MODE && filtered.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>אין משתמשים תואמים.</span>}
        </div>
      </section>

      {cfg.blockedEmails?.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🚫 מיילים חסומים</h3>
          {cfg.blockedEmails.map((e) => (
            <div key={e} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{e}</span>
              <button onClick={() => unblock(e)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>בטל חסימה</button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
