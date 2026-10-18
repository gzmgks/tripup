import { describe, expect, it } from 'vitest'
import { expenseTotal } from '../domain/money'
import { createInitialTrip, decideDinner } from './seed'

// Totals per expense from the verified ledger (ledger.json).
const LEDGER_TOTALS: Record<string, number> = {
  e01: 3460, e02: 57585, e03: 9470, e04: 18300, e05: 1350, e06: 1550, e07: 7500, e08: 10885,
  e09: 22500, e10: 27385, e11: 2400, e12: 10000, e13: 9250, e14: 5465, e15: 2700, e16: 13500,
  e17: 2200, e18: 15850, e19: 4800, e20: 5000, e21: 1250, e22: 8400,
}

describe('seed', () => {
  it('matches the ledger totals', () => {
    const { expenses } = createInitialTrip()
    expect(Object.fromEntries(expenses.map((e) => [e.id, expenseTotal(e)]))).toEqual(LEDGER_TOTALS)
    expect(expenses.reduce((s, e) => s + expenseTotal(e), 0)).toBe(240800)
  })

  it('links the LX Factory plan to expense e22', () => {
    const { plans, expenses } = createInitialTrip()
    const lx = plans.find((p) => p.id === 'd5-lx-factory')
    const e22 = expenses.find((e) => e.id === 'e22')
    expect(lx?.note).toBe('Lunch · €84 · paid by Theo')
    expect(e22?.planId).toBe('d5-lx-factory')
    expect(e22?.paidBy).toBe('theo')
  })

  it('scopes Ren to the dinner as a guest', () => {
    const { members, crew } = createInitialTrip()
    const ren = members.find((m) => m.id === 'ren')
    expect(ren?.kind).toBe('guest')
    expect(ren?.planIds).toEqual(['d5-dinner'])
    expect(crew).toEqual(['ari', 'maya', 'theo', 'sam', 'nic'])
  })

  it('returns an independent deep copy each time', () => {
    const a = createInitialTrip()
    a.expenses[0].items[0].participants.pop()
    a.pollScript.poll.votes.ari = 'ramiro'
    a.drinks.nic = 'in'
    const b = createInitialTrip()
    expect(b.expenses[0].items[0].participants).toHaveLength(5)
    expect(b.pollScript.poll.votes).toEqual({})
    expect(b.drinks.nic).toBe('skip')
  })

  it('shares no object or array between two fresh trips, or within one', () => {
    const seen = new Set<object>()
    const walk = (value: unknown, path: string): void => {
      if (value === null || typeof value !== 'object') return
      if (seen.has(value)) throw new Error(`shared reference at ${path}`)
      seen.add(value)
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`)
    }
    expect(() => {
      walk(createInitialTrip(), 'a')
      walk(createInitialTrip(), 'b')
    }).not.toThrow()
  })

  it('decides the dinner slot from the winning place', () => {
    const { plans, places } = createInitialTrip()
    const slot = plans.find((p) => p.id === 'd5-dinner')
    const ramiro = places.find((p) => p.id === 'ramiro')
    if (!slot || !ramiro) throw new Error('missing seed data')
    const decided = decideDinner(slot, ramiro, 'd5-dinner-poll')
    expect(decided).toMatchObject({
      status: 'decided',
      title: 'Dinner at Cervejaria Ramiro',
      endTime: '22:30',
      note: '20:30–22:30 · Loud & seafood',
      placeId: 'ramiro',
      pollId: 'd5-dinner-poll',
    })
    expect(slot.status).toBe('open')
  })
})
