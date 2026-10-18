import { motion, useReducedMotion } from 'framer-motion'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import { moneyView } from '../../store/selectors'
import { tripPlace } from '../money/copy'
import { DrawCheck } from '../pay/DrawCheck'
import styles from './SquaredUp.module.css'

const EASE = [0.22, 1, 0.36, 1] as const
/** Avatars pop in one after another, then the "all ✓" pill. */
const AVATARS_AT = 0.46
const AVATAR_STAGGER = 0.06
const POP = { type: 'spring' as const, stiffness: 460, damping: 26 }

/** 10 · Squared up: the one warm moment on the settle side. Every count comes from the store. */
export function SquaredUp() {
  const state = useApp()
  const { data, guestAdded, payments, showToast, restart } = state
  const reduce = useReducedMotion()
  const view = moneyView(state)
  const place = tripPlace(data.trip.name)
  const people = data.members.filter((m) => m.kind === 'crew' || guestAdded)
  const guests = people.filter((m) => m.kind === 'guest')
  const paid = payments.filter((p) => p.status === 'paid').length
  const days = data.days.length
  const summary = `${days} days · ${view.expenses.length} expenses · ${paid} ${paid === 1 ? 'payment' : 'payments'} to close it all`

  const share = () => {
    const recap = `${data.trip.name} is squared up ✓\n${summary}`
    // The clipboard needs a secure page (not a phone on the local network): say where the recap would go.
    const noShare = () => showToast('Not part of this demo: the recap goes to the group chat')
    if (!navigator.clipboard) return noShare()
    navigator.clipboard.writeText(recap).then(() => showToast('Trip recap copied · share it with the group'), noShare)
  }

  const planNext = () => {
    restart()
    showToast('The demo starts again from My trips')
  }

  // Warm but calm (settle voice): one check, one soft halo pulse, things rising into place. No confetti.
  // With reduced motion everything is simply there.
  const rise = (delay: number, y = 12) =>
    reduce
      ? { initial: false as const }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: EASE } }
  const pop = (delay: number, from = 0.4) =>
    reduce
      ? { initial: false as const }
      : { initial: { opacity: 0, scale: from }, animate: { opacity: 1, scale: 1 }, transition: { ...POP, delay, opacity: { duration: 0.16, delay } } }

  return (
    <div className={styles.screen}>
      <StatusBar tone="onLight" />
      <main className={styles.main}>
        <span className={styles.badgeWrap} aria-hidden="true">
          <motion.span
            className={styles.halo}
            {...(reduce
              ? { initial: false as const }
              : { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 } })}
          />
          {!reduce && (
            // One soft pulse out of the halo as the check lands, then it's gone.
            <motion.span
              className={styles.pulse}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1.5], opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.1, delay: 0.42, times: [0, 0.1, 1], ease: 'easeOut' }}
            />
          )}
          <motion.span
            className={styles.badge}
            data-squared-check
            {...(reduce
              ? { initial: false as const }
              : { initial: { scale: 0.5, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 320, damping: 22, opacity: { duration: 0.18 } } })}
          >
            <DrawCheck size={48} draw={!reduce} delay={0.26} />
          </motion.span>
        </span>

        <div className={styles.copy}>
          <motion.h1 className={styles.title} {...rise(0.2)}>
            {place} is squared up
          </motion.h1>
          <motion.p className={styles.lead} {...rise(0.3, 8)}>
            Everyone is settled. Ready for the next adventure.
          </motion.p>
        </div>

        <div className={styles.people} role="group" aria-label="Everyone is settled">
          <span className={styles.avatars}>
            {people.map((m, i) => (
              <motion.span key={m.id} className={styles.avatarSlot} {...pop(AVATARS_AT + i * AVATAR_STAGGER)}>
                <Avatar member={m.id} size={36} ring="chosen" />
              </motion.span>
            ))}
          </span>
          <motion.span className={styles.all} {...pop(AVATARS_AT + people.length * AVATAR_STAGGER + 0.06, 0.6)}>
            all
            <Icon name="check" size={16} />
          </motion.span>
        </div>

        <motion.div className={styles.summary} {...rise(AVATARS_AT + people.length * AVATAR_STAGGER + 0.18, 10)}>
          <p className={styles.summaryLine}>{summary}</p>
          {guests.map((g) => (
            <p key={g.id} className={styles.summaryNote}>
              {g.name}'s guest access is now closed.
            </p>
          ))}
        </motion.div>
      </main>

      <div className={styles.actions}>
        <Button onClick={share}>Share a trip recap</Button>
        <Button variant="secondary" onClick={planNext}>
          Plan the next trip
        </Button>
      </div>
    </div>
  )
}
