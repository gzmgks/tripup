// Scripted "system" events: what the rest of the group does while Ari uses the
// app. Each event waits until it makes sense (ready), so the scenario always
// reaches the states drawn in Figma. Stage 3 runs them from the demo controls;
// stage 4 schedules them on timers.

import { DINNER_PLAN_ID } from '../data/seed'
import { castVote, tally } from '../domain/poll'
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

/** The group's pick: Ramiro, or the poll's first place if Ari left Ramiro out of it. */
export function favourite(s: ScenarioState): string {
  const options = s.poll?.optionIds ?? []
  return options.includes('ramiro') ? 'ramiro' : options[0]
}

/** Theo's and Nic's first choice: Taberna, or another place if Taberna isn't in the poll. */
function rival(s: ScenarioState): string {
  const fav = favourite(s)
  const options = s.poll?.optionIds ?? []
  return options.find((o) => o === 'taberna' && o !== fav) ?? options.find((o) => o !== fav) ?? fav
}

/** Scripted votes only ever go to places that are in the poll, so none is dropped. */
const voteBy = (member: MemberId, choose: (s: ScenarioState) => string, after?: (s: ScenarioState) => boolean): ScriptEvent => ({
  id: `vote-${member}`,
  label: `${member[0].toUpperCase()}${member.slice(1)} votes`,
  ready: (s) => pollOpen(s) && !sc.hasVoted(s, member) && (after ? after(s) : true),
  run: (s) => sc.vote(s, member, choose(s)),
})

const othersIn = (s: ScenarioState) => ['maya', 'theo', 'nic'].every((m) => sc.hasVoted(s, m as MemberId))
const ariIn = (s: ScenarioState) => sc.hasVoted(s, s.data.trip.me)
/** Nic has moved to the group's pick (or that step is skipped, as in the tie edge case). */
const nicSwitched = (s: ScenarioState) => s.done.includes('switch-nic') || s.poll?.votes.nic === favourite(s)
const renVotes = (s: ScenarioState) =>
  (s.data.members.find((m) => m.id === 'ren')?.planIds ?? []).includes(DINNER_PLAN_ID) && !!s.poll?.eligible.includes('ren')

/**
 * Would the poll still end level once Sam (and Ren) vote for the group's pick? Only when Ren
 * votes from his link for the same place as Ari (3–3): then Theo comes round too.
 */
export function endsTied(s: ScenarioState): boolean {
  if (!s.poll) return false
  let poll = s.poll
  for (const m of ['sam', 'ren'] as MemberId[]) if (!poll.votes[m]) poll = castVote(poll, m, favourite(s))
  return tally(poll).leaders.length > 1
}
const theoNeeded = (s: ScenarioState) => !s.done.includes('switch-theo') && s.poll?.votes.theo !== favourite(s) && endsTied(s)

const drinksBy = (member: MemberId): ScriptEvent => ({
  id: `drinks-${member}`,
  label: `${member[0].toUpperCase()}${member.slice(1)} answers “Who’s having drinks?”`,
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
  // 03 → G0: Ren opens the invite link on his phone, joins, and Ari's phone hears "Ren joined".
  {
    id: 'ren-opens-link',
    label: 'Ren opens the invite link',
    ready: (s) => s.guestInvited && !s.guestAdded && s.screen === 'hub' && s.sheet === null,
    run: (s) => sc.openGuestJoin(s),
  },
  {
    id: 'ren-joins',
    label: 'Ren enters his name and joins',
    ready: (s) => s.guestInvited && !s.guestAdded && s.screen === 'guest-join',
    run: (s) => sc.joinGuest(s),
  },
  {
    id: 'ren-back',
    label: 'Back on Ari’s phone: Ren joined',
    ready: (s) => s.guestAdded && s.screen === 'guest-join',
    run: (s) => sc.backFromGuestJoin(s),
  },
  // 05: the group votes; the rest waits for Ari so the hi-fi state (4 of 6) always shows.
  voteBy('maya', favourite),
  voteBy('theo', rival),
  voteBy('nic', rival),
  // Then Nic changes his mind. With Sam and Ren on Ramiro too, Ramiro wins clearly whatever
  // Ari picked (4–1–1, 4–2 or 5–1): the happy path never ends in a tie.
  {
    id: 'switch-nic',
    label: 'Nic changes his vote',
    ready: (s) => pollOpen(s) && othersIn(s) && ariIn(s) && s.poll?.votes.nic !== favourite(s),
    run: (s) => sc.vote(s, 'nic', favourite(s)),
  },
  // Ren voting from his link for Ari's place would make it 3–3: Theo comes round as well.
  {
    id: 'switch-theo',
    label: 'Theo changes his vote',
    ready: (s) => pollOpen(s) && othersIn(s) && ariIn(s) && nicSwitched(s) && theoNeeded(s),
    run: (s) => sc.vote(s, 'theo', favourite(s)),
  },
  voteBy('sam', favourite, (s) => othersIn(s) && ariIn(s) && nicSwitched(s) && !theoNeeded(s)),
  voteBy('ren', favourite, (s) => othersIn(s) && ariIn(s) && nicSwitched(s) && !theoNeeded(s) && renVotes(s)),
  {
    id: 'close-poll',
    label: 'Everyone has voted: poll closes',
    ready: (s) => sc.pollReadyToClose(s),
    run: (s) => sc.decide(s),
  },
  // 06: drinks answers ("Who's having drinks?") come in.
  drinksBy('maya'),
  drinksBy('theo'),
  drinksBy('sam'),
  drinksBy('nic'),
  // 06B: when the drinks answers are in, the evening moves on to 22:30.
  {
    id: 'end-dinner',
    label: 'It’s 22:30 · dinner ends',
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
    // Once: after Squared Up, Ari goes Home and the trip is a past trip.
    ready: (s) => s.screen !== 'squared' && !s.squaredSeen && moneyView(s).allSettled,
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
