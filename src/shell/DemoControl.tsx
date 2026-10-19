import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useDialog } from '../components/useDialog'
import { DEMO_STEPS, useApp } from '../store/app'
import type { DemoStep } from '../store/app'
import { moneyView } from '../store/selectors'
import styles from './DemoControl.module.css'

const GROUPS: { title: string; match: (s: DemoStep) => boolean }[] = [
  { title: 'Scenario 01–10', match: (s) => /^\d/.test(s.label) },
  { title: 'Edge cases', match: (s) => s.label.startsWith('Edge') },
  { title: 'Ren’s phone', match: (s) => /^G\d/.test(s.label) },
  { title: 'Design system', match: (s) => s.id.startsWith('tokens') },
]

/** Hidden presenter tools: run the group's scripted actions, skip ahead in time, jump to a step, restart. */
export function DemoControl() {
  const demoOpen = useApp((s) => s.demoOpen)
  return <AnimatePresence>{demoOpen && <DemoPanel key="demo" />}</AnimatePresence>
}

function DemoPanel() {
  const closeDemo = useApp((s) => s.closeDemo)
  const panel = useRef<HTMLDivElement>(null)
  // Like a sheet: focus moves in (and back to "Demo controls"), Tab stays inside, Escape closes.
  const onKeyDown = useDialog(panel, closeDemo)
  // Ignore a stray click right after opening (e.g. the release of the long press that opened it).
  const [openedAt] = useState(() => performance.now())
  const onScrimClick = () => {
    if (performance.now() - openedAt > 500) closeDemo()
  }

  return (
    <motion.div
      className={styles.scrim}
      data-demo
      onClick={onScrimClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={panel}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      >
        <div className={styles.head}>
          <h2 id="demo-title" className="t-h3">
            Demo controls
          </h2>
          <button type="button" className={styles.close} onClick={closeDemo}>
            Close
          </button>
        </div>
        <p className={styles.hint}>
          Only for presenting. On a phone, long-press the top of the screen to open this.
        </p>

        <SystemEvents />
        <TimeSkip />
        <Shortcuts />
        <JumpList />
      </motion.div>
    </motion.div>
  )
}

/** What the rest of the group does. The autopilot runs these on timers; this runs the next one now. */
function SystemEvents() {
  const scripted = useApp((s) => s.pendingEvent())
  const runNextEvent = useApp((s) => s.runNextEvent)
  const runEndDinner = useApp((s) => s.runEndDinnerWithInterlude)
  const autoplay = useApp((s) => s.autoplay)
  const setAutoplay = useApp((s) => s.setAutoplay)
  const failNextPayment = useApp((s) => s.failNextPayment)
  const setFailNextPayment = useApp((s) => s.setFailNextPayment)
  const [last, setLast] = useState<string | null>(null)

  const run = () => {
    if (!scripted) return
    setLast(scripted.label)
    if (scripted.id === 'end-dinner') runEndDinner()
    else runNextEvent()
  }

  return (
    <section className={styles.block} aria-labelledby="demo-events">
      <h3 id="demo-events" className={styles.blockTitle}>
        System events
      </h3>
      <Toggle label="Group plays by itself" on={autoplay} onChange={setAutoplay} />
      {scripted ? (
        <button type="button" className={styles.primary} onClick={run}>
          {autoplay ? 'Now: ' : 'Run: '}
          {scripted.label}
        </button>
      ) : (
        <p className={styles.nothing}>Nothing waiting</p>
      )}
      <p className={styles.hint} aria-live="polite">
        {last ? `Done: ${last}` : 'The group’s votes, answers and payments, in story order, on fixed timers.'}
      </p>
      <Toggle label="Next bank payment fails" on={failNextPayment} onChange={setFailNextPayment} />
    </section>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={styles.toggleRow} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`${styles.switch} ${on ? styles.switchOn : ''}`} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  )
}

/** Time skips live here, not in the product UI: the evening jumps to 22:30 (the "Later that evening" moment, then "Who paid?"). */
function TimeSkip() {
  const decided = useApp((s) => s.decided)
  const dinnerEnded = useApp((s) => s.dinnerEnded)
  const interlude = useApp((s) => s.interlude)
  const runEndDinner = useApp((s) => s.runEndDinnerWithInterlude)
  const closeDemo = useApp((s) => s.closeDemo)
  const ready = decided && !dinnerEnded && !interlude
  const reason = !decided ? 'Works once tonight’s dinner is decided.' : dinnerEnded || interlude ? 'It’s already 22:30.' : null

  const skip = () => {
    // Close first, so the presenter sees the moment play.
    closeDemo()
    runEndDinner()
  }

  return (
    <section className={styles.block} aria-labelledby="demo-time">
      <h3 id="demo-time" className={styles.blockTitle}>
        Time
      </h3>
      <button type="button" className={styles.secondary} disabled={!ready} aria-describedby={reason ? 'demo-time-why' : undefined} onClick={skip}>
        Skip to 22:30 · dinner ends
      </button>
      {reason && (
        <p id="demo-time-why" className={styles.hint}>
          {reason}
        </p>
      )}
    </section>
  )
}

function Shortcuts() {
  const state = useApp()
  const { poll, dinnerExpense, openGuestView, closeDemo } = state
  const pollOpen = poll?.status === 'open' && poll.eligible.includes('ren')
  const renOwes = !!dinnerExpense && moneyView(state).rows.some((r) => r.guest && r.transfer.from === 'ren')

  const open = (screen: 'guest-poll' | 'guest-pay') => () => {
    openGuestView(screen)
    closeDemo()
  }

  return (
    <section className={styles.block} aria-labelledby="demo-ren">
      <h3 id="demo-ren" className={styles.blockTitle}>
        Ren’s phone
      </h3>
      <div className={styles.pair}>
        <button type="button" className={styles.secondary} disabled={!pollOpen} onClick={open('guest-poll')}>
          Open Ren’s poll link
        </button>
        <button type="button" className={styles.secondary} disabled={!renOwes} onClick={open('guest-pay')}>
          Open Ren’s pay link
        </button>
      </div>
      {(!pollOpen || !renOwes) && (
        <p className={styles.hint}>
          {!pollOpen && !renOwes
            ? 'The poll link works while a poll with Ren is open; the pay link once the bill is saved.'
            : !pollOpen
              ? 'The poll link works while a poll with Ren is open.'
              : 'The pay link works once the bill is saved.'}
        </p>
      )}
    </section>
  )
}

function JumpList() {
  const stepId = useApp((s) => s.stepId)
  const jumpTo = useApp((s) => s.jumpTo)
  const restart = useApp((s) => s.restart)

  return (
    <>
      <button type="button" className={styles.secondary} onClick={restart}>
        Restart demo
      </button>
      {[...GROUPS, { title: 'More', match: (s: DemoStep) => !GROUPS.some((g) => g.match(s)) }].map((g) => {
        const steps = DEMO_STEPS.filter(g.match)
        if (!steps.length) return null
        return (
          <section key={g.title} className={styles.group}>
            <h3 className={styles.blockTitle}>{g.title}</h3>
            <ul className={styles.list}>
              {steps.map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    className={styles.step}
                    aria-current={step.id === stepId ? 'step' : undefined}
                    onClick={() => jumpTo(step.id)}
                  >
                    {/* The token screens keep their build-era ids; the list shows what they are. */}
                    {step.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
