// Days 1–4 of the trip, for the Plan tab's read-only past days. Each stop is a
// line of the verified ledger (seed.ts e01–e19): its day, time, amount and payer
// come from there, so a past day adds up to what the Money tab counts.

import { expenseTotal, formatEUR } from '../domain/money'
import type { Expense, Plan } from '../domain/types'
import type { TripState } from './seed'

export interface LedgerStop {
  /** The stop on the timeline, e.g. 'Castelo de São Jorge'. */
  title: string
  /** What was paid there, as on today's stops ("Lunch · €84 · paid by Theo"). */
  label: string
}

/** Days 1–4, by expense id. */
export const PAST_STOPS: Record<string, LedgerStop> = {
  // Day 1 · Wed 8 Oct: arrival
  e01: { title: 'Land in Lisbon', label: 'Taxi' },
  e02: { title: 'Check in, Alfama house', label: '4 nights' },
  e03: { title: 'Pingo Doce', label: 'Groceries' },
  e04: { title: 'Dinner in Alfama', label: 'Dinner' },
  // Day 2 · Thu 9 Oct: the old town and the river
  e05: { title: 'Manteigaria', label: 'Pastéis' },
  e06: { title: 'Tram 28', label: 'Tickets' },
  e07: { title: 'Castelo de São Jorge', label: 'Tickets' },
  e08: { title: 'Time Out Market', label: 'Lunch' },
  e09: { title: 'Sunset sail on the Tagus', label: 'Boat' },
  e10: { title: 'Fado dinner in Alfama', label: 'Dinner' },
  // Day 3 · Fri 10 Oct: Sintra
  e11: { title: 'Train to Sintra', label: 'Tickets' },
  e12: { title: 'Pena Palace', label: 'Tickets' },
  e13: { title: 'Lunch in Sintra', label: 'Lunch' },
  e14: { title: 'Dinner at the house', label: 'Groceries' },
  // Day 4 · Sat 11 Oct: the group splits up (surf or MAAT), then dinner together
  e15: { title: 'Costa da Caparica', label: 'Uber' },
  e16: { title: 'Surf lesson', label: 'Lesson' },
  e17: { title: 'MAAT', label: 'Tickets' },
  e18: { title: 'Dinner in Príncipe Real', label: 'Dinner' },
  e19: { title: 'Drinks in Cais do Sodré', label: 'Drinks' },
}

/** Today's done stops on the Full trip map, by expense id (e23 = tonight's dinner, once logged). */
export const TODAY_LABELS: Record<string, string> = { e20: 'Tickets', e22: 'Lunch', e23: 'Dinner' }

/** "Lunch · €84 · paid by Theo"; Ari's own payments read "paid by you". */
export function expenseLine(data: TripState, expense: Expense, label: string): string {
  const payer = expense.paidBy === data.trip.me ? 'you' : (data.members.find((m) => m.id === expense.paidBy)?.name ?? expense.paidBy)
  return `${label} · ${formatEUR(expenseTotal(expense), { decimals: 'auto' })} · paid by ${payer}`
}

export interface PastDay {
  /** Done stops, in time order, each with its expense line as the note. */
  plans: Plan[]
  spentCents: number
}

/** A past day as done stops built from the ledger. */
export function pastDay(data: TripState, day: number): PastDay {
  const expenses = data.expenses.filter((e) => e.day === day && PAST_STOPS[e.id]).sort((a, b) => a.time.localeCompare(b.time))
  const plans = expenses.map((e): Plan => {
    const stop = PAST_STOPS[e.id]
    // Who was there: everyone on the ledger line (Day 4's surf and MAAT were half the group each).
    const attendees = [...new Set(e.items.flatMap((i) => i.participants))]
    return { id: e.planId ?? `${e.id}-stop`, day, time: e.time, title: stop.title, status: 'done', note: expenseLine(data, e, stop.label), attendees }
  })
  return { plans, spentCents: expenses.reduce((sum, e) => sum + expenseTotal(e), 0) }
}
