import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { memberName } from '../../components/names'
import { useAnimatedNumber } from '../../components/useAnimatedNumber'
import { buildDinnerExpense, formatEUR, restOfBill, shareFor } from '../../domain/money'
import type { MemberId } from '../../domain/types'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import type { SplitPreset, WineChoice } from '../../store/app'
import { billAttendees, billDraft } from '../../store/scenario'
import { PaidByPicker } from './PaidByPicker'
import { Roll } from './Roll'
import styles from './LogBill.module.css'

/** "No tip added +" adds a 10% tip of the total (rounded to cents); the engine splits it by share. */
const TIP_RATE = 0.1

const EASE = [0.22, 1, 0.36, 1] as const
/** Wine block in/out when the preset changes: height and the 24px gap after it, so nothing below jumps. */
const WINE_HIDDEN = { height: 0, opacity: 0, marginBottom: -24, overflow: 'hidden' as const }
const WINE_SHOWN = { height: 'auto', opacity: 1, marginBottom: 0, transitionEnd: { overflow: 'visible' as const } }

const PRESETS: { id: SplitPreset; label: string }[] = [
  { id: 'share-all', label: 'Share all' },
  { id: 'partial', label: 'Partially separate' },
  { id: 'each-own', label: 'Each pays own' },
]

/** 07 · Log the bill (Hi-fi 2). Every amount is computed from the store's draft. */
export function LogBill() {
  const state = useApp()
  const { data, bill, setWine, setPreset, setTip, saveBill, closeBill, showToast } = state
  const [picking, setPicking] = useState(false)
  const reduce = useReducedMotion()
  const draft = billDraft(state)
  const expense = draft ? buildDinnerExpense(draft) : null
  const myShare = expense ? shareFor(data.trip.me, expense) : 0
  // "Your share" counts calmly to each new value; the first render shows the value itself.
  const shownShare = useAnimatedNumber(myShare, { duration: 0.55 })
  if (!bill || !draft || !expense) return null

  const me = data.trip.me
  const d = data.dinnerBill
  const attendees = billAttendees(state)
  const crewTiles = attendees.filter((m) => data.members.find((x) => x.id === m)?.kind === 'crew')
  const guests = attendees.filter((m) => !crewTiles.includes(m))

  const splitWine = bill.preset === 'partial'
  const drinkers = draft.splitOut[0]?.participants.filter((m) => attendees.includes(m)) ?? []
  const rest = restOfBill(draft)
  const restEach = Math.floor(rest / attendees.length)
  const wineEach = drinkers.length ? Math.floor(d.wine.amountCents / drinkers.length) : 0
  // The wine can't end up shared by nobody: keep at least one person on it.
  const chooseWine = (m: MemberId, choice: WineChoice) => {
    if (choice === 'out' && drinkers.length === 1 && drinkers[0] === m) {
      showToast('Someone has to share the wine. Or pick Share all.')
      return
    }
    setWine(m, choice)
  }
  const plan = data.plans.find((p) => p.id === d.planId)
  const place = data.places.find((p) => p.id === plan?.placeId)
  const tip = bill.tipCents

  return (
    <main className={styles.screen}>
      <div className={styles.topBlock}>
        <StatusBar tone="onLight" />
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.headerSpacer} aria-hidden="true" />
            <h1 className={styles.title}>Log the bill</h1>
            <button type="button" className={styles.close} aria-label="Close" onClick={closeBill}>
              <Icon name="cancel" size={28} />
            </button>
          </div>
          {/* Only the bill scrolls: the title and × stay put, clear of the clock on phones. */}
          <div className={styles.scroll}>

          <div className={styles.planCard}>
            <p className={styles.planName}>{place?.name ?? d.title}</p>
            <p className={styles.planMeta}>
              From your plan · {plan?.time ?? d.time} · {attendees.length} people
            </p>
          </div>

          <div className={styles.group8}>
            <div className={styles.row}>
              <span className={styles.label}>Paid by</span>
              <button
                type="button"
                className={styles.dropdown}
                aria-haspopup="dialog"
                onClick={() => setPicking(true)}
              >
                <span className="visually-hidden">Paid by </span>
                <Avatar member={bill.paidBy} size={20} labelled={false} />
                <span className={styles.dropdownText}>{bill.paidBy === me ? `${memberName(me)} (you)` : memberName(bill.paidBy)}</span>
                <Icon name="dropdown" size={12} className={styles.dropdownIcon} />
              </button>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Total</span>
              <div className={styles.totalRight}>
                <span className={styles.total}>{formatEUR(bill.totalCents + bill.tipCents)}</span>
                <button type="button" className={styles.photo} aria-label="Add receipt photo" onClick={() => showToast('✓ Receipt photo attached')}>
                  <Icon name="camera" size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.group8}>
            <div className={styles.preset}>
              <p className={styles.question}>How are we splitting this?</p>
              <div className={styles.segmented} role="radiogroup" aria-label="How are we splitting this?" onKeyDown={arrowKeys()}>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={bill.preset === p.id}
                    className={`${styles.segment} ${bill.preset === p.id ? styles.segmentOn : ''}`}
                    onClick={() => (p.id === 'each-own' ? showToast('Not part of this demo: try Share all or Partially separate') : setPreset(p.id))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.preselected}>
              <AnimatePresence initial={false}>
                {splitWine && (
                  <motion.div
                    key="wine"
                    className={styles.wineWrap}
                    initial={WINE_HIDDEN}
                    animate={WINE_SHOWN}
                    exit={WINE_HIDDEN}
                    transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE }}
                  >
                    <div className={styles.wine}>
                      <p className={styles.hint}>Pre-selected from tonight’s drinks answers</p>
                      <div className={styles.group8}>
                        <div className={styles.wineHead}>
                          <div className={styles.row}>
                            <span className={styles.wineLabel}>{d.wine.label}</span>
                            <span className={styles.wineAmount}>{formatEUR(d.wine.amountCents)}</span>
                          </div>
                          <p className={styles.caption}>Split out from the total · pre-filled from “Who's having drinks?”</p>
                        </div>

                        <div className={styles.tiles}>
                          <div className={styles.crewTiles}>
                            {/* A guest whose answer is set (his own, or Ari's ✓/✕) is a tile like everyone else's. */}
                            {[...crewTiles, ...guests.filter((m) => bill.wine[m] !== 'pending')].map((m) => (
                              <CrewTile
                                key={m}
                                member={m}
                                choice={bill.wine[m]}
                                onToggle={() => chooseWine(m, bill.wine[m] === 'out' ? 'in' : 'out')}
                              />
                            ))}
                          </div>
                          {guests
                            .filter((m) => bill.wine[m] === 'pending')
                            .map((m) => (
                              <GuestTile key={m} choice={bill.wine[m]} onChoose={(c) => chooseWine(m, c)} />
                            ))}
                        </div>

                        <p className={styles.summary} aria-live="polite" aria-atomic="true">
                          <b>
                            <Roll text={formatEUR(wineEach)} />
                          </b>{' '}
                          each · <b className={styles.violet}>
                            <Roll text={String(drinkers.length)} />
                          </b>{' '}
                          <span className={styles.violet}>people</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                className={styles.splitOut}
                onClick={() => showToast('Not part of this demo: tonight only the wine is split out')}
              >
                + Split out another item
              </button>

              <div className={styles.rest}>
                <div className={styles.row}>
                  <span className={styles.restTitle}>Rest of the bill</span>
                  <span className={styles.restTitle}>
                    <Roll text={formatEUR(rest)} />
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.restMeta}>
                    Auto-calculated ·{' '}
                    <b>
                      <Roll text={formatEUR(restEach)} align="left" /> each
                    </b>
                  </span>
                  <button
                    type="button"
                    className={styles.dropdown}
                    onClick={() => showToast('Not part of this demo: tonight the rest is split equally')}
                  >
                    <span className={styles.dropdownTextInk}>Split equally ({attendees.length})</span>
                    <Icon name="dropdown" size={12} className={styles.dropdownIcon} />
                  </button>
                </div>
              </div>

              <div className={styles.row}>
                <span className={styles.tipLabel}>Tip</span>
                <button
                  type="button"
                  className={styles.tip}
                  aria-label={tip > 0 ? `${formatEUR(tip)} · split by share. Remove tip` : 'No tip added. Add a 10% tip'}
                  onClick={() => setTip(tip > 0 ? 0 : Math.round(bill.totalCents * TIP_RATE))}
                >
                  <span className={styles.tipText}>
                    <Roll text={tip > 0 ? `${formatEUR(tip)} · split by share` : 'No tip added '} />
                  </span>
                  <span className={styles.tipIcon}>
                    <span className={styles.pad2}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={tip > 0 ? 'x' : 'plus'}
                          className={styles.tipGlyph}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE }}
                        >
                          <Icon name={tip > 0 ? 'x' : 'plus'} size={12} />
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
          </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.share}>
          <span className={styles.shareLabel}>Your share</span>
          <span className={styles.shareAmount} aria-hidden="true">
            {formatEUR(shownShare)}
          </span>
          <span className="visually-hidden" aria-live="polite">
            {formatEUR(myShare)}
          </span>
        </div>
        <button type="button" className={styles.save} onClick={saveBill}>
          Save
        </button>
      </div>

      <AnimatePresence>{picking && <PaidByPicker key="paid-by" onClose={() => setPicking(false)} />}</AnimatePresence>
    </main>
  )
}

function CrewTile({ member, choice, onToggle }: { member: MemberId; choice: WineChoice; onToggle: () => void }) {
  const reduce = useReducedMotion()
  const off = choice === 'out'
  return (
    <button
      type="button"
      className={styles.tile}
      aria-pressed={!off}
      aria-label={`${memberName(member)}: ${off ? 'not sharing the wine' : 'sharing the wine'}`}
      onClick={onToggle}
    >
      <Avatar member={member} size={36} ring={off ? 'off' : 'chosen'} labelled={false} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={off ? 'off' : 'on'}
          className={off ? styles.statusOff : styles.statusOn}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.55, opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 640, damping: 30 }}
        >
          <Icon name={off ? 'x' : 'check'} size={24} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** Ren hasn't answered "Who's having drinks?": counted in until he or Ari decides (violet = waiting on you); then he's a plain tile. */
function GuestTile({ choice, onChoose }: { choice: WineChoice; onChoose: (c: WineChoice) => void }) {
  const state = choice === 'pending' ? 'waiting' : choice === 'in' ? 'in' : 'off'
  return (
    <div className={styles.guestTile}>
      <span className={`${styles.guestPill} ${styles[`pill_${state}`]}`}>
        {/* A guest from the link has no photo: his monogram, as everywhere else. */}
        <Avatar member="ren" size={24} labelled={false} />
        <span className={styles.guestName}>
          <b>Ren</b>
          <Roll text={state} align="center" />
        </span>
      </span>
      <div className={styles.guestButtons}>
        <button
          type="button"
          className={`${styles.guestButton} ${choice === 'in' ? styles.guestYes : ''}`}
          aria-label="Ren shares the wine"
          aria-pressed={choice === 'in'}
          onClick={() => onChoose('in')}
        >
          <span className={choice === 'pending' ? styles.violet : choice === 'in' ? styles.statusOn : styles.statusHint}>
            <Icon name="check" size={24} />
          </span>
        </button>
        <button
          type="button"
          className={`${styles.guestButton} ${choice === 'out' ? styles.guestNo : ''}`}
          aria-label="Ren doesn’t share the wine"
          aria-pressed={choice === 'out'}
          onClick={() => onChoose('out')}
        >
          <span className={choice === 'in' ? styles.statusHint : styles.statusOff}>
            <Icon name="x" size={24} />
          </span>
        </button>
      </div>
    </div>
  )
}
