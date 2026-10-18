import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

type Ease = [number, number, number, number]

/**
 * Animates an integer (e.g. cents) from its previous value to the new one, for
 * calm count-ups and count-downs (balances, shares). Rounds to whole units on
 * every frame, so formatEUR always gets valid cents. With reduced motion it
 * jumps straight to the new value.
 */
export function useAnimatedNumber(
  value: number,
  { duration = 0.9, from, ease = [0.22, 1, 0.36, 1] }: { duration?: number; from?: number; ease?: Ease } = {},
) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(from ?? value)
  const current = useRef(from ?? value)
  // A stable key, so a new array literal at the call site doesn't restart the animation.
  const easeKey = ease.join(',')

  useEffect(() => {
    if (reduce || current.current === value) {
      current.current = value
      setShown(value)
      return
    }
    const controls = animate(current.current, value, {
      duration,
      ease: easeKey.split(',').map(Number) as Ease,
      onUpdate: (v) => {
        current.current = Math.round(v)
        setShown(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, duration, reduce, easeKey])

  return shown
}
