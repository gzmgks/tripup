// Derived money views for the Money, Pay and Squared Up screens. Everything is
// computed from the expenses and payments; nothing is hard-coded.

import { computeBalances, pairwiseDebtCount, payerGroupCredit, simplifyDebts } from '../domain/money'
import type { Balances } from '../domain/money'
import type { Expense, GuestDebt, MemberId, Transfer } from '../domain/types'
import type { Payment, ScenarioState } from './scenario'

export interface SettleRow {
  transfer: Transfer
  payment?: Payment
  /** 'open' = not paid yet, 'pending' = cash waiting for the receiver, 'paid'. */
  status: 'open' | 'pending' | 'paid'
  guest: boolean
}

export interface MoneyView {
  expenses: Expense[]
  crew: MemberId[]
  /** Group balances before tonight's dinner. */
  before: Balances
  /** Group balances with every logged expense (guest shares excluded). */
  now: Balances
  /** Simplified crew transfers (greedy min-cash-flow). */
  transfers: Transfer[]
  guestDebts: GuestDebt[]
  /**
   * Payments the crew would need without simplifying ("3 payments instead of N"): every
   * participant owes each expense's payer, netted per pair of crew members across all expenses.
   */
  transfersBefore: number
  rows: SettleRow[]
  /** What the dinner did to Ari's balance: the group owes her this much for it. */
  dinnerCredit: number | null
  /** Ari's balance, net of payments already made. */
  myOpen: number
  paidCount: number
  totalCount: number
  allSettled: boolean
}

export function moneyView(s: ScenarioState): MoneyView {
  const crew = s.data.crew
  const me = s.data.trip.me
  const expenses = s.dinnerExpense ? [...s.data.expenses, s.dinnerExpense] : s.data.expenses
  const before = computeBalances(s.data.expenses, crew).balances
  const { balances: now, guestDebts } = computeBalances(expenses, crew)
  const transfers = simplifyDebts(now)

  const find = (from: MemberId, to: MemberId) => s.payments.find((p) => p.from === from && p.to === to)
  const status = (p?: Payment): SettleRow['status'] => (!p ? 'open' : p.status === 'paid' ? 'paid' : 'pending')
  const rows: SettleRow[] = [
    ...transfers.map((t) => ({ transfer: t, payment: find(t.from, t.to), status: status(find(t.from, t.to)), guest: false })),
    ...guestDebts.map((g) => {
      const t = { from: g.from, to: g.to, amountCents: g.amountCents }
      return { transfer: t, payment: find(t.from, t.to), status: status(find(t.from, t.to)), guest: true }
    }),
  ]

  let myOpen = now[me] ?? 0
  for (const p of s.payments) {
    if (p.guest || p.status !== 'paid') continue
    if (p.from === me) myOpen += p.amountCents
    if (p.to === me) myOpen -= p.amountCents
  }

  const paidCount = rows.filter((r) => r.status === 'paid').length
  return {
    expenses,
    crew,
    before,
    now,
    transfers,
    guestDebts,
    transfersBefore: pairwiseDebtCount(expenses, crew),
    rows,
    dinnerCredit: s.dinnerExpense ? payerGroupCredit(s.dinnerExpense, crew) : null,
    myOpen,
    paidCount,
    totalCount: rows.length,
    allSettled: rows.length > 0 && paidCount === rows.length,
  }
}

/**
 * Guest shares still owed to one crew member (Ren → Ari €25 until he pays). They sit outside
 * the group balance, so at €0 with the group they still need saying.
 */
export function guestOwedTo(view: MoneyView, member: MemberId): SettleRow[] {
  return view.rows.filter((r) => r.guest && r.transfer.to === member && r.status !== 'paid')
}

/** Rows ordered for display: the logged-in user's own row first (as on screen 08). */
export function rowsForDisplay(rows: SettleRow[], me: MemberId): SettleRow[] {
  const crew = rows.filter((r) => !r.guest)
  const mine = crew.filter((r) => r.transfer.from === me || r.transfer.to === me)
  const others = crew.filter((r) => !mine.includes(r))
  return [...mine, ...others.sort((a, b) => a.transfer.amountCents - b.transfer.amountCents)]
}
