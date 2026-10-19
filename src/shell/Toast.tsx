import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../components/Icon'
import { useApp } from '../store/app'
import styles from './Toast.module.css'

/** Light feedback, e.g. "Not part of this demo". A toast that starts with ✓ confirms something: it gets the Lime check. */
export function Toast() {
  const toast = useApp((s) => s.toast)
  // Keep clear of the primary buttons at the bottom of sheets and of Log the bill.
  const raised = useApp((s) => s.sheet !== null || s.screen === 'bill')
  const text = toast?.text.replace(/^✓\s*/, '')
  const confirms = text !== toast?.text
  return (
    <div className={`${styles.region} ${raised ? styles.raised : ''}`} role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={styles.toast}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            {confirms && (
              <span className={styles.check}>
                <Icon name="check" size={14} />
              </span>
            )}
            <span className={styles.text}>{text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
