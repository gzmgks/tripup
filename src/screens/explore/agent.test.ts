import { describe, expect, it } from 'vitest'
import { CATALOG, LISTS } from '../../data/explore'
import { INITIAL_IDEAS } from '../../data/seed'
import { greeting, notUnderstood, parseRequest, recommend, respond } from './agent'
import type { AgentContext } from './agent'

const tonight: AgentContext = { dinner: 'open', clock: '18:40' }

describe('the Explore catalog', () => {
  it('has the five seeded Ideas, unique ids, and lists that only name catalog places', () => {
    const ids = CATALOG.map((e) => e.place.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of INITIAL_IDEAS) expect(ids).toContain(id)
    for (const l of LISTS) for (const id of l.ids) expect(ids).toContain(id)
    expect(LISTS.find((l) => l.id === 'top10')!.ids).toHaveLength(10)
  })

  it('marks what the crew already did (ledger and today’s plan)', () => {
    const been = (id: string) => CATALOG.find((e) => e.place.id === id)!.been
    expect(been('belem-tower')).toEqual({ day: 5 })
    expect(been('lx-factory')).toEqual({ day: 5 })
    expect(been('castelo')).toEqual({ day: 2 })
    expect(been('maat')).toEqual({ day: 4, who: ['maya', 'nic'] })
    expect(been('jeronimos')).toBeUndefined()
  })
})

describe('the agent’s script', () => {
  it('asks what, where, when, budget in turn', () => {
    expect(greeting('Ari').ask).toBe('what')
    expect(respond({}, tonight)).toEqual({ lines: ['What are you in the mood for?'], ask: 'what' })
    expect(respond({ what: 'food' }, tonight)).toEqual({ lines: ['Food it is. Where should I look?'], ask: 'where' })
    expect(respond({ what: 'food', where: 'alfama' }, tonight).ask).toBe('when')
    expect(respond({ what: 'food', where: 'alfama', when: 'tonight' }, tonight).ask).toBe('budget')
  })

  it('food near the house tonight: the closest places, and where dinner stands', () => {
    const turn = respond({ what: 'food', where: 'alfama', when: 'tonight', budget: '€€' }, tonight)
    expect(turn.ids).toEqual(['a-baiuca', 'sal-grosso', 'taberna'])
    expect(turn.lines).toEqual([
      'Three places to eat near the house tonight, €€ or less:',
      'Dinner at 20:30 is still open: tap + Add to pick one, or put it in a poll.',
    ])
    expect(respond({ what: 'food', where: 'alfama', when: 'tonight', budget: '€€' }, { ...tonight, dinner: 'poll', pollFull: true }).lines[1]).toBe(
      'The dinner poll is full, so add the ones you like to Ideas.',
    )
    expect(respond({ what: 'food', where: 'alfama', when: 'tonight', budget: '€€' }, { ...tonight, dinner: 'decided' }).lines[1]).toBe(
      'Tonight’s dinner is decided, so add the ones you like to Ideas for next time.',
    )
  })

  it('never suggests a museum tonight; sights tonight are the viewpoints', () => {
    const { ids } = recommend({ what: 'sights', where: 'anywhere', when: 'tonight', budget: 'any' })
    expect(ids).toEqual(['graca', 'senhora-monte'])
  })

  it('relaxes the budget before the area, and says so', () => {
    const turn = respond({ what: 'food', where: 'alfama', when: 'tonight', budget: '€' }, tonight)
    expect(recommend({ what: 'food', where: 'alfama', when: 'tonight', budget: '€' }).relaxed).toBe('budget')
    expect(turn.lines[0]).toBe('Nothing at € near the house tonight, so these cost a bit more:')
  })

  it('keeps the one exact match on top when it has to bend', () => {
    const r = recommend({ what: 'food', where: 'alfama', when: 'next', budget: '€' })
    expect(r).toMatchObject({ relaxed: 'budget', exact: 1 })
    expect(r.ids[0]).toBe('santo-antonio')
    expect(respond({ what: 'food', where: 'alfama', when: 'next', budget: '€' }, tonight).lines[0]).toBe(
      'Only one at € near the house for your next trip, so I added some that cost a bit more:',
    )
  })

  it('looks further when the area has nothing for that moment', () => {
    const turn = respond({ what: 'drinks', where: 'belem', when: 'tonight', budget: 'any' }, tonight)
    expect(turn.ids).toEqual(['graca', 'ginjinha', 'park-rooftop'])
    expect(turn.lines[0]).toBe('Not much in Belém for that, so I looked a bit further. Three places for a drink tonight:')
    expect(turn.lines[1]).toBe('The 23:30 drinks have no bar yet: tap + Add to pick one.')
  })

  it('next trip: leaves out what the crew has done and points to Ideas', () => {
    const turn = respond({ what: 'sights', where: 'belem', when: 'next', budget: 'any' }, tonight)
    expect(turn.ids).not.toContain('belem-tower')
    expect(turn.ids).not.toContain('lx-factory')
    expect(turn.ids).toContain('jeronimos')
    expect(turn.lines[1]).toBe('Add the ones you like to Ideas: they’ll be waiting when you plan your next trip.')
  })

  it('Feira da Ladra is a next-trip idea only (Tuesdays and Saturdays)', () => {
    const tomorrow = recommend({ what: 'different', where: 'alfama', when: 'morning', budget: 'any' })
    expect(tomorrow.ids).not.toContain('feira-ladra')
    expect(recommend({ what: 'different', where: 'alfama', when: 'next', budget: 'any' }).ids).toContain('feira-ladra')
  })

  it('something different tonight brings up fado vadio, with the Day 2 fado in mind', () => {
    const turn = respond({ what: 'different', where: 'anywhere', when: 'tonight', budget: 'any' }, tonight)
    expect(turn.ids).toContain('a-baiuca')
    expect(turn.lines[1]).toBe('You had fado on Day 2. Fado vadio is different: anyone can get up and sing.')
  })
})

describe('typed requests', () => {
  it('understands the same four things as the chips', () => {
    expect(parseRequest('Cheap drinks near us tonight')).toEqual({ what: 'drinks', where: 'alfama', when: 'tonight', budget: '€' })
    expect(parseRequest('something fancy in Belém for next time')).toEqual({ where: 'belem', when: 'next', budget: '€€€' })
    expect(parseRequest('food, €€')).toEqual({ what: 'food', budget: '€€' })
    expect(parseRequest('cheap eats near us')).toEqual({ what: 'food', where: 'alfama', budget: '€' })
    expect(parseRequest('breakfast before we fly')).toEqual({ what: 'food', when: 'morning' })
    expect(parseRequest('price doesn’t matter')).toEqual({ budget: 'any' })
    expect(parseRequest('drinks after dinner')).toEqual({ what: 'drinks', when: 'tonight' })
  })

  it('says so when it doesn’t understand, and asks again', () => {
    expect(parseRequest('hello there')).toEqual({})
    expect(notUnderstood({ what: 'food' })).toEqual({ lines: ['Sorry, I didn’t catch that.', 'Where should I look?'], ask: 'where' })
  })
})
