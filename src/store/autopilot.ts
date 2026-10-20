// Autopilot: runs the group's scripted events (events.ts) on fixed timers, so a
// PM can demo the scenario without touching the demo controls. Deterministic:
// the same taps always produce the same sequence and timing.

import { nextEvent } from './events'
import type { ScriptEvent } from './events'
import type { ScenarioState } from './scenario'

/** Delay (ms) after an event becomes possible before it runs. */
export const EVENT_DELAY: Record<string, number> = {
  // 03 → G0: the invite is out; Ren's phone shows, he types his name, taps Join, and Ari's phone is back.
  'ren-opens-link': 2200,
  'ren-joins': 2400,
  'ren-back': 1500,
  // 05: the push banner shows first (~2.4s), then votes land one by one.
  'vote-maya': 3000,
  'vote-theo': 1300,
  'vote-nic': 1300,
  // After Ari votes, leave the Hi-fi 1 state (4 of 6) on screen for a moment, then Nic switches.
  'switch-nic': 2600,
  'vote-sam': 1400,
  'vote-ren': 1400,
  // "6 of 6 voted · closing…" before the winner lands.
  'close-poll': 1900,
  // 06: drinks answers trickle in after the winner has landed.
  'drinks-maya': 1800,
  'drinks-theo': 900,
  'drinks-sam': 900,
  'drinks-nic': 900,
  // Time to read the decided stop before the evening moves on.
  'end-dinner': 5000,
  // 09B: friends pay from their own phones once Ari has paid.
  'pay-theo': 2000, // after Ari's balance has finished counting to €0
  'pay-sam': 1100,
  'pay-nic': 1100,
  'pay-maya': 1100,
  'pay-ren': 1100,
  'confirm-cash': 2600,
  'squared-up': 2400,
}

/** Events wait while the user is busy with something that would hide them. */
function holds(e: ScriptEvent, s: ScenarioState & { demoOpen: boolean }): boolean {
  if (s.demoOpen) return true
  if (s.screen === 'guest-poll' || s.screen === 'guest-pay') return true
  // Ren's join page plays its own two moments; nothing else happens while it shows.
  if (s.screen === 'guest-join') return e.id !== 'ren-joins' && e.id !== 'ren-back'
  // Payments tick in on the Money tab, so wait until the Pay sheet is closed.
  if (e.id.startsWith('pay-') || e.id === 'squared-up') return s.sheet !== null
  // The evening only moves on from the Plan tab, with nothing on top of it.
  if (e.id === 'end-dinner') return s.screen !== 'hub' || s.hubTab !== 'plan' || s.sheet !== null
  return false
}

interface Store<S> {
  getState: () => S
  subscribe: (listener: (s: S) => void) => () => void
}

type PilotState = ScenarioState & {
  demoOpen: boolean
  autoplay: boolean
  runNextEvent: () => void
  runEndDinnerWithInterlude: () => void
}

export function startAutopilot<S extends PilotState>(store: Store<S>): () => void {
  let pending: { id: string; timer: number } | null = null

  const cancel = () => {
    if (pending) window.clearTimeout(pending.timer)
    pending = null
  }

  const check = () => {
    const s = store.getState()
    const e = s.autoplay ? nextEvent(s) : undefined
    if (!e || holds(e, s)) {
      cancel()
      return
    }
    if (pending?.id === e.id) return
    cancel()
    pending = {
      id: e.id,
      timer: window.setTimeout(() => {
        pending = null
        const now = store.getState()
        const still = now.autoplay ? nextEvent(now) : undefined
        if (!still || still.id !== e.id || holds(still, now)) return check()
        if (e.id === 'end-dinner') now.runEndDinnerWithInterlude()
        else now.runNextEvent()
      }, EVENT_DELAY[e.id] ?? 1200),
    }
  }

  const unsubscribe = store.subscribe(check)
  check()
  return () => {
    unsubscribe()
    cancel()
  }
}
