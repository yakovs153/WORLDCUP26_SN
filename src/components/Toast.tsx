import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface ToastMsg {
  id: number
  text: string
  kind: 'success' | 'error' | 'info'
}

interface ToastApi {
  show: (text: string, kind?: ToastMsg['kind']) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([])

  const show = useCallback((text: string, kind: ToastMsg['kind'] = 'success') => {
    const id = nextId++
    setItems((curr) => [...curr, { id, text, kind }])
    setTimeout(() => {
      setItems((curr) => curr.filter((t) => t.id !== id))
    }, 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 'calc(var(--bottom-nav-height) + 16px)',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              minWidth: 220,
              padding: '10px 16px',
              borderRadius: 'var(--radius-full)',
              background:
                t.kind === 'error'
                  ? 'var(--color-danger)'
                  : t.kind === 'info'
                    ? 'var(--color-surface)'
                    : 'var(--color-primary)',
              color: t.kind === 'info' ? 'var(--color-text)' : 'var(--color-text-inverse)',
              border: t.kind === 'info' ? '1px solid var(--color-border-strong)' : 'none',
              fontWeight: 700,
              fontSize: 14,
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
              animation: 'toastIn 0.25s ease both'
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Allow standalone use without provider (no-op)
    return { show: (_t: string, _k?: ToastMsg['kind']) => {} } satisfies ToastApi
  }
  return ctx
}

// Helper for one-off toasts via custom event (when provider not in scope).
export function emitToast(text: string, kind: ToastMsg['kind'] = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { text, kind } }))
}

export function useGlobalToastListener() {
  const { show } = useToast()
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ text: string; kind: ToastMsg['kind'] }>
      show(ce.detail.text, ce.detail.kind)
    }
    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [show])
}
