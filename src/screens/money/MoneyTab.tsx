import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { SectionTitle } from '../../components/SectionTitle'
import { useAnimatedNumber } from '../../components/useAnimatedNumber'
import { expenseTotal, formatEUR, shareFor } from '../../domain/money'
import type { Expense, MemberId } from '../../domain/types'
import { useApp } from '../../store/app'
import type { Payment } from '../../store/scenario'
import { moneyView, rowsForDisplay } from '../../store/selectors'
import type { MoneyView, SettleRow } from '../../store/selectors'
import { Roll } from '../bill/Roll'
import { HUB_PANEL_ID, HUB_TAB_ID } from '../hub/ids'
import { inclGuests, possessiveOf, prose, squareParts, tripPlace, who } from './copy'
import { EveryoneBalance } from './EveryoneBalance'
import styles from './MoneyTab.module.css'

const RECENT_COUNT = 3

// Settle-side motion: quiet and clear (count-downs, ticks), never flashy.
const EASE = [0.22, 1, 0.36, 1] as const
const INSTANT = { duration: 0 }
/** The balance counts over this long: 08 count-down from the pre-dinner balance, then later changes (09 → all square). */
const INTRO_COUNT_S = 1.2
const COUNT_S = 1
/** Wait before counting, so the eye lands first (and the Pay sheet is out of the way). */
const COUNT_DELAY_MS = 300
/** Transfer rows enter one after another on the 08 moment. */
const ROW_STAGGER_S = 0.05

/** Saved bills whose "balance updated" moment already played: it plays once per saved bill. */
const introPlayed = new WeakSet<Expense>()

/** 08 · Money tab (and 09B as payments land). Calm voice, flat surfaces; every number comes from moneyView. */
export function MoneyTab() {
  const state = useApp()
  const { data, dinnerExpense, payments, sheet, startPay, remind, showToast, showSquaredUp } = state
  const reduce = useReducedMotion()
  const [allRecent, setAllRecent] = useState(false)
  const me = data.trip.me
  const view = moneyView(state)
  const crewRows = rowsForDisplay(view.rows, me)
  const guestRows = view.rows.filter((r) => r.guest)
  const n = view.transfers.length

  // 08: the first time the Money tab shows a freshly saved bill, the balance counts down from the
  // pre-dinner balance and the transfers come in. Once per bill; never under a sheet or with reduced motion.
  const [intro] = useState(
    () =>
      !reduce &&
      !!dinnerExpense &&
      !sheet &&
      !payments.some((p) => p.from === me && !p.guest) &&
      (view.before[me] ?? 0) !== (view.now[me] ?? 0) &&
      !introPlayed.has(dinnerExpense),
  )
  useEffect(() => {
    if (dinnerExpense) introPlayed.add(dinnerExpense)
  }, [dinnerExpense])

  const pay = (row: SettleRow) =>
    dinnerExpense ? startPay(row.transfer) : showToast('In this demo you settle up after tonight’s dinner')

  // "instead of 10": what the crew would pay each other without simplifying (moneyView.transfersBefore).
  const settleTitle = `Simplified · ${n} ${n === 1 ? 'payment' : 'payments'}${
    view.transfersBefore > n ? ` instead of ${view.transfersBefore}` : ''
  }`

  return (
    <main className={styles.sheet} id={HUB_PANEL_ID} aria-labelledby={HUB_TAB_ID.money}>
      <BalanceCard view={view} me={me} dinner={dinnerExpense} payments={payments} intro={intro} held={sheet !== null} />

      {n > 0 && (
        <section className={styles.section} aria-labelledby="settle-title">
          <SectionTitle id="settle-title">{settleTitle}</SectionTitle>
          <div className={styles.rows}>
            {crewRows.map((row, i) => (
              <SettleRowView key={rowKey(row)} row={row} me={me} onPay={() => pay(row)} onNudge={remind} enterAt={intro ? i : null} />
            ))}
          </div>
        </section>
      )}

      {guestRows.length > 0 && (
        <section className={styles.section} aria-labelledby="guest-title">
          <SectionTitle id="guest-title">Tonight's guest</SectionTitle>
          <div className={styles.rows}>
            {guestRows.map((row, i) => (
              <SettleRowView
                key={rowKey(row)}
                row={row}
                me={me}
                onPay={() => pay(row)}
                onNudge={remind}
                enterAt={intro ? crewRows.length + i : null}
              />
            ))}
          </div>
        </section>
      )}

      {view.paidCount > 0 && (
        <div className={styles.progressBlock}>
          <div className={styles.progress}>
            {/* Friends' payments land 1–2s apart: each one is read out ("3 of 4 payments"). */}
            <p className={styles.progressLabel} aria-live="polite" aria-atomic="true">
              <Roll text={String(view.paidCount)} align="left" /> of {view.totalCount} payments{inclGuests(view)}
            </p>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Payments"
              aria-valuemin={0}
              aria-valuemax={view.totalCount}
              aria-valuenow={view.paidCount}
            >
              <motion.span
                className={styles.fill}
                initial={false}
                animate={{ width: `${(view.paidCount / Math.max(1, view.totalCount)) * 100}%` }}
                // Springs to each new payment, well damped (no wobble on the settle side).
                transition={reduce ? INSTANT : { type: 'spring', stiffness: 180, damping: 26 }}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {view.allSettled && (
              <motion.div
                key="squared"
                className={styles.squaredSlot}
                // Opens its own room (and the 12px gap above it), so the blocks below glide down.
                initial={{ height: 0, marginTop: -12, opacity: 0, overflow: 'hidden' }}
                animate={{ height: 'auto', marginTop: 0, opacity: 1, transitionEnd: { overflow: 'visible' } }}
                exit={{ height: 0, marginTop: -12, opacity: 0, overflow: 'hidden' }}
                transition={reduce ? INSTANT : { duration: 0.36, ease: EASE }}
                // When the last payment lands, bring the button into view (it can open below the fold on phones).
                onAnimationComplete={(def) => {
                  const entered = typeof def === 'object' && def !== null && (def as { opacity?: number }).opacity === 1
                  if (entered) document.getElementById('squared-up-cta')?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
                }}
              >
                <Button id="squared-up-cta" onClick={showSquaredUp}>
                  <span className={styles.checkOnWhite}>
                    <Icon name="check" size={20} />
                  </span>
                  {tripPlace(data.trip.name)} is squared up
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <EveryoneBalance view={view} payments={payments} me={me} logged={!!dinnerExpense} />

      <button
        type="button"
        className={styles.addExpense}
        onClick={() => showToast('Not part of this demo: tonight’s bill is logged from the dinner stop')}
      >
        + Add expense
      </button>

      <section className={styles.section} aria-labelledby="recent-title">
        <SectionTitle
          id="recent-title"
          aside={
            <button type="button" className={styles.seeAll} aria-expanded={allRecent} onClick={() => setAllRecent((a) => !a)}>
              {allRecent ? 'Show less' : `See all (${view.expenses.length})`}
            </button>
          }
        >
          Recent
        </SectionTitle>
        <ul className={styles.recent}>
          {recentExpenses(view.expenses, allRecent ? view.expenses.length : RECENT_COUNT).map((e) => (
            <RecentRow key={e.id} expense={e} me={me} today={data.trip.today} />
          ))}
        </ul>
      </section>
    </main>
  )
}

const rowKey = (row: SettleRow) => `${row.transfer.from}-${row.transfer.to}`

// ── Your trip balance ───────────────────────────────────────────────────

function BalanceCard({
  view,
  me,
  dinner,
  payments,
  intro,
  held,
}: {
  view: MoneyView
  me: MemberId
  dinner: Expense | null
  payments: Payment[]
  /** Count down from the pre-dinner balance (08). */
  intro: boolean
  /** A sheet is on top: keep the shown balance until it is gone (09 → count to all square). */
  held: boolean
}) {
  const reduce = useReducedMotion()
  const open = view.myOpen
  const before = view.before[me] ?? 0
  const myPaid = payments.find((p) => p.from === me && !p.guest && p.status === 'paid')

  // The value the card counts to: the balance, a beat after it changes, and never under a sheet.
  // The first count of the 08 moment is the longer one.
  const [count, setCount] = useState({ target: intro ? before : open, duration: COUNT_S, n: 0 })
  const target = count.target
  useEffect(() => {
    if (held || target === open) return
    const t = window.setTimeout(
      () => setCount((c) => ({ target: open, duration: intro && c.n === 0 ? INTRO_COUNT_S : COUNT_S, n: c.n + 1 })),
      reduce ? 0 : COUNT_DELAY_MS,
    )
    return () => window.clearTimeout(t)
  }, [held, target, open, reduce, intro])
  // A quicker tail, so the last cents don't tick for half a second.
  const shown = useAnimatedNumber(target, { duration: count.duration, ease: [0.33, 1, 0.68, 1] })
  const settled = shown === open

  // "was €156.00" and the explanation fade in as the count-down lands (then stay): from the
  // last ~1.5% of the count, so they arrive with the number rather than after its long ease-out tail.
  const [revealed, setRevealed] = useState(!intro)
  const landing = target === open && Math.abs(shown - open) <= Math.max(25, Math.abs(open - before) * 0.015)
  if (!revealed && landing) setRevealed(true)

  // At €0 with the group, a guest's open share is said too: "You’re square with the group" over "Ren owes you €25".
  const square = squareParts(view, me)
  const words = (cents: number) =>
    cents < 0 ? `You owe ${formatEUR(-cents)}` : cents > 0 ? `You’re owed ${formatEUR(cents)}` : square[0]
  // The label only changes (cross-fade) once the count reaches it: "You owe €0.01" → "You’re square with the group",
  // and again when the guest pays → "You’re all square".
  const kind = shown < 0 ? 'owe' : shown > 0 ? 'owed' : square.length > 1 ? 'square-guest' : 'square'

  let explain: string
  if (!dinner) {
    explain = `Across ${view.expenses.length} expenses so far.`
  } else {
    const payer = dinner.paidBy
    const guest = view.guestDebts.find((g) => g.expenseId === dinner.id)
    const guestPaid = guest && view.rows.some((r) => r.guest && r.transfer.from === guest.from && r.status === 'paid')
    const guestLine = guest
      ? ` ${memberName(guest.from)} ${guestPaid ? 'paid' : 'pays'} ${possessiveOf(guest.from)} ${prose(guest.amountCents)} share to ${
          payer === me ? 'you' : memberName(payer)
        } directly.`
      : ''
    explain =
      payer === me
        ? `Tonight's dinner ${before < 0 ? 'brought it down' : 'added to it'}: the group owes you ${prose(view.dinnerCredit ?? 0)} for it.${guestLine}`
        : `Tonight's dinner added your ${prose(shareFor(me, dinner))} share: ${memberName(payer)} paid the bill.${guestLine}`
  }

  const showPaid = !!myPaid && settled
  const showWas = !showPaid && !!dinner && before !== (view.now[me] ?? 0)
  const fade = reduce ? INSTANT : { duration: 0.32, ease: EASE }

  return (
    <section className={styles.balance} aria-labelledby="balance-title">
      <h2 id="balance-title" className={styles.balanceLabel}>
        Your trip balance
      </h2>
      {/* Screen readers get the balance itself, not every frame of the count. */}
      <p className="visually-hidden" aria-live="polite">
        {open === 0 ? square.join(' · ') : words(open)}
      </p>
      <div className={styles.balanceMain}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={kind}
            aria-hidden="true"
            className={styles.headlineBlock}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={reduce ? INSTANT : { duration: 0.24, ease: EASE }}
          >
            <p className={kind === 'owe' ? styles.headline : styles.headlineSettled}>{words(shown)}</p>
            {kind === 'square-guest' && <p className={styles.guestOwes}>{square[1]}</p>}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false}>
          {showPaid ? (
            <motion.p
              key="paid"
              className={styles.paidLine}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <span className={styles.checkOnWhite}>
                <Icon name="check" size={16} />
              </span>
              Paid · {memberName(myPaid.to)} received {formatEUR(myPaid.amountCents)}
            </motion.p>
          ) : (
            showWas && (
              <motion.p
                key="was"
                className={styles.was}
                initial={false}
                animate={{ opacity: revealed ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={fade}
              >
                was {formatEUR(Math.abs(before))}
              </motion.p>
            )
          )}
        </AnimatePresence>
      </div>
      <motion.p
        className={styles.explain}
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={reduce ? INSTANT : { duration: 0.36, delay: 0.1, ease: EASE }}
      >
        {explain}
      </motion.p>
    </section>
  )
}

// ── Settle rows (08 · 09B) ──────────────────────────────────────────────

function SettleRowView({
  row,
  me,
  onPay,
  onNudge,
  enterAt,
}: {
  row: SettleRow
  me: MemberId
  onPay: () => void
  onNudge: (name: string) => void
  /** Position in the 08 entrance stagger, or null to render in place. */
  enterAt: number | null
}) {
  const reduce = useReducedMotion()
  const { from, to, amountCents } = row.transfer
  const mine = from === me || to === me
  const label = `${who(from, me)} → ${who(to, me)}`

  let caption: string | null = null
  if (row.status === 'pending') caption = to === me ? 'Waiting for you to confirm' : `Waiting for ${memberName(to)} to confirm`
  else if (row.status === 'open' && row.guest) caption = 'Auto-reminder tomorrow if unpaid'
  // Nobody chases anyone (Figma 87:234): the app sends the reminder, so there's no nudge tonight.
  const canNudge = false

  let trailing: ReactNode = null
  if (row.status === 'paid') {
    trailing = (
      <span className={styles.paid}>
        <span className={styles.checkOnWhite}>
          <Icon name="check" size={20} />
        </span>
        {row.guest ? 'Paid via link' : 'Paid'}
      </span>
    )
  } else if (row.status === 'open' && from === me) {
    trailing = (
      <button type="button" className={styles.pay} onClick={onPay} aria-label={`Pay ${memberName(to)} ${formatEUR(amountCents)}`}>
        Pay
      </button>
    )
  } else if (row.status === 'open' && row.guest) {
    trailing = <span className={styles.status}>Requested</span>
  }

  return (
    <motion.div
      className={styles.row}
      data-settle-row={`${from}-${to}`}
      initial={enterAt === null ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.1 + (enterAt ?? 0) * ROW_STAGGER_S, ease: EASE }}
    >
      <div className={styles.rowMain}>
        <span className={mine ? styles.whoMine : styles.who}>{label}</span>
        <span className={styles.rowRight}>
          {/* 09B: when the payment lands the amount dims and glides left for the tick. */}
          <motion.span
            className={`${mine ? styles.amountMine : styles.amount} ${row.status === 'paid' ? styles.amountPaid : ''}`}
            layout="position"
            layoutDependency={row.status}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {formatEUR(amountCents)}
          </motion.span>
          <AnimatePresence mode="popLayout" initial={false} anchorX="right">
            {trailing && (
              <motion.span
                key={row.status}
                className={styles.trailing}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: reduce ? 0 : 0.12 } }}
                transition={reduce ? INSTANT : { type: 'spring', stiffness: 520, damping: 30, delay: 0.08 }}
              >
                {trailing}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {(caption || canNudge) && (
          <motion.div
            key="meta"
            className={styles.rowMeta}
            // A caption that goes away (Ren's reminder once he paid) folds up with the 6px gap above it.
            initial={{ height: 0, marginTop: -6, opacity: 0 }}
            animate={{ height: 'auto', marginTop: 0, opacity: 1 }}
            exit={{ height: 0, marginTop: -6, opacity: 0 }}
            transition={reduce ? INSTANT : { duration: 0.3, ease: EASE }}
          >
            {caption && <span className={styles.caption}>{caption}</span>}
            {canNudge && (
              <button type="button" className={styles.nudge} onClick={() => onNudge(memberName(from))}>
                Nudge
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Recent ──────────────────────────────────────────────────────────────

function recentExpenses(expenses: Expense[], count: number): Expense[] {
  return [...expenses].sort((a, b) => b.day - a.day || b.time.localeCompare(a.time)).slice(0, count)
}

function RecentRow({ expense, me, today }: { expense: Expense; me: MemberId; today: number }) {
  const paidBy = expense.paidBy === me ? 'you' : memberName(expense.paidBy)
  const when = expense.day === today ? 'Today' : `Day ${expense.day}`
  return (
    <li className={styles.recentRow}>
      <span className={styles.recentText}>
        <span className={styles.recentTitle}>{expense.title}</span>
        <span className={styles.caption}>
          Paid by {paidBy} · {when}
        </span>
      </span>
      <span className={styles.recentAmount}>{formatEUR(expenseTotal(expense))}</span>
    </li>
  )
}
