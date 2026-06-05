import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import { useAppConfig } from '../hooks/useAppConfig'

export default function Layout() {
  const cfg = useAppConfig()
  const ann = cfg.announcement
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="glow-bg" aria-hidden />
      <Header />
      {ann.active && ann.text && (
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 16px'
          }}
        >
          📣 {ann.text}
        </div>
      )}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'var(--space-4)',
          paddingBottom: 'var(--space-6)'
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
