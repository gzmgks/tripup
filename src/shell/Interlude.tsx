import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Announce } from '../components/Announce'
import { useApp } from '../store/app'
import styles from './Interlude.module.css'

const EASE = [0.22, 1, 0.36, 1] as const
/** One clock line (the 22:30 text is 56px on a 60px line, see Interlude.module.css). */
const LINE = 60

/**
 * The evening moves on: a short "Later that evening · 22:30" moment before the "Who paid?" prompt
 * (the store shows it ~1.7s). The hour rolls 20 → 21 → 22 like a counter, so it reads as time
 * passing; with reduced motion it is simply "22:30".
 */
export function Interlude() {
  const interlude = useApp((s) => s.interlude)
  const reduce = useReducedMotion()
  return (
    <>
      <Announce text={interlude ? 'Later that evening: 22:30' : ''} />
      <AnimatePresence>
        {interlude && (
          <Scrim key="interlude" reduce={!!reduce}>
            <motion.p
              className={styles.caption}
              initial={reduce ? false : { y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              Later that evening
            </motion.p>
            <motion.p
              className={styles.time}
              initial={reduce ? false : { y: 12, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 22 }}
            >
              <span className="visually-hidden">22:30</span>
              {reduce ? <span aria-hidden="true">22:30</span> : <RollingClock />}
            </motion.p>
          </Scrim>
        )}
      </AnimatePresence>
    </>
  )
}

/** Blocks taps while shown; lets them through again as soon as it starts leaving. */
function Scrim({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  const present = useIsPresent()
  return (
    <motion.div
      className={styles.scrim}
      aria-hidden="true"
      style={{ pointerEvents: present ? 'auto' : 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
    >
      {children}
    </motion.div>
  )
}

/** "2[0→1→2]:30": two quick ticks of the hour digit, each settling, with a beat between them. */
function RollingClock() {
  return (
    <span className={styles.clock} aria-hidden="true">
      <span className={styles.part}>2</span>
      <span className={styles.window}>
        {/* Sizes the window to the final digit, so "22:30" at rest is spaced like plain text. */}
        <span className={styles.sizer}>2</span>
        <motion.span
          className={styles.column}
          initial={{ y: 0 }}
          animate={{ y: [0, -LINE, -LINE, -2 * LINE, -2 * LINE] }}
          transition={{
            delay: 0.62,
            duration: 0.78,
            times: [0, 0.3, 0.58, 0.88, 1],
            ease: [EASE, 'linear', EASE, 'linear'],
          }}
        >
          <span>0</span>
          <span>1</span>
          <span>2</span>
        </motion.span>
      </span>
      <span className={styles.part}>:30</span>
    </span>
  )
}
