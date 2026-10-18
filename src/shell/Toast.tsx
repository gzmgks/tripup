import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store/app'
import styles from './Toast.module.css'

/** Light feedback, e.g. "Not part of this demo". */
export function Toast() {
  const toast = useApp((s) => s.toast)
  // Keep clear of the primary buttons at the bottom of sheets and of Log the bill.
  const raised = useApp((s) => s.sheet !== null || s.screen === 'bill')
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
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
