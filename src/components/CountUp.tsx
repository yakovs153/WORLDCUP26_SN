import { useEffect, useRef, useState } from 'react'

/** Animate a number from its previous value to the new one (ease-out cubic). */
export function useCountUp(target: number, duration = 650): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      // Round to int while animating (smooth count-up), but settle on the exact
      // target so half-points (e.g. 7.5 from auto-fills) survive.
      setVal(t < 1 ? Math.round(from + (target - from) * eased) : target)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return val
}

/** Format points: whole numbers plain, halves with one decimal (7 → "7", 7.5 → "7.5"). */
export const fmtPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Inline animated number. */
export default function CountUp({ value }: { value: number }) {
  return <>{fmtPoints(useCountUp(value))}</>
}
