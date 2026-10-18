// Scripted "system" events: what the rest of the group does while Ari uses the
// app. Each event waits until it makes sense (ready), so the scenario always
// reaches the states drawn in Figma. Stage 3 runs them from the demo controls;
// stage 4 schedules them on timers.

import { DINNER_PLAN_ID } from '../data/seed'
import type { MemberId } from '../domain/types'
import * as sc from './scenario'
import type { ScenarioState } from './scenario'
import { moneyView } from './selectors'

export interface ScriptEvent {
  id: string
  label: string
  ready: (s: ScenarioState) => boolean
  run: (s: ScenarioState) => ScenarioState
}

const pollOpen = (s: ScenarioState) => s.poll?.status === 'open'
const voteBy = (member: MemberId, optionId: string, after?: (s: ScenarioState) => boolean): ScriptEvent => ({
  id: `vote-${member}`,
  label: `${member[0].toUpperCase()}${member.slice(1)} votes`,
  ready: (s) => pollOpen(s) && !sc.hasVoted(s, member) && (after ? after(s) : true),
  run: (s) => sc.vote(s, member, optionId),
})

const othersIn = (s: ScenarioState) => ['maya', 'theo', 'nic'].every((m) => sc.hasVoted(s, m as MemberId))
const ariIn = (s: ScenarioState) => sc.hasVoted(s, s.data.trip.me)

const drinksBy = (member: MemberId): ScriptEvent => ({
  id: `drinks-${member}`,
  label: `${member[0].toUpperCase()}${member.slice(1)} answers drinks`,
  ready: (s) => s.decided && !s.bill && s.drinks[member] === null,
  run: (s) => sc.answerDrinks(s, member, s.data.drinks[member]),
})

const payBy = (from: MemberId): ScriptEvent => ({
  id: `pay-${from}`,
  label: `${from[0].toUpperCase()}${from.slice(1)} pays`,
  ready: (s) => {
    if (!s.dinnerExpense) return false
    const me = s.data.trip.me
    const myRow = moneyView(s).rows.find((r) => !r.guest && r.transfer.from === me)
    const ariPaid = !myRow || myRow.status === 'paid'
    const row = moneyView(s).rows.find((r) => r.transfer.from === from)
    return ariPaid && !!row && row.status === 'open'
  },
  run: (s) => {
    const row = moneyView(s).rows.find((r) => r.transfer.from === from)!
    return sc.recordPayment(s, { ...row.transfer, method: 'bank', guest: row.guest })
  },
})

export const SCRIPT: ScriptEvent[] = [
  // 05: the group votes; Sam and Ren wait for Ari so the hi-fi state (4 of 6) always shows.
  voteBy('maya', 'ramiro'),
  voteBy('theo', 'taberna'),
  voteBy('nic', 'taberna'),
  voteBy('sam', 'ramiro', (s) => othersIn(s) && ariIn(s)),
  voteBy('ren', 'ramiro', (s) => othersIn(s) && ariIn(s) && (s.data.members.find((m) => m.id === 'ren')?.planIds ?? []).includes(DINNER_PLAN_ID) && !!s.poll?.eligible.includes('ren')),
  {
    id: 'close-poll',
    label: 'Everyone has voted: poll closes',
    ready: (s) => sc.pollReadyToClose(s),
    run: (s) => sc.decide(s),
  },
  // 06: drinks answers come in.
  drinksBy('maya'),
  drinksBy('theo'),
  drinksBy('sam'),
  drinksBy('nic'),
  // 06B: when the drinks answers are in, the evening moves on to 22:30.
  {
    id: 'end-dinner',
    label: 'It’s 22:30: dinner ends',
    ready: (s) => s.decided && !s.dinnerEnded && (['maya', 'theo', 'sam', 'nic'] as MemberId[]).every((m) => s.drinks[m] !== null),
    run: (s) => sc.endDinner(s),
  },
  // 09B: once Ari has paid, the others pay from their own phones.
  payBy('theo'),
  payBy('sam'),
  payBy('ren'),
  {
    id: 'confirm-cash',
    label: 'Maya confirms the cash',
    ready: (s) => s.payments.some((p) => p.status === 'awaiting-confirmation'),
    run: (s) => {
      const p = s.payments.find((x) => x.status === 'awaiting-confirmation')!
      return sc.confirmCash(s, p.from, p.to)
    },
  },
  {
    id: 'squared-up',
    label: 'All balances at €0: squared up',
    ready: (s) => s.screen !== 'squared' && moneyView(s).allSettled,
    run: (s) => sc.showSquaredUp(s),
  },
]

/** The next event that can run now, if any. */
export function nextEvent(s: ScenarioState): ScriptEvent | undefined {
  return SCRIPT.find((e) => !s.done.includes(e.id) && e.ready(s))
}

export function runEvent(s: ScenarioState, e: ScriptEvent): ScenarioState {
  return { ...e.run(s), done: [...s.done, e.id] }
}

/** Run every event that is ready, in order (used to build demo snapshots). */
export function runReady(s: ScenarioState, until?: (s: ScenarioState) => boolean): ScenarioState {
  let state = s
  for (let guard = 0; guard < 50; guard++) {
    if (until?.(state)) return state
    const e = nextEvent(state)
    if (!e) return state
    state = runEvent(state, e)
  }
  return state
}
