// The scenario as pure state transitions. The store calls these; demo jump
// points are built by replaying them, so every snapshot is a state the real
// flow can reach.

import { createInitialTrip, DINNER_PLAN_ID, DINNER_POLL_ID, DRINKS_PLAN_ID, decideDinner, INITIAL_IDEAS } from '../data/seed'
import type { TripState } from '../data/seed'
import { buildDinnerExpense } from '../domain/money'
import type { BillDraft } from '../domain/money'
import { addOption, castVote, closePoll, shouldClose, tally } from '../domain/poll'
import type { ClockTime, DrinksAnswer, Expense, MemberId, Place, Poll, Transfer } from '../domain/types'

export type ScreenId = 'home' | 'hub' | 'bill' | 'squared' | 'guest-join' | 'guest-poll' | 'guest-pay' | 'preview-tokens' | 'preview-light'
export type HubTab = 'plan' | 'money'
export type SheetId = 'add-people' | 'decide' | 'pay' | 'suggest' | 'add-plan' | 'explore' | 'full-map'

/** Wine chip state on Log the bill. 'pending' = no drinks answer yet, counts as in. */
export type WineChoice = 'in' | 'out' | 'pending'
export type SplitPreset = 'share-all' | 'partial' | 'each-own'
export type DecideMode = 'vote' | 'chance' | 'someone'
export type PayMethod = 'bank' | 'card' | 'cash'
export type PayPhase = 'choose' | 'approving' | 'processing' | 'paid' | 'failed' | 'awaiting-confirmation'

export interface BillDraftState {
  paidBy: MemberId
  totalCents: number
  preset: SplitPreset
  wine: Record<MemberId, WineChoice>
  tipCents: number
}

export interface Payment {
  id: string
  from: MemberId
  to: MemberId
  amountCents: number
  method: PayMethod
  /** Cash needs the receiver to confirm before it counts. */
  status: 'paid' | 'awaiting-confirmation'
  /** Guest paying the bill's payer directly (outside the group balances). */
  guest?: boolean
}

export interface PayFlow {
  transfer: Transfer
  method: PayMethod
  phase: PayPhase
}

export type BannerKind = 'group-push' | 'who-paid'

export interface Banner {
  id: number
  kind: BannerKind
}

/** Poll callouts shown inside the live poll card. */
export type PollNotice = null | 'fourth-added' | 'tie'

export interface ScenarioState {
  screen: ScreenId
  hubTab: HubTab
  sheet: SheetId | null
  data: TripState
  /** Story clock (not the static status bar). */
  clock: ClockTime
  /** Ren has been invited by link (03): "Invited · waiting to join" until he joins. */
  guestInvited: boolean
  /** Ren has joined from the link: a guest member who can vote (03 → G0). */
  guestAdded: boolean
  guestPlanIds: string[]
  decideMode: DecideMode
  poll: Poll | null
  pollNotice: PollNotice
  drinks: Record<MemberId, DrinksAnswer>
  /** Set once the poll has closed and the winner filled the slot (06). */
  decided: boolean
  /** The dinner stop has ended (06B, 22:30). */
  dinnerEnded: boolean
  bill: BillDraftState | null
  /** Saved bill (07 → 08). */
  dinnerExpense: Expense | null
  payments: Payment[]
  payFlow: PayFlow | null
  banner: Banner | null
  /** Scripted system events that already ran (see events.ts). */
  done: string[]
  /** Demo flag: the next bank payment fails (09 edge case). */
  failNextPayment: boolean
  /** Where "Back to Ari's phone" returns to. */
  guestReturn: ScreenId
  /** The group's Ideas: place ids (trip places or Explore catalog ids). */
  ideas: string[]
  /** Squared Up has shown: the trip is closed and Home lists it under Past trips. */
  squaredSeen: boolean
}

let bannerId = 0
const banner = (kind: BannerKind): Banner => ({ id: ++bannerId, kind })

export function freshScenario(): ScenarioState {
  const data = createInitialTrip()
  return {
    screen: 'home',
    hubTab: 'plan',
    sheet: null,
    data,
    clock: '18:40',
    guestInvited: false,
    guestAdded: false,
    guestPlanIds: [DINNER_PLAN_ID],
    decideMode: 'vote',
    poll: null,
    pollNotice: null,
    // Only Ari's own answer exists at first ("I'm in" is pre-selected); the others arrive (events.ts).
    drinks: { ari: data.drinks.ari, maya: null, theo: null, sam: null, nic: null, ren: null },
    decided: false,
    dinnerEnded: false,
    bill: null,
    dinnerExpense: null,
    payments: [],
    payFlow: null,
    banner: null,
    done: [],
    failNextPayment: false,
    guestReturn: 'hub',
    ideas: [...INITIAL_IDEAS],
    squaredSeen: false,
  }
}

const mapPlans = (s: ScenarioState, f: (p: TripState['plans'][number]) => TripState['plans'][number]): TripState => ({
  ...s.data,
  plans: s.data.plans.map(f),
})

// ── 01 → 02 ────────────────────────────────────────────────────────────

export const openTrip = (s: ScenarioState): ScenarioState => ({ ...s, screen: 'hub', hubTab: 'plan', sheet: null })

export const goHome = (s: ScenarioState): ScenarioState => ({ ...s, screen: 'home', sheet: null, payFlow: null, banner: null })

// ── Explore · Ideas ────────────────────────────────────────────────────

/** Make an Explore catalog place a trip place (idempotent), so plans and polls can use it. */
export const addPlace = (s: ScenarioState, place: Place): ScenarioState =>
  s.data.places.some((p) => p.id === place.id) ? s : { ...s, data: { ...s.data, places: [...s.data.places, place] } }

/** "Add to a plan" → tonight's 23:30 drinks slot: the place fills it (the plan stays optional). */
export function fillDrinks(s: ScenarioState, placeId: string): ScenarioState {
  const place = s.data.places.find((p) => p.id === placeId)
  if (!place) return s
  return { ...s, data: mapPlans(s, (p) => (p.id === DRINKS_PLAN_ID ? { ...p, placeId, title: `Drinks at ${place.shortName ?? place.name}` } : p)) }
}

/** Save a place to the group's Ideas (idempotent). */
export const saveIdea = (s: ScenarioState, placeId: string): ScenarioState =>
  s.ideas.includes(placeId) ? s : { ...s, ideas: [...s.ideas, placeId] }

// ── 03 · Add people ────────────────────────────────────────────────────

/**
 * Ari invites Ren from the header "+ Add": he is "Invited · waiting to join" for the plans she
 * ticked, until he opens the link (joinGuest). Already joined: this just saves his plans.
 */
export function inviteGuest(s: ScenarioState, planIds: string[] = [DINNER_PLAN_ID]): ScenarioState {
  const ids = planIds.length ? planIds : [DINNER_PLAN_ID]
  const next: ScenarioState = {
    ...s,
    guestInvited: true,
    guestPlanIds: ids,
    sheet: null,
    data: {
      ...s.data,
      members: s.data.members.map((m) => (m.id === 'ren' ? { ...m, planIds: ids } : m)),
    },
  }
  return s.guestAdded ? joinGuest(next) : next
}

/** Ren opens the link, enters his name and taps Join: a guest member who can vote (G0 → 03). */
export function joinGuest(s: ScenarioState): ScenarioState {
  if (!s.guestInvited) return s
  const ids = s.guestPlanIds
  // Joined while the dinner poll is live: he gets a vote too. Moved off the dinner: he loses it,
  // so the poll doesn't wait for him.
  let poll = s.poll
  if (poll && poll.status === 'open') {
    const inDinner = ids.includes(DINNER_PLAN_ID)
    if (inDinner && !poll.eligible.includes('ren')) poll = { ...poll, eligible: [...poll.eligible, 'ren' as const] }
    if (!inDinner && poll.eligible.includes('ren')) {
      const { ren: _dropped, ...votes } = poll.votes
      poll = { ...poll, eligible: poll.eligible.filter((m) => m !== 'ren'), votes }
    }
  }
  // His vote went with him: if he comes back, he votes again (the scripted vote can run).
  const done = poll && !poll.votes.ren && s.poll?.votes.ren ? s.done.filter((id) => id !== 'vote-ren') : s.done
  // The tie callout follows the new count (same rule as vote()).
  const t = poll && poll.status === 'open' ? tally(poll) : null
  const pollNotice = t && s.pollNotice === 'tie' && !(t.waitingFor.length === 0 && t.leaders.length > 1) ? null : s.pollNotice
  return { ...s, poll, done, pollNotice, guestAdded: true }
}

/** Invite and join in one go (demo jump points and tests). */
export const addGuest = (s: ScenarioState, planIds: string[] = [DINNER_PLAN_ID]): ScenarioState => joinGuest(inviteGuest(s, planIds))

/** Ren's phone: he opened the invite link (G0). */
export const openGuestJoin = (s: ScenarioState): ScenarioState =>
  s.guestInvited && !s.guestAdded ? { ...s, screen: 'guest-join', sheet: null, banner: null, guestReturn: s.screen.startsWith('guest') ? s.guestReturn : s.screen } : s

/** Back to Ari's phone after Ren joined. */
export const backFromGuestJoin = (s: ScenarioState): ScenarioState => (s.screen === 'guest-join' ? { ...s, screen: s.guestReturn } : s)

// ── 04 · Decide → 05 · Live poll ────────────────────────────────────────

export function startPoll(s: ScenarioState, optionIds?: string[], closesAt?: ClockTime): ScenarioState {
  if (s.poll && (s.poll.status === 'open' || s.decided)) return s
  const script = s.data.pollScript
  const eligible = s.data.members
    .filter((m) => m.kind === 'crew' || (s.guestAdded && (m.planIds ?? []).includes(DINNER_PLAN_ID)))
    .map((m) => m.id)
  const poll: Poll = {
    ...script.poll,
    optionIds: optionIds?.length ? optionIds.slice(0, 4) : script.poll.optionIds,
    eligible,
    votes: {},
    status: 'open',
    closesAt: closesAt ?? script.poll.closesAt,
  }
  return {
    ...s,
    sheet: null,
    screen: 'hub',
    hubTab: 'plan',
    poll,
    pollNotice: null,
    banner: banner('group-push'),
    data: mapPlans(s, (p) => (p.id === DINNER_PLAN_ID ? { ...p, status: 'poll', pollId: DINNER_POLL_ID } : p)),
  }
}

export function vote(s: ScenarioState, member: MemberId, optionId: string): ScenarioState {
  if (!s.poll || s.poll.status !== 'open') return s
  const poll = castVote(s.poll, member, optionId)
  // A tie with everyone in shows the "Let fate decide" callout instead of closing.
  const t = tally(poll)
  const tie = t.waitingFor.length === 0 && t.leaders.length > 1
  return { ...s, poll, pollNotice: tie ? 'tie' : s.pollNotice === 'tie' ? null : s.pollNotice }
}

export function suggestPlace(s: ScenarioState, placeId: string, by: MemberId): ScenarioState {
  if (!s.poll) return s
  const poll = addOption(s.poll, placeId)
  if (poll === s.poll) return s
  return { ...s, poll, sheet: null, pollNotice: by === s.data.trip.me ? s.pollNotice : 'fourth-added' }
}

export const dismissPollNotice = (s: ScenarioState): ScenarioState => ({ ...s, pollNotice: null })

/** Close the poll and put the winner in the 20:30 slot (06). */
export function decide(s: ScenarioState, tieBreakWinner?: string): ScenarioState {
  if (!s.poll || s.poll.status === 'closed') return s
  const t = tally(s.poll)
  const fallback = tieBreakWinner ?? (t.leaders.includes('ramiro') ? 'ramiro' : t.leaders[0] ?? s.poll.optionIds[0])
  const poll = closePoll(s.poll, { tieBreakWinner: fallback })
  return landWinner({ ...s, poll, pollNotice: null }, poll.winnerId!)
}

function landWinner(s: ScenarioState, placeId: string): ScenarioState {
  const place = s.data.places.find((p) => p.id === placeId)!
  return {
    ...s,
    decided: true,
    data: mapPlans(s, (p) => (p.id === DINNER_PLAN_ID ? decideDinner({ ...p, title: 'Final dinner together' }, place, DINNER_POLL_ID) : p)),
  }
}

/** "Switch spot": the runner-up takes the slot, no re-vote. */
export function switchSpot(s: ScenarioState): ScenarioState {
  if (!s.poll || !s.decided || !canSwitchSpot(s)) return s
  const t = tally(s.poll)
  const ranked = [...t.options].sort((a, b) => b.count - a.count)
  const current = s.data.plans.find((p) => p.id === DINNER_PLAN_ID)?.placeId
  const next = ranked.find((o) => o.optionId !== current)
  if (!next) return s
  return landWinner({ ...s, poll: { ...s.poll, winnerId: next.optionId, decidedBy: 'votes' } }, next.optionId)
}

/** Only a decision with votes has a runner-up to switch to (a direct pick or a spin has none). */
export const canSwitchSpot = (s: ScenarioState): boolean => !!s.poll && tally(s.poll).voted > 0

/** Start a decided dinner by chance or by one person (04 callouts). */
export function decideWithout(s: ScenarioState, placeId: string, pickedBy?: MemberId): ScenarioState {
  if (s.decided) return s
  const script = s.data.pollScript
  const poll: Poll = {
    ...script.poll,
    votes: {},
    status: 'closed',
    winnerId: placeId,
    decidedBy: pickedBy ? 'someone' : 'chance',
    ...(pickedBy ? { pickedBy } : {}),
  }
  return landWinner({ ...s, sheet: null, screen: 'hub', hubTab: 'plan', poll }, placeId)
}

export const answerDrinks = (s: ScenarioState, member: MemberId, answer: DrinksAnswer): ScenarioState =>
  s.bill ? s : { ...s, drinks: { ...s.drinks, [member]: answer } }

// ── 06B · 22:30 → 07 · Log the bill ─────────────────────────────────────

export const endDinner = (s: ScenarioState): ScenarioState =>
  !s.decided || s.dinnerEnded ? s : { ...s, clock: '22:30', dinnerEnded: true, banner: banner('who-paid') }

export function openBill(s: ScenarioState): ScenarioState {
  const d = s.data.dinnerBill
  const attendees = billAttendees(s)
  const wine = {} as Record<MemberId, WineChoice>
  for (const m of attendees) {
    const a = s.drinks[m]
    wine[m] = a === 'in' ? 'in' : a === 'skip' ? 'out' : 'pending'
  }
  return {
    ...s,
    screen: 'bill',
    sheet: null,
    banner: null,
    bill: s.bill ?? { paidBy: d.paidBy, totalCents: d.totalCents, preset: 'partial', wine, tipCents: 0 },
  }
}

/** Who's at dinner: the crew, plus Ren once he's a guest for the dinner (same rule as the stop). */
export function billAttendees(s: ScenarioState): MemberId[] {
  const d = s.data.dinnerBill
  return d.attendees.filter((m) => {
    const member = s.data.members.find((x) => x.id === m)
    return member?.kind === 'crew' || (s.guestAdded && (member?.planIds ?? []).includes(d.planId))
  })
}

export function billDraft(s: ScenarioState): BillDraft | null {
  if (!s.bill) return null
  const d = s.data.dinnerBill
  const attendees = billAttendees(s)
  const drinkers = attendees.filter((m) => s.bill!.wine[m] !== 'out')
  const place = s.data.places.find((p) => p.id === s.data.plans.find((x) => x.id === d.planId)?.placeId)
  return {
    id: d.id,
    day: d.day,
    time: d.time,
    title: place ? `Dinner at ${place.name}` : d.title,
    planId: d.planId,
    // The tip goes on top of the receipt total and is split by share (edge case "A tip is added").
    totalCents: s.bill.totalCents + s.bill.tipCents,
    paidBy: s.bill.paidBy,
    attendees,
    splitOut:
      s.bill.preset === 'partial' ? [{ label: d.wine.label, amountCents: d.wine.amountCents, participants: drinkers }] : [],
    tipCents: s.bill.tipCents,
  }
}

export const setWine = (s: ScenarioState, member: MemberId, choice: WineChoice): ScenarioState =>
  s.bill ? { ...s, bill: { ...s.bill, wine: { ...s.bill.wine, [member]: choice } } } : s

export const setPreset = (s: ScenarioState, preset: SplitPreset): ScenarioState =>
  s.bill ? { ...s, bill: { ...s.bill, preset } } : s

export const setTip = (s: ScenarioState, tipCents: number): ScenarioState =>
  s.bill ? { ...s, bill: { ...s.bill, tipCents } } : s

export const setPaidBy = (s: ScenarioState, paidBy: MemberId): ScenarioState =>
  s.bill ? { ...s, bill: { ...s.bill, paidBy } } : s

export function saveBill(s: ScenarioState): ScenarioState {
  const draft = billDraft(s)
  if (!draft) return s
  return { ...s, dinnerExpense: buildDinnerExpense(draft), screen: 'hub', hubTab: 'money', sheet: null }
}

// ── 08 → 09 · Pay ───────────────────────────────────────────────────────

export const startPay = (s: ScenarioState, transfer: Transfer): ScenarioState =>
  !s.dinnerExpense ? s : { ...s, sheet: 'pay', payFlow: { transfer, method: 'bank', phase: 'choose' } }

export const choosePayMethod = (s: ScenarioState, method: PayMethod): ScenarioState =>
  s.payFlow ? { ...s, payFlow: { ...s.payFlow, method, phase: 'choose' } } : s

export const setPayPhase = (s: ScenarioState, phase: PayPhase): ScenarioState =>
  s.payFlow ? { ...s, payFlow: { ...s.payFlow, phase } } : s

let paymentId = 0
export function recordPayment(
  s: ScenarioState,
  p: { from: MemberId; to: MemberId; amountCents: number; method: PayMethod; guest?: boolean },
): ScenarioState {
  if (s.payments.some((x) => x.from === p.from && x.to === p.to)) return s
  const status = p.method === 'cash' ? 'awaiting-confirmation' : 'paid'
  return { ...s, payments: [...s.payments, { id: `pay-${++paymentId}`, ...p, status }] }
}

export const confirmCash = (s: ScenarioState, from: MemberId, to: MemberId): ScenarioState => ({
  ...s,
  payments: s.payments.map((p) => (p.from === from && p.to === to ? { ...p, status: 'paid' } : p)),
  payFlow: s.payFlow && s.payFlow.transfer.from === from && s.payFlow.transfer.to === to ? { ...s.payFlow, phase: 'paid' } : s.payFlow,
})

export const closeSheet = (s: ScenarioState): ScenarioState => ({
  ...s,
  sheet: null,
  payFlow: s.payFlow && (s.payFlow.phase === 'approving' || s.payFlow.phase === 'processing') ? s.payFlow : null,
})

export const showSquaredUp = (s: ScenarioState): ScenarioState => ({
  ...s,
  screen: 'squared',
  sheet: null,
  payFlow: null,
  banner: null,
  squaredSeen: true,
})

// ── Helpers used by the event script ────────────────────────────────────

export const hasVoted = (s: ScenarioState, m: MemberId) => !!s.poll?.votes[m]
export const pollReadyToClose = (s: ScenarioState) => !!s.poll && shouldClose(s.poll, s.clock) && s.pollNotice !== 'tie'
