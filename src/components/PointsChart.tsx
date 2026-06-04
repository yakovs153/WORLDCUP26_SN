interface Point {
  x: number
  y: number
  label?: string
}

interface Props {
  points: Point[]
  height?: number
}

/**
 * SVG sparkline טהור — ללא תלות חיצונית.
 * מקבל סדרת נקודות (cumulative), מצייר קו + שטח מתחתיו.
 */
export default function PointsChart({ points, height = 110 }: Props) {
  if (points.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 13
        }}
      >
        כשמשחקים יסתיימו והניחושים שלך ינוקדו — תופיע כאן הגרף שלך
      </div>
    )
  }

  const W = 600
  const H = height
  const PAD = 16

  const minY = 0
  const maxY = Math.max(...points.map((p) => p.y), 5)

  const scaleX = (x: number) =>
    points.length === 1 ? W / 2 : PAD + ((x - points[0].x) / (points[points.length - 1].x - points[0].x)) * (W - PAD * 2)
  const scaleY = (y: number) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`).join(' ')

  const areaPath =
    path +
    ` L ${scaleX(points[points.length - 1].x).toFixed(1)} ${H - PAD}` +
    ` L ${scaleX(points[0].x).toFixed(1)} ${H - PAD} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label="גרף נקודות לאורך הטורניר"
    >
      <defs>
        <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth="1" />
      {/* area fill */}
      <path d={areaPath} fill="url(#ptsGrad)" />
      {/* line */}
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(p.x)}
          cy={scaleY(p.y)}
          r={i === points.length - 1 ? 5 : 3.5}
          fill="var(--color-primary)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      ))}
      {/* last value label */}
      {(() => {
        const last = points[points.length - 1]
        const lx = scaleX(last.x)
        const ly = scaleY(last.y)
        return (
          <text
            x={lx}
            y={Math.max(ly - 10, 12)}
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fill="var(--color-primary)"
          >
            {last.y}
          </text>
        )
      })()}
    </svg>
  )
}
