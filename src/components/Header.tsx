import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import ThemeToggle from './ThemeToggle'
import CubeMark from './CubeMark'

export default function Header() {
  const { user, signOut } = useAuth()
  const cfg = useAppConfig()
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        height: 'var(--header-height)',
        background: 'var(--glass-bg)',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        backdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)'
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
        {logoFailed ? (
          <CubeMark size={30} />
        ) : (
          <img
            src="/logo.png"
            alt="StoreNext"
            height={34}
            style={{ display: 'block' }}
            onError={() => setLogoFailed(true)}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, letterSpacing: 1 }}>
            {cfg.content.tournamentName}
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
            ניחושים פנימיים
          </span>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeToggle />
        {user && (
          <button
            onClick={signOut}
            className="btn-ghost"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              border: '1px solid var(--color-border-strong)'
            }}
          >
            התנתק
          </button>
        )}
      </div>
    </header>
  )
}
