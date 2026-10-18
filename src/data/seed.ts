// Scenario data for the prototype: the last evening of a 5-day Lisbon trip.
// Names, places, times, amounts and copy come from the Figma file; the 22
// pre-dinner expenses are the verified ledger (ledger.json), converted 1:1.

import type {
  Cents,
  ClockTime,
  DrinksAnswer,
  Expense,
  ExpenseItem,
  Member,
  MemberId,
  Place,
  Plan,
  Poll,
} from '../domain/types'

export interface TripInfo {
  id: string
  name: string
  currency: 'EUR'
  me: MemberId
  today: number
  /** Trip hub header line. */
  subtitle: string
  /** Home card line. */
  homeSubtitle: string
  ideasCount: number
}

export interface TripDay {
  day: number
  /** Day chip label. */
  label: string
  date: string
}

export interface PastTrip {
  name: string
  subtitle: string
}

export interface DinnerBill {
  id: string
  day: number
  time: ClockTime
  title: string
  planId: string
  totalCents: Cents
  paidBy: MemberId
  attendees: MemberId[]
  wine: { label: string; amountCents: Cents }
  tipCents: Cents
}

export interface ScriptedVote {
  member: MemberId
  optionId: string
}

export interface PollScript {
  /** The poll as Ari sends it from 04 (no votes yet). */
  poll: Poll
  /** Votes already in when Ari opens the live poll (05 shows 4 of 6 after hers). */
  votesBeforeAri: ScriptedVote[]
  expectedAriVote: string
  /** Votes that arrive after Ari's (05B: Ramiro overtakes). */
  votesAfterAri: ScriptedVote[]
  /** Callout: "Theo added Time Out Market". */
  fourthOption: { addedBy: MemberId; placeId: string }
}

export interface TripState {
  trip: TripInfo
  pastTrips: PastTrip[]
  members: Member[]
  crew: MemberId[]
  places: Place[]
  days: TripDay[]
  plans: Plan[]
  /** The 22 expenses logged before tonight's dinner. */
  expenses: Expense[]
  dinnerBill: DinnerBill
  /** "Who's in for drinks?" answers. Ari's is her own; it starts on the default 'in'. */
  drinks: Record<MemberId, DrinksAnswer>
  pollScript: PollScript
}

export const CREW: readonly MemberId[] = ['ari', 'maya', 'theo', 'sam', 'nic']
const EVERYONE: readonly MemberId[] = ['ari', 'maya', 'theo', 'sam', 'nic', 'ren']

export const DINNER_PLAN_ID = 'd5-dinner'
export const DINNER_POLL_ID = 'd5-dinner-poll'
export const DINNER_END_TIME: ClockTime = '22:30'

const trip: TripInfo = {
  id: 'lisbon',
  name: 'Lisbon with the crew',
  currency: 'EUR',
  me: 'ari',
  today: 5,
  subtitle: 'Day 5 of 5 · Sun 12 Oct',
  homeSubtitle: 'Day 5 of 5 · 8–12 Oct · 5 people',
  ideasCount: 7,
}

const pastTrips: PastTrip[] = [{ name: 'Porto', subtitle: 'March · Squared up ✓' }]

const members: Member[] = [
  { id: 'ari', name: 'Ari', short: 'A', kind: 'crew' },
  { id: 'maya', name: 'Maya', short: 'M', kind: 'crew' },
  { id: 'theo', name: 'Theo', short: 'T', kind: 'crew' },
  { id: 'sam', name: 'Sam', short: 'S', kind: 'crew' },
  { id: 'nic', name: 'Nic', short: 'N', kind: 'crew' },
  { id: 'ren', name: 'Ren', short: 'R', kind: 'guest', planIds: [DINNER_PLAN_ID] },
]

const places: Place[] = [
  {
    id: 'ramiro',
    name: 'Cervejaria Ramiro',
    shortName: 'Ramiro',
    vibe: 'Loud & seafood',
    price: '€€',
    walkMin: 12,
    meta: 'Loud & seafood · €€ · 12 min',
    source: 'In your Ideas · saved by Maya',
  },
  {
    id: 'taberna',
    name: 'Taberna da Rua das Flores',
    shortName: 'Taberna',
    vibe: 'Cozy tasca',
    price: '€€',
    walkMin: 8,
    meta: 'Cozy tasca · €€ · 8 min',
    source: 'AI pick · open until 23:00',
  },
  {
    id: 'cevicheria',
    name: 'A Cevicheria',
    shortName: 'Cevicheria',
    vibe: 'Trendy & fresh',
    price: '€€€',
    walkMin: 15,
    meta: 'Trendy & fresh · €€€ · 15 min',
    source: 'In your Ideas · saved by Ari',
  },
  // Figma only names this one ("Theo added Time Out Market"); vibe, price and
  // walk time are placeholders in the same style.
  {
    id: 'timeout',
    name: 'Time Out Market',
    shortName: 'Time Out',
    vibe: 'Food hall',
    price: '€€',
    walkMin: 10,
    meta: 'Food hall · €€ · 10 min',
    source: 'Added by Theo',
  },
]

const days: TripDay[] = [
  { day: 1, label: 'Day 1', date: 'Wed 8 Oct' },
  { day: 2, label: 'Day 2', date: 'Thu 9 Oct' },
  { day: 3, label: 'Day 3', date: 'Fri 10 Oct' },
  { day: 4, label: 'Day 4', date: 'Sat 11 Oct' },
  { day: 5, label: 'Day 5 · Today', date: 'Sun 12 Oct' },
]

const plans: Plan[] = [
  {
    id: 'd5-belem-tower',
    day: 5,
    time: '10:00',
    title: 'Belém Tower',
    status: 'done',
    attendees: [...CREW],
  },
  {
    id: 'd5-lx-factory',
    day: 5,
    time: '14:00',
    title: 'LX Factory',
    status: 'done',
    // Linked to expense e22 through its planId.
    note: 'Lunch · €84 · paid by Theo',
    attendees: [...CREW],
  },
  {
    id: DINNER_PLAN_ID,
    day: 5,
    time: '20:30',
    title: 'Final dinner together',
    status: 'open',
    note: 'Place not decided · added by Maya when planning',
    attendees: [...EVERYONE],
  },
  {
    id: 'd5-drinks',
    day: 5,
    time: '23:30',
    title: 'Drinks in Bairro Alto',
    status: 'optional',
    note: 'Optional',
    attendees: [...CREW],
  },
]

type ItemRow = [label: string, amountCents: Cents, participants: readonly MemberId[]]

function expense(
  id: string,
  day: number,
  time: ClockTime,
  title: string,
  planId: string | null,
  paidBy: MemberId,
  rows: ItemRow[],
): Expense {
  const items: ExpenseItem[] = rows.map(([label, amountCents, participants], n) => ({
    id: label === 'rest' ? `${id}-rest` : `${id}-${n + 1}`,
    label,
    amountCents,
    participants: [...participants],
  }))
  return { id, day, time, title, planId, paidBy, items }
}

const expenses: Expense[] = [
  expense('e01', 1, '13:30', 'Taxi from the airport', null, 'nic', [['rest', 3460, CREW]]),
  expense('e02', 1, '15:00', 'Alfama house · 4 nights', null, 'maya', [['rest', 57585, CREW]]),
  expense('e03', 1, '17:30', 'Pingo Doce groceries', null, 'sam', [['rest', 9470, CREW]]),
  expense('e04', 1, '20:30', 'Dinner in Alfama', 'd1-dinner', 'theo', [['Vinho verde', 2800, ['ari', 'maya', 'theo', 'sam']], ['rest', 15500, CREW]]),
  expense('e05', 2, '09:30', 'Pastéis at Manteigaria', null, 'ari', [['rest', 1350, CREW]]),
  expense('e06', 2, '10:30', 'Tram 28 tickets', null, 'sam', [['rest', 1550, CREW]]),
  expense('e07', 2, '11:30', 'Castelo de São Jorge tickets', 'd2-castelo', 'nic', [['rest', 7500, CREW]]),
  expense('e08', 2, '13:30', 'Lunch at Time Out Market', 'd2-lunch', 'theo', [['rest', 10885, CREW]]),
  expense('e09', 2, '18:00', 'Sunset sail on the Tagus', 'd2-sunset-sail', 'sam', [['rest', 22500, CREW]]),
  expense('e10', 2, '21:00', 'Fado dinner in Alfama', 'd2-fado', 'ari', [['Port wine', 2500, ['ari', 'maya', 'theo', 'sam']], ['rest', 24885, CREW]]),
  expense('e11', 3, '09:00', 'Train to Sintra & back', null, 'sam', [['rest', 2400, CREW]]),
  expense('e12', 3, '10:30', 'Pena Palace tickets', 'd3-pena', 'nic', [['rest', 10000, CREW]]),
  expense('e13', 3, '13:30', 'Lunch in Sintra', 'd3-lunch', 'nic', [['rest', 9250, CREW]]),
  expense('e14', 3, '19:30', 'Groceries for dinner at home', null, 'sam', [['rest', 5465, CREW]]),
  expense('e15', 4, '09:30', 'Uber to Costa da Caparica', null, 'sam', [['rest', 2700, ['ari', 'theo', 'sam']]]),
  expense('e16', 4, '10:30', 'Surf lesson', 'd4-surf', 'theo', [['rest', 13500, ['ari', 'theo', 'sam']]]),
  expense('e17', 4, '11:00', 'MAAT tickets', 'd4-maat', 'maya', [['rest', 2200, ['maya', 'nic']]]),
  expense('e18', 4, '20:30', 'Dinner in Príncipe Real', 'd4-dinner', 'nic', [['rest', 15850, CREW]]),
  expense('e19', 4, '23:00', 'Drinks in Cais do Sodré', 'd4-drinks', 'ari', [['rest', 4800, ['ari', 'maya', 'theo', 'sam']]]),
  expense('e20', 5, '10:00', 'Belém Tower tickets', 'd5-belem-tower', 'sam', [['rest', 5000, CREW]]),
  expense('e21', 5, '11:30', 'Pastéis de Belém', null, 'ari', [['rest', 1250, CREW]]),
  expense('e22', 5, '14:00', 'Lunch at LX Factory', 'd5-lx-factory', 'theo', [['rest', 8400, CREW]]),
]

const dinnerBill: DinnerBill = {
  id: 'e23',
  day: 5,
  time: '20:30',
  title: 'Dinner at Cervejaria Ramiro',
  planId: DINNER_PLAN_ID,
  totalCents: 19800,
  paidBy: 'ari',
  attendees: [...EVERYONE],
  wine: { label: 'Wine', amountCents: 4800 },
  tipCents: 0,
}

const drinks: Record<MemberId, DrinksAnswer> = {
  ari: 'in',
  maya: 'in',
  theo: 'in',
  sam: 'in',
  nic: 'skip',
  ren: null,
}

const pollScript: PollScript = {
  poll: {
    id: DINNER_POLL_ID,
    planId: DINNER_PLAN_ID,
    question: "Where's dinner tonight?",
    optionIds: ['ramiro', 'taberna', 'cevicheria'],
    votes: {},
    eligible: [...EVERYONE],
    closesAt: '19:30',
    status: 'open',
    createdBy: 'ari',
  },
  votesBeforeAri: [
    { member: 'maya', optionId: 'ramiro' },
    { member: 'theo', optionId: 'taberna' },
    { member: 'nic', optionId: 'taberna' },
  ],
  expectedAriVote: 'cevicheria',
  votesAfterAri: [
    { member: 'sam', optionId: 'ramiro' },
    { member: 'ren', optionId: 'ramiro' },
  ],
  fourthOption: { addedBy: 'theo', placeId: 'timeout' },
}

/** The dinner slot once the poll is decided (06: "Dinner at Cervejaria Ramiro · 20:30–22:30 · Loud & seafood"). */
export function decideDinner(plan: Plan, place: Place, pollId?: string): Plan {
  return {
    ...plan,
    status: 'decided',
    title: `Dinner at ${place.name}`,
    placeId: place.id,
    pollId: pollId ?? plan.pollId,
    endTime: DINNER_END_TIME,
    note: `${plan.time}–${DINNER_END_TIME} · ${place.vibe}`,
  }
}

const initialTrip: TripState = {
  trip,
  pastTrips,
  members,
  crew: [...CREW],
  places,
  days,
  plans,
  expenses,
  dinnerBill,
  drinks,
  pollScript,
}

/** A fresh deep copy of the whole scenario, so the demo can restart cleanly. */
export function createInitialTrip(): TripState {
  return structuredClone(initialTrip)
}
