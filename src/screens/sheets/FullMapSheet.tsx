import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { FullScreen } from '../../components/FullScreen'
import { focusLanding } from '../../components/focus'
import { Icon } from '../../components/Icon'
import { placeFor } from '../../data/explore'
import { expenseLine, TODAY_LABELS } from '../../data/pastDays'
import { DINNER_PLAN_ID } from '../../data/seed'
import { tally } from '../../domain/poll'
import type { Place, Plan } from '../../domain/types'
import { useApp } from '../../store/app'
import { PlaceActions } from '../explore/PlaceActions'
import { placeNote } from '../explore/tonight'
import { DAY5_MAP, DAY5_PINS } from '../hub/dayMap'
import type { MapPoint } from '../hub/dayMap'
import mapDay5Full from '../../assets/images/map-day5-full.webp'
import { MapLayer, MapSpot, PinFace } from '../hub/MapPin'
import type { PinKind } from '../hub/MapPin'
import { EASE_OUT } from '../hub/motion'
import { POLL_CARD_ID } from '../hub/PollCard'
import { ActChip, Chip } from './parts'
import shared from './sheets.module.css'
import styles from './FullMapSheet.module.css'

/** Where the group's Ideas sit on the whole Day 5 map (image px, clear of the route). */
const IDEA_PINS: Record<string, MapPoint> = {
  ramiro: { x: 597, y: 692 },
  cevicheria: { x: 242, y: 557 },
  'senhora-monte': { x: 590, y: 250 },
  manteigaria: { x: 165, y: 760 },
  'park-rooftop': { x: 560, y: 1060 },
  'jardim-torel': { x: 262, y: 850 },
  'feira-ladra': { x: 760, y: 860 },
}
/** Free spots for Ideas saved since, in the order they were saved. */
const SPARE_SPOTS: MapPoint[] = [
  { x: 130, y: 1100 },
  { x: 720, y: 1200 },
  { x: 380, y: 1180 },
  { x: 800, y: 560 },
  { x: 120, y: 330 },
  { x: 420, y: 300 },
]

const CARD_ID = 'map-card'

/** The map shows the top of the export: the route sits in its upper half, clear of the stop card. */
const MAP_FOCUS_Y = 0

interface StageShape {
  w: number
  h: number
  /** Wider than tall: a phone in landscape. */
  wide: boolean
}

function useStageShape(stage: RefObject<HTMLDivElement | null>): StageShape {
  const [shape, setShape] = useState<StageShape>({ w: 0, h: 0, wide: false })
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setShape((s) => (s.w === width && s.h === height ? s : { w: width, h: height, wide: width > height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [stage])
  return shape
}

/**
 * Upright, the map covers the stage. Wide and short (landscape), a cover fit would crop today's
 * stops away, so the whole export scrolls instead, opened on the next stop, above the card.
 */
function MapPan({ shape, focus, children }: { shape: StageShape; focus: number; children: ReactNode }) {
  const pan = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = pan.current
    if (!el || !shape.wide) return
    const card = document.getElementById(CARD_ID)?.getBoundingClientRect().height ?? 0
    el.scrollTop = focus * (shape.w / DAY5_MAP.w) - (shape.h - card) / 2
    // When the shape or the next stop changes (the poll closes while the map is open); otherwise it's the user's to scroll.
  }, [shape.wide, shape.w, shape.h, focus])
  if (!shape.wide) return <>{children}</>
  return (
    <div className={styles.pan} ref={pan}>
      <div className={styles.panInner} style={{ height: (shape.w * DAY5_MAP.h) / DAY5_MAP.w }}>
        {children}
      </div>
    </div>
  )
}

/** A stop of today as the map shows it: its pin, and the card that opens from it. */
interface MapStop {
  plan: Plan
  /** On the pin: its number in the day, or "?" while the place is open. */
  mark: string
  kind: PinKind
  title: string
  detail?: string
  done: boolean
  action?: { label: string; run: () => void }
}

type Selection = { stop: string } | { idea: string }

/** 02 callout · Full trip map (128:25): today's stops on their route, plus the group's ★ ideas. */
export function FullMapSheet() {
  const trip = useApp(useShallow((s) => ({ data: s.data, poll: s.poll, decided: s.decided, ideas: s.ideas, clock: s.clock })))
  const { dinnerEnded, dinnerExpense, closeSheet, openSheet } = useApp(
    useShallow((s) => ({ dinnerEnded: s.dinnerEnded, dinnerExpense: s.dinnerExpense, closeSheet: s.closeSheet, openSheet: s.openSheet })),
  )
  const { data, poll } = trip
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const shape = useStageShape(stageRef)

  const { plans, places } = data
  const today = plans.filter((p) => p.day === data.trip.today)
  const dinner = today.find((p) => p.id === DINNER_PLAN_ID)
  // The next stop, as the Plan tab's map chip has it: dinner, then (once it has ended) what comes after.
  const next = dinner?.status === 'decided' && dinnerEnded ? today.find((p) => p.time > dinner.time) : dinner
  const ledger = dinnerExpense ? [...data.expenses, dinnerExpense] : data.expenses

  // Back on the Plan tab, with the live poll in view.
  const seePoll = () => {
    closeSheet()
    // After the dialog hands focus back to "Expand map": keyboard focus follows the eye to the poll.
    requestAnimationFrame(() => {
      const poll = document.getElementById(POLL_CARD_ID)
      if (!poll) return
      poll.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
      focusLanding(poll)
    })
  }

  const stopOf = (plan: Plan): MapStop => {
    const n = String(today.indexOf(plan) + 1)
    const lead = plan.id === next?.id ? 'Next · ' : ''
    const paid = ledger
      .filter((e) => e.planId === plan.id && TODAY_LABELS[e.id])
      .map((e) => expenseLine(data, e, TODAY_LABELS[e.id]))
      .join(' · ')
    const place = places.find((p) => p.id === plan.placeId)

    if (plan.status === 'open')
      return {
        plan,
        mark: '?',
        kind: 'open',
        title: `Next · Dinner ${plan.time} · place not decided`,
        detail: plan.title,
        done: false,
        action: { label: 'Decide', run: () => openSheet('decide') },
      }
    if (plan.status === 'poll' && poll) {
      const t = tally(poll)
      const tied = t.waitingFor.length === 0 && t.leaders.length > 1
      return {
        plan,
        mark: '?',
        kind: 'open',
        title: `Next · Dinner ${plan.time} · ${tied ? 'poll tied' : 'poll live'}, ${t.voted} of ${t.eligible} voted`,
        detail: `${poll.question} · closes ${poll.closesAt}`,
        done: false,
        action: { label: 'See the poll', run: seePoll },
      }
    }
    // Done: what it cost. Still to come: the place ("Loud & seafood · €€ · 12 min"), and "Optional" for drinks.
    const about = plan.status === 'optional' ? [plan.note, place?.meta] : [place?.meta]
    const done = plan.status === 'done' || !!paid
    return {
      plan,
      mark: n,
      // Done stops are filled; the ones still ahead (dinner once decided, drinks) are outlined.
      kind: done ? 'filled' : 'stop',
      title: `${lead}${plan.title} · ${plan.time}`,
      detail: paid || about.filter(Boolean).join(' · ') || undefined,
      done,
    }
  }
  const stops = today.filter((p) => DAY5_PINS[p.id]).map(stopOf)

  // The group's Ideas as ★. One that became a stop tonight (the dinner, the drinks) is drawn as that stop.
  const [showIdeas, setShowIdeas] = useState(true)
  const [adding, setAdding] = useState<Place | null>(null)
  let spare = 0
  const ideas = trip.ideas
    .map((id) => ({ place: placeFor(id, places), at: IDEA_PINS[id] ?? SPARE_SPOTS[spare++] }))
    .filter((i): i is { place: Place; at: MapPoint } => !!i.place && !!i.at && !today.some((p) => p.placeId === i.place?.id))

  // The next stop is open first: it is the one waiting on the group.
  const [selection, setSelection] = useState<Selection>({ stop: next?.id ?? stops[0]?.plan.id ?? '' })
  const idea = 'idea' in selection && showIdeas ? ideas.find((i) => i.place.id === selection.idea)?.place : undefined
  const stop = idea ? undefined : (stops.find((s) => 'stop' in selection && s.plan.id === selection.stop) ?? stops.find((s) => s.plan.id === next?.id))
  const cardKey = idea ? `idea-${idea.id}` : `stop-${stop?.plan.id}`

  const card = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 }, transition: { duration: reduce ? 0 : 0.16, ease: EASE_OUT } }

  return (
    <FullScreen title="Full trip map" onClose={closeSheet} bleed>
      <div className={styles.stage} ref={stageRef}>
        <MapPan shape={shape} focus={(next && DAY5_PINS[next.id]?.y) ?? DAY5_PINS[DINNER_PLAN_ID].y}>
          <MapLayer map={DAY5_MAP} focusY={MAP_FOCUS_Y}>
            <img className={styles.mapImage} src={mapDay5Full} alt="Map of today’s route in Lisbon" />
            {showIdeas &&
              ideas.map(({ place: p, at }) => {
                const on = idea?.id === p.id
                return (
                  <MapSpot key={p.id} map={DAY5_MAP} at={at} className={on ? styles.spotOn : undefined}>
                    <button
                      type="button"
                      className={`${styles.idea} ${on ? styles.ideaOn : ''}`}
                      aria-label={`${p.name}, saved by the group`}
                      aria-pressed={on}
                      aria-controls={CARD_ID}
                      onClick={() => setSelection({ idea: p.id })}
                    >
                      <Icon name="star" size={14} />
                    </button>
                  </MapSpot>
                )
              })}
            {stops.map((s) => {
              const on = stop?.plan.id === s.plan.id
              return (
                <MapSpot key={s.plan.id} map={DAY5_MAP} at={DAY5_PINS[s.plan.id]} className={on ? styles.spotOn : undefined}>
                  <button
                    type="button"
                    className={`${styles.pin} ${on ? styles.pinOn : ''}`}
                    aria-label={`${s.mark === '?' ? 'Open stop' : `Stop ${s.mark}`}: ${s.title}${s.done ? ', done' : ''}`}
                    aria-pressed={on}
                    aria-controls={CARD_ID}
                    onClick={() => setSelection({ stop: s.plan.id })}
                  >
                    {/* "?" becomes the stop's number when dinner is decided: the number springs in over it. */}
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={s.mark}
                        className={styles.face}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 16, opacity: { duration: 0.12 } }}
                      >
                        <PinFace kind={s.kind}>{s.mark}</PinFace>
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </MapSpot>
              )
            })}
          </MapLayer>
        </MapPan>

        <div className={styles.tools}>
          <Chip role="checkbox" onMuted selected={showIdeas} label={`Ideas · ${trip.ideas.length}, show them on the map`} onClick={() => setShowIdeas(!showIdeas)}>
            <Icon name="star" size={12} />
            Ideas · {trip.ideas.length}
          </Chip>
        </div>

        <div className={styles.cardSlot} id={CARD_ID}>
          <AnimatePresence mode="wait" initial={false}>
            {idea ? (
              <motion.div key={cardKey} className={styles.card} {...card}>
                <div className={styles.cardHead}>
                  <span className={`${styles.cardPin} ${styles.cardStar}`} aria-hidden="true">
                    <Icon name="star" size={14} />
                  </span>
                  <div className={styles.cardText}>
                    <p className={shared.itemTitle}>{idea.name}</p>
                    <p className={shared.note}>{idea.meta}</p>
                    <p className={shared.note}>{placeNote(trip, idea.id, { savers: true })}</p>
                  </div>
                  {/* The same menu as Explore's "+ Add": tonight's dinner or drinks, or the poll, each saying where it stands. */}
                  <ActChip label={`Add ${idea.name} to a plan or a poll`} onClick={() => setAdding(idea)}>
                    + Add
                  </ActChip>
                </div>
              </motion.div>
            ) : stop ? (
              <motion.div key={cardKey} className={styles.card} {...card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardPin} aria-hidden="true">
                    <PinFace kind={stop.kind}>{stop.mark}</PinFace>
                  </span>
                  <div className={styles.cardText}>
                    <p className={shared.itemTitle}>{stop.title}</p>
                    {stop.detail && <p className={shared.note}>{stop.detail}</p>}
                  </div>
                  {stop.done && (
                    <span className={styles.check} role="img" aria-label="Done">
                      <Icon name="check" size={24} />
                    </span>
                  )}
                </div>
                {stop.action && (
                  <div className={shared.menu}>
                    <ActChip onClick={stop.action.run}>{stop.action.label}</ActChip>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>{adding && <PlaceActions key={adding.id} place={adding} onClose={() => setAdding(null)} />}</AnimatePresence>
    </FullScreen>
  )
}
