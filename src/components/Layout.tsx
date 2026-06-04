import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import DemoBanner from './DemoBanner'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DemoBanner />
      <Header />
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
