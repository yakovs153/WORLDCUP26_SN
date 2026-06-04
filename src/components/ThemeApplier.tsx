import { useEffect } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'

/**
 * Mounts no DOM, but updates :root CSS variables whenever theme config changes.
 * This is how admin theme changes apply live across the entire app.
 */
export default function ThemeApplier() {
  const cfg = useAppConfig()

  useEffect(() => {
    const root = document.documentElement
    const t = cfg.theme

    root.style.setProperty('--color-primary', t.primary)
    root.style.setProperty('--color-primary-hover', adjustLightness(t.primary, 0.08))
    root.style.setProperty('--color-accent', t.accent)
    root.style.setProperty('--color-bg', t.bg)
    root.style.setProperty('--color-bg-elevated', adjustLightness(t.bg, 0.04))
    root.style.setProperty('--color-surface', t.surface)
    root.style.setProperty('--color-surface-hover', adjustLightness(t.surface, 0.04))
    root.style.setProperty('--color-text', t.text)
    root.style.setProperty('--color-danger', t.danger)

    // Also keep the meta theme-color in sync
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.bg)
  }, [cfg.theme])

  return null
}

// Lighten/darken a hex color by adding `delta` to its L channel.
function adjustLightness(hex: string, delta: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  const newL = Math.max(0, Math.min(1, l + delta))

  // back to RGB
  let r2, g2, b2
  if (s === 0) {
    r2 = g2 = b2 = newL
  } else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
    const p = 2 * newL - q
    r2 = hueToRgb(p, q, h + 1 / 3)
    g2 = hueToRgb(p, q, h)
    b2 = hueToRgb(p, q, h - 1 / 3)
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`
}

function hueToRgb(p: number, q: number, t: number) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
