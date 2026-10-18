// Core domain types for TripUp. Plain unions and interfaces only.

export type MemberId = 'ari' | 'maya' | 'theo' | 'sam' | 'nic' | 'ren'

/** Money is always an integer number of euro cents. */
export type Cents = number

/** 24h clock time, zero-padded: 'HH:MM'. */
export type ClockTime = string

export type MemberKind = 'crew' | 'guest'

export interface Member {
  id: MemberId
  name: string
  /** Avatar initial, e.g. 'A'. */
  short: string
  kind: MemberKind
  /** Guest scope: the only plans a guest can see and share bills for. */
  planIds?: string[]
}

export interface Place {
  id: string
  name: string
  /** Short name used in notifications and chips, e.g. 'Ramiro'. */
  shortName?: string
  vibe: string
  price: string
  walkMin: number
  /** Ready-made meta line, e.g. 'Loud & seafood · €€ · 12 min'. */
  meta: string
  /** Where the option came from, e.g. 'In your Ideas · saved by Maya'. */
  source: string
}

export type PlanStatus = 'done' | 'open' | 'poll' | 'decided' | 'optional'

export interface Plan {
  id: string
  day: number
  time: ClockTime
  endTime?: ClockTime
  title: string
  status: PlanStatus
  placeId?: string
  pollId?: string
  note?: string
  attendees: MemberId[]
}

export type PollStatus = 'open' | 'closed'
export type PollDecision = 'votes' | 'chance' | 'someone'

export interface Poll {
  id: string
  planId: string
  question: string
  /** Place ids, max 4. */
  optionIds: string[]
  votes: Partial<Record<MemberId, string>>
  eligible: MemberId[]
  closesAt: ClockTime
  status: PollStatus
  createdBy?: MemberId
  winnerId?: string
  decidedBy?: PollDecision
  /** 'someone' decisions: who picked. */
  pickedBy?: MemberId
}

export interface ExpenseItem {
  id: string
  label: string
  amountCents: Cents
  participants: MemberId[]
}

export interface Expense {
  id: string
  day: number
  time: ClockTime
  title: string
  planId: string | null
  paidBy: MemberId
  items: ExpenseItem[]
  tipCents?: Cents
}

/** A settle-up payment between two crew members. */
export interface Transfer {
  from: MemberId
  to: MemberId
  amountCents: Cents
}

/** A guest's share of one expense, owed directly to whoever paid it. */
export interface GuestDebt {
  from: MemberId
  to: MemberId
  amountCents: Cents
  expenseId: string
}

export type DrinksAnswer = 'in' | 'skip' | null
