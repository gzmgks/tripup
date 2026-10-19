// Explore catalog: real Lisbon places for the AI travel agent and the curated lists.
// Meta lines follow the trip places' style (vibe · price · minutes from the Alfama house,
// or by tram / metro for the far ones). Prices are rough levels or "Ticketed", never amounts;
// there are no ratings, and no opening hours beyond the well known (Feira da Ladra is on
// Tuesdays and Saturdays). Cervejaria Ramiro, Taberna, A Cevicheria and Time Out Market are
// the trip's own places (seed.ts), so their states line up with the plan and the poll.

import type { MemberId, Place } from '../domain/types'
import { createInitialTrip, INITIAL_IDEAS } from './seed'

export type ExploreWhat = 'food' | 'drinks' | 'sights' | 'different'
export type ExploreArea = 'alfama' | 'bairro-alto' | 'belem' | 'further'
export type ListId = 'top10' | 'food' | 'nightlife' | 'gems'
/** Tonight's slots a place can fill: the 20:30 dinner (and its poll) or the 23:30 drinks. */
export type TonightSlot = 'dinner' | 'drinks'

export interface ExploreEntry {
  place: Place
  what: ExploreWhat[]
  where: ExploreArea[]
  /** When it makes sense beyond "next trip" (every place does): this evening, tomorrow morning. */
  when: ('tonight' | 'morning')[]
  /** Price level for the budget question: 0 = free, 1–3 = € to €€€. */
  cost: 0 | 1 | 2 | 3
  slot?: TonightSlot
  /** Done on this trip (the ledger in seed.ts, or today's plan). `who` when only some of the crew went. */
  been?: { day: number; who?: MemberId[] }
  /** Who saved it to the group's Ideas before tonight (INITIAL_IDEAS). */
  savedBy?: MemberId
}

export interface ExploreList {
  id: ListId
  title: string
  blurb: string
  ids: string[]
}

const TRIP_PLACES = createInitialTrip().places
const tripPlace = (id: string): Place => TRIP_PLACES.find((p) => p.id === id)!
const capital = (m: MemberId) => `${m[0].toUpperCase()}${m.slice(1)}`

interface SpotOptions {
  shortName?: string
  by?: 'tram' | 'metro'
  /** In the group's Ideas from the start: the source names who saved it (as the trip places do). */
  savedBy?: MemberId
}

function spot(id: string, name: string, vibe: string, price: string, minutes: number, o: SpotOptions = {}): Place {
  return {
    id,
    name,
    ...(o.shortName ? { shortName: o.shortName } : {}),
    vibe,
    price,
    walkMin: minutes,
    meta: `${vibe} · ${price} · ${minutes} min${o.by ? ` by ${o.by}` : ''}`,
    source: o.savedBy ? `In your Ideas · saved by ${capital(o.savedBy)}` : 'Explore',
  }
}

export const CATALOG: ExploreEntry[] = [
  // ── The classics ──
  {
    place: spot('jeronimos', 'Jerónimos Monastery', 'Manueline monastery', 'Ticketed', 35, { shortName: 'Jerónimos', by: 'tram' }),
    what: ['sights'], where: ['belem'], when: ['morning'], cost: 1,
  },
  {
    place: spot('castelo', 'Castelo de São Jorge', 'Castle walls & views', 'Ticketed', 12, { shortName: 'Castelo' }),
    what: ['sights'], where: ['alfama'], when: ['morning'], cost: 1, been: { day: 2 },
  },
  {
    place: spot('tram-28', 'Tram 28', 'The old yellow tram', '€', 5),
    what: ['sights', 'different'], where: ['alfama'], when: ['morning'], cost: 1, been: { day: 2 },
  },
  {
    place: spot('senhora-monte', 'Miradouro da Senhora do Monte', 'Highest viewpoint', 'Free', 20, { shortName: 'Senhora do Monte', savedBy: 'nic' }),
    what: ['sights'], where: ['alfama'], when: ['tonight', 'morning'], cost: 0, savedBy: 'nic',
  },
  {
    place: spot('belem-tower', 'Belém Tower', 'Riverside fortress', 'Ticketed', 35, { by: 'tram' }),
    what: ['sights'], where: ['belem'], when: ['morning'], cost: 1, been: { day: 5 },
  },
  {
    place: spot('pasteis-belem', 'Pastéis de Belém', 'The original pastel de nata', '€', 35, { by: 'tram' }),
    what: ['food'], where: ['belem'], when: ['morning'], cost: 1, been: { day: 5 },
  },
  {
    place: tripPlace('timeout'),
    what: ['food'], where: ['bairro-alto'], when: ['tonight'], cost: 2, slot: 'dinner', been: { day: 2 },
  },
  {
    place: spot('maat', 'MAAT', 'Art & architecture by the river', 'Ticketed', 35, { by: 'tram' }),
    what: ['sights', 'different'], where: ['belem'], when: [], cost: 1, been: { day: 4, who: ['maya', 'nic'] },
  },
  {
    place: spot('oceanario', 'Oceanário de Lisboa', 'Big aquarium by the river', 'Ticketed', 30, { shortName: 'Oceanário', by: 'metro' }),
    what: ['sights', 'different'], where: ['further'], when: ['morning'], cost: 2,
  },
  {
    place: spot('lx-factory', 'LX Factory', 'Shops & food in old mills', 'Free', 30, { by: 'tram' }),
    what: ['sights', 'different'], where: ['belem'], when: [], cost: 0, been: { day: 5 },
  },

  // ── Food ──
  {
    place: tripPlace('taberna'),
    what: ['food'], where: ['alfama', 'bairro-alto'], when: ['tonight'], cost: 2, slot: 'dinner',
  },
  {
    place: tripPlace('ramiro'),
    what: ['food'], where: ['alfama'], when: ['tonight'], cost: 2, slot: 'dinner', savedBy: 'maya',
  },
  {
    place: tripPlace('cevicheria'),
    what: ['food'], where: ['bairro-alto'], when: ['tonight'], cost: 3, slot: 'dinner', savedBy: 'ari',
  },
  {
    place: spot('sal-grosso', 'Taberna Sal Grosso', 'Small Alfama tasca', '€€', 6, { shortName: 'Sal Grosso' }),
    what: ['food'], where: ['alfama'], when: ['tonight'], cost: 2, slot: 'dinner',
  },
  {
    place: spot('o-trevo', 'O Trevo', 'Bifanas at the counter', '€', 25),
    what: ['food'], where: ['bairro-alto'], when: ['tonight'], cost: 1, slot: 'dinner',
  },
  {
    place: spot('santo-antonio', 'Pastelaria Santo António', 'Small nata bakery', '€', 8, { shortName: 'Santo António' }),
    what: ['food'], where: ['alfama'], when: ['morning'], cost: 1,
  },
  {
    place: spot('manteigaria', 'Manteigaria', 'Pastéis de nata', '€', 20, { savedBy: 'sam' }),
    what: ['food'], where: ['bairro-alto'], when: ['morning'], cost: 1, been: { day: 2 }, savedBy: 'sam',
  },

  // ── Nightlife ──
  {
    place: spot('park-rooftop', 'Park', 'Rooftop bar on a car park', '€€', 25, { savedBy: 'theo' }),
    what: ['drinks'], where: ['bairro-alto'], when: ['tonight'], cost: 2, slot: 'drinks', savedBy: 'theo',
  },
  {
    place: spot('pink-street', 'Pink Street', 'Bar street, painted pink', '€€', 25),
    what: ['drinks'], where: ['bairro-alto'], when: ['tonight'], cost: 2, slot: 'drinks',
  },
  {
    place: spot('musicbox', 'Musicbox', 'Live music under an arch', '€€', 25),
    what: ['drinks', 'different'], where: ['bairro-alto'], when: ['tonight'], cost: 2, slot: 'drinks',
  },
  {
    place: spot('tasca-chico', 'Tasca do Chico', 'Tiny fado bar, fado vadio', '€', 30),
    what: ['drinks', 'different'], where: ['bairro-alto'], when: ['tonight'], cost: 1, slot: 'drinks',
  },
  {
    place: spot('ginjinha', 'A Ginjinha', 'Cherry liqueur at the counter', '€', 18, { shortName: 'Ginjinha' }),
    what: ['drinks'], where: ['alfama'], when: ['tonight'], cost: 1, slot: 'drinks',
  },
  {
    place: spot('a-baiuca', 'A Baiuca', 'Fado vadio over dinner', '€€', 4),
    what: ['food', 'different'], where: ['alfama'], when: ['tonight'], cost: 2, slot: 'dinner',
  },

  // ── Hidden gems ──
  {
    place: spot('jardim-torel', 'Jardim do Torel', 'Quiet garden with a view', 'Free', 25, { savedBy: 'maya' }),
    what: ['sights', 'different'], where: ['further'], when: ['morning'], cost: 0, savedBy: 'maya',
  },
  {
    place: spot('feira-ladra', 'Feira da Ladra', 'Flea market, Tue & Sat', 'Free', 8, { savedBy: 'nic' }),
    what: ['sights', 'different'], where: ['alfama'], when: [], cost: 0, savedBy: 'nic',
  },
  {
    place: spot('graca', 'Miradouro da Graça', 'Viewpoint with a kiosk bar', 'Free', 15, { shortName: 'Graça' }),
    what: ['sights', 'drinks'], where: ['alfama'], when: ['tonight', 'morning'], cost: 0, slot: 'drinks',
  },
  {
    place: spot('tile-museum', 'National Tile Museum', 'Azulejos in an old convent', 'Ticketed', 25, { shortName: 'Tile Museum' }),
    what: ['sights', 'different'], where: ['further'], when: [], cost: 1,
  },
]

export const LISTS: ExploreList[] = [
  {
    id: 'top10',
    title: 'Top 10 in Lisbon',
    blurb: 'The classics, in no particular order.',
    ids: ['jeronimos', 'castelo', 'tram-28', 'senhora-monte', 'belem-tower', 'pasteis-belem', 'timeout', 'maat', 'oceanario', 'lx-factory'],
  },
  {
    id: 'food',
    title: 'Food',
    blurb: 'Tascas, seafood and pastéis de nata.',
    ids: ['taberna', 'ramiro', 'cevicheria', 'sal-grosso', 'a-baiuca', 'o-trevo', 'timeout', 'santo-antonio', 'manteigaria'],
  },
  {
    id: 'nightlife',
    title: 'Nightlife',
    blurb: 'For the 23:30 drinks, or a late one next time.',
    ids: ['park-rooftop', 'pink-street', 'musicbox', 'tasca-chico', 'ginjinha', 'a-baiuca'],
  },
  {
    id: 'gems',
    title: 'Hidden gems',
    blurb: 'Quieter spots most visitors walk past.',
    ids: ['jardim-torel', 'feira-ladra', 'graca', 'tile-museum', 'tasca-chico', 'santo-antonio'],
  },
]

const BY_ID = new Map(CATALOG.map((e) => [e.place.id, e]))

export function exploreEntry(id: string): ExploreEntry | undefined {
  return BY_ID.get(id)
}

/** The place as the trip knows it (once added, data.places), else the catalog's. */
export function placeFor(id: string, places: readonly Place[]): Place | undefined {
  return places.find((p) => p.id === id) ?? BY_ID.get(id)?.place
}

/** Tonight's slot a place fits; a trip place outside the catalog is a dinner option. */
export function slotFor(id: string): TonightSlot | undefined {
  const e = BY_ID.get(id)
  return e ? e.slot : 'dinner'
}

/** Who saved an Idea: the seeded ones say, anything added since was Ari (only she can save here). */
export function savedBy(id: string, me: MemberId): MemberId | undefined {
  return INITIAL_IDEAS.includes(id) ? BY_ID.get(id)?.savedBy : me
}
