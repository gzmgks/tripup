import { describe, expect, it } from 'vitest'
import { tally } from '../domain/poll'
import { shareFor } from '../domain/money'
import { buildDinnerExpense } from '../domain/money'
import { nextEvent, runEvent, runReady } from './events'
import * as sc from './scenario'
import { moneyView } from './selectors'

const me = 'ari'

describe('the full scenario', () => {
  it('walks from Home to Squared Up with the Figma numbers', () => {
    let s = sc.openTrip(sc.freshScenario())
    expect(s.screen).toBe('hub')
    expect(moneyView(s).now.ari).toBe(-15600) // Home: "You owe €156"

    s = sc.addGuest(s)
    expect(s.guestAdded).toBe(true)
    s = sc.startPoll(s)
    expect(s.poll!.eligible).toHaveLength(6)
    expect(s.banner?.kind).toBe('group-push')

    // Maya, Theo, Nic vote; Sam and Ren wait for Ari.
    s = runReady(s)
    expect(tally(s.poll!).voted).toBe(3)
    expect(nextEvent(s)).toBeUndefined()

    s = sc.vote(s, me, 'cevicheria')
    const hifi = tally(s.poll!)
    expect(hifi.voted).toBe(4)
    expect(hifi.counts).toEqual({ ramiro: 1, taberna: 2, cevicheria: 1 })
    expect(hifi.leaders).toEqual(['taberna'])
    expect(hifi.waitingFor).toEqual(['sam', 'ren'])

    s = runReady(s, (x) => !!x.poll?.votes.ren)
    // Nic moved to Ramiro: a clear win, no tie.
    expect(tally(s.poll!).counts).toEqual({ ramiro: 4, taberna: 1, cevicheria: 1 })

    s = runEvent(s, nextEvent(s)!) // close poll
    expect(s.decided).toBe(true)
    const dinner = s.data.plans.find((p) => p.id === 'd5-dinner')!
    expect(dinner.title).toBe('Dinner at Cervejaria Ramiro')
    expect(dinner.note).toBe('20:30–22:30 · Loud & seafood')

    s = runReady(s, (x) => x.drinks.nic !== null)
    expect(s.drinks).toEqual({ ari: 'in', maya: 'in', theo: 'in', sam: 'in', nic: 'skip', ren: null })

    s = sc.openBill(sc.endDinner(s))
    expect(s.bill!.wine).toEqual({ ari: 'in', maya: 'in', theo: 'in', sam: 'in', nic: 'out', ren: 'pending' })
    expect(shareFor(me, buildDinnerExpense(sc.billDraft(s)!))).toBe(3460)
    s = sc.setWine(s, 'ren', 'out')
    expect(shareFor(me, buildDinnerExpense(sc.billDraft(s)!))).toBe(3700)

    s = sc.saveBill(s)
    const m = moneyView(s)
    expect(s.hubTab).toBe('money')
    expect(m.before.ari).toBe(-15600)
    expect(m.myOpen).toBe(-2000)
    expect(m.dinnerCredit).toBe(13600)
    expect(m.transfersBefore).toBe(10)
    expect(m.transfers).toEqual([
      { from: 'sam', to: 'maya', amountCents: 5000 },
      { from: 'theo', to: 'maya', amountCents: 3000 },
      { from: 'ari', to: 'maya', amountCents: 2000 },
    ])
    expect(m.guestDebts.map((g) => [g.from, g.to, g.amountCents])).toEqual([['ren', 'ari', 2500]])
    expect(m.totalCount).toBe(4)

    // Others only pay once Ari has.
    expect(nextEvent(s)).toBeUndefined()
    s = sc.recordPayment(s, { from: 'ari', to: 'maya', amountCents: 2000, method: 'bank' })
    expect(moneyView(s).myOpen).toBe(0)
    s = runReady(s, (x) => x.screen === 'squared')
    expect(moneyView(s).allSettled).toBe(true)
    expect(moneyView(s).paidCount).toBe(4)
    expect(s.screen).toBe('squared')
    expect(moneyView(s).expenses).toHaveLength(23)
  })

  it('a 3–3 tie waits for the dice instead of closing', () => {
    // The edge case: Nic doesn't switch (the happy path never ties).
    let s = runReady(sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario()))))
    s = sc.vote(s, me, 'taberna')
    s = runReady({ ...s, done: [...s.done, 'switch-nic', 'switch-theo'] })
    expect(s.pollNotice).toBe('tie')
    expect(s.poll!.status).toBe('open')
    s = sc.decide(s)
    expect(s.poll!.decidedBy).toBe('chance')
    expect(s.decided).toBe(true)
  })

  it('cash waits for the receiver to confirm', () => {
    let s = sc.freshScenario()
    s = sc.recordPayment(s, { from: 'ari', to: 'maya', amountCents: 2000, method: 'cash' })
    expect(s.payments[0].status).toBe('awaiting-confirmation')
    s = sc.confirmCash(s, 'ari', 'maya')
    expect(s.payments[0].status).toBe('paid')
  })

  it('switch spot hands the slot to the runner-up', () => {
    let s = runReady(sc.vote(runReady(sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario())))), me, 'cevicheria'), (x) => x.decided)
    s = sc.switchSpot(s)
    expect(s.data.plans.find((p) => p.id === 'd5-dinner')!.placeId).toBe('taberna')
  })

  it('Ramiro wins clearly whatever Ari picks, with or without Ren', () => {
    for (const withRen of [true, false]) {
      for (const pick of ['ramiro', 'taberna', 'cevicheria']) {
        const start = sc.openTrip(sc.freshScenario())
        let s = sc.startPoll(withRen ? sc.addGuest(start) : start)
        s = sc.vote(runReady(s), me, pick)
        s = runReady(s, (x) => x.poll?.status === 'closed')
        expect(s.poll?.status, `${pick}, Ren ${withRen}`).toBe('closed')
        expect(s.poll?.winnerId).toBe('ramiro')
        const t = tally({ ...s.poll!, status: 'open' })
        expect(t.leaders).toEqual(['ramiro'])
        expect(s.pollNotice).toBeNull()
      }
    }
  })

  it('the tie stays reachable as an edge case', () => {
    let s = sc.vote(runReady(sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario())))), me, 'taberna')
    s = runReady({ ...s, done: [...s.done, 'switch-nic', 'switch-theo'] })
    expect(tally(s.poll!).counts).toEqual({ ramiro: 3, taberna: 3, cevicheria: 0 })
    expect(s.pollNotice).toBe('tie')
    expect(s.poll?.status).toBe('open')
  })

  it('Ideas and Explore places', () => {
    const place = { id: 'x-test', name: 'Test bar', vibe: 'Bar', price: '€', walkMin: 5, meta: 'Bar · € · 5 min', source: 'Explore' }
    let s = sc.freshScenario()
    expect(s.ideas).toHaveLength(7)
    s = sc.saveIdea(sc.addPlace(s, place), place.id)
    s = sc.saveIdea(sc.addPlace(s, place), place.id)
    expect(s.ideas).toHaveLength(8)
    expect(s.data.places.filter((p) => p.id === 'x-test')).toHaveLength(1)
  })

  it('scripted votes follow the places in the poll, so it always closes with a clear winner', () => {
    for (const options of [['taberna', 'cevicheria'], ['ramiro', 'cevicheria'], ['cevicheria', 'timeout'], ['ramiro', 'taberna', 'cevicheria', 'timeout']]) {
      for (const pick of options) {
        let s = sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario())), options)
        s = sc.vote(runReady(s), me, pick)
        s = runReady(s, (x) => x.poll?.status === 'closed')
        expect(s.poll?.status, `${options.join('/')} · Ari ${pick}`).toBe('closed')
        expect(tally({ ...s.poll!, status: 'open' }).leaders).toHaveLength(1)
        expect(s.poll?.winnerId).toBe(options.includes('ramiro') ? 'ramiro' : options[0])
      }
    }
  })

  it('Ren voting from his link for Ari\'s place still ends with a clear winner', () => {
    for (const renFirst of [true, false]) {
      let s = sc.vote(runReady(sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario())))), me, 'taberna')
      if (renFirst) s = { ...sc.vote(s, 'ren', 'taberna'), done: [...s.done, 'vote-ren'] }
      s = runReady(s, (x) => (renFirst ? x.poll?.status === 'closed' : !!x.poll?.votes.sam))
      if (!renFirst) {
        // Ren votes last (the guest view): the store's guestVote brings Theo round.
        s = { ...sc.vote(s, 'ren', 'taberna'), done: [...s.done, 'vote-ren'] }
        expect(s.pollNotice).toBe('tie')
        continue
      }
      expect(s.poll?.winnerId).toBe('ramiro')
      expect(tally({ ...s.poll!, status: 'open' }).counts).toEqual({ ramiro: 4, taberna: 2, cevicheria: 0 })
    }
  })
})
