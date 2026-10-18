import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import explore from '../../assets/icons/explore.png'
import { arrowKeys } from '../../components/arrowKeys'
import { focusLanding, focusLost } from '../../components/focus'
import mapDay5 from '../../assets/images/map-day5.webp'
import paper from '../../assets/images/paper-texture.webp'
import { Icon } from '../../components/Icon'
import { DINNER_PLAN_ID } from '../../data/seed'
import type { Plan } from '../../domain/types'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import { DINNER_STOP_ATTR, DinnerStop, OpenSlot } from './DinnerStop'
import type { Entrance } from './DinnerStop'
import { MapPin } from './MapPin'
import { EASE_OUT } from './motion'
import { POLL_CARD_ID, PollCard } from './PollCard'
import { RESIZE_MS, SmoothHeight } from './SmoothHeight'
import { HUB_PANEL_ID, HUB_TAB_ID } from './ids'
import styles from './PlanTab.module.css'

type SlotKind = 'open' | 'poll' | 'decided' | 'other'

/** Room kept under a revealed element: clear of the toast (and the home indicator). */
const CLEAR_TOAST = 104
const CLEAR_EDGE = 24

/**
 * Scroll the Plan sheet just enough that `el` is fully visible (its top wins
 * when it is taller than the view). Smooth, or instant with reduced motion.
 */
function reveal(sheet: HTMLElement, el: Element, bottomRoom: number, instant: boolean) {
  const view = sheet.getBoundingClientRect()
  const box = el.getBoundingClientRect()
  const top = box.top - view.top + sheet.scrollTop
  const bottom = top + box.height
  let target = sheet.scrollTop
  if (bottom > target + sheet.clientHeight - bottomRoom) target = bottom - sheet.clientHeight + bottomRoom
  if (top - 12 < target) target = top - 12
  target = Math.max(0, Math.min(target, sheet.scrollHeight - sheet.clientHeight))
  if (Math.abs(target - sheet.scrollTop) < 2) return
  sheet.scrollTo({ top: target, behavior: instant ? 'auto' : 'smooth' })
}

export function PlanTab() {
  const {
    data,
    poll,
    pollNotice,
    dinnerEnded,
    showToast,
    openSheet,
  } = useApp(
    useShallow((s) => ({
      data: s.data,
      poll: s.poll,
      pollNotice: s.pollNotice,
      dinnerEnded: s.dinnerEnded,
      showToast: s.showToast,
      openSheet: s.openSheet,
    })),
  )
  const reduce = useReducedMotion()
  const sheetRef = useRef<HTMLElement>(null)
  const { days, plans, places, trip } = data
  const today = plans.filter((p) => p.day === trip.today)
  const dinner = plans.find((p) => p.id === DINNER_PLAN_ID)
  const decided = dinner?.status === 'decided'

  // What the 20:30 slot shows, and what it showed before the last change (derived
  // during render, so the entering card knows where it came from in the same paint).
  const slotKind: SlotKind =
    dinner?.status === 'poll' && poll ? 'poll' : decided ? 'decided' : dinner?.status === 'open' ? 'open' : 'other'
  const [slot, setSlot] = useState<{ now: SlotKind; before: SlotKind | null }>({ now: slotKind, before: null })
  if (slot.now !== slotKind) setSlot({ now: slotKind, before: slot.now })
  const entrance: Entrance = slot.before === 'poll' ? 'poll' : slot.before ? 'other' : null

  // Auto-scroll, only on changes after mount (a deep link opens at the top): the
  // poll when it starts, a callout when it appears, the stop when the winner lands.
  // It waits for the slot to finish resizing, so the target is where it ends up.
  const pending = useRef<{ selector: string; room: number } | null>(null)
  const fallback = useRef(0)
  const flushReveal = useCallback(() => {
    const p = pending.current
    const sheet = sheetRef.current
    if (!p || !sheet) return
    pending.current = null
    window.clearTimeout(fallback.current)
    const el = sheet.querySelector<HTMLElement>(p.selector)
    if (!el) return
    reveal(sheet, el, p.room, !!reduce)
    // The focused control went with the old card (a vote when the poll closed): continue from the new one.
    if (focusLost()) focusLanding(el)
  }, [reduce])
  const queueReveal = useCallback(
    (selector: string, room: number) => {
      pending.current = { selector, room }
      window.clearTimeout(fallback.current)
      // Nothing resized (or reduced motion): reveal anyway.
      fallback.current = window.setTimeout(flushReveal, reduce ? 0 : RESIZE_MS + 520)
    },
    [flushReveal, reduce],
  )
  useEffect(() => () => window.clearTimeout(fallback.current), [])

  useEffect(() => {
    if (slot.before === null) return
    if (slot.now === 'poll') queueReveal(`#${POLL_CARD_ID}`, CLEAR_EDGE)
    else if (slot.now === 'decided') queueReveal(`[${DINNER_STOP_ATTR}]`, CLEAR_TOAST)
  }, [slot, queueReveal])

  // Opened straight onto a callout or the decided stop (a demo jump, or back from Money): show it.
  // A plain live poll (Hi-fi 1) still opens at the top, exactly like the frame.
  const revealedOnMount = useRef(false)
  const mountTarget = useRef(pollNotice ? 'notice' : slotKind === 'decided' ? 'stop' : null)
  useEffect(() => {
    if (revealedOnMount.current) return
    revealedOnMount.current = true
    if (mountTarget.current === 'notice') queueReveal('[data-poll-notice]', CLEAR_EDGE)
    else if (mountTarget.current === 'stop') queueReveal(`[${DINNER_STOP_ATTR}]`, CLEAR_TOAST)
  }, [queueReveal])

  const lastNotice = useRef(pollNotice)
  useEffect(() => {
    const before = lastNotice.current
    lastNotice.current = pollNotice
    if (pollNotice && pollNotice !== before) queueReveal('[data-poll-notice]', CLEAR_EDGE)
  }, [pollNotice, queueReveal])

  // The stop after dinner, once dinner has ended (Drinks in Bairro Alto).
  const after = dinner ? today.find((p) => p.time > dinner.time) : undefined

  const chip = !dinner
    ? null
    : !decided
      ? `Upcoming > Dinner ${dinner.time} (not decided)`
      : dinnerEnded && after
        ? `Upcoming > ${after.title} ${after.time}`
        : `Upcoming > ${dinner.title} ${dinner.time}`

  /** The quick action opens the Decide sheet only while the slot is still open. */
  const decide = () => {
    if (dinner?.status === 'poll') {
      document.getElementById(POLL_CARD_ID)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
      showToast('Tonight’s dinner poll is already live')
    } else if (decided) {
      showToast('Dinner is decided. Switch spot changes it')
    } else {
      openSheet('decide')
    }
  }

  /**
   * The 20:30 slot changes with the story: open slot (02) → live poll (05) →
   * decided stop (06). The card hands over in place: the old one fades out on
   * top, the slot eases to the new height, and the winner's name travels from
   * its poll row into the stop's title (shared layoutId, see PollCard).
   */
  const slotCard = (plan: Plan) => {
    const fade = { duration: reduce ? 0 : 0.2 }
    if (slotKind === 'poll' && poll)
      return (
        // Leaves quickly, so the winner's name is soon the only thing moving.
        <motion.div key="poll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.14 } }} transition={fade}>
          <PollCard poll={poll} places={places} />
        </motion.div>
      )
    if (slotKind === 'decided')
      return (
        // No fade on the way in: the stop builds itself under the leaving poll.
        <motion.div key="decided" exit={{ opacity: 0 }} transition={fade}>
          <DinnerStop plan={plan} entrance={entrance} />
        </motion.div>
      )
    return (
      <motion.div key={slotKind} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
        {slotKind === 'open' ? <OpenSlot plan={plan} /> : <StopCard plan={plan} />}
      </motion.div>
    )
  }

  const stopFor = (plan: Plan) => {
    if (plan.id !== DINNER_PLAN_ID) return <StopCard plan={plan} />
    return (
      <SmoothHeight className={styles.slot} innerClassName={styles.slotInner} onSettle={flushReveal}>
        {reduce ? (
          // Reduced motion: a clean swap, not even a frame of overlap.
          slotCard(plan)
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {slotCard(plan)}
          </AnimatePresence>
        )}
      </SmoothHeight>
    )
  }

  return (
    // layoutScroll: shared-layout travel inside the sheet is measured with its scroll.
    <motion.main className={styles.sheet} ref={sheetRef} layoutScroll id={HUB_PANEL_ID} aria-labelledby={HUB_TAB_ID.plan}>
      <div className={styles.days} role="tablist" aria-label="Days" onKeyDown={arrowKeys()}>
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            role="tab"
            aria-selected={d.day === trip.today}
            aria-controls="day-panel"
            tabIndex={d.day === trip.today ? 0 : -1}
            className={`${styles.day} ${d.day === trip.today ? styles.dayToday : ''}`}
            onClick={d.day === trip.today ? undefined : () => showToast('Not part of this demo: today is Day 5')}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className={styles.map}>
        <img className={styles.mapImage} src={mapDay5} alt="Map of today’s stops in Lisbon" />
        <AnimatePresence initial={false}>
          {decided && dinner && (
            // The decided dinner becomes a numbered stop over the dashed "?" baked into the map.
            <MapPin key="pin" number={today.indexOf(dinner) + 1} pop />
          )}
        </AnimatePresence>
        <button type="button" className={styles.expand} aria-label="Expand map" onClick={() => openSheet('full-map')}>
          <span className={styles.expandIcon}>
            <Icon name="expand" size={20} height={21.986} />
          </span>
        </button>
        <div className={styles.upcomingRow}>
          <AnimatePresence mode="wait" initial={false}>
            {chip && (
              <motion.span
                key={chip}
                className={styles.upcoming}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.16, ease: EASE_OUT }}
              >
                {chip}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.actions}>
        <ActionButton label="Decide" onClick={decide}>
          <Icon name="list" size={16} />
        </ActionButton>
        <ActionButton label="Add Plan" onClick={() => openSheet('add-plan')}>
          <span className={styles.pad2}>
            <Icon name="plus" size={12} />
          </span>
        </ActionButton>
        <ActionButton label="Explore" onClick={() => openSheet('explore')}>
          <img className={styles.exploreIcon} src={explore} alt="" />
        </ActionButton>
        <ActionButton label={`Ideas (${trip.ideasCount})`} onClick={() => openSheet('explore')}>
          <Icon name="star" size={16} />
        </ActionButton>
      </div>

      <section className={styles.today} id="day-panel" role="tabpanel" aria-labelledby="today-title">
        <h2 id="today-title" className={styles.todayTitle}>
          Today
        </h2>
        <div className={styles.itinerary}>
          <img className={styles.paper} src={paper} alt="" aria-hidden="true" />
          {/* Mirrored copy below the first, so a tall timeline keeps its texture without a seam. */}
          <img className={styles.paperMore} src={paper} alt="" aria-hidden="true" />
          <LayoutGroup id="plan">
            {today.map((plan) => (
              <div key={plan.id} className={styles.item} data-plan={plan.id}>
                <span className={styles.time}>{plan.time}</span>
                {stopFor(plan)}
              </div>
            ))}
          </LayoutGroup>
        </div>
      </section>
    </motion.main>
  )
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.action} onClick={onClick}>
      <span className={styles.actionIcon}>{children}</span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  )
}

/** Timeline item, variant "Default" (150:154). */
function StopCard({ plan }: { plan: Plan }) {
  const done = plan.status === 'done'
  const optional = plan.status === 'optional'
  return (
    <div className={styles.stop}>
      <div className={styles.stopContent}>
        <p className={optional ? styles.stopTitleStrong : styles.stopTitle}>{plan.title}</p>
        {plan.note && <p className={optional ? styles.stopNoteMuted : styles.stopNote}>{plan.note}</p>}
      </div>
      {done && (
        <span className={styles.check} role="img" aria-label="Done">
          <Icon name="check" size={24} />
        </span>
      )}
    </div>
  )
}
