import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Announce } from '../../components/Announce'
import { arrowKeys } from '../../components/arrowKeys'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { OptionCard } from '../../components/OptionCard'
import { SectionTitle } from '../../components/SectionTitle'
import { Sheet } from '../../components/Sheet'
import { formatEUR } from '../../domain/money'
import { useApp } from '../../store/app'
import type { PayMethod } from '../../store/app'
import { moneyView } from '../../store/selectors'
import { subjectOf, tripPlace } from '../money/copy'
import { DrawCheck } from './DrawCheck'
import styles from './PaySheet.module.css'

type Tone = 'act' | 'done' | 'waiting' | 'error'
/** How the badge arrives: 'pop' (paid), 'shake' (failed), 'pulse' (waiting on the bank), or a plain fade. */
type Entrance = 'pop' | 'shake' | 'pulse' | 'fade'

const EASE = [0.22, 1, 0.36, 1] as const
const INSTANT = { duration: 0 }

const footerKeyOf = (phase: string) => (phase === 'choose' ? 'choose' : phase === 'approving' || phase === 'processing' ? 'wait' : phase)

/** 09 · Pay sheet: choose a method, then the calm bank / processing / paid states; red only when it fails. */
export function PaySheet() {
  const state = useApp()
  const { payFlow, data, choosePayMethod, confirmPay, retryPay, payAnotherWay, finishPay, closeSheet } = state
  const reduce = !!useReducedMotion()
  // Keep the last flow while the sheet slides out (closing clears payFlow in the same update).
  const [snapshot, setSnapshot] = useState(payFlow)
  if (payFlow && payFlow !== snapshot) setSnapshot(payFlow)
  // The first footer arrives with the sheet itself: no fade, so the button never looks disabled.
  const [firstFooter] = useState(() => (payFlow ? footerKeyOf(payFlow.phase) : null))
  const flow = payFlow ?? snapshot
  // After the bank and sending waits, the next action (Done, Try again) takes the focus the
  // vanished button left on the sheet, so Enter finishes and the outcome is read with it.
  const footerRef = useRef<HTMLDivElement>(null)
  const phaseNow = flow?.phase
  const phaseBefore = useRef(phaseNow)
  useEffect(() => {
    // Only when the phase moves on while the sheet is open (not when it opens on a result).
    if (phaseBefore.current === phaseNow) return
    phaseBefore.current = phaseNow
    if (phaseNow !== 'paid' && phaseNow !== 'failed' && phaseNow !== 'awaiting-confirmation') return
    if (document.activeElement?.getAttribute('role') === 'dialog') footerRef.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [phaseNow])
  if (!flow) return null

  const { transfer, method, phase } = flow
  const payee = memberName(transfer.to)
  const amount = formatEUR(transfer.amountCents)
  const done = phase === 'paid' || phase === 'awaiting-confirmation'
  const allSquare = moneyView(state).myOpen === 0

  const cta: Record<PayMethod, string> = {
    bank: 'Continue to your bank',
    card: `Pay ${amount}`,
    cash: 'Mark as paid',
  }

  let stage: ReactNode
  let footer: ReactNode
  switch (phase) {
    case 'choose':
      stage = (
        <>
          <SectionTitle id="pay-with">Pay with</SectionTitle>
          <div className={styles.methods} role="radiogroup" aria-labelledby="pay-with" onKeyDown={arrowKeys()}>
            <OptionCard
              title="Pay by bank · instant"
              meta="No IBAN needed · approve in your bank app"
              selected={method === 'bank'}
              onSelect={() => choosePayMethod('bank')}
            />
            <OptionCard
              title="Card or Apple Pay"
              meta="Via TripUp's payment partner"
              selected={method === 'card'}
              onSelect={() => choosePayMethod('card')}
            />
            <OptionCard
              title="Paid in cash or another way"
              meta={`${payee} confirms ${subjectOf(transfer.to)} received it`}
              selected={method === 'cash'}
              onSelect={() => choosePayMethod('cash')}
            />
          </div>
        </>
      )
      footer = <Button onClick={confirmPay}>{cta[method]}</Button>
      break
    case 'approving':
      stage = (
        <Status tone="act" entrance="pulse" icon={<BankIllustration draw={!reduce} />} title="Approve in your bank app">
          Your bank asks for one quick approval. No IBANs, no copying.
        </Status>
      )
      footer = <FooterSpacer />
      break
    case 'processing':
      stage = <Status tone="act" icon={<span className={styles.spinner} />} title={`Sending ${amount} to ${payee}…`} />
      footer = <FooterSpacer />
      break
    case 'paid':
      stage = (
        <Status tone="done" entrance="pop" icon={<DrawCheck size={32} draw={!reduce} delay={0.2} />} title={`Paid · ${payee} received ${amount}`}>
          {allSquare ? 'You’re all square' : null}
        </Status>
      )
      footer = <Button onClick={finishPay}>Done</Button>
      break
    case 'awaiting-confirmation':
      stage = (
        <Status tone="waiting" icon={<ClockGlyph />} title={`Waiting for ${payee} to confirm`}>
          It counts as paid once {payee} confirms.
        </Status>
      )
      footer = <Button onClick={finishPay}>Done</Button>
      break
    case 'failed':
      stage = (
        <Status tone="error" entrance="shake" icon={<Icon name="x" size={28} />} title="Payment didn't go through">
          Your bank declined it. Nothing was charged and your balance is unchanged.
        </Status>
      )
      footer = (
        <>
          <Button onClick={retryPay}>Try again</Button>
          <Button variant="secondary" onClick={payAnotherWay}>
            Pay another way
          </Button>
        </>
      )
      break
  }

  // What a screen reader hears as the phases change (the regions stay mounted, so each change is read).
  const said: Partial<Record<typeof phase, string>> = {
    approving: 'Approve in your bank app',
    processing: `Sending ${amount} to ${payee}…`,
    paid: `Paid · ${payee} received ${amount}.${allSquare ? ' You’re all square.' : ''}`,
    'awaiting-confirmation': `Waiting for ${payee} to confirm. It counts as paid once ${payee} confirms.`,
  }

  // The footer changes with the phase (action, nothing to tap, Done, Try again): the new one fades in.
  const footerKey = footerKeyOf(phase)
  const footerSet = (
    <motion.div
      key={footerKey}
      ref={footerRef}
      className={styles.footerSet}
      initial={footerKey === firstFooter ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduce ? INSTANT : { duration: 0.22, delay: 0.12 }}
    >
      {footer}
    </motion.div>
  )

  return (
    <Sheet title={`Pay ${payee}`} onClose={done ? finishPay : closeSheet} footer={footerSet}>
      <div className={styles.amountBlock}>
        <p className={done ? styles.amountDone : styles.amount}>{amount}</p>
        <p className={styles.for}>For: {tripPlace(data.trip.name)} trip balance</p>
      </div>
      <Announce text={said[phase] ?? ''} />
      <Announce assertive text={phase === 'failed' ? "Payment didn't go through. Your bank declined it. Nothing was charged and your balance is unchanged." : ''} />
      {/* Phases cross-fade in one grid cell: the stage keeps its height, nothing below moves. */}
      <div className={styles.stageWrap}>
        <AnimatePresence initial={false}>
          <Stage key={phase} phase={phase}>
            {stage}
          </Stage>
        </AnimatePresence>
      </div>
    </Sheet>
  )
}

function Stage({ phase, children }: { phase: string; children: ReactNode }) {
  // The leaving phase is only a fading echo: no taps, not read out.
  const present = useIsPresent()
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={styles.stage}
      data-pay-phase={present ? phase : undefined}
      aria-hidden={present ? undefined : true}
      style={{ pointerEvents: present ? undefined : 'none' }}
      initial={{ opacity: 0, y: 6 }}
      // The old phase clears first, the new one follows: a cross-fade without a double exposure.
      animate={{ opacity: 1, y: 0, transition: reduce ? INSTANT : { duration: 0.26, delay: 0.1, ease: EASE } }}
      exit={{ opacity: 0, transition: reduce ? INSTANT : { duration: 0.12, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  )
}

function Status({
  tone,
  icon,
  title,
  children,
  entrance = 'fade',
}: {
  tone: Tone
  icon: ReactNode
  title: string
  children?: ReactNode
  entrance?: Entrance
}) {
  const reduce = useReducedMotion()
  const badge = reduce
    ? { initial: false as const }
    : entrance === 'pop'
      ? // Paid: the Lime circle settles in, quietly (one small overshoot).
        { initial: { scale: 0.4 }, animate: { scale: 1 }, transition: { type: 'spring' as const, stiffness: 380, damping: 22, delay: 0.06 } }
      : entrance === 'shake'
        ? // Failed: one short shake of the badge, nothing flashes.
          { initial: { x: 0 }, animate: { x: [0, -7, 7, -5, 5, -2, 0] }, transition: { duration: 0.45, delay: 0.18, ease: 'easeInOut' as const } }
        : { initial: false as const }

  return (
    <div className={styles.status}>
      <motion.span className={`${styles.badge} ${styles[tone]}`} aria-hidden="true" {...badge}>
        {entrance === 'pulse' && !reduce && (
          // Waiting on the bank app: a slow ring breathes out of the badge.
          <motion.span
            className={styles.pulse}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.04, 1.38], opacity: [0, 0.45, 0] }}
            transition={{ duration: 1.7, delay: 0.9, times: [0, 0.15, 1], repeat: Infinity, repeatDelay: 0.2, ease: 'easeOut' }}
          />
        )}
        {icon}
      </motion.span>
      <p className={styles.statusTitle}>{title}</p>
      {children && <p className={styles.statusBody}>{children}</p>}
    </div>
  )
}

/** Keeps the sheet height steady while nothing needs a tap. */
function FooterSpacer() {
  return <span className={styles.footerSpacer} aria-hidden="true" />
}

/** Neutral bank-approval illustration (no real bank branding): a phone with a bank glyph. */
function BankIllustration({ draw }: { draw: boolean }) {
  // The phone draws itself, then the bank inside it: a calm "go to your bank app" hint.
  const line = (delay: number, duration = 0.42) =>
    draw
      ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { pathLength: { duration, delay, ease: EASE }, opacity: { duration: 0.01, delay } } }
      : { initial: false as const }
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.rect x="10" y="3" width="20" height="34" rx="4" {...line(0.1, 0.6)} />
      <motion.path d="M17 33h6" {...line(0.45, 0.2)} />
      <motion.path d="M14 16.5 20 13l6 3.5" {...line(0.5, 0.3)} />
      <motion.path d="M15.5 18.5v5M20 18.5v5M24.5 18.5v5" {...line(0.65, 0.25)} />
      <motion.path d="M14 26h12" {...line(0.8, 0.25)} />
    </svg>
  )
}

function ClockGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="11" />
      <path d="M16 10v6l4 2.5" />
    </svg>
  )
}
