import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { arrowKeys } from '../../components/arrowKeys'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { OptionCard } from '../../components/OptionCard'
import { SectionTitle } from '../../components/SectionTitle'
import { Sheet } from '../../components/Sheet'
import { DINNER_PLAN_ID } from '../../data/seed'
import { MAX_POLL_OPTIONS } from '../../domain/poll'
import type { MemberId } from '../../domain/types'
import { useApp } from '../../store/app'
import { decideStart, resetDecideStart } from './decideStart'
import type { DecideMode } from '../../store/app'
import { Chip, Segmented } from './parts'
import shared from './sheets.module.css'
import styles from './DecideSheet.module.css'

const MODES: { id: DecideMode; label: string }[] = [
  { id: 'vote', label: 'Vote' },
  { id: 'chance', label: 'Chance' },
  { id: 'someone', label: 'Someone picks' },
]

const SOURCES = ['AI picks', 'Ideas', 'Map', 'Search'] as const
type Closes = 'all-or-deadline' | '30' | '60'
const MIN_OPTIONS = 2

/** The spin always lands on Ramiro when it is in the draw (the scenario's winner). */
const SPIN_TARGET = 'ramiro'
/** Tick delays (ms): fast, then easing out onto the result. */
const SPIN_TICKS = [60, 60, 70, 80, 90, 110, 130, 160, 200, 250, 310, 380]
const LAND_PAUSE_MS = 800
const HAND_OFF_MS = 1600

type SpinPhase = 'idle' | 'spinning' | 'landed'

/** The reel: a place rolls up from below and leaves through the top (custom = step seconds). */
const REEL = {
  below: { y: '110%', opacity: 0 },
  shown: { y: '0%', opacity: 1 },
  // Same pace as the place coming in, so the two stay one line apart like a real reel.
  above: (seconds: number) => ({ y: '-110%', opacity: 0, transition: { duration: seconds, ease: 'easeOut' as const } }),
} satisfies Variants

/** 04 · How should we decide? Vote (default), Chance, or Someone picks (callout 147:31). */
export function DecideSheet() {
  const data = useApp((s) => s.data)
  const poll = useApp((s) => s.poll)
  const decided = useApp((s) => s.decided)
  const guestAdded = useApp((s) => s.guestAdded)
  const mode = useApp((s) => s.decideMode)
  const setMode = useApp((s) => s.setDecideMode)
  const closeSheet = useApp((s) => s.closeSheet)
  const startPoll = useApp((s) => s.startPoll)
  const decideWithout = useApp((s) => s.decideWithout)
  const showToast = useApp((s) => s.showToast)
  const reduceMotion = useReducedMotion()

  const script = data.pollScript.poll
  const me = data.trip.me
  const dinner = data.plans.find((p) => p.id === DINNER_PLAN_ID)
  // A place Ari came from ("Add to a poll" in Explore or on the map) joins the AI picks, first.
  // It waits until the poll starts or the dinner is decided (a "+ Add Ren" detour keeps it).
  const [optionIds] = useState(() => {
    const extra = decideStart()
    const known = extra && !script.optionIds.includes(extra) && data.places.some((p) => p.id === extra)
    return known ? [extra, ...script.optionIds].slice(0, MAX_POLL_OPTIONS) : script.optionIds
  })
  const candidates = optionIds.map((id) => data.places.find((p) => p.id === id)).filter((p) => p !== undefined)

  const [selected, setSelected] = useState<string[]>(optionIds)
  const [closes, setCloses] = useState<Closes>('all-or-deadline')
  const [picker, setPicker] = useState<MemberId>('maya')
  const [handingOff, setHandingOff] = useState(false)
  const [spin, setSpin] = useState<{ phase: SpinPhase; placeId: string | null; tick: number }>({
    phase: 'idle',
    placeId: null,
    tick: 0,
  })

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  /** Closing the sheet (or a demo jump) mid-spin cancels it: the sheet keeps rendering while it slides out. */
  const [jumpsAtOpen] = useState(() => useApp.getState().jumps)
  const finish = (placeId: string, pickedBy?: MemberId) => {
    const now = useApp.getState()
    if (now.sheet !== 'decide' || now.jumps !== jumpsAtOpen) return
    resetDecideStart()
    decideWithout(placeId, pickedBy)
  }

  const busy = spin.phase !== 'idle' || handingOff

  // Same rule as startPoll: the crew, plus Ren once he is a guest for the dinner.
  const eligible = data.members.filter(
    (m) => m.kind === 'crew' || (guestAdded && (m.planIds ?? []).includes(DINNER_PLAN_ID)),
  ).length

  const toggle = (id: string) => {
    if (busy) return
    if (selected.includes(id)) {
      if (selected.length <= MIN_OPTIONS) {
        showToast('Keep at least 2 places')
        return
      }
      setSelected(selected.filter((x) => x !== id))
    } else if (selected.length < MAX_POLL_OPTIONS) {
      setSelected(optionIds.filter((x) => x === id || selected.includes(x)))
    }
  }

  /** Guard: tonight is already being decided, so nothing restarts it. */
  const alreadyDeciding = () => {
    if (decided) {
      showToast('Tonight’s dinner is already decided')
      return true
    }
    if (poll?.status === 'open') {
      showToast('Tonight’s poll is already live')
      return true
    }
    return false
  }

  /** "30 min" / "1 h" count from now (the story clock); the default closes at 19:30. */
  const closesAt = () => {
    if (closes === 'all-or-deadline') return script.closesAt
    const [h, m] = useApp.getState().clock.split(':').map(Number)
    const t = h * 60 + m + (closes === '30' ? 30 : 60)
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  const send = () => {
    if (alreadyDeciding()) return
    resetDecideStart()
    startPoll(selected.filter((id) => data.places.some((p) => p.id === id)), closesAt())
  }

  const runSpin = () => {
    if (busy || alreadyDeciding()) return
    const target = selected.includes(SPIN_TARGET) ? SPIN_TARGET : selected[0]
    const land = () => {
      setSpin({ phase: 'landed', placeId: target, tick: SPIN_TICKS.length + 1 })
      later(LAND_PAUSE_MS, () => finish(target))
    }
    if (reduceMotion) {
      land()
      return
    }
    // Walk the selected places, one per tick, so the last tick is the target.
    const n = selected.length
    const steps = SPIN_TICKS.length
    const start = (((selected.indexOf(target) - steps) % n) + n) % n
    let at = 0
    SPIN_TICKS.forEach((delay, i) => {
      at += delay
      const placeId = selected[(start + i + 1) % n]
      if (i === steps - 1) later(at, land)
      else later(at, () => setSpin({ phase: 'spinning', placeId, tick: i + 1 }))
    })
    setSpin({ phase: 'spinning', placeId: selected[start], tick: 0 })
  }

  const handOff = () => {
    if (busy || alreadyDeciding()) return
    setHandingOff(true)
    showToast(`✓ ${memberName(picker)} picks tonight’s spot`)
    later(HAND_OFF_MS, () => finish(SPIN_TARGET, picker))
  }

  const spinPlace = spin.placeId ? data.places.find((p) => p.id === spin.placeId) : undefined
  // Each reel step takes most of the gap before the next tick: fast at first, easing out.
  const tickSeconds = (SPIN_TICKS[Math.min(spin.tick, SPIN_TICKS.length - 1)] * 0.85) / 1000
  const stepSeconds = spin.phase === 'landed' ? 0.2 : tickSeconds

  const footer =
    mode === 'vote' ? (
      <Button onClick={send}>Send to group ({eligible})</Button>
    ) : mode === 'chance' ? (
      <>
        {spin.phase !== 'idle' && (
          // A one-line slot reel: each tick rolls the next place up into view, the dice
          // tumbling with it; on the last tick the result lands, Lime fills in (chosen)
          // and a check pops. Deterministic: the same ticks always land on the same place.
          <div className={styles.reel} data-spin-phase={spin.phase}>
            <AnimatePresence>
              {spin.phase === 'landed' && (
                <motion.span
                  key="fill"
                  className={styles.reelFill}
                  aria-hidden="true"
                  initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28, opacity: { duration: 0.14 } }}
                />
              )}
            </AnimatePresence>
            <AnimatePresence mode="popLayout" initial={false} custom={stepSeconds}>
              <motion.span
                key={`${spin.tick}-${spin.placeId}`}
                className={styles.reelName}
                data-place-id={spin.placeId ?? undefined}
                custom={stepSeconds}
                variants={REEL}
                initial={reduceMotion ? false : 'below'}
                animate="shown"
                exit={reduceMotion ? undefined : 'above'}
                transition={
                  spin.phase === 'landed'
                    ? { type: 'spring', stiffness: 520, damping: 24, opacity: { duration: 0.12 } }
                    : { duration: tickSeconds, ease: 'easeOut' }
                }
              >
                <span className={styles.reelIcon}>
                  {spin.phase === 'landed' ? (
                    <motion.span
                      className={styles.reelIcon}
                      initial={reduceMotion ? false : { scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.08 }}
                    >
                      <Icon name="check" size={20} className={styles.reelCheck} />
                    </motion.span>
                  ) : (
                    // The dice turns a quarter on every tick, so it tumbles as the reel rolls.
                    <motion.span
                      aria-hidden="true"
                      className={styles.reelDice}
                      initial={reduceMotion ? false : { rotate: (spin.tick - 1) * 90 }}
                      animate={{ rotate: spin.tick * 90 }}
                      transition={{ duration: tickSeconds, ease: 'easeOut' }}
                    >
                      🎲
                    </motion.span>
                  )}
                </span>
                {spinPlace?.name}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
        <span className="visually-hidden" role="status">
          {spin.phase === 'landed' ? spinPlace?.name : ''}
        </span>
        {/* aria-disabled, not disabled: the button stays violet through the spin */}
        <Button onClick={runSpin} aria-disabled={busy}>
          {spin.phase === 'idle' ? 'Spin' : 'Spinning…'}
        </Button>
      </>
    ) : (
      <Button onClick={handOff} aria-disabled={busy}>
        {handingOff ? `Waiting for ${memberName(picker)}…` : `Let ${memberName(picker)} pick`}
      </Button>
    )

  return (
    <Sheet title="How should we decide?" onClose={closeSheet} footer={footer}>
      <Segmented label="How should we decide?" options={MODES} value={mode} onChange={setMode} disabled={busy} />

      <div className={shared.card}>
        <span className={styles.fieldLabel}>Question</span>
        <p className={styles.question}>{script.question}</p>
      </div>

      <motion.div
        key={mode}
        className={styles.modeBody}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {mode === 'chance' && (
          <div className={shared.card}>
            <h3 className={shared.cardTitle}>Leave it to chance</h3>
            <p className={shared.body}>
              Pick 2–4 places, spin once, done. Same spin as the tie-breaker. The group sees the result instantly.
            </p>
          </div>
        )}

        {mode === 'someone' && (
          <div className={shared.card}>
            <h3 className={shared.cardTitle}>Let someone pick</h3>
            <p className={shared.body}>
              Hand tonight’s choice to one person. They pick, the others can object with an alternative.
            </p>
            <div className={`${shared.chips} ${styles.people}`} role="radiogroup" aria-label="Who picks" onKeyDown={arrowKeys()}>
              {data.crew
                .filter((m) => m !== me)
                .map((m) => (
                  <Chip key={m} onMuted selected={picker === m} onClick={() => setPicker(m)} disabled={busy}>
                    <Avatar member={m} size={20} labelled={false} className={shared.chipAvatar} />
                    {memberName(m)}
                  </Chip>
                ))}
            </div>
          </div>
        )}

        {mode !== 'someone' && (
          <section className={shared.section} aria-label="Places">
            <div className={shared.chips} role="radiogroup" aria-label="Where the places come from" onKeyDown={arrowKeys()}>
              {SOURCES.map((s) => (
                <Chip
                  key={s}
                  selected={s === 'AI picks'}
                  onClick={s === 'AI picks' ? () => undefined : () => showToast('Not part of this demo: places come from AI picks')}
                >
                  {s}
                </Chip>
              ))}
            </div>
            <p className={shared.note}>
              Nearby · open now · {candidates.length} different vibes · mixed with your Ideas
            </p>
            <div className={shared.stack} role="group" aria-label="Places in the poll">
              {candidates.map((p) => (
                <OptionCard
                  key={p.id}
                  kind="check"
                  title={p.name}
                  meta={p.meta}
                  note={p.source}
                  selected={selected.includes(p.id)}
                  onSelect={() => toggle(p.id)}
                />
              ))}
            </div>
          </section>
        )}

        {mode === 'vote' && (
          <section className={shared.section} aria-labelledby="closes-title">
            <SectionTitle id="closes-title">Closes</SectionTitle>
            <div className={shared.chips} role="radiogroup" aria-labelledby="closes-title" onKeyDown={arrowKeys()}>
              <Chip selected={closes === 'all-or-deadline'} onClick={() => setCloses('all-or-deadline')}>
                All voted or {script.closesAt}
              </Chip>
              <Chip selected={closes === '30'} onClick={() => setCloses('30')}>
                30 min
              </Chip>
              <Chip selected={closes === '60'} onClick={() => setCloses('60')}>
                1 h
              </Chip>
            </div>
            <p className={shared.note}>
              When it closes, the winner fills tonight’s {dinner?.time} slot and everyone is notified.
            </p>
          </section>
        )}
      </motion.div>
    </Sheet>
  )
}
