import { describe, expect, it } from 'vitest'
import { createInitialTrip } from '../data/seed'
import {
  MEMBER_ORDER,
  buildDinnerExpense,
  computeBalances,
  drinkersFromAnswers,
  expenseShares,
  expenseTotal,
  formatEUR,
  pairwiseDebtCount,
  payerGroupCredit,
  restOfBill,
  shareFor,
  simplifyDebts,
  splitByWeights,
  splitEqually,
} from './money'
import type { Balances, Shares } from './money'
import type { Expense, MemberId } from './types'

const sum = (s: Shares | Balances) => MEMBER_ORDER.reduce((t, m) => t + (s[m] ?? 0), 0)

const seed = createInitialTrip()
const { crew, expenses, dinnerBill } = seed

function dinner(wine: MemberId[]): Expense {
  return buildDinnerExpense({
    ...dinnerBill,
    splitOut: [{ label: dinnerBill.wine.label, amountCents: dinnerBill.wine.amountCents, participants: wine }],
  })
}

const STATE_A_WINE: MemberId[] = ['ari', 'maya', 'theo', 'sam', 'ren']
const STATE_B_WINE: MemberId[] = ['ari', 'maya', 'theo', 'sam']

describe('splitEqually', () => {
  it('gives the leftover cent to the payer first when the payer is in the split', () => {
    const s = splitEqually(1000, ['ari', 'maya', 'theo'], 'maya')
    expect([s.ari, s.maya, s.theo]).toEqual([333, 334, 333])
    expect(sum(s)).toBe(1000)
  })

  it('gives leftover cents in member order when the payer is not in the split', () => {
    const s = splitEqually(1000, ['sam', 'theo', 'ari'], 'maya')
    expect([s.ari, s.theo, s.sam, s.maya]).toEqual([334, 333, 333, 0])
    expect(sum(s)).toBe(1000)
  })

  it('splits 15701 across six with the payer and then member order taking the 5 extra cents', () => {
    const s = splitEqually(15701, [...MEMBER_ORDER], 'ari')
    expect(s).toEqual({ ari: 2617, maya: 2617, theo: 2617, sam: 2617, nic: 2617, ren: 2616 })
    expect(sum(s)).toBe(15701)
  })

  it('always sums to the amount', () => {
    for (let amount = 0; amount < 400; amount += 7) {
      for (let n = 1; n <= MEMBER_ORDER.length; n++) {
        const people = MEMBER_ORDER.slice(0, n)
        for (const payer of MEMBER_ORDER) {
          const s = splitEqually(amount, people, payer)
          expect(sum(s)).toBe(amount)
          const values = people.map((p) => s[p])
          expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('throws on bad input', () => {
    expect(() => splitEqually(10.5, ['ari'], 'ari')).toThrow()
    expect(() => splitEqually(-100, ['ari'], 'ari')).toThrow()
    expect(() => splitEqually(100, [], 'ari')).toThrow()
    expect(() => splitEqually(Number.NaN, ['ari'], 'ari')).toThrow()
    expect(() => splitEqually(100, ['ari', 'ari'], 'ari')).toThrow()
  })
})

describe('seeded ledger', () => {
  it('has exactly 22 pre-dinner expenses, crew only', () => {
    expect(expenses).toHaveLength(22)
    expect(expenses.map((e) => e.id)).toEqual(
      Array.from({ length: 22 }, (_, i) => `e${String(i + 1).padStart(2, '0')}`),
    )
    for (const e of expenses) {
      expect(crew).toContain(e.paidBy)
      for (const item of e.items) for (const p of item.participants) expect(crew).toContain(p)
      expect(sum(expenseShares(e))).toBe(expenseTotal(e))
    }
  })

  it('gives the exact pre-dinner balances from the data sheet', () => {
    const { balances, guestDebts } = computeBalances(expenses, crew)
    expect(balances).toEqual({ ari: -15600, maya: 13700, theo: 700, sam: -1300, nic: 2500 })
    expect(sum(balances)).toBe(0)
    expect(guestDebts).toEqual([])
  })
})

describe('dinner bill', () => {
  it('state A: Nic skipped, Ren still waiting counts as in', () => {
    const wine = drinkersFromAnswers(dinnerBill.attendees, seed.drinks)
    expect(wine).toEqual(STATE_A_WINE)
    const e = dinner(wine)
    expect(splitEqually(4800, wine, 'ari').maya).toBe(960) // "€9.60 each · 5 people"
    expect(shareFor('ari', e)).toBe(3460)
    expect(formatEUR(shareFor('ari', e))).toBe('€34.60')
    expect(sum(expenseShares(e))).toBe(19800)
  })

  it('07B: Ren off', () => {
    const e = dinner(STATE_B_WINE)
    const s = expenseShares(e)
    expect(s.ari).toBe(3700)
    expect(s.nic).toBe(2500)
    expect(s.ren).toBe(2500)
    expect(s).toEqual({ ari: 3700, maya: 3700, theo: 3700, sam: 3700, nic: 2500, ren: 2500 })
    expect(sum(s)).toBe(19800)
    expect(expenseTotal(e)).toBe(19800)
  })

  it('builds the rest of the bill from total − split-out − tip', () => {
    const draft = {
      ...dinnerBill,
      splitOut: [{ label: 'Wine', amountCents: 4800, participants: STATE_B_WINE }],
    }
    expect(restOfBill(draft)).toBe(15000)
    const e = buildDinnerExpense(draft)
    expect(e.id).toBe('e23')
    expect(e.planId).toBe('d5-dinner')
    expect(e.items.map((i) => [i.label, i.amountCents, i.participants.length])).toEqual([
      ['Wine', 4800, 4],
      ['rest', 15000, 6],
    ])
    expect(e.tipCents).toBeUndefined()
  })

  it('folds a split-out item nobody is ticked for back into the rest', () => {
    const e = dinner([])
    expect(e.items).toHaveLength(1)
    expect(shareFor('ari', e)).toBe(3300)
  })

  it('only charges split-out items to people at the table', () => {
    // Sam dropped out, but his wine chip was left on: he must not pay for wine.
    const draft = {
      ...dinnerBill,
      attendees: ['ari', 'maya', 'theo', 'nic', 'ren', 'ari'] as MemberId[],
      splitOut: [{ label: 'Wine', amountCents: 4800, participants: STATE_B_WINE }],
    }
    const e = buildDinnerExpense(draft)
    expect(e.items.map((i) => i.participants)).toEqual([
      ['ari', 'maya', 'theo'],
      ['ari', 'maya', 'theo', 'nic', 'ren'],
    ])
    const s = expenseShares(e)
    expect(s).toEqual({ ari: 4600, maya: 4600, theo: 4600, sam: 0, nic: 3000, ren: 3000 })
    expect(sum(s)).toBe(19800)

    // A split-out item whose only people left the table folds back into the rest.
    const gone = buildDinnerExpense({ ...draft, splitOut: [{ label: 'Dessert', amountCents: 1600, participants: ['sam'] }] })
    expect(gone.items).toHaveLength(1)
    expect(restOfBill({ ...draft, splitOut: [{ label: 'Dessert', amountCents: 1600, participants: ['sam'] }] })).toBe(19800)
  })

  it('rejects split-out items larger than the total', () => {
    expect(() =>
      buildDinnerExpense({ ...dinnerBill, splitOut: [{ label: 'Wine', amountCents: 20000, participants: ['ari'] }] }),
    ).toThrow()
  })
})

describe('after dinner (07B saved)', () => {
  const din = dinner(STATE_B_WINE)
  const all = [...expenses, din]
  const { balances, guestDebts } = computeBalances(all, crew)

  it('matches the data sheet balances and keeps Ren out of the group', () => {
    expect(balances).toEqual({ ari: -2000, maya: 10000, theo: -3000, sam: -5000, nic: 0 })
    expect(sum(balances)).toBe(0)
    expect(guestDebts).toEqual([{ from: 'ren', to: 'ari', amountCents: 2500, expenseId: 'e23' }])
  })

  it("credits Ari €136 for the dinner (198 − 37 − 25)", () => {
    expect(payerGroupCredit(din, crew)).toBe(13600)
    expect(formatEUR(payerGroupCredit(din, crew), { decimals: 'auto' })).toBe('€136')
  })

  it('simplifies to 3 transfers instead of up to 10', () => {
    expect(simplifyDebts(balances)).toEqual([
      { from: 'sam', to: 'maya', amountCents: 5000 },
      { from: 'theo', to: 'maya', amountCents: 3000 },
      { from: 'ari', to: 'maya', amountCents: 2000 },
    ])
    expect(pairwiseDebtCount(all, crew)).toBe(10)
    expect(pairwiseDebtCount(all, crew)).toBe((crew.length * (crew.length - 1)) / 2)
  })

  it('variant: Ari skips drinks', () => {
    const e = dinner(['maya', 'theo', 'sam'])
    expect(shareFor('ari', e)).toBe(2500)
    const after = computeBalances([...expenses, e], crew)
    expect(sum(after.balances)).toBe(0)
    expect(simplifyDebts(after.balances)).toEqual([
      { from: 'sam', to: 'maya', amountCents: 5400 },
      { from: 'theo', to: 'maya', amountCents: 3400 },
      { from: 'ari', to: 'maya', amountCents: 800 },
    ])
  })

  it('simplifyDebts breaks equal debts and credits by member order', () => {
    expect(simplifyDebts({ ari: 0, maya: -700, theo: 700, sam: -700, nic: 700 })).toEqual([
      { from: 'maya', to: 'theo', amountCents: 700 },
      { from: 'sam', to: 'nic', amountCents: 700 },
    ])
    expect(simplifyDebts({ ari: 0, maya: 0, theo: 0, sam: 0, nic: 0 })).toEqual([])
  })

  it('simplifyDebts settles every balance and rejects unbalanced input', () => {
    const before = computeBalances(expenses, crew).balances
    const left = { ...before }
    for (const t of simplifyDebts(before)) {
      left[t.from] = (left[t.from] ?? 0) + t.amountCents
      left[t.to] = (left[t.to] ?? 0) - t.amountCents
    }
    expect(Object.values(left).every((v) => v === 0)).toBe(true)
    expect(() => simplifyDebts({ ari: 100, maya: -50 })).toThrow()
  })
})

describe('tip', () => {
  const withTip = buildDinnerExpense({
    ...dinnerBill,
    totalCents: 20000,
    tipCents: 2000,
    splitOut: [{ label: 'Wine', amountCents: 4800, participants: STATE_B_WINE }],
  })

  it('is split in proportion to each share and sums exactly', () => {
    // Pre-tip: wine drinkers 3400, Nic and Ren 2200 (rest = 20000 − 4800 − 2000 = 13200 / 6).
    expect(withTip.items.find((i) => i.label === 'rest')?.amountCents).toBe(13200)
    const s = expenseShares(withTip)
    expect(s).toEqual({ ari: 3778, maya: 3778, theo: 3778, sam: 3778, nic: 2444, ren: 2444 })
    expect(sum(s)).toBe(20000)
    expect(expenseTotal(withTip)).toBe(20000)
  })

  it('is deterministic, with ties broken by member order', () => {
    expect(expenseShares(withTip)).toEqual(expenseShares(structuredClone(withTip)))
    const s = splitByWeights(1001, { sam: 1, ari: 1, nic: 1 })
    expect([s.ari, s.sam, s.nic]).toEqual([334, 334, 333])
    expect(sum(s)).toBe(1001)
  })

  it('sums exactly for awkward amounts', () => {
    for (const tip of [1, 7, 99, 333, 1999]) {
      const e: Expense = { ...withTip, tipCents: tip }
      expect(sum(expenseShares(e))).toBe(expenseTotal(e))
    }
  })
})

describe('formatEUR', () => {
  it('formats cents as euros', () => {
    expect(formatEUR(19800)).toBe('€198.00')
    expect(formatEUR(960)).toBe('€9.60')
    expect(formatEUR(8400, { decimals: 'auto' })).toBe('€84')
    expect(formatEUR(15600, { decimals: 'auto' })).toBe('€156')
    expect(formatEUR(960, { decimals: 'auto' })).toBe('€9.60')
    expect(formatEUR(123400)).toBe('€1,234.00')
    expect(formatEUR(123456789)).toBe('€1,234,567.89')
    expect(formatEUR(0)).toBe('€0.00')
    expect(formatEUR(5)).toBe('€0.05')
  })

  it('uses a true minus sign, and + when sign is requested', () => {
    expect(formatEUR(-2000, { sign: true })).toBe('−€20.00')
    expect(formatEUR(-2000, { sign: true })).toBe('−€20.00')
    expect(formatEUR(13700, { sign: true, decimals: 'auto' })).toBe('+€137')
    expect(formatEUR(0, { sign: true, decimals: 'auto' })).toBe('€0')
  })

  it('rejects non-integer cents', () => {
    expect(() => formatEUR(9.6)).toThrow()
  })
})
