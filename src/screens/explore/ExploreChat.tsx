import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import explore from '../../assets/icons/explore.png'
import { Announce } from '../../components/Announce'
import { Icon } from '../../components/Icon'
import { SectionTitle } from '../../components/SectionTitle'
import { LISTS, placeFor } from '../../data/explore'
import type { ListId } from '../../data/explore'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { ActChip } from '../sheets/parts'
import shared from '../sheets/sheets.module.css'
import { QUESTIONS } from './agent'
import { PlaceCard } from './PlaceCard'
import { asIdea, placeNote } from './tonight'
import type { AgentChat, ChatMessage } from './useAgentChat'
import styles from './ExploreChat.module.css'

const ARRIVE = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } } as const

/** The nearest scrolling ancestor (FullScreen's body). */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if (o === 'auto' || o === 'scroll') return p
  }
  return null
}

/** Scroll just enough to show a new message, never so far that its top hides under the tabs. */
function reveal(el: HTMLElement, smooth: boolean) {
  const sc = scrollerOf(el)
  if (!sc) return
  const tabs = sc.querySelector<HTMLElement>('[data-sticky]')?.offsetHeight ?? 0
  const r = el.getBoundingClientRect()
  const box = sc.getBoundingClientRect()
  const by = Math.min(r.bottom - box.bottom + 16, r.top - (box.top + tabs) - 8)
  if (by > 0) sc.scrollBy({ top: by, behavior: smooth ? 'smooth' : 'auto' })
}

/**
 * The AI travel agent: a short chat with suggestion chips (what, where, when, budget), then
 * place cards. Agent bubbles are BG with ink text (violet is for acting, not talking); Ari's
 * answers are the chosen chip, in Lime. Replies are read out through a live region.
 */
export function ExploreChat({ chat, onAdd, onBrowse }: { chat: AgentChat; onAdd: (place: Place) => void; onBrowse: (list: ListId) => void }) {
  const trip = useApp(useShallow((s) => ({ data: s.data, poll: s.poll, decided: s.decided, ideas: s.ideas, clock: s.clock })))
  const saveIdea = useApp((s) => s.saveIdea)
  const showToast = useApp((s) => s.showToast)
  const reduce = useReducedMotion()
  const list = useRef<HTMLOListElement>(null)

  const { log, typing, via } = chat
  const last = log[log.length - 1]
  const places = (m: ChatMessage) => (m.ids ?? []).map((id) => placeFor(id, trip.data.places)).filter((p) => p !== undefined)

  // Each new message (and the typing dots) scrolls into view; after a tapped chip, focus moves on
  // to the reply's first control, so keyboard and screen-reader users carry on from there.
  const seen = useRef(log)
  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>('[data-msg]')
    const el = items?.[items.length - 1]
    if (!el) return
    reveal(el, !reduce)
    if (seen.current !== log && !typing) {
      seen.current = log
      if (via === 'chip' && last.from === 'agent') el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
    }
  }, [log, typing, via, last, reduce])

  const said = last.from === 'agent' ? [...last.lines, ...places(last).map((p) => p.name)].join(' ') : ''

  const unsaved = (m: ChatMessage) => places(m).filter((p) => !trip.ideas.includes(p.id))
  const saveAll = (m: ChatMessage) => {
    const todo = unsaved(m)
    for (const p of todo) saveIdea(asIdea(p, trip.data.trip.me))
    showToast(todo.length === 1 ? `✓ ${todo[0].name} saved to Ideas` : `✓ ${todo.length} places saved to Ideas`)
    // The button goes once everything is saved: keep focus in the chat, on "Start over".
    requestAnimationFrame(() => {
      if (!list.current?.contains(document.activeElement)) list.current?.querySelector<HTMLElement>('[data-followups] button')?.focus()
    })
  }

  return (
    <div className={styles.chat}>
      <ol ref={list} className={styles.log} aria-label="Chat with TripUp AI">
        {log.map((m, i) => {
          const isLast = m === last && !typing
          if (m.from === 'me')
            return (
              <motion.li key={m.id} data-msg className={styles.mine} {...ARRIVE}>
                <p className={styles.myBubble}>
                  <span className="visually-hidden">You: </span>
                  {m.lines[0]}
                </p>
              </motion.li>
            )
          const found = places(m)
          // Ideas are the useful thing to do with "tomorrow" and "next trip": save them in one go.
          const offerSave = isLast && m.ids && chat.answers.when !== 'tonight' && unsaved(m).length > 0
          return (
            <motion.li key={m.id} data-msg className={styles.agent} {...(i === 0 ? { initial: false } : ARRIVE)}>
              <div className={styles.agentRow}>
                <AgentAvatar />
                <div className={styles.bubbles}>
                  <span className="visually-hidden">TripUp AI: </span>
                  {m.lines.map((line) => (
                    <p key={line} className={styles.bubble}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              {found.length > 0 && (
                <div className={shared.stack}>
                  {found.map((p) => (
                    <PlaceCard key={p.id} place={p} note={placeNote(trip, p.id)} onAdd={onAdd} />
                  ))}
                </div>
              )}
              {isLast && m.ask && (
                <div className={`${shared.chips} ${styles.replies}`} role="group" aria-label={QUESTIONS[m.ask].prompt}>
                  {QUESTIONS[m.ask].choices.map((c) => (
                    <button key={c.value} type="button" className={shared.chip} onClick={() => chat.choose(m.ask!, c)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {isLast && !m.ask && (
                <div className={`${shared.chips} ${found.length ? '' : styles.replies}`} data-followups>
                  {offerSave && (
                    <ActChip onClick={() => saveAll(m)}>{unsaved(m).length === found.length ? `Save all ${found.length} to Ideas` : 'Save the rest to Ideas'}</ActChip>
                  )}
                  <ActChip onClick={chat.restart}>Start over</ActChip>
                </div>
              )}
            </motion.li>
          )
        })}
        {typing && (
          <motion.li key="typing" data-msg className={styles.agentRow} {...ARRIVE}>
            <AgentAvatar />
            <span className={`${styles.bubble} ${styles.typing}`}>
              <span className="visually-hidden">TripUp AI is typing</span>
              <i />
              <i />
              <i />
            </span>
          </motion.li>
        )}
      </ol>
      {/* Before the first answer, the lists are one tap away too. */}
      {log.length === 1 && !typing && (
        <section className={`${shared.section} ${styles.browse}`} aria-labelledby="explore-browse-title">
          <SectionTitle id="explore-browse-title">Or browse</SectionTitle>
          <div className={shared.stack}>
            {LISTS.map((l) => (
              <button key={l.id} type="button" className={`${shared.card} ${styles.list}`} onClick={() => onBrowse(l.id)}>
                <span className={shared.rowText}>
                  <span className={shared.itemTitle}>{l.title}</span>
                  <span className={shared.note}>
                    {l.ids.length} places ·{' '}
                    {l.ids
                      .slice(0, 3)
                      .map((id) => placeFor(id, trip.data.places))
                      .map((p) => p?.shortName ?? p?.name)
                      .join(', ')}
                    …
                  </span>
                </span>
                <Icon name="chevron-left" size={20} className={shared.chevron} />
              </button>
            ))}
          </div>
        </section>
      )}
      <Announce text={said} />
    </div>
  )
}

function AgentAvatar() {
  return (
    <span className={styles.avatar} aria-hidden="true">
      <img src={explore} alt="" />
    </span>
  )
}

/** The chat's input in FullScreen's footer. Chips stay the main way in; typing understands the same four things. */
export function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0
  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        onSend(text.trim())
        setText('')
      }}
    >
      <label className="visually-hidden" htmlFor="explore-ask">
        Ask TripUp AI
      </label>
      <input
        id="explore-ask"
        className={styles.field}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Or type: cheap eats near us"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
      />
      <button type="submit" className={`${styles.send} ${ready ? styles.sendReady : ''}`} aria-label="Send" aria-disabled={!ready}>
        <Icon name="chevron-left" size={20} className={styles.sendIcon} />
      </button>
    </form>
  )
}
