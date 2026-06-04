import { useRef, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { TOP_SCORER_CANDIDATES, type PlayerOption } from '../lib/players'
import { patchAppConfig } from '../lib/appConfig'
import { uploadPlayerPhoto, removePlayerPhoto } from '../lib/playerPhotos'
import PlayerAvatar from '../components/PlayerAvatar'
import { useToast } from '../components/Toast'
import type { CustomPlayer } from '../types'

const COUNTRY_CODES = [
  'BRA','ARG','FRA','ENG','ESP','POR','GER','NED','BEL','CRO','ITA','USA','MEX','CAN','MAR','JPN','SEN','URY',
  'POL','SUI','DEN','SWE','NOR','TUR','EGY','AUS','KOR'
]

export default function AdminPlayers() {
  const cfg = useAppConfig()
  const toast = useToast()
  const [busyFor, setBusyFor] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('BRA')

  // Combined list: hard-coded candidates + admin-added custom players
  const allPlayers: PlayerOption[] = [
    ...TOP_SCORER_CANDIDATES,
    ...cfg.customPlayers.map((cp) => ({
      name: cp.name,
      countryCode: cp.countryCode,
      display: `${cp.name} · ${cp.countryCode}`
    }))
  ]

  const isCustom = (name: string) => cfg.customPlayers.some((p) => p.name === name)

  const addPlayer = async () => {
    const name = newName.trim()
    if (!name) return
    if (allPlayers.some((p) => p.name === name)) {
      toast.show('שחקן בשם זה כבר קיים', 'error')
      return
    }
    const next: CustomPlayer[] = [...cfg.customPlayers, { name, countryCode: newCode }]
    await patchAppConfig({ customPlayers: next })
    toast.show(`${name} נוסף לרשימה ✓`)
    setNewName('')
    setAdding(false)
  }

  const removeCustomPlayer = async (name: string) => {
    const next = cfg.customPlayers.filter((p) => p.name !== name)
    await patchAppConfig({ customPlayers: next })
    // Also remove its photo if exists
    if (cfg.playerPhotos[name]) {
      await removePlayerPhoto(name)
    }
    toast.show(`${name} הוסר`, 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Add custom player */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adding ? 12 : 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>
            ➕ הוספת שחקן חדש
          </h3>
          {!adding && (
            <button className="btn" onClick={() => setAdding(true)} style={{ padding: '6px 14px', fontSize: 13 }}>
              + חדש
            </button>
          )}
        </div>

        {adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              placeholder="שם השחקן (לדוגמה: קולו מואני)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              autoFocus
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="btn" onClick={addPlayer} style={{ padding: '0 16px' }}>
                הוספה
              </button>
              <button
                className="btn-ghost"
                onClick={() => { setAdding(false); setNewName('') }}
                style={{ padding: '0 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Players list */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 6 }}>
          תמונות שחקנים — מלך השערים
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          העלה תמונה לכל שחקן (JPG/PNG/WEBP) — גם ע"י <strong>גרירה</strong> לאזור האווטר.
          התמונה תוקטן אוטומטית ל-240px.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allPlayers.map((p) => {
            const custom = isCustom(p.name)
            return (
              <PlayerRow
                key={p.name}
                name={p.name}
                countryCode={p.countryCode}
                country={p.display.split('·')[1]?.trim() || p.countryCode}
                photoUrl={cfg.playerPhotos[p.name]}
                isCustom={custom}
                busy={busyFor === p.name}
                onUpload={async (file) => {
                  setBusyFor(p.name)
                  try {
                    await uploadPlayerPhoto(p.name, file)
                    toast.show(`תמונת ${p.name} הועלתה ✓`)
                  } catch (e) {
                    toast.show(e instanceof Error ? e.message : 'העלאה נכשלה', 'error')
                  } finally {
                    setBusyFor(null)
                  }
                }}
                onRemovePhoto={async () => {
                  setBusyFor(p.name)
                  try {
                    await removePlayerPhoto(p.name)
                    toast.show(`תמונת ${p.name} הוסרה`, 'info')
                  } catch (e) {
                    toast.show(e instanceof Error ? e.message : 'הסרה נכשלה', 'error')
                  } finally {
                    setBusyFor(null)
                  }
                }}
                onRemovePlayer={custom ? () => removeCustomPlayer(p.name) : undefined}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function PlayerRow({
  name, countryCode, country, photoUrl, isCustom, busy,
  onUpload, onRemovePhoto, onRemovePlayer
}: {
  name: string
  countryCode: string
  country: string
  photoUrl?: string
  isCustom: boolean
  busy: boolean
  onUpload: (f: File) => Promise<void>
  onRemovePhoto: () => Promise<void>
  onRemovePlayer?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) await onUpload(f)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: dragOver ? 'color-mix(in srgb, var(--color-primary) 18%, var(--color-bg-elevated))' : 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: dragOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
        transition: 'all 0.15s ease'
      }}
    >
      <PlayerAvatar name={name} countryCode={countryCode} photoUrl={photoUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {name}
          {isCustom && <span style={{ fontSize: 9, color: 'var(--color-primary)', background: 'rgba(225,29,72,0.15)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>מותאם</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{country}</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) await onUpload(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost"
          style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
        >
          {busy ? '…' : photoUrl ? '🔄' : '⬆ העלאה'}
        </button>
        {photoUrl && !busy && (
          <button
            onClick={onRemovePhoto}
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: 14, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)' }}
            title="הסר תמונה"
          >
            🗑
          </button>
        )}
        {onRemovePlayer && !busy && (
          <button
            onClick={onRemovePlayer}
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: 14, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)' }}
            title="הסר שחקן מותאם"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '10px 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  outline: 'none',
  fontSize: 14,
  width: '100%'
} as const
