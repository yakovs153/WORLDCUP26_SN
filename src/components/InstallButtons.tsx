import { useEffect, useState } from 'react'

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const DISMISS_KEY = 'wc26-install-dismissed-until-v2' // session-only dismiss (timestamp)

/** Always-visible Install / Open in browser card on the home screen.
 *  Hides only when (a) running as a standalone PWA, or (b) user dismissed within
 *  the last 24h. Works on Android Chrome (native prompt), iOS Safari (share-sheet
 *  instructions), and falls back to a clear "ask your browser to install" hint. */
export default function InstallButtons() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { const until = Number(localStorage.getItem(DISMISS_KEY) || 0); return until > Date.now() } catch { return false }
  })
  const [showIosTip, setShowIosTip] = useState(false)
  const [showGenericTip, setShowGenericTip] = useState(false)

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    const nav = navigator as Navigator & { standalone?: boolean }
    const inStandalone = window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
    if (inStandalone) setInstalled(true)
    return () => { window.removeEventListener('beforeinstallprompt', onBIP); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (installed || dismissed) return null

  // Robust iOS detection — iPadOS 13+ reports as "Macintosh" but has touch.
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || ('ontouchend' in document && /Mac/.test(ua))
  const isAndroid = /Android/.test(ua)

  const install = async () => {
    if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); return }
    if (isIOS) { setShowIosTip(true); return }
    setShowGenericTip(true)
  }
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000)) } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="glass animate-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 24 }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>שמור גישה מהירה</div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>התקן את האפליקציה — בלי דפדפן, ישר ממסך הבית</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn" onClick={install} style={{ padding: '8px 14px', fontSize: 13 }}>
          ⬇ התקן אפליקציה
        </button>
        <button onClick={dismiss} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 13, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
          💻 פתח בדפדפן
        </button>
      </div>
      {showIosTip && (
        <div style={{ flexBasis: '100%', fontSize: 12, lineHeight: 1.6, marginTop: 6, padding: '8px 10px', background: 'var(--glass-bg-hi)', borderRadius: 'var(--radius-md)' }}>
          <b>ב-iPhone (Safari):</b> לחץ על כפתור השיתוף בתחתית הדפדפן (ריבוע עם חץ למעלה ↑) → גלול ובחר <b>"הוסף למסך הבית"</b> / "Add to Home Screen".
        </div>
      )}
      {showGenericTip && !isIOS && (
        <div style={{ flexBasis: '100%', fontSize: 12, lineHeight: 1.6, marginTop: 6, padding: '8px 10px', background: 'var(--glass-bg-hi)', borderRadius: 'var(--radius-md)' }}>
          {isAndroid
            ? <><b>ב-Android (Chrome):</b> לחץ על תפריט שלוש הנקודות ⋮ ובחר <b>"Install app"</b> / "התקן אפליקציה".</>
            : <><b>במחשב:</b> בחר בתפריט הדפדפן את "התקן את האפליקציה" / "Install ניחושי מונדיאל 2026". באייקון בשורת הכתובת (⊕ או 🖥️) ב-Chrome/Edge.</>}
        </div>
      )}
    </div>
  )
}
