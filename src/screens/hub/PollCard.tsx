import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { memberName } from '../../components/names'
import { Announce } from '../../components/Announce'
import { canAddOption, tally } from '../../domain/poll'
import type { MemberId, Place, Poll } from '../../domain/types'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import { BAR_SPRING, EASE_OUT, POP_SPRING, TRAVEL_SPRING, grow, placeNameId } from './motion'
import { Roll } from './Roll'
import styles from './PollCard.module.css'

export const POLL_CARD_ID = 'dinner-poll'

/** How long "Spin the dice" rolls before the tie is broken (deterministic: the store picks). */
const DICE_ROLL_MS = 800
/** The dice wiggles once when the tie callout lands. */
const DICE_WIGGLE = { rotate: [0, -16, 13, -8, 4, 0] }
const DICE_WIGGLE_T = { duration: 0.6, delay: 0.3, ease: 'easeInOut' } as const
const DICE_ROLL = { rotate: 720, scale: [1, 1.25, 1] }
const DICE_ROLL_T = { duration: DICE_ROLL_MS / 1000, ease: [0.3, 0, 0.2, 1] } as const

/** 05B: two sparkles and a popper rise off the winning row once (decision moment, ~0.7s). */
const PARTICLES = [
  { glyph: '🎉', x: -26, y: -22, rotate: -18, delay: 0 },
  { glyph: '✨', x: -2, y: -30, rotate: 10, delay: 0.06 },
  { glyph: '✨', x: 20, y: -16, rotate: 24, delay: 0.12 },
]

/** Timeline item, variant "Poll" (component 151:288), driven by the poll data. */
export function PollCard({ poll, places }: { poll: Poll; places: Place[] }) {
  const {
    vote,
    openSheet,
    pollNotice,
    dismissPollNotice,
    breakTie,
    data,
  } = useApp(
    useShallow((s) => ({
      vote: s.vote,
      openSheet: s.openSheet,
      pollNotice: s.pollNotice,
      dismissPollNotice: s.dismissPollNotice,
      breakTie: s.breakTie,
      data: s.data,
    })),
  )
  const reduce = useReducedMotion()
  const answersRef = useRef<HTMLDivElement>(null)
  const me = data.trip.me
  const t = tally(poll, places)
  const myVote = poll.votes[me]
  const waiting = t.waitingFor.map((m) => (m === me ? 'you' : memberName(m)))
  const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? id

  const everyoneIn = t.eligible > 0 && t.waitingFor.length === 0
  const tie = pollNotice === 'tie'
  // Only a single leader gets the violet bar; options tied on votes look identical (grey), even for first.
  const soleLeader = t.leaders.length === 1 ? t.leaders[0] : null
  // Everyone is in and there's one winner: the poll is about to close (05B).
  const closing = everyoneIn && !tie && soleLeader !== null
  const canSuggest = canAddOption(poll) && !everyoneIn

  // "Nic switched to Ramiro": someone else moving their vote, noticed as it happens
  // (derived during render, like Roll). Ari's own changes need no telling, and a demo
  // jump (it rebuilds the trip data) is not anyone changing their mind.
  const [seen, setSeen] = useState({ votes: poll.votes, data })
  const [switched, setSwitched] = useState<{ member: MemberId; optionId: string } | null>(null)
  if (seen.votes !== poll.votes || seen.data !== data) {
    const before = seen.votes
    const jumped = seen.data !== data
    const moved = jumped ? undefined : (Object.keys(poll.votes) as MemberId[]).find((m) => m !== me && before[m] && before[m] !== poll.votes[m])
    setSeen({ votes: poll.votes, data })
    if (moved) setSwitched({ member: moved, optionId: poll.votes[moved]! })
    else if (jumped && before !== poll.votes) setSwitched(null)
  }
  // It stays while that vote stands; the tie callout tells its own story.
  const switchLine = switched && poll.votes[switched.member] === switched.optionId && !tie ? switched : null
  const switchPlace = switchLine ? (places.find((p) => p.id === switchLine.optionId)?.shortName ?? placeName(switchLine.optionId)) : ''

  // "Theo added Time Out Market": the newest option, and who added it (scripted).
  const added = poll.optionIds[poll.optionIds.length - 1]
  const { fourthOption } = data.pollScript
  const adder = fourthOption.placeId === added ? memberName(fourthOption.addedBy) : 'Someone'

  // "Spin the dice": a short roll, then the store breaks the tie (always the same winner).
  const [rolling, setRolling] = useState(false)
  const rollTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(rollTimer.current), [])
  const spin = () => {
    if (rolling) return
    if (reduce) {
      breakTie()
      return
    }
    setRolling(true)
    rollTimer.current = window.setTimeout(() => {
      setRolling(false)
      // A demo jump during the roll may have moved the story on.
      if (useApp.getState().pollNotice === 'tie') breakTie()
    }, DICE_ROLL_MS)
  }

  const seeOptions = () => {
    dismissPollNotice()
    const group = answersRef.current
    group?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    const options = group?.querySelectorAll<HTMLButtonElement>('button')
    options?.[options.length - 1]?.focus({ preventScroll: true })
  }

  const notice = grow(8, reduce)

  // Screen readers hear the count when the votes pause (they land ~1.3s apart), not every roll,
  // and the callouts as they appear (the live regions stay mounted, so they are announced).
  const countSaid = `${t.voted} of ${t.eligible} voted${closing ? ', closing' : ''}`
  const noticeSaid =
    pollNotice === 'fourth-added'
      ? `${adder} added ${placeName(added)}. ${myVote ? `Your vote stays on ${placeName(myVote)}. Want to switch?` : 'Want to vote for it?'}`
      : tie
        ? `It's a tie! Let fate decide. ${t.leaders.map((id) => `${placeName(id)} ${t.counts[id]}`).join(', ')}`
        : ''
  const switchSaid = switchLine ? `${memberName(switchLine.member)} switched to ${switchPlace}` : ''

  return (
    <div className={styles.card} id={POLL_CARD_ID}>
      <div className={styles.head}>
        <span className={styles.chip}>Live Poll</span>
        <motion.span className={styles.count} aria-hidden="true">
          <b><Roll value={t.voted} /></b> of <b>{t.eligible}</b> voted
          <AnimatePresence initial={false}>
            {closing && (
              <motion.span key="closing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, delay: 0.08 }}>
                {' · closing…'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
        <Announce text={countSaid} settle={1500} />
        <Announce text={noticeSaid} />
        <Announce text={switchSaid} />
      </div>
      <h3 className={styles.question}>{poll.question}</h3>

      {poll.status === 'open' && !myVote && <p className={styles.voteHint}>Tap a place to vote</p>}
      <div className={styles.answers} role="group" aria-label={poll.question} ref={answersRef}>
        <AnimatePresence initial={false}>
          {t.options.map((o) => {
            const mine = myVote === o.optionId
            const won = closing && o.isLeader
            const enter = grow(8, reduce)
            return (
              <motion.button
                key={o.optionId}
                type="button"
                className={styles.option}
                data-option={o.optionId}
                aria-pressed={mine}
                onClick={() => vote(o.optionId)}
                // A tiny press, so Ari's own tap answers at once.
                whileTap={{ scale: 0.985 }}
                {...enter}
                transition={{ ...enter.transition, scale: { duration: 0.12 } }}
              >
                {/* 05B · Lime = chosen: the winning row lights up before the poll closes. */}
                <AnimatePresence>
                  {won && (
                    <motion.span
                      key="won"
                      className={styles.won}
                      aria-hidden="true"
                      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ ...POP_SPRING, opacity: { duration: 0.2 } }}
                    />
                  )}
                </AnimatePresence>
                <span className={styles.row}>
                  <motion.span className={styles.name} layoutId={placeNameId(o.optionId)} transition={TRAVEL_SPRING}>
                    {o.place?.name}
                  </motion.span>
                  <span className="visually-hidden">, </span>
                  <Roll value={o.count} />
                  <span className="visually-hidden">{o.count === 1 ? ' vote,' : ' votes,'}</span>
                </span>
                <span className={styles.track}>
                  <motion.span
                    className={`${styles.fill} ${o.optionId === soleLeader ? styles.leader : ''}`}
                    initial={false}
                    animate={{ width: `${o.fraction * 100}%` }}
                    transition={reduce ? { duration: 0 } : BAR_SPRING}
                  />
                </span>
                <span className={styles.voters}>
                  <span className={styles.stack}>
                    <AnimatePresence initial={false} mode="popLayout">
                      {o.voters.map((m) => (
                        <motion.span
                          key={m}
                          className={styles.voter}
                          // Changing your vote: the avatar travels to its new row.
                          layoutId={`poll-voter-${m}`}
                          initial={reduce ? false : m === me ? { scale: 0.8 } : { scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{
                            ...(m === me ? { type: 'spring', stiffness: 700, damping: 30 } : POP_SPRING),
                            opacity: { duration: 0.12 },
                            layout: TRAVEL_SPRING,
                          }}
                        >
                          <Avatar member={m} size={24} ring="poll" />
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </span>
                  <AnimatePresence initial={false} mode="popLayout">
                    {mine && (
                      <motion.span
                        key="mine"
                        className={styles.yourVote}
                        layoutId="poll-your-vote"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12, layout: TRAVEL_SPRING }}
                      >
                        Your vote
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {/* Its own presence scope, so it plays when the row is already on screen. */}
                <AnimatePresence initial={false}>{won && !reduce && <Celebration key="burst" />}</AnimatePresence>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {switchLine && (
          // Keyed by the move, so a second switch replaces the line rather than editing it.
          <motion.div key={`switch-${switchLine.member}-${switchLine.optionId}`} className={styles.reveal} {...grow(8, reduce)}>
            <p className={styles.switched}>
              <b>{memberName(switchLine.member)}</b> switched to {switchPlace}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {pollNotice === 'fourth-added' && (
          // The wrapper grows (no padding of its own, so it can start from nothing).
          <motion.div key="fourth" className={styles.reveal} {...notice}>
            <div className={styles.notice} data-poll-notice>
              <p className={styles.noticeTitle}>
                {adder} added {placeName(added)}
              </p>
              <p className={styles.noticeText}>
                {myVote ? `Your vote stays on ${placeName(myVote)}. Want to switch?` : 'Want to vote for it?'}
              </p>
              <div className={styles.noticeActions}>
                {myVote && (
                  <button type="button" className={`${styles.pill} ${styles.pillQuiet}`} onClick={dismissPollNotice}>
                    Keep my vote
                  </button>
                )}
                <button type="button" className={`${styles.pill} ${styles.pillAct}`} onClick={seeOptions}>
                  See options
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {tie && (
          <motion.div key="tie" className={styles.reveal} {...notice}>
            <div className={styles.notice} data-poll-notice>
              <p className={styles.noticeTitle}>It's a tie! Let fate decide</p>
              <p className={styles.noticeText}>
                {/* Each "name count" stays on one line; the line only breaks at the dots. */}
                {t.leaders.map((id) => `${placeName(id)} ${t.counts[id]}`.replaceAll(' ', '\u00a0')).join(' · ')}
              </p>
              <Button className={styles.spin} onClick={spin} aria-disabled={rolling} aria-busy={rolling}>
                <motion.span
                  className={styles.dice}
                  aria-hidden="true"
                  initial={false}
                  animate={rolling ? DICE_ROLL : DICE_WIGGLE}
                  transition={rolling ? DICE_ROLL_T : DICE_WIGGLE_T}
                >
                  🎲
                </motion.span>
                Spin the dice
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {canSuggest && (
          <motion.div key="suggest" className={styles.reveal} {...grow(8, reduce)}>
            <button type="button" className={styles.suggest} onClick={() => openSheet('suggest')}>
              + Suggest a place
            </button>
          </motion.div>
        )}
        {!tie && (
          <motion.p key="footer" className={styles.footer} {...grow(8, reduce)}>
            {everyoneIn
              ? 'Everyone has voted'
              : `${waiting.length > 0 ? `Waiting for ${waiting.join(', ')} · ` : ''}closes when all vote or at ${poll.closesAt}`}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** A one-off burst of two sparkles and a popper (skipped with reduced motion). */
function Celebration() {
  return (
    <span className={styles.burst} aria-hidden="true">
      {PARTICLES.map((p) => (
        <motion.span
          key={`${p.glyph}${p.x}`}
          className={styles.particle}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: [0.4, 1.1, 1], rotate: p.rotate }}
          transition={{ duration: 0.7, delay: p.delay, ease: EASE_OUT, opacity: { duration: 0.7, delay: p.delay, times: [0, 0.15, 0.65, 1] } }}
        >
          {p.glyph}
        </motion.span>
      ))}
    </span>
  )
}
