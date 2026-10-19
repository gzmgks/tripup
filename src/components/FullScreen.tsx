import { motion } from 'framer-motion'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { StatusBar } from '../shell/StatusBar'
import { Icon } from './Icon'
import { useDialog } from './useDialog'
import styles from './FullScreen.module.css'

interface FullScreenProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Sticky bottom area, e.g. a chat input or the primary button. */
  footer?: ReactNode
  /** Optional element left of the title (defaults to an invisible spacer, as in Hi-fi 2). */
  leading?: ReactNode
  /** Body without the default padding and gap (e.g. an edge-to-edge map). */
  bleed?: boolean
  className?: string
}

/**
 * Full-screen view over the trip hub (Full trip map, Explore). Same header as Sheet and
 * Hi-fi 2 (H2 title centred, circled × on the right) on a white page with its own status bar;
 * it rises like a sheet, so it reads as "on top of the plan", not a new place in the app.
 */
export function FullScreen({ title, onClose, children, footer, leading, bleed, className }: FullScreenProps) {
  const panel = useRef<HTMLDivElement>(null)
  // Focus moves in and back out, Tab stays inside, Escape closes (see useDialog).
  const onKeyDown = useDialog(panel, onClose)

  return (
    <motion.div
      ref={panel}
      className={`${styles.view} ${className ?? ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 420, damping: 44 }}
    >
      <StatusBar tone="onLight" />
      <div className={styles.header}>
        {leading ?? <span className={styles.spacer} aria-hidden="true" />}
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <Icon name="cancel" size={28} />
        </button>
      </div>
      <div className={`${styles.body} ${bleed ? styles.bleed : ''}`}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </motion.div>
  )
}
