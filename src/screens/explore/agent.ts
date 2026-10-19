// The AI travel agent in Explore, as a short deterministic script: four questions (what,
// where, when, budget), then 2–3 places from the catalog. Pure, so the matching and the
// copy are tested (agent.test.ts); the chat view only adds the typing pause.

import { CATALOG } from '../../data/explore'
import type { ExploreEntry, ExploreWhat } from '../../data/explore'

export type What = ExploreWhat
export type Where = 'alfama' | 'bairro-alto' | 'belem' | 'anywhere'
export type When = 'tonight' | 'morning' | 'next'
export type Budget = '€' | '€€' | '€€€' | 'any'

export interface Answers {
  what?: What
  where?: Where
  when?: When
  budget?: Budget
}

export type Question = keyof Answers

export interface Choice {
  value: string
  label: string
}

export const ORDER: Question[] = ['what', 'where', 'when', 'budget']

/** Each question and its suggestion chips; a tapped chip becomes Ari's message, in its own words. */
export const QUESTIONS: Record<Question, { prompt: string; choices: Choice[] }> = {
  what: {
    prompt: 'What are you in the mood for?',
    choices: [
      { value: 'food', label: 'Food' },
      { value: 'drinks', label: 'Drinks' },
      { value: 'sights', label: 'Sights' },
      { value: 'different', label: 'Something different' },
    ],
  },
  where: {
    prompt: 'Where should I look?',
    choices: [
      { value: 'alfama', label: 'Near us in Alfama' },
      { value: 'bairro-alto', label: 'Bairro Alto' },
      { value: 'belem', label: 'Belém' },
      { value: 'anywhere', label: 'Anywhere' },
    ],
  },
  when: {
    prompt: 'When is it for?',
    choices: [
      { value: 'tonight', label: 'Tonight' },
      { value: 'morning', label: 'Tomorrow morning before we fly' },
      { value: 'next', label: 'Next trip' },
    ],
  },
  budget: {
    prompt: 'And the budget?',
    choices: [
      { value: '€', label: '€' },
      { value: '€€', label: '€€' },
      { value: '€€€', label: '€€€' },
      { value: 'any', label: 'Doesn’t matter' },
    ],
  },
}

/** What the agent knows about tonight, so its tips are true for the moment you ask. */
export interface AgentContext {
  /** The 20:30 dinner: still open, a poll is live, or decided. */
  dinner: 'open' | 'poll' | 'decided'
  /** The live poll already has its 4 places. */
  pollFull?: boolean
  /** The 23:30 drinks slot's place, once it has one. */
  drinksAt?: string
  /** Story clock, 'HH:MM'. */
  clock: string
}

export interface AgentTurn {
  lines: string[]
  /** The question the suggestion chips answer. */
  ask?: Question
  /** The places it suggests, best first (a results turn; [] when nothing fits). */
  ids?: string[]
}

export const greeting = (name: string): AgentTurn => ({
  lines: [`Hi ${name}! I can find something for tonight, for tomorrow morning before you fly, or for your next trip.`, QUESTIONS.what.prompt],
  ask: 'what',
})

const ACK: Record<What, string> = {
  food: 'Food it is.',
  drinks: 'Drinks it is.',
  sights: 'Sights it is.',
  different: 'Something different, love it.',
}

/** The agent's next turn: the first unanswered question, or the results once all four are in. */
export function respond(a: Answers, ctx: AgentContext): AgentTurn {
  const next = ORDER.find((q) => a[q] === undefined)
  if (!next) return results(a as Required<Answers>, ctx)
  const ack = next === 'where' && a.what ? `${ACK[a.what]} ` : ''
  return { lines: [`${ack}${QUESTIONS[next].prompt}`], ask: next }
}

/** Typed instead of tapped: "didn't catch that", then the same question (or a hint once it's done). */
export function notUnderstood(a: Answers): AgentTurn {
  const next = ORDER.find((q) => a[q] === undefined)
  return next
    ? { lines: ['Sorry, I didn’t catch that.', QUESTIONS[next].prompt], ask: next }
    : { lines: ['Sorry, I didn’t catch that. Try something like “cheap drinks near us tonight”, or start over.'] }
}

// ── Matching ───────────────────────────────────────────────────────────

const CAP: Record<Budget, number> = { '€': 1, '€€': 2, '€€€': 3, any: 3 }
const LIMIT = 3

type Relaxed = 'where' | 'budget' | 'both'

/**
 * Places for a full set of answers. Strict first; with fewer than 2, it keeps the area and
 * relaxes the budget, then keeps the budget and looks further, then both, with the exact
 * matches still on top (`exact` of them). It never bends "when": a museum is not a tonight
 * place. Visited places go last (and out, for a next trip).
 */
export function recommend(a: Required<Answers>): { ids: string[]; relaxed?: Relaxed; exact: number } {
  const fits = (e: ExploreEntry, where: boolean, budget: boolean) =>
    e.what.includes(a.what) &&
    (a.when === 'next' || e.when.includes(a.when)) &&
    (!where || a.where === 'anywhere' || e.where.includes(a.where)) &&
    (!budget || e.cost <= CAP[a.budget])
  const tiers: { found: ExploreEntry[]; relaxed?: Relaxed }[] = [
    { found: CATALOG.filter((e) => fits(e, true, true)) },
    { found: CATALOG.filter((e) => fits(e, true, false)), relaxed: 'budget' },
    { found: CATALOG.filter((e) => fits(e, false, true)), relaxed: 'where' },
    { found: CATALOG.filter((e) => fits(e, false, false)), relaxed: 'both' },
  ]
  const tier = tiers.find((t) => t.found.length >= 2) ?? tiers.find((t) => t.found.length > 0)
  if (!tier) return { ids: [], exact: 0 }

  const exact = tiers[0].found
  const groupBeen = (e: ExploreEntry) => !!e.been && !e.been.who
  let found = tier.found
  if (a.when === 'next' && found.filter((e) => !groupBeen(e)).length >= 2) found = found.filter((e) => !groupBeen(e))
  const ranked = found
    .map((e, i) => ({ e, i }))
    .sort(
      (x, y) =>
        Number(!exact.includes(x.e)) - Number(!exact.includes(y.e)) ||
        Number(groupBeen(x.e)) - Number(groupBeen(y.e)) ||
        // Tonight and tomorrow morning: closest first. Next trip: the catalog's own order.
        (a.when === 'next' ? 0 : x.e.place.walkMin - y.e.place.walkMin) ||
        x.i - y.i,
    )
  const ids = ranked.slice(0, LIMIT).map((r) => r.e.place.id)
  return { ids, ...(tier.relaxed ? { relaxed: tier.relaxed } : {}), exact: ranked.filter((r) => exact.includes(r.e)).length }
}

// ── Copy ───────────────────────────────────────────────────────────────

const COUNT = ['', 'One', 'Two', 'Three', 'Four']
const NOUN: Record<What, [one: string, many: string]> = {
  food: ['place to eat', 'places to eat'],
  drinks: ['place for a drink', 'places for a drink'],
  sights: ['thing to see', 'things to see'],
  different: ['place that’s a bit different', 'places that are a bit different'],
}
const WHERE: Record<Where, string> = {
  alfama: 'near the house',
  'bairro-alto': 'in Bairro Alto',
  belem: 'in Belém',
  anywhere: 'around Lisbon',
}
const WHEN: Record<When, string> = { tonight: 'tonight', morning: 'tomorrow morning', next: 'for your next trip' }
const BUDGET: Record<Budget, string> = { '€': ', € or free', '€€': ', €€ or less', '€€€': '', any: '' }

const FADO_VADIO = ['a-baiuca', 'tasca-chico']

function results(a: Required<Answers>, ctx: AgentContext): AgentTurn {
  const { ids, relaxed, exact } = recommend(a)
  if (ids.length === 0) return { lines: ['I couldn’t find anything for that, honestly. Want to try another time or budget?'], ids }

  const n = ids.length
  const what = `${COUNT[n]} ${NOUN[a.what][n === 1 ? 0 : 1]}`
  // When it had to bend, it says what it bent (and keeps the one exact match, if there was one).
  const lead =
    relaxed === 'budget'
      ? exact
        ? `Only one at ${a.budget} ${WHERE[a.where]} ${WHEN[a.when]}, so I added some that cost a bit more:`
        : `Nothing at ${a.budget} ${WHERE[a.where]} ${WHEN[a.when]}, so these cost a bit more:`
      : relaxed === 'where'
        ? exact
          ? `Only one ${NOUN[a.what][0]} ${WHERE[a.where]} for that, so I looked a bit further:`
          : `Not much ${WHERE[a.where]} for that, so I looked a bit further. ${what} ${WHEN[a.when]}${BUDGET[a.budget]}:`
        : relaxed === 'both'
          ? 'Not much like that, so here’s the closest I’ve got:'
          : `${what} ${WHERE[a.where]} ${WHEN[a.when]}${BUDGET[a.budget]}:`
  const tip = tipFor(a, ids, ctx)
  return { lines: tip ? [lead, tip] : [lead], ids }
}

/** One specific, true line about what to do with the results right now. */
function tipFor(a: Required<Answers>, ids: string[], ctx: AgentContext): string | undefined {
  if (a.when === 'next') return 'Add the ones you like to Ideas: they’ll be waiting when you plan your next trip.'
  if (a.when === 'morning') return 'Nothing is planned for tomorrow, so add the ones you like to Ideas for the group to see.'
  if (a.what === 'different' && ids.some((id) => FADO_VADIO.includes(id))) return 'You had fado on Day 2. Fado vadio is different: anyone can get up and sing.'
  if (a.what === 'sights')
    return ctx.clock < '19:00'
      ? 'Most sights close in the evening, but the viewpoints are free and sunset is around 19:00.'
      : 'Most sights close in the evening, but the viewpoints are free and lovely after dark.'
  if (a.what === 'drinks') return slotHint('drinks', ctx)
  return slotHint('dinner', ctx)
}

/** Where tonight's slot stands, for the agent and the Food and Nightlife lists. */
export function slotHint(slot: 'dinner' | 'drinks', ctx: AgentContext): string {
  if (slot === 'drinks')
    return ctx.drinksAt
      ? `Drinks are at ${ctx.drinksAt} for now: tap + Add on another to switch.`
      : 'The 23:30 drinks have no bar yet: tap + Add to pick one.'
  if (ctx.dinner === 'open') return 'Dinner at 20:30 is still open: tap + Add to pick one, or put it in a poll.'
  if (ctx.dinner === 'poll')
    return ctx.pollFull ? 'The dinner poll is full, so add the ones you like to Ideas.' : 'The dinner poll is live: tap + Add to put one in it.'
  return 'Tonight’s dinner is decided, so add the ones you like to Ideas for next time.'
}

// ── Typed requests ─────────────────────────────────────────────────────

/** Keywords → answers; the first match per question wins (so "€€€" before "€"). */
const RULES: { re: RegExp; set: Answers }[] = [
  { re: /\b(food|eat|eats|eating|dinner|lunch|breakfast|brunch|restaurants?|hungry|seafood|tascas?|nata|past[eé]is|bakery|coffee)\b/, set: { what: 'food' } },
  { re: /\b(drinks?|bars?|cocktails?|wine|beers?|clubs?|clubbing|party|nightlife|ginja)\b/, set: { what: 'drinks' } },
  { re: /\b(sights?|sightseeing|see|views?|viewpoints?|miradouros?|museums?|castle|monuments?)\b/, set: { what: 'sights' } },
  { re: /\b(different|unusual|hidden|quirky|surprise|fado)\b/, set: { what: 'different' } },
  { re: /\b(alfama|near|nearby|close by|close to|walking distance|around here)\b/, set: { where: 'alfama' } },
  { re: /\b(bairro alto|chiado|cais do sodr[eé])\b/, set: { where: 'bairro-alto' } },
  { re: /\bbel[eé]m\b/, set: { where: 'belem' } },
  { re: /\b(anywhere|wherever|all over)\b/, set: { where: 'anywhere' } },
  { re: /\b(next (trip|time|year)|another time|someday|come back)\b/, set: { when: 'next' } },
  { re: /\b(tomorrow|morning|breakfast|before (we|the|our) (fly|flight)|before flying)\b/, set: { when: 'morning' } },
  { re: /\b(tonight|now|this evening|later)\b/, set: { when: 'tonight' } },
  { re: /(doesn.?t matter|no budget|any budget|any price|whatever)/, set: { budget: 'any' } },
  { re: /(€€€|splurge|fancy|treat)/, set: { budget: '€€€' } },
  { re: /(€€|mid-?range|moderate|not too (pricey|expensive)|reasonable)/, set: { budget: '€€' } },
  { re: /(€|\bcheap\b|\bfree\b|\bbudget\b|inexpensive)/, set: { budget: '€' } },
]

export function parseRequest(text: string): Answers {
  // "Drinks after dinner" is about drinks, tonight: the dinner there is a time, not a want.
  const t = text.toLowerCase().replace(/’/g, "'").replace(/after dinner/g, 'tonight')
  let out: Answers = {}
  for (const r of RULES) if (r.re.test(t)) out = { ...r.set, ...out }
  return out
}

export const isStartOver = (text: string) => /^\s*(start over|restart|reset|start again)\b/i.test(text)
