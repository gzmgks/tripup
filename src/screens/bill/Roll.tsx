import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import type { Ref } from 'react'
import styles from './Roll.module.css'

const EASE = [0.22, 1, 0.36, 1] as const

interface RollProps {
  text: string
  /**
   * 'right' / 'left': inline value; layout takes the new width at once and the old text
   * fades out pinned to that edge. 'center': full-width line, text centred.
   */
  align?: 'left' | 'right' | 'center'
}

/**
 * A value that rolls softly to its new text: the old one lifts away, the new one rises in
 * (~270ms). The first render is static, so screens settle to their exact resting layout.
 * With reduced motion the text simply changes.
 */
export function Roll({ text, align = 'right' }: RollProps) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={align === 'center' ? styles.block : styles.roll}>{text}</span>
  return (
    <span className={align === 'center' ? styles.block : styles.roll}>
      <AnimatePresence mode="popLayout" initial={false} anchorX={align === 'right' ? 'right' : 'left'}>
        <RollItem key={text} text={text} />
      </AnimatePresence>
    </span>
  )
}

function RollItem({ text, ref }: { text: string; ref?: Ref<HTMLSpanElement> }) {
  // The leaving value is only a visual echo: keep it out of the accessibility tree.
  const present = useIsPresent()
  return (
    <motion.span
      ref={ref}
      className={styles.item}
      aria-hidden={present ? undefined : true}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      // The old value clears quickly, the new one follows a beat later: a roll, not a double exposure.
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }}
      transition={{ duration: 0.22, delay: 0.05, ease: EASE }}
    >
      {text}
    </motion.span>
  )
}
