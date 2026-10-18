import { useEffect, useState } from 'react'

/**
 * The value once it has stopped changing for `ms` (starts as the first value).
 * For live regions next to fast-moving numbers: votes land ~1.3s apart, and a screen
 * reader should hear "4 of 6 voted" when things pause, not every step.
 */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}
