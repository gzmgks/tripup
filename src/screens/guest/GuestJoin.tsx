import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Announce } from '../../components/Announce'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { DINNER_PLAN_ID } from '../../data/seed'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import { GuestChrome } from './GuestChrome'
import styles from './Guest.module.css'

const GUEST_NAME = 'Ren'
/** With the group on autopilot, Ren types his name on his own: a beat after the page shows, one letter at a time. */
const TYPE_START_MS = 700
const TYPE_LETTER_MS = 120

/** G0 · Ren's phone, mobile web: the invite link. He enters his name and joins, no app or account. */
export function GuestJoin() {
  const { data, invited, joined, autoplay, guestJoin } = useApp(
    useShallow((s) => ({ data: s.data, invited: s.guestInvited, joined: s.guestAdded, autoplay: s.autoplay, guestJoin: s.guestJoin })),
  )
  const host = data.trip.me
  const dinner = data.plans.find((p) => p.id === DINNER_PLAN_ID)
  const [name, setName] = useState('')
  // Once Ren (the presenter) touches the field, the autopilot leaves it alone.
  const typedByHand = useRef(false)

  useEffect(() => {
    if (!autoplay || joined || typedByHand.current) return
    const timers = [...GUEST_NAME].map((_, i) =>
      window.setTimeout(() => {
        if (!typedByHand.current) setName(GUEST_NAME.slice(0, i + 1))
      }, TYPE_START_MS + i * TYPE_LETTER_MS),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [autoplay, joined])

  if (!invited) {
    return (
      <GuestChrome url="tripup.app/p/lisbon-dinner">
        <p className={styles.empty}>This invite link isn’t active.</p>
      </GuestChrome>
    )
  }

  return (
    <GuestChrome url="tripup.app/p/lisbon-dinner">
      <Announce text={joined ? 'You’re in! Ari will see you joined.' : ''} />
      <div className={styles.pollHead}>
        <span className={styles.invite}>
          <Avatar member={host} size={20} labelled={false} />
          Invited by {memberName(host)}
        </span>
      </div>

      <div className={styles.questionBlock}>
        <h1 className={styles.question} id="guest-invite">
          {memberName(host)} invited you to tonight’s dinner
        </h1>
        <p className={styles.caption}>
          {data.trip.name} · {dinner ? `${dinner.title} · Tonight ${dinner.time}` : 'Tonight'}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {joined ? (
          <motion.div
            key="joined"
            className={styles.done}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className={styles.doneIcon}>
              <Icon name="check" size={20} />
            </span>
            <div className={styles.doneTexts}>
              <p className={styles.doneText}>You’re in, {name.trim() || GUEST_NAME}!</p>
              <p className={styles.doneMeta}>You’ll get the poll and your share of the bill here, on this link.</p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className={styles.joinForm}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) guestJoin()
            }}
          >
            <label className={styles.caption} htmlFor="guest-name">
              Your name
            </label>
            <input
              id="guest-name"
              className={styles.field}
              value={name}
              onChange={(e) => {
                typedByHand.current = true
                setName(e.target.value)
              }}
              placeholder="Name"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="done"
            />
            <Button type="submit" disabled={!name.trim()}>
              Join
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </GuestChrome>
  )
}
