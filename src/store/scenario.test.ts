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
    expect(tally(s.poll!).counts).toEqual({ ramiro: 3, taberna: 2, cevicheria: 1 })

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
    let s = runReady(sc.startPoll(sc.addGuest(sc.openTrip(sc.freshScenario()))))
    s = runReady(sc.vote(s, me, 'taberna'))
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
})
