// What a place can do on the last night: go in the group's Ideas, fill one of tonight's
// slots (the 20:30 dinner, the 23:30 drinks) or join the dinner poll. One honest state per
// option, so the Explore menu says why before you tap, and the map's toasts say the same.

import { memberName } from '../../components/names'
import { exploreEntry, savedBy, slotFor } from '../../data/explore'
import { DINNER_PLAN_ID, DRINKS_PLAN_ID } from '../../data/seed'
import { canAddOption, MAX_POLL_OPTIONS } from '../../domain/poll'
import type { MemberId, Place } from '../../domain/types'
import type { ScenarioState } from '../../store/scenario'
import type { AgentContext } from './agent'

type Trip = Pick<ScenarioState, 'data' | 'poll' | 'decided' | 'ideas' | 'clock'>

export type RowState = 'available' | 'done' | 'blocked'

export interface ActionRow {
  state: RowState
  title: string
  note: string
  /** The slot's time, for the plan rows. */
  time?: string
}

export interface PlaceActions {
  ideas: ActionRow
  dinner?: ActionRow
  drinks?: ActionRow
  poll?: ActionRow
}

const who = (m: MemberId, me: MemberId) => (m === me ? 'you' : memberName(m))
const short = (p: Place) => p.shortName ?? p.name

/** A place as Ari saves it: its source says who saved it, like the trip's own Ideas. */
export const asIdea = (place: Place, me: MemberId): Place => ({ ...place, source: `In your Ideas · saved by ${memberName(me)}` })

/** Tonight's 20:30 dinner: still open, a poll is live, or decided (by the poll or by someone). */
export function dinnerState(s: Trip): AgentContext['dinner'] {
  if (s.decided || s.poll?.status === 'closed') return 'decided'
  return s.poll ? 'poll' : 'open'
}

/** What the agent and the list hints need to know about tonight right now. */
export function agentContext(s: Trip): AgentContext {
  const drinks = s.data.plans.find((p) => p.id === DRINKS_PLAN_ID)
  const at = drinks?.placeId ? s.data.places.find((p) => p.id === drinks.placeId) : undefined
  const dinner = dinnerState(s)
  return {
    dinner,
    clock: s.clock,
    ...(dinner === 'poll' && s.poll && !canAddOption(s.poll) ? { pollFull: true } : {}),
    ...(at ? { drinksAt: short(at) } : {}),
  }
}

/** The "+ Add" menu's rows for a place: Ideas always; dinner and its poll, or drinks, when it fits. */
export function placeActions(s: Trip, place: Place): PlaceActions {
  const me = s.data.trip.me
  const slot = slotFor(place.id)
  const saver = savedBy(place.id, me)
  const out: PlaceActions = {
    ideas: s.ideas.includes(place.id)
      ? { state: 'done', title: 'In Ideas', note: saver ? `Saved by ${who(saver, me)}` : 'Saved by the group' }
      : { state: 'available', title: 'Add to Ideas', note: 'The group’s list: everyone can see it' },
  }

  const dinner = s.data.plans.find((p) => p.id === DINNER_PLAN_ID)
  if (slot === 'dinner' && dinner) {
    const state = dinnerState(s)
    out.dinner =
      state === 'decided'
        ? dinner.placeId === place.id
          ? { state: 'done', title: dinner.title, note: 'Already tonight’s dinner', time: dinner.time }
          : { state: 'blocked', title: dinner.title, note: 'Already decided', time: dinner.time }
        : state === 'poll'
          ? { state: 'blocked', title: dinner.title, note: 'A poll is live: add it to the poll instead', time: dinner.time }
          : { state: 'available', title: dinner.title, note: 'Open · you pick, the group is notified', time: dinner.time }

    const poll = s.poll
    const title = 'Tonight’s dinner poll'
    out.poll =
      state === 'decided'
        ? { state: 'blocked', title, note: 'Closed · dinner is decided' }
        : !poll
          ? { state: 'available', title, note: 'No poll yet · start one' }
          : poll.optionIds.includes(place.id)
            ? { state: 'done', title, note: 'Already in the poll' }
            : !canAddOption(poll)
              ? { state: 'blocked', title, note: `Full · ${MAX_POLL_OPTIONS} of ${MAX_POLL_OPTIONS} places` }
              : { state: 'available', title, note: `Live · ${poll.optionIds.length} of ${MAX_POLL_OPTIONS} places · add it` }
  }

  const drinks = s.data.plans.find((p) => p.id === DRINKS_PLAN_ID)
  if (slot === 'drinks' && drinks) {
    out.drinks =
      drinks.placeId === place.id
        ? { state: 'done', title: drinks.title, note: 'Already tonight’s drinks', time: drinks.time }
        : drinks.placeId
          ? { state: 'available', title: drinks.title, note: `Optional · switch to ${short(place)}`, time: drinks.time }
          : { state: 'available', title: drinks.title, note: `Optional · it becomes Drinks at ${short(place)}`, time: drinks.time }
  }
  return out
}

/** For a place no slot of tonight's fits (a sight, a bakery): say so, and point to Ideas. */
export function noSlotLine(s: Pick<Trip, 'ideas'>, place: Place): string {
  return `Tonight’s open slots are dinner and drinks, so ${short(place)} ${s.ideas.includes(place.id) ? 'stays in Ideas' : 'is one for Ideas'}.`
}

/**
 * The card's second line: where the place stands tonight, whether the crew has been, and
 * Ideas ("Saved by Maya" in the Ideas list, "In Ideas ✓" elsewhere).
 */
export function placeNote(s: Trip, id: string, { savers = false }: { savers?: boolean } = {}): string {
  const me = s.data.trip.me
  const parts: string[] = []
  const plan = (planId: string) => s.data.plans.find((p) => p.id === planId)
  if (s.decided && plan(DINNER_PLAN_ID)?.placeId === id) parts.push('Tonight’s dinner')
  else if (s.poll?.status === 'open' && s.poll.optionIds.includes(id)) parts.push('In tonight’s poll')
  if (plan(DRINKS_PLAN_ID)?.placeId === id) parts.push('Tonight’s drinks')

  const been = exploreEntry(id)?.been
  if (been) {
    const day = been.day === s.data.trip.today ? 'today' : `Day ${been.day}`
    parts.push(been.who ? `${been.who.map((m) => who(m, me)).join(' & ')} went · ${day}` : been.day === s.data.trip.today ? 'Been here today' : `Been here · ${day}`)
  }

  if (s.ideas.includes(id)) {
    const saver = savedBy(id, me)
    parts.push(savers ? (saver ? `Saved by ${who(saver, me)}` : 'Saved by the group') : 'In Ideas ✓')
  }
  return parts.join(' · ')
}
