import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import styles from './MapPin.module.css'

/**
 * A numbered stop drawn over the dashed "?" baked into map-day5.webp, for when
 * the open slot is decided. Place it inside the map's positioned box; `focusY`
 * must match the image's object-position y (0–1), 0.5 when centred.
 * `pop`: the pin springs onto the "?" when it appears (put it in an
 * <AnimatePresence initial={false}> so it doesn't pop on first render).
 */
export function MapPin({ number, focusY = 0.5, pop = false }: { number: number; focusY?: number; pop?: boolean }) {
  return (
    <span className={styles.layer} style={{ '--focus-y': focusY } as CSSProperties} aria-hidden="true">
      <span className={styles.pin}>
        <motion.span
          className={styles.face}
          initial={pop ? { scale: 0.3, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16, opacity: { duration: 0.12 } }}
        >
          {number}
        </motion.span>
      </span>
    </span>
  )
}
