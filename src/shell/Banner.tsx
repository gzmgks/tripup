import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import logoMark from '../assets/brand/logo-mark.svg'
import { Announce } from '../components/Announce'
import { Button } from '../components/Button'
import { focusLanding } from '../components/focus'
import { Icon } from '../components/Icon'
import { memberName } from '../components/names'
import { DINNER_PLAN_ID } from '../data/seed'
import { useApp } from '../store/app'
import { useShallow } from 'zustand/react/shallow'
import styles from './Banner.module.css'

/** Swipe up this far (px) or this fast (px/s) to dismiss. */
const SWIPE_DISTANCE = 32
const SWIPE_VELOCITY = 400

/** Leaves the way it came: up and out, quick and soft (auto-dismiss, swipe, tap elsewhere). */
const EXIT = { opacity: 0, y: -40, scale: 0.98, transition: { duration: 0.26, ease: [0.4, 0, 0.9, 0.6] as const } }
/** 05 · the group push slides in like a system banner. */
const ENTER_PUSH = { type: 'spring' as const, stiffness: 520, damping: 38 }
/**
 * 06B · 22:30: a slightly bigger, warmer spring, after the "Later that evening" moment has
 * mostly faded (the interlude sits above the banner while it fades out).
 */
const ENTER_WHO_PAID = { type: 'spring' as const, stiffness: 380, damping: 26, delay: 0.24 }

type State = ReturnType<typeof useApp.getState>

/** What a screen reader hears when a banner lands (from a live region that stays mounted). */
function bannerSaid(s: State): string {
  if (s.banner?.kind === 'group-push' && s.poll) return `What the group got: ${memberName(s.poll.createdBy ?? s.data.trip.me)}: ${s.poll.question}`
  if (s.banner?.kind !== 'who-paid') return ''
  const plan = s.data.plans.find((p) => p.id === DINNER_PLAN_ID)
  const place = s.data.places.find((p) => p.id === plan?.placeId)
  return `TripUp, ${s.clock}: Who paid at ${place?.name ?? 'dinner'}? Log it while everyone is still at the table.`
}

/**
 * iOS-style push banner over every screen, driven by state.banner.
 * 'group-push' (05): what the rest of the group receives when Ari sends the poll.
 * 'who-paid' (06B): the 22:30 prompt to log the bill.
 *
 * Stage 4 hooks: the banner is keyed by banner.id (a new banner replaces the old
 * one with a clean exit/enter), and `data-banner-kind` names it for timers/tests.
 */
export function Banner() {
  const banner = useApp((s) => s.banner)
  const dismissBanner = useApp((s) => s.dismissBanner)
  const said = useApp(bannerSaid)
  const regionRef = useRef<HTMLDivElement>(null)

  // Tap anywhere else on the phone (or Esc, or Tab onto what it covers) dismisses the banner; the tap still goes through.
  useEffect(() => {
    if (!banner) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target || !target.closest('[data-device]')) return
      if (regionRef.current?.contains(target) || target.closest('[data-demo]')) return
      dismissBanner()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useApp.getState().demoOpen && !useApp.getState().sheet) dismissBanner()
      // Tabbing on to something the banner covers (the header under it) is the keyboard's "tap
      // elsewhere": the banner goes, so the focused control is never hidden behind it.
      if (e.key === 'Tab')
        requestAnimationFrame(() => {
          const at = document.activeElement
          if (!(at instanceof HTMLElement) || !at.closest('[data-device]') || regionRef.current?.contains(at)) return
          const r = at.getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          if (hit && regionRef.current?.contains(hit)) dismissBanner()
        })
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [banner, dismissBanner])

  // Gone (dismissed, timed out, quick-voted) while keyboard focus was on it: continue in the screen below.
  // If the screen changed at the same time (e.g. "Log the bill"), App already moves focus to its title.
  const screen = useApp((s) => s.screen)
  const lastScreen = useRef(screen)
  useEffect(() => {
    const screenChanged = lastScreen.current !== screen
    lastScreen.current = screen
    if (banner || screenChanged || !regionRef.current?.contains(document.activeElement)) return
    const main = document.querySelector<HTMLElement>('[data-device] main')
    if (main) focusLanding(main)
  }, [banner, screen])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_DISTANCE || info.velocity.y < -SWIPE_VELOCITY) dismissBanner()
  }

  return (
    <div ref={regionRef} className={styles.region}>
      <Announce text={said} />
      <AnimatePresence>
        {banner && (
          <motion.section
            key={banner.id}
            className={`${styles.stack} ${banner.kind === 'group-push' ? styles.labelled : ''}`}
            aria-label={banner.kind === 'group-push' ? 'What the group got' : 'Notification'}
            data-banner-kind={banner.kind}
            initial={banner.kind === 'who-paid' ? { opacity: 0, y: -56, scale: 0.92 } : { opacity: 0, y: -32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            // After "Log the bill" the next screen is already there: the 22:30 banner just fades.
            exit={banner.kind === 'who-paid' ? { opacity: 0, transition: { duration: 0.12 } } : EXIT}
            transition={banner.kind === 'who-paid' ? ENTER_WHO_PAID : ENTER_PUSH}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.08 }}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
          >
            {banner.kind === 'group-push' ? <GroupPush /> : <WhoPaid />}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 05 · Push notification (other members), labelled because Ari can't get her own push. */
function GroupPush() {
  const {
    poll,
    data,
    dismissBanner,
    showToast,
  } = useApp(
    useShallow((s) => ({
      poll: s.poll,
      data: s.data,
      dismissBanner: s.dismissBanner,
      showToast: s.showToast,
    })),
  )
  if (!poll) return null
  const author = memberName(poll.createdBy ?? data.trip.me)
  const options = poll.optionIds.map((id) => data.places.find((p) => p.id === id)).filter((p) => !!p)

  const quickVote = () => {
    dismissBanner()
    showToast('Your friends vote from their lock screen')
  }

  return (
    <>
      <span className={styles.label}>What the group got</span>
      <div className={styles.card}>
        <NotificationHead when="now" />
        <div className={styles.text}>
          <p className={styles.title}>
            {author}: {poll.question}
          </p>
          <p className={styles.body}>Vote right here, without opening the app</p>
        </div>
        <div className={styles.chips} role="group" aria-label="Quick vote">
          {options.map((place) => (
            <button key={place.id} type="button" className={styles.chip} onClick={quickVote}>
              {place.shortName ?? place.name}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/** 06B · 22:30, the dinner stop ends. */
function WhoPaid() {
  const { data, clock, openBill } = useApp(useShallow((s) => ({ data: s.data, clock: s.clock, openBill: s.openBill })))
  const reduce = useReducedMotion()
  const plan = data.plans.find((p) => p.id === DINNER_PLAN_ID)
  const place = data.places.find((p) => p.id === plan?.placeId)

  return (
    <div className={styles.card}>
      <NotificationHead when={clock} />
      <div className={styles.text}>
        <p className={styles.title}>Who paid at {place?.name ?? 'dinner'}?</p>
        <p className={styles.body}>Log it while everyone is still at the table.</p>
      </div>
      {/* The one thing to do now: the button breathes once (a soft violet ring) after the banner lands. */}
      <motion.div
        className={`${styles.action} ${reduce ? '' : styles.pulseOnce}`}
        initial={{ scale: 1 }}
        animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
        transition={{ duration: 0.5, delay: 0.85, ease: 'easeInOut' }}
      >
        <Button onClick={openBill}>Log the bill</Button>
      </motion.div>
    </div>
  )
}

function NotificationHead({ when }: { when: string }) {
  const dismissBanner = useApp((s) => s.dismissBanner)
  return (
    <div className={styles.head}>
      <span className={styles.appIcon} aria-hidden="true">
        <span className={styles.mark} style={{ '--logo': `url("${logoMark}")` } as CSSProperties} />
      </span>
      <span className={styles.meta}>TripUp · {when}</span>
      <button type="button" className={styles.close} aria-label="Dismiss notification" onClick={dismissBanner}>
        <Icon name="cancel" size={20} />
      </button>
    </div>
  )
}
