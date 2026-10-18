import { AnimatePresence, motion } from 'framer-motion'
import { Announce } from '../../components/Announce'
import { arrowKeys } from '../../components/arrowKeys'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { OptionCard } from '../../components/OptionCard'
import { tally } from '../../domain/poll'
import type { MemberId } from '../../domain/types'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import { GuestChrome } from './GuestChrome'
import styles from './Guest.module.css'

const GUEST: MemberId = 'ren'

/** G1 · Ren's phone, mobile web: votes on tonight's dinner from the link. */
export function GuestPoll() {
  const { poll, data, guestVote } = useApp(useShallow((s) => ({ poll: s.poll, data: s.data, guestVote: s.guestVote })))

  if (!poll) {
    return (
      <GuestChrome url="tripup.app/p/lisbon-dinner">
        <p className={styles.empty}>There’s no poll open right now.</p>
      </GuestChrome>
    )
  }

  const host = memberName(poll.createdBy ?? data.trip.me)
  const t = tally(poll, data.places)
  const myVote = poll.votes[GUEST]
  const open = poll.status === 'open'
  const canVote = open && poll.eligible.includes(GUEST)
  const winner = !open ? data.places.find((p) => p.id === poll.winnerId) : undefined
  const slot = data.plans.find((p) => p.id === poll.planId)

  return (
    <GuestChrome url="tripup.app/p/lisbon-dinner">
      <Announce text={winner ? `It’s ${winner.name}! See you at ${slot?.time ?? 'dinner'}.` : myVote ? 'You’re in! We’ll tell you where.' : ''} />
      <div className={styles.pollHead}>
        <span className={styles.invite}>
          <Avatar member={poll.createdBy ?? data.trip.me} size={20} labelled={false} />
          Invited by {host}
        </span>
        {open && (
          <span className={styles.count}>
            <b>{t.voted}</b> of <b>{t.eligible}</b> voted
          </span>
        )}
      </div>

      <div className={styles.questionBlock}>
        <h1 className={styles.question} id="guest-question">
          {poll.question}
        </h1>
        {open && (
          <p className={styles.caption}>
            {slot ? `Tonight ${slot.time} · ` : ''}closes when all vote or at {poll.closesAt}
          </p>
        )}
      </div>

      {winner ? (
        // Closed: the winner, with the result as the plan shows it ("Picked by 3 of 6").
        <motion.div
          key="decided"
          className={styles.done}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <span className={styles.doneIcon}>
            <Icon name="check" size={20} />
          </span>
          <div className={styles.doneTexts}>
            <p className={styles.doneText}>
              It’s {winner.name}! See you at {slot?.time ?? 'dinner'}.
            </p>
            <p className={styles.doneMeta}>
              {winner.meta} · Picked by {t.counts[winner.id] ?? 0} of {t.eligible}
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className={styles.options} role="radiogroup" aria-labelledby="guest-question" onKeyDown={arrowKeys()}>
            {t.options.map((o) => (
              <OptionCard
                key={o.optionId}
                title={o.place?.name ?? o.optionId}
                meta={o.place?.meta}
                note={o.count > 0 ? `${o.count} ${o.count === 1 ? 'vote' : 'votes'}` : undefined}
                selected={myVote === o.optionId}
                disabled={!canVote}
                onSelect={() => guestVote(o.optionId)}
              />
            ))}
          </div>

          {open && !canVote && <p className={styles.empty}>Ask {host} to add you to this dinner to vote.</p>}

          <AnimatePresence initial={false}>
            {myVote && (
              <motion.div
                key="voted"
                className={styles.done}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              >
                <span className={styles.doneIcon}>
                  <Icon name="check" size={20} />
                </span>
                <p className={styles.doneText}>You’re in! We’ll tell you where.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </GuestChrome>
  )
}
