import { AnimatePresence, motion } from 'framer-motion'
import { Announce } from '../../components/Announce'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { formatEUR, shareFor, splitEqually } from '../../domain/money'
import type { Expense, MemberId } from '../../domain/types'
import { useApp } from '../../store/app'
import { moneyView } from '../../store/selectors'
import { GuestChrome } from './GuestChrome'
import styles from './Guest.module.css'

const GUEST: MemberId = 'ren'

/** G2 · Ren's phone, mobile web: pays his share of the dinner straight to whoever paid. */
export function GuestPay() {
  const state = useApp()
  const { dinnerExpense, data, guestPay } = state
  const row = moneyView(state).rows.find((r) => r.guest && r.transfer.from === GUEST)

  if (!dinnerExpense || !row) {
    return (
      <GuestChrome url="tripup.app/pay/lisbon-dinner">
        <p className={styles.empty}>Nothing to pay here yet.</p>
      </GuestChrome>
    )
  }

  const payer = memberName(row.transfer.to)
  const paid = row.status === 'paid'
  const people = new Set(dinnerExpense.items.flatMap((i) => i.participants)).size
  const date = data.days.find((d) => d.day === dinnerExpense.day)?.date

  return (
    <GuestChrome url="tripup.app/pay/lisbon-dinner">
      <Announce text={paid ? "You're all set. Thanks for joining!" : ''} />
      <div className={styles.titles}>
        <h1 className={styles.title}>{dinnerExpense.title}</h1>
        <p className={styles.caption}>
          {date ? `${date} · ` : ''}
          {dinnerExpense.time} · {people} people
        </p>
      </div>

      <div className={styles.share}>
        <div className={styles.shareRow}>
          <span className={styles.shareLabel}>
            Your share
            {paid && <span className={styles.paidChip}>Paid</span>}
          </span>
          <span className={`${styles.shareAmount} ${paid ? styles.shareAmountPaid : ''}`}>
            {formatEUR(row.transfer.amountCents)}
          </span>
        </div>
        <p className={styles.caption}>{breakdown(dinnerExpense, GUEST)}</p>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {paid ? (
          <motion.div
            key="paid"
            className={styles.settled}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24 }}
          >
            <span className={styles.doneIcon}>
              <Icon name="check" size={20} />
            </span>
            <div className={styles.settledText}>
              <p className={styles.settledTitle}>You're all set.</p>
              <p className={styles.settledBody}>Thanks for joining!</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pay" exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Button onClick={guestPay}>Pay {payer} by bank</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </GuestChrome>
  )
}

/**
 * "Food €25.00 · no drinks": the guest's part of each item of the saved bill.
 * The rest of the bill is "Food" when drinks were split out; a split-out item
 * the guest is not in reads "no drinks".
 */
function breakdown(expense: Expense, member: MemberId): string {
  const splitOut = expense.items.filter((i) => i.label !== 'rest')
  const parts: string[] = []
  let items = 0
  for (const item of expense.items) {
    if (!item.participants.includes(member)) continue
    const share = splitEqually(item.amountCents, item.participants, expense.paidBy)[member]
    items += share
    const label = item.label !== 'rest' ? item.label : splitOut.length ? 'Food' : 'Food & drinks'
    parts.push(`${label} ${formatEUR(share)}`)
  }
  const tip = shareFor(member, expense) - items
  if (tip > 0) parts.push(`Tip ${formatEUR(tip)}`)
  if (splitOut.length > 0 && !splitOut.some((i) => i.participants.includes(member))) parts.push('no drinks')
  return parts.join(' · ')
}
