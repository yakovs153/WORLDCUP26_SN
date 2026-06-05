import { useEffect, useState } from 'react'

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const DISMISS_KEY = 'wc26-install-dismissed-v1'

/** Twin buttons: "Install app" (PWA install prompt) and "Continue in browser". */
export default function InstallButtons() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } })
  const [iosTip, setIosTip] = useState(false)

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    // Already installed (running as PWA)?
    const inStandalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (inStandalone) setInstalled(true)
    return () => { window.removeEventListener('beforeinstallprompt', onBIP); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (installed || dismissed) return null

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
  const canPrompt = !!evt

  const install = async () => {
    if (canPrompt && evt) { await evt.prompt(); await evt.userChoice; setEvt(null) }
    else if (isIOS) setIosTip(true)
  }
  const continueBrowser = () => { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ } setDismissed(true) }

  // Hide entirely if there's nothing useful to offer (e.g. desktop browser with no support and not iOS).
  if (!canPrompt && !isIOS) return null

  return (
    <div className="glass animate-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22 }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>שמור על האפליקציה בהישג יד</div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{canPrompt ? 'התקן את האפליקציה למסך הבית' : 'הוסף למסך הבית מ-Safari'}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn" onClick={install} style={{ padding: '8px 12px', fontSize: 13 }}>
          ⬇ התקן אפליקציה
        </button>
        <button onClick={continueBrowser} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 13, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
          המשך בדפדפן
        </button>
      </div>
      {iosTip && (
        <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          ב-iPhone: לחץ על כפתור השיתוף 􀈂 בתחתית הדפדפן → "Add to Home Screen".
        </div>
      )}
    </div>
  )
}
