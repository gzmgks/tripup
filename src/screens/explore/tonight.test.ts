import { describe, expect, it } from 'vitest'
import { exploreEntry } from '../../data/explore'
import { runReady } from '../../store/events'
import * as sc from '../../store/scenario'
import { noSlotLine, placeActions, placeNote } from './tonight'

const place = (id: string) => exploreEntry(id)!.place
const hub = () => sc.openTrip(sc.freshScenario())

describe('what a place can do tonight', () => {
  it('an open evening: Ideas, the 20:30 dinner and a poll to start, for a restaurant', () => {
    const rows = placeActions(hub(), place('sal-grosso'))
    expect(rows.ideas).toMatchObject({ state: 'available', title: 'Add to Ideas' })
    expect(rows.dinner).toMatchObject({ state: 'available', title: 'Final dinner together', time: '20:30' })
    expect(rows.poll).toMatchObject({ state: 'available', note: 'No poll yet · start one' })
    expect(rows.drinks).toBeUndefined()
  })

  it('a bar fills the 23:30 drinks; a sight fits neither slot', () => {
    expect(placeActions(hub(), place('park-rooftop'))).toMatchObject({
      ideas: { state: 'done', title: 'In Ideas', note: 'Saved by Theo' },
      drinks: { state: 'available', note: 'Optional · it becomes Drinks at Park' },
    })
    const castelo = placeActions(hub(), place('castelo'))
    expect(castelo.dinner).toBeUndefined()
    expect(castelo.drinks).toBeUndefined()
    expect(castelo.poll).toBeUndefined()
    expect(noSlotLine(hub(), place('castelo'))).toBe('Tonight’s open slots are dinner and drinks, so Castelo is one for Ideas.')
    expect(noSlotLine(hub(), place('senhora-monte'))).toBe('Tonight’s open slots are dinner and drinks, so Senhora do Monte stays in Ideas.')
  })

  it('a live poll: the dinner slot waits on it, the poll has room for one more', () => {
    const s = { ...sc.vote(runReady(sc.startPoll(sc.addGuest(hub()))), 'ari', 'cevicheria'), banner: null }
    const rows = placeActions(s, place('sal-grosso'))
    expect(rows.dinner).toMatchObject({ state: 'blocked', note: 'A poll is live: add it to the poll instead' })
    expect(rows.poll).toMatchObject({ state: 'available', note: 'Live · 3 of 4 places · add it' })
    expect(placeActions(s, place('ramiro')).poll).toMatchObject({ state: 'done' })
    expect(placeNote(s, 'ramiro')).toBe('In tonight’s poll · In Ideas ✓')

    const full = sc.suggestPlace(s, 'timeout', 'theo')
    expect(placeActions(full, place('sal-grosso')).poll).toMatchObject({ state: 'blocked', note: 'Full · 4 of 4 places' })
  })

  it('once dinner is decided, it says so; the place that won reads as tonight’s dinner', () => {
    const s = sc.decideWithout(sc.addPlace(hub(), place('sal-grosso')), 'sal-grosso', 'ari')
    expect(placeActions(s, place('sal-grosso')).dinner).toMatchObject({ state: 'done', title: 'Dinner at Taberna Sal Grosso' })
    expect(placeActions(s, place('taberna')).dinner).toMatchObject({ state: 'blocked', note: 'Already decided' })
    expect(placeActions(s, place('taberna')).poll).toMatchObject({ state: 'blocked', note: 'Closed · dinner is decided' })
    expect(placeNote(s, 'sal-grosso')).toBe('Tonight’s dinner')
  })

  it('notes say who has been and who saved it', () => {
    const s = hub()
    expect(placeNote(s, 'belem-tower')).toBe('Been here today')
    expect(placeNote(s, 'castelo')).toBe('Been here · Day 2')
    expect(placeNote(s, 'maat')).toBe('Maya & Nic went · Day 4')
    expect(placeNote(s, 'manteigaria')).toBe('Been here · Day 2 · In Ideas ✓')
    expect(placeNote(s, 'cevicheria', { savers: true })).toBe('Saved by you')
    const saved = sc.saveIdea(sc.addPlace(s, place('graca')), 'graca')
    expect(placeNote(saved, 'graca', { savers: true })).toBe('Saved by you')
    expect(placeActions(saved, place('graca')).ideas).toMatchObject({ state: 'done', note: 'Saved by you' })
  })
})
