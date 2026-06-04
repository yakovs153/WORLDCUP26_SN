import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Header() {
  const { user, signOut } = useAuth()
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 'var(--header-height)',
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text)' }}>
        <img
          src="/logo.png"
          alt="StoreNext"
          height={36}
          style={{ display: 'block' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1 }}>
            מונדיאל 2026
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
            ניחושים פנימיים
          </span>
        </div>
      </Link>
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
    </header>
  )
}
