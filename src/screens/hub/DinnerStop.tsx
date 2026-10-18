import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import type { Ref } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { Announce } from '../../components/Announce'
import { DINNER_END_TIME } from '../../data/seed'
import { expenseTotal, formatEUR } from '../../domain/money'
import { tally } from '../../domain/poll'
import type { DrinksAnswer, MemberId, Plan } from '../../domain/types'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import { EASE_OUT, TRAVEL_SPRING, grow, placeNameId, rise } from './motion'
import styles from './DinnerStop.module.css'

/** Marks the decided stop (the Plan tab scrolls it into view when the winner lands). */
export const DINNER_STOP_ATTR = 'data-dinner-stop'

/**
 * How the stop arrived: 'poll' = the winner just landed from the live poll (its
 * name travels into the title, the rest builds in), 'other' = decided another
 * way while watching, null = it was already there (deep link, tab switch).
 */
export type Entrance = 'poll' | 'other' | null

/** 02 · The 20:30 slot Maya added when planning: the time is set, the place is open. */
export function OpenSlot({ plan }: { plan: Plan }) {
  const openSheet = useApp((s) => s.openSheet)
  // Ren joins for this dinner: until he's added, adding him is the next step (violet = waiting on you).
  const renPending = useApp((s) => !s.guestAdded)
  return (
    <div className={styles.open}>
      <div className={styles.openHead}>
        <span className={styles.openPin} aria-hidden="true">
          ?
        </span>
        <p className={styles.openTitle}>
          <span className="visually-hidden">Open slot: </span>
          {plan.title}
        </p>
      </div>
      {plan.note && <p className={styles.note}>{plan.note}</p>}
      {renPending && <p className={styles.nudge}>Ren joins you for this dinner: add him first, so he can vote too.</p>}
      <div className={styles.buttons}>
        {renPending && (
          <button type="button" className={`${styles.small} ${styles.smallAct}`} onClick={() => openSheet('add-people')}>
            + Add Ren
          </button>
        )}
        <button
          type="button"
          className={`${styles.small} ${renPending ? styles.smallChip : styles.smallAct}`}
          onClick={() => openSheet('decide')}
        >
          Decide
        </button>
        <button type="button" className={`${styles.small} ${styles.smallChip}`} onClick={() => openSheet('explore')}>
          Pick a place
        </button>
      </div>
    </div>
  )
}

/** 06 · The winner in the 20:30 slot; 06B · after 22:30, Log the bill; then the logged stop. */
export function DinnerStop({ plan, entrance = null }: { plan: Plan; entrance?: Entrance }) {
  // The 22:30 banner pulses its own "Log the bill"; don't pulse both at once.
  const bannerPulsing = useApp((s) => s.banner?.kind === 'who-paid')
  const {
    data,
    poll,
    drinks,
    guestAdded,
    dinnerEnded,
    dinnerExpense,
    bill,
    answerDrinks,
    switchSpot,
    runEndDinnerWithInterlude,
    openBill,
    showToast,
  } = useApp(
    useShallow((s) => ({
      data: s.data,
      poll: s.poll,
      drinks: s.drinks,
      guestAdded: s.guestAdded,
      dinnerEnded: s.dinnerEnded,
      dinnerExpense: s.dinnerExpense,
      bill: s.bill,
      answerDrinks: s.answerDrinks,
      switchSpot: s.switchSpot,
      runEndDinnerWithInterlude: s.runEndDinnerWithInterlude,
      openBill: s.openBill,
      showToast: s.showToast,
    })),
  )
  const reduce = useReducedMotion()
  // "Skip to 22:30" leaves with the chips: keyboard focus moves on to the "Log the bill" that replaces it.
  const focusLogBill = useRef(false)
  const me = data.trip.me
  const place = data.places.find((p) => p.id === plan.placeId)
  const play = entrance !== null

  if (dinnerExpense) {
    // Logged: the stop reads like the other finished stops ("Lunch · €84 · paid by Theo").
    return (
      <div className={styles.done}>
        <div className={styles.doneText}>
          <p className={styles.doneTitle}>{plan.title}</p>
          <p className={styles.note}>
            Dinner · {formatEUR(expenseTotal(dinnerExpense))} · paid by {dinnerExpense.paidBy === me ? 'you' : memberName(dinnerExpense.paidBy)}
          </p>
        </div>
        <span className={styles.check} role="img" aria-label="Done">
          <Icon name="check" size={24} />
        </span>
      </div>
    )
  }

  // Who's at dinner: the crew, plus Ren once he's a guest for this plan.
  const attendees = plan.attendees.filter((m) => {
    const member = data.members.find((x) => x.id === m)
    return member?.kind === 'crew' || (guestAdded && (member?.planIds ?? []).includes(plan.id))
  })

  const pickedBy = (() => {
    if (!poll) return null
    if (poll.decidedBy === 'someone')
      return poll.pickedBy ? `Picked by ${poll.pickedBy === me ? 'you' : memberName(poll.pickedBy)}` : 'Picked for the group'
    if (poll.decidedBy === 'chance') return 'Picked by chance'
    const t = tally(poll)
    const votes = t.counts[plan.placeId ?? ''] ?? 0
    // After "Switch spot" the runner-up holds the slot: say so rather than claim the group picked it.
    if (plan.placeId && t.leaders.length > 0 && !t.leaders.includes(plan.placeId)) return `Runner-up · ${votes} of ${t.eligible}`
    return `Picked by ${votes} of ${t.eligible}`
  })()

  const groups: { label: string; answer: DrinksAnswer }[] = [
    { label: 'In', answer: 'in' },
    { label: 'Skip', answer: 'skip' },
    { label: 'No answer yet', answer: null },
  ]
  const who = (answer: DrinksAnswer): MemberId[] => attendees.filter((m) => (drinks[m] ?? null) === answer)
  const mine = drinks[me] ?? null
  // Answers land ~1s apart: screen readers hear the tally once they pause, not each name.
  const drinksSaid = `Drinks · ${groups
    .map(({ label, answer }) => [label, who(answer).length] as const)
    .filter(([label, n]) => n > 0 || label === 'In')
    .map(([label, n]) => `${label}: ${n}`)
    .join(', ')}`
  // Answers stay editable until the bill is opened (its wine chips take over from there).
  const editable = !bill

  // "Dinner at " + the place's name, which is the element that travelled from the poll.
  const prefix = place && plan.title.endsWith(place.name) ? plan.title.slice(0, -place.name.length) : null
  const nameIn = entrance === 'poll' ? false : rise(play, reduce, 0, 4).initial

  const drinksCard = (
    <motion.div className={styles.drinks} role="group" aria-labelledby="drinks-title" {...rise(play, reduce, 0.17)}>
      <p id="drinks-title" className={styles.drinksTitle}>
        Who's in for drinks?
      </p>
      <p className={styles.drinksNote}>For the wine at dinner: it's split among the people who are in.</p>
      {editable && (
        <div className={styles.buttons} role="radiogroup" aria-label="Your answer" onKeyDown={arrowKeys()}>
          <AnswerButton label="I'm in" selected={mine === 'in'} waiting={mine === null} grow={play} onClick={() => answerDrinks('in')} />
          <AnswerButton label="Skip" selected={mine === 'skip'} waiting={mine === null} grow={play} onClick={() => answerDrinks('skip')} />
        </div>
      )}
      <Announce text={drinksSaid} settle={1500} />
      <dl className={styles.answers}>
        <AnimatePresence initial={false}>
          {groups.map(({ label, answer }) => {
            const names = who(answer)
            // "In" always shows; the others only once someone is in them.
            if (answer !== 'in' && names.length === 0) return null
            return (
              <motion.div key={label} className={styles.answerRow} {...grow(6, reduce)}>
                <dt className={styles.answerLabel}>{label}</dt>
                <dd className={styles.answerNames}>
                  {names.length === 0 && '–'}
                  {/* Each answer moves its name into its row. */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {names.map((m, i) => (
                      <DrinkName key={m} member={m} lead={i > 0} />
                    ))}
                  </AnimatePresence>
                </dd>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </dl>
    </motion.div>
  )

  return (
    <div className={styles.stop} data-place={plan.placeId} {...{ [DINNER_STOP_ATTR]: '' }}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          {prefix !== null && place ? (
            <>
              <motion.span {...rise(play, reduce, entrance === 'poll' ? 0.26 : 0.1, 0)}>{prefix}</motion.span>
              <motion.span
                key={place.id}
                className={styles.titleName}
                layoutId={placeNameId(place.id)}
                initial={nameIn}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...TRAVEL_SPRING, opacity: { duration: 0.2 } }}
              >
                {place.name}
              </motion.span>
            </>
          ) : (
            plan.title
          )}
        </h3>
        {plan.note && (
          <motion.p className={styles.note} {...rise(play, reduce, entrance === 'poll' ? 0.26 : 0.08, 4)}>
            {plan.note}
          </motion.p>
        )}
      </div>

      {/* 06 → 06B: the chips and the demo shortcut fold away, Log the bill rises in. */}
      <AnimatePresence initial={play}>
        {!dinnerEnded && (
          <motion.div
            key="chips"
            className={styles.chips}
            {...rise(play, reduce, 0.12)}
            exit={grow(12, reduce).exit}
          >
            {place && <span className={`${styles.chip} ${styles.chipInfo}`}>{place.walkMin} min walk</span>}
            {pickedBy && <span className={`${styles.chip} ${styles.chipInfo}`}>{pickedBy}</span>}
            <button
              type="button"
              className={`${styles.chip} ${styles.chipAct}`}
              onClick={() => showToast(`Directions to ${place?.shortName ?? 'dinner'} aren’t part of this demo`)}
            >
              Directions
            </button>
            <button type="button" className={`${styles.chip} ${styles.chipAct}`} onClick={switchSpot}>
              Switch spot
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 06B keeps the drinks answers (the bill pre-fills from them) above Log the bill. */}
      {editable && drinksCard}

      <AnimatePresence initial={play}>
        {!dinnerEnded ? (
          <motion.div key="skip" className={styles.skipRow} {...rise(play, reduce, 0.22)} exit={grow(12, reduce).exit}>
            {/* Demo shortcut, styled like the other presenter pills (black), not product UI */}
            <button
              type="button"
              className={styles.skip}
              onClick={() => {
                focusLogBill.current = true
                runEndDinnerWithInterlude()
              }}
            >
              Skip to {plan.endTime ?? DINNER_END_TIME} →
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="log"
            className={styles.log}
            ref={(el: HTMLDivElement | null) => {
              if (!el || !focusLogBill.current) return
              focusLogBill.current = false
              el.querySelector('button')?.focus({ preventScroll: true })
            }}
            {...rise(true, reduce, 0.3, 10)}
          >
            <Button onClick={openBill}>Log the bill</Button>
            {/* One gentle violet pulse: this is waiting on you (skipped with reduced motion). */}
            {!reduce && !bannerPulsing && <span className={styles.pulse} aria-hidden="true" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * One name in a drinks row. The names already there slide to make room and the
 * new one fades in place a beat later, so nothing crosses.
 */
function DrinkName({ member, lead, ref }: { member: MemberId; lead: boolean; ref?: Ref<HTMLSpanElement> }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      ref={ref}
      className={styles.name}
      layout="position"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ opacity: { duration: 0.2, delay: 0.12 }, layout: { duration: 0.3, ease: EASE_OUT } }}
    >
      {/* The separator arrives with the name it introduces. */}
      {lead ? ',\u00a0' : ''}
      {memberName(member)}
    </motion.span>
  )
}

function AnswerButton({
  label,
  selected,
  waiting,
  grow: growIn,
  onClick,
}: {
  label: string
  selected: boolean
  waiting: boolean
  /** The pre-selected answer fills in once the stop has landed. */
  grow: boolean
  onClick: () => void
}) {
  const reduce = useReducedMotion()
  // Only the pre-selected fill waits for the stop to land; a tap answers at once.
  const [tapped, setTapped] = useState(false)
  const wait = growIn && !tapped ? 0.4 : 0
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`${styles.small} ${styles.answer} ${selected ? styles.answerOn : waiting ? styles.smallChip : styles.answerOff}`}
      onClick={() => {
        setTapped(true)
        onClick()
      }}
    >
      {/* Lime = chosen: the fill grows into the pill. */}
      <AnimatePresence initial={growIn}>
        {selected && (
          <motion.span
            key="fill"
            className={styles.answerFill}
            aria-hidden="true"
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 30, delay: wait, opacity: { duration: 0.12, delay: wait } }}
          />
        )}
      </AnimatePresence>
      {label}
      <AnimatePresence initial={growIn}>
        {selected && (
          <motion.span
            key="check"
            className={styles.answerCheck}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22, delay: wait ? wait + 0.05 : 0.05 }}
          >
            <Icon name="check" size={14} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
