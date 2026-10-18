import { motion } from 'framer-motion'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { useDialog } from './useDialog'
import styles from './Sheet.module.css'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Sticky bottom area, e.g. the primary button. */
  footer?: ReactNode
  /** Optional element left of the title (defaults to an invisible spacer, as in Hi-fi 2). */
  leading?: ReactNode
}

/**
 * Bottom sheet over the trip hub (03, 04, 09…). Header follows Hi-fi 2:
 * H2 title centred, circled × on the right.
 */
export function Sheet({ title, onClose, children, footer, leading }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  // Focus moves in and back out, Tab stays inside, Escape closes (see useDialog).
  const onKeyDown = useDialog(panel, onClose)

  return (
    <motion.div
      className={styles.scrim}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        ref={panel}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 42 }}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          {leading ?? <span className={styles.spacer} aria-hidden="true" />}
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="cancel" size={28} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </motion.div>
    </motion.div>
  )
}
