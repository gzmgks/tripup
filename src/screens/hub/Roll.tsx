import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { Ref } from 'react'
import { EASE_OUT } from './motion'
import styles from './Roll.module.css'

const roll = {
  enter: (dir: number) => ({ y: `${dir * 90}%`, opacity: 0 }),
  rest: { y: '0%', opacity: 1 },
  leave: (dir: number) => ({ y: `${dir * -90}%`, opacity: 0 }),
}

/**
 * A small count that rolls when it changes: the old value slides up and out,
 * the new one comes in from below (the other way round when it goes down).
 * Inline and baseline-neutral, so it can sit in running text ("4 of 6 voted").
 * With reduced motion the number just changes.
 */
export function Roll({ value }: { value: number }) {
  const reduce = useReducedMotion()
  // Direction of the last change, derived during render (no effect, no extra paint).
  const [seen, setSeen] = useState({ value, dir: 1 })
  if (seen.value !== value) setSeen({ value, dir: value > seen.value ? 1 : -1 })

  if (reduce) return <span className={styles.roll}>{value}</span>
  return (
    <span className={styles.roll}>
      <AnimatePresence mode="popLayout" initial={false} custom={seen.dir}>
        <Digit key={value} value={value} dir={seen.dir} />
      </AnimatePresence>
    </span>
  )
}

/** The leaving digit is only a visual echo: screen readers hear "4 of 6", never "45 of 6". */
function Digit({ value, dir, ref }: { value: number; dir: number; ref?: Ref<HTMLSpanElement> }) {
  const present = useIsPresent()
  return (
    <motion.span
      ref={ref}
      className={styles.digit}
      aria-hidden={present ? undefined : true}
      custom={dir}
      variants={roll}
      initial="enter"
      animate="rest"
      exit="leave"
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      {value}
    </motion.span>
  )
}
