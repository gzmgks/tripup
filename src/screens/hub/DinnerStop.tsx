import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { Announce } from '../../components/Announce'
import { DINNER_END_TIME, DINNER_PLAN_ID } from '../../data/seed'
import { tally } from '../../domain/poll'
import type { DrinksAnswer, MemberId, Plan } from '../../domain/types'
import { useApp } from '../../store/app'
import { expenseLine } from '../../data/pastDays'
import { exploreAt } from '../explore/startView'
import { canSwitchSpot } from '../../store/scenario'
import { useShallow } from 'zustand/react/shallow'
import { TRAVEL_SPRING, grow, placeNameId, rise } from './motion'
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
      <GuestInvited />
      <div className={styles.buttons}>
        <button type="button" className={`${styles.small} ${styles.smallAct}`} onClick={() => openSheet('decide')}>
          Decide
        </button>
        <button type="button" className={`${styles.small} ${styles.smallChip}`} onClick={() => {
            exploreAt('food')
            openSheet('explore')
          }}>
          Pick a place
        </button>
      </div>
    </div>
  )
}

/** Ren is invited for this dinner but hasn't opened the link yet (03 → G0): a quiet line, nothing to do here. */
export function GuestInvited() {
  const invited = useApp((s) => s.guestInvited && !s.guestAdded && s.guestPlanIds.includes(DINNER_PLAN_ID))
  if (!invited) return null
  return (
    <p className={styles.invited}>
      <Avatar member="ren" size={20} labelled={false} className={styles.invitedAvatar} />
      <span>
        <span className={styles.invitedName}>Ren</span> · Invited · waiting to join
      </span>
    </p>
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
  const canSwitch = useApp(canSwitchSpot)
  const reduce = useReducedMotion()
  // "Skip ahead" leaves with the chips: keyboard focus moves on to the "Log the bill" that replaces it.
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
            {expenseLine(data, dinnerExpense, 'Dinner')}
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

  // "Who's having drinks?" Anyone who hasn't answered is counted in until they opt out, as on the bill.
  const who = (answer: DrinksAnswer): MemberId[] => attendees.filter((m) => (drinks[m] ?? null) === answer)
  const wineIn = who('in')
  const skipping = who('skip')
  const noAnswer = who(null)
  const mine = drinks[me] ?? null
  // Answers land ~1s apart: screen readers hear the tally once they pause, not each name.
  const counted = noAnswer.length > 0 ? ` (${noAnswer.map(memberName).join(', ')}: no answer, counted in)` : ''
  const drinksSaid = `Drinks · In: ${wineIn.length + noAnswer.length}${counted}${skipping.length > 0 ? `, Skip: ${skipping.length}` : ''}`
  // Answers stay editable until the bill is opened (its wine chips take over from there).
  const editable = !bill

  // "Dinner at " + the place's name, which is the element that travelled from the poll.
  const prefix = place && plan.title.endsWith(place.name) ? plan.title.slice(0, -place.name.length) : null
  const nameIn = entrance === 'poll' ? false : rise(play, reduce, 0, 4).initial

  const drinksCard = (
    <motion.div className={styles.drinks} role="group" aria-labelledby="drinks-title" {...rise(play, reduce, 0.17)}>
      <p id="drinks-title" className={styles.drinksTitle}>
        Who's having drinks?
      </p>
      <p className={styles.drinksNote}>It's split among the people who are in. No answer counts as in.</p>
      {editable && (
        <div className={styles.buttons} role="radiogroup" aria-label="Your answer" onKeyDown={arrowKeys()}>
          <AnswerButton label="I'm in" selected={mine === 'in'} waiting={mine === null} grow={play} onClick={() => answerDrinks('in')} />
          <AnswerButton label="Skip" selected={mine === 'skip'} waiting={mine === null} grow={play} onClick={() => answerDrinks('skip')} />
        </div>
      )}
      <Announce text={drinksSaid} settle={1500} />
      <dl className={styles.answers}>
        <div className={styles.answerRow}>
          <dt className={styles.answerLabel}>In</dt>
          <dd className={styles.answerNames}>
            <p>
              <Names members={wineIn} empty={noAnswer.length === 0 ? '–' : undefined} />
            </p>
            {/* No answer yet: counted in, each on a line of their own until they answer. */}
            <AnimatePresence initial={false}>
              {noAnswer.map((m) => (
                <motion.div key={m} {...grow(0, reduce)}>
                  <p className={styles.noAnswer}>
                    <Avatar member={m} size={20} labelled={false} className={styles.noAnswerAvatar} />
                    {/* On a narrow phone it breaks between phrases, never inside one. */}
                    <span>
                      <span className={styles.noAnswerName}>{memberName(m)}</span>{'\u00a0'}· <span className={styles.phrase}>no answer,</span>{' '}
                      <span className={styles.phrase}>counted in</span>
                    </span>
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </dd>
        </div>
        {/* "Skip" only once someone skips. */}
        <AnimatePresence initial={false}>
          {skipping.length > 0 && (
            <motion.div key="skip" className={styles.answerRow} {...grow(6, reduce)}>
              <dt className={styles.answerLabel}>Skip</dt>
              <dd className={styles.answerNames}>
                <p>
                  <Names members={skipping} />
                </p>
              </dd>
            </motion.div>
          )}
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

      {/* 06 → 06B: the chips and "Skip ahead" fold away, Log the bill rises in. */}
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
            {canSwitch && (
              <button type="button" className={`${styles.chip} ${styles.chipAct}`} onClick={switchSpot}>
                Switch spot
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 06B keeps the drinks answers (the bill pre-fills from them) above Log the bill. */}
      {editable && drinksCard}

      <AnimatePresence initial={play}>
        {!dinnerEnded ? (
          <motion.p key="skip" className={styles.later} {...rise(play, reduce, 0.22)} exit={grow(12, reduce).exit}>
            {/* A quiet way on to 22:30; the evening also moves on by itself once the answers are in. */}
            Dinner ends at {plan.endTime ?? DINNER_END_TIME} ·{' '}
            <button
              type="button"
              className={styles.skip}
              aria-label={`Skip ahead to ${plan.endTime ?? DINNER_END_TIME}`}
              onClick={() => {
                focusLogBill.current = true
                runEndDinnerWithInterlude()
              }}
            >
              Skip ahead
            </button>
          </motion.p>
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
 * Names in running text ("Ari, Maya, Theo"). Each comma is its own piece, keyed by
 * the name it introduces, so it comes and goes with that name. Nothing slides: a
 * leaving name fades where it stands before the line closes up, and a new one takes
 * its place unseen before it fades in, so the line reads at every moment.
 */
function Names({ members, empty }: { members: MemberId[]; empty?: string }) {
  const pieces =
    members.length === 0 && empty
      ? [{ key: 'empty', text: empty }]
      : members.flatMap((m, i) => [...(i > 0 ? [{ key: `sep-${m}`, text: ', ' }] : []), { key: m, text: memberName(m) }])
  return (
    <AnimatePresence initial={false}>
      {pieces.map((p) => (
        <NamePiece key={p.key} text={p.text} />
      ))}
    </AnimatePresence>
  )
}

/** A leaving piece is only a visual echo: screen readers hear the list as it is now. */
function NamePiece({ text }: { text: string }) {
  const reduce = useReducedMotion()
  const present = useIsPresent()
  return (
    <motion.span
      aria-hidden={present ? undefined : true}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.14 } }}
      // After the "no answer" line it came from has folded (grow's exit, 0.24s), so a name is never in both.
      transition={{ duration: 0.22, delay: reduce ? 0 : 0.26 }}
    >
      {text}
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
