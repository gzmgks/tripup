// Money math for TripUp. Pure functions; every amount is an integer number of cents.

import type {
  Cents,
  ClockTime,
  DrinksAnswer,
  Expense,
  ExpenseItem,
  GuestDebt,
  MemberId,
  Transfer,
} from './types'

/** Deterministic order for every tie-break and remainder cent. */
export const MEMBER_ORDER: readonly MemberId[] = ['ari', 'maya', 'theo', 'sam', 'nic', 'ren']

/** Per-member amounts; members without a share hold 0. */
export type Shares = Record<MemberId, Cents>

/** Group balances (paid − share), keyed by crew member only. Positive = is owed. */
export type Balances = Partial<Record<MemberId, Cents>>

export interface BalanceResult {
  balances: Balances
  guestDebts: GuestDebt[]
}

export function byMemberOrder(a: MemberId, b: MemberId): number {
  return MEMBER_ORDER.indexOf(a) - MEMBER_ORDER.indexOf(b)
}

export function emptyShares(): Shares {
  return { ari: 0, maya: 0, theo: 0, sam: 0, nic: 0, ren: 0 }
}

function assertCents(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${what} must be an integer number of cents, got ${value}`)
  }
}

function assertNonNegativeCents(value: number, what: string): void {
  assertCents(value, what)
  if (value < 0) throw new Error(`${what} must not be negative, got ${value}`)
}

function sumShares(shares: Shares): Cents {
  return MEMBER_ORDER.reduce((sum, m) => sum + shares[m], 0)
}

/**
 * Equal split. Everyone gets floor(amount / n); the leftover cents go one each
 * to the payer first (when the payer is in the split), then to the other
 * participants in MEMBER_ORDER.
 */
export function splitEqually(
  amountCents: Cents,
  participants: readonly MemberId[],
  payer: MemberId,
): Shares {
  assertNonNegativeCents(amountCents, 'amountCents')
  if (participants.length === 0) throw new Error('splitEqually needs at least one participant')
  if (new Set(participants).size !== participants.length) {
    throw new Error('splitEqually participants must be unique')
  }

  const people = [...participants].sort(byMemberOrder)
  const base = Math.floor(amountCents / people.length)
  const shares = emptyShares()
  for (const p of people) shares[p] = base

  const queue = people.includes(payer) ? [payer, ...people.filter((p) => p !== payer)] : people
  let leftover = amountCents - base * people.length
  for (const p of queue) {
    if (leftover === 0) break
    shares[p] += 1
    leftover -= 1
  }
  return shares
}

/**
 * Split by non-negative integer weights (largest-remainder method). Leftover
 * cents go to the largest fractional remainders, ties by MEMBER_ORDER.
 * Used for the tip, and usable for a "by shares" split.
 */
export function splitByWeights(
  amountCents: Cents,
  weights: Partial<Record<MemberId, number>>,
): Shares {
  assertNonNegativeCents(amountCents, 'amountCents')
  const people = MEMBER_ORDER.filter((m) => (weights[m] ?? 0) !== 0)
  let totalWeight = 0
  for (const m of people) {
    const w = weights[m] ?? 0
    assertNonNegativeCents(w, `weight of ${m}`)
    totalWeight += w
  }
  if (totalWeight === 0) throw new Error('splitByWeights needs at least one positive weight')

  const shares = emptyShares()
  const remainders: { member: MemberId; remainder: number }[] = []
  let allocated = 0
  for (const m of people) {
    const product = amountCents * (weights[m] ?? 0)
    if (!Number.isSafeInteger(product)) throw new Error('splitByWeights amount too large')
    const quotient = Math.floor(product / totalWeight)
    shares[m] = quotient
    allocated += quotient
    remainders.push({ member: m, remainder: product - quotient * totalWeight })
  }
  remainders.sort((a, b) => b.remainder - a.remainder || byMemberOrder(a.member, b.member))
  for (let i = 0; i < amountCents - allocated; i++) shares[remainders[i].member] += 1
  return shares
}

export function expenseTotal(expense: Expense): Cents {
  const items = expense.items.reduce((sum, item) => sum + item.amountCents, 0)
  return items + (expense.tipCents ?? 0)
}

/** Each member's share of one expense, tip included. Always sums to expenseTotal. */
export function expenseShares(expense: Expense): Shares {
  const shares = emptyShares()
  for (const item of expense.items) {
    const split = splitEqually(item.amountCents, item.participants, expense.paidBy)
    for (const m of MEMBER_ORDER) shares[m] += split[m]
  }

  const tip = expense.tipCents ?? 0
  assertNonNegativeCents(tip, 'tipCents')
  if (tip > 0) {
    // Tip follows each person's pre-tip share. A zero bill falls back to an equal split.
    const preTip = sumShares(shares)
    const tipShares =
      preTip > 0
        ? splitByWeights(tip, shares)
        : splitEqually(tip, [...new Set(expense.items.flatMap((i) => i.participants))], expense.paidBy)
    for (const m of MEMBER_ORDER) shares[m] += tipShares[m]
  }
  return shares
}

export function shareFor(memberId: MemberId, expense: Expense): Cents {
  return expenseShares(expense)[memberId]
}

/**
 * Group balances for the crew (paid − share). A guest's share never enters the
 * group: it becomes a direct GuestDebt to that expense's payer, and the payer's
 * group credit is reduced by the same amount. Balances always sum to 0.
 */
export function computeBalances(
  expenses: readonly Expense[],
  crew: readonly MemberId[],
): BalanceResult {
  const balances: Balances = {}
  for (const m of MEMBER_ORDER) if (crew.includes(m)) balances[m] = 0
  const guestDebts: GuestDebt[] = []

  for (const e of expenses) {
    if (!crew.includes(e.paidBy)) {
      throw new Error(`${e.id} is paid by ${e.paidBy}, who is not crew; only crew pay group bills`)
    }
    const shares = expenseShares(e)
    let guestPart = 0
    for (const m of MEMBER_ORDER) {
      const share = shares[m]
      if (share === 0) continue
      if (crew.includes(m)) {
        balances[m] = (balances[m] ?? 0) - share
      } else {
        guestDebts.push({ from: m, to: e.paidBy, amountCents: share, expenseId: e.id })
        guestPart += share
      }
    }
    balances[e.paidBy] = (balances[e.paidBy] ?? 0) + expenseTotal(e) - guestPart
  }
  return { balances, guestDebts }
}

/** What the crew owes the payer for one expense: total − payer's own share − guest shares. */
export function payerGroupCredit(expense: Expense, crew: readonly MemberId[]): Cents {
  const shares = expenseShares(expense)
  const guestPart = MEMBER_ORDER.filter((m) => !crew.includes(m)).reduce((s, m) => s + shares[m], 0)
  return expenseTotal(expense) - shares[expense.paidBy] - guestPart
}

/**
 * Greedy min-cash-flow: the largest debtor pays the largest creditor the
 * smaller of the two amounts, until everyone is at 0. Ties by MEMBER_ORDER.
 */
export function simplifyDebts(balances: Balances): Transfer[] {
  const left = new Map<MemberId, Cents>()
  let sum = 0
  for (const m of MEMBER_ORDER) {
    const v = balances[m] ?? 0
    assertCents(v, `balance of ${m}`)
    left.set(m, v)
    sum += v
  }
  if (sum !== 0) throw new Error(`balances must sum to 0, got ${sum}`)

  const transfers: Transfer[] = []
  for (;;) {
    let debtor: MemberId | null = null
    let debt = 0
    let creditor: MemberId | null = null
    let credit = 0
    for (const m of MEMBER_ORDER) {
      const v = left.get(m) ?? 0
      if (v < 0 && -v > debt) {
        debtor = m
        debt = -v
      }
      if (v > 0 && v > credit) {
        creditor = m
        credit = v
      }
    }
    if (debtor === null || creditor === null) return transfers
    const amountCents = Math.min(debt, credit)
    transfers.push({ from: debtor, to: creditor, amountCents })
    left.set(debtor, -debt + amountCents)
    left.set(creditor, credit - amountCents)
  }
}

/**
 * Debts before simplification: every crew participant owes the payer their
 * share of each expense, netted per pair of crew members. Guests are excluded.
 */
export function pairwiseDebts(expenses: readonly Expense[], crew: readonly MemberId[]): Transfer[] {
  const crewOrdered = MEMBER_ORDER.filter((m) => crew.includes(m))
  // net[a][b] > 0 means a owes b, with a before b in MEMBER_ORDER.
  const net = new Map<string, Cents>()
  const key = (a: MemberId, b: MemberId) => `${a}>${b}`

  for (const e of expenses) {
    if (!crew.includes(e.paidBy)) continue
    const shares = expenseShares(e)
    for (const m of crewOrdered) {
      if (m === e.paidBy || shares[m] === 0) continue
      const [first, second] = byMemberOrder(m, e.paidBy) < 0 ? [m, e.paidBy] : [e.paidBy, m]
      const signed = first === m ? shares[m] : -shares[m]
      net.set(key(first, second), (net.get(key(first, second)) ?? 0) + signed)
    }
  }

  const debts: Transfer[] = []
  for (let i = 0; i < crewOrdered.length; i++) {
    for (let j = i + 1; j < crewOrdered.length; j++) {
      const a = crewOrdered[i]
      const b = crewOrdered[j]
      const v = net.get(key(a, b)) ?? 0
      if (v > 0) debts.push({ from: a, to: b, amountCents: v })
      if (v < 0) debts.push({ from: b, to: a, amountCents: -v })
    }
  }
  return debts
}

/** "Transfers before simplification" (the "up to 10" on the Money tab). */
export function pairwiseDebtCount(expenses: readonly Expense[], crew: readonly MemberId[]): number {
  return pairwiseDebts(expenses, crew).length
}

export interface FormatEUROptions {
  /** 'always' (default) shows cents; 'auto' drops a trailing .00. */
  decimals?: 'always' | 'auto'
  /** Prefix positive amounts with '+'. Negative amounts always get '−'. */
  sign?: boolean
}

const MINUS = '−'

/** '€198.00', '€9.60', '€1,234.00'; auto: '€84'; negative: '−€20.00'; sign: '+€137'. */
export function formatEUR(cents: Cents, opts: FormatEUROptions = {}): string {
  assertCents(cents, 'cents')
  const { decimals = 'always', sign = false } = opts
  const abs = Math.abs(cents)
  const euros = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const rest = abs % 100
  const body = decimals === 'auto' && rest === 0 ? euros : `${euros}.${String(rest).padStart(2, '0')}`
  const prefix = cents < 0 ? MINUS : sign && cents > 0 ? '+' : ''
  return `${prefix}€${body}`
}

// ---- Log-the-bill draft -------------------------------------------------

export interface SplitOutItem {
  label: string
  amountCents: Cents
  participants: MemberId[]
}

export interface BillDraft {
  id?: string
  day?: number
  time?: ClockTime
  title?: string
  planId?: string | null
  totalCents: Cents
  paidBy: MemberId
  /** Everyone at the table; they share the rest of the bill equally. */
  attendees: MemberId[]
  /** Items with their own people, e.g. the wine. */
  splitOut: SplitOutItem[]
  tipCents?: Cents
}

/** Everyone at the table, once each, in MEMBER_ORDER. */
function tablePeople(draft: BillDraft): MemberId[] {
  return MEMBER_ORDER.filter((m) => draft.attendees.includes(m))
}

/**
 * Split-out items that count. Only people at the table can share an item, so a
 * chip left on for someone removed from the attendees is ignored. An item
 * nobody (at the table) is ticked for, or worth 0, is not split out: its amount
 * stays in the rest of the bill.
 */
function activeSplitOut(draft: BillDraft): SplitOutItem[] {
  const table = tablePeople(draft)
  return draft.splitOut
    .map((i) => ({ ...i, participants: table.filter((m) => i.participants.includes(m)) }))
    .filter((i) => i.amountCents > 0 && i.participants.length > 0)
}

/** "Rest of the bill": total − split-out items − tip. */
export function restOfBill(draft: BillDraft): Cents {
  const splitOut = activeSplitOut(draft).reduce((sum, i) => sum + i.amountCents, 0)
  return draft.totalCents - splitOut - (draft.tipCents ?? 0)
}

/** Builds the Expense the bill screen saves. Split-out items first, then the rest. */
export function buildDinnerExpense(draft: BillDraft): Expense {
  assertNonNegativeCents(draft.totalCents, 'totalCents')
  assertNonNegativeCents(draft.tipCents ?? 0, 'tipCents')
  for (const i of draft.splitOut) assertNonNegativeCents(i.amountCents, `${i.label} amount`)
  if (draft.attendees.length === 0) throw new Error('a bill needs at least one attendee')

  const rest = restOfBill(draft)
  if (rest < 0) throw new Error('split-out items and tip add up to more than the total')

  const id = draft.id ?? 'bill'
  const items: ExpenseItem[] = activeSplitOut(draft).map((i, n) => ({
    id: `${id}-${n + 1}`,
    label: i.label,
    amountCents: i.amountCents,
    participants: i.participants,
  }))
  items.push({ id: `${id}-rest`, label: 'rest', amountCents: rest, participants: tablePeople(draft) })

  const expense: Expense = {
    id,
    day: draft.day ?? 0,
    time: draft.time ?? '00:00',
    title: draft.title ?? 'Bill',
    planId: draft.planId ?? null,
    paidBy: draft.paidBy,
    items,
  }
  if ((draft.tipCents ?? 0) > 0) expense.tipCents = draft.tipCents
  return expense
}

/** Wine chips pre-selected from "Who's having drinks?": everyone but a 'skip' (no answer counts as in). */
export function drinkersFromAnswers(
  attendees: readonly MemberId[],
  answers: Partial<Record<MemberId, DrinksAnswer>>,
): MemberId[] {
  return attendees.filter((m) => answers[m] !== 'skip').sort(byMemberOrder)
}
