/**
 * Tiny self-contained confetti burst — no dependencies.
 * Paints a short-lived full-screen canvas, then removes itself.
 * Respects prefers-reduced-motion (no-op when the user opts out).
 */
const COLORS = ['#e11d48', '#f59e0b', '#22c55e', '#7c3aed', '#f43f5e', '#fde047']

export function fireConfetti(durationMs = 1400): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-layer'
  const dpr = window.devicePixelRatio || 1
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)

  const N = Math.min(160, Math.round(W / 6))
  const parts = Array.from({ length: N }, (_, i) => ({
    x: W / 2 + (Math.cos(i) * W) / 8,
    y: H * 0.32,
    vx: (((i * 73) % 100) / 100 - 0.5) * 9,
    vy: -(4 + ((i * 31) % 100) / 12),
    rot: (i * 37) % 360,
    vr: (((i * 17) % 100) / 100 - 0.5) * 18,
    w: 6 + (i % 5),
    h: 8 + (i % 7),
    color: COLORS[i % COLORS.length]
  }))

  const gravity = 0.32
  let start: number | null = null

  function frame(ts: number) {
    if (start === null) start = ts
    const elapsed = ts - start
    ctx!.clearRect(0, 0, W, H)
    for (const p of parts) {
      p.vy += gravity
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate((p.rot * Math.PI) / 180)
      ctx!.globalAlpha = Math.max(0, 1 - elapsed / durationMs)
      ctx!.fillStyle = p.color
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx!.restore()
    }
    if (elapsed < durationMs) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(frame)
}
