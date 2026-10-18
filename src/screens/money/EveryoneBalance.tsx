import { AnimatePresence, motion } from 'framer-motion'
import { useId, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import type { Cents, MemberId } from '../../domain/types'
import type { Payment } from '../../store/scenario'
import type { MoneyView } from '../../store/selectors'
import { balanceWords } from './copy'
import styles from './MoneyTab.module.css'

/** A member's group balance net of the payments already made (guest payments sit outside the group). */
function openBalance(view: MoneyView, payments: Payment[], m: MemberId): Cents {
  let v = view.now[m] ?? 0
  for (const p of payments) {
    if (p.guest || p.status !== 'paid') continue
    if (p.from === m) v += p.amountCents
    if (p.to === m) v -= p.amountCents
  }
  return v
}

/**
 * "Everyone’s balance" (new, not in Figma): a collapsed row that lists each
 * crew member's balance before tonight's dinner and now. Everyone in the same
 * calm wording, nobody highlighted.
 */
export function EveryoneBalance({ view, payments, me, logged }: { view: MoneyView; payments: Payment[]; me: MemberId; logged: boolean }) {
  // Open once tonight's bill is in, so each person's updated balance is visible; collapsible after.
  const [open, setOpen] = useState(logged)
  const listId = useId()

  return (
    <section className={styles.everyone}>
      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.disclosureTitle}>Everyone’s balance</span>
        <span className={styles.disclosureMeta}>
          {view.crew.length} people
          <Icon name="dropdown" size={12} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={listId}
            className={styles.everyoneBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <table className={styles.table}>
              <thead className={logged ? undefined : 'visually-hidden'}>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Person</span>
                  </th>
                  {logged && <th scope="col">Before dinner</th>}
                  <th scope="col">Now</th>
                </tr>
              </thead>
              <tbody>
                {view.crew.map((m) => (
                  <tr key={m}>
                    <th scope="row">
                      <span className={styles.person}>
                        <Avatar member={m} size={24} labelled={false} />
                        <span className={styles.personName}>{m === me ? `${memberName(m)} (you)` : memberName(m)}</span>
                      </span>
                    </th>
                    {logged && <td className={styles.before}>{balanceWords(view.before[m] ?? 0)}</td>}
                    <td className={styles.now}>{balanceWords(openBalance(view, payments, m))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
