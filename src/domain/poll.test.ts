import { describe, expect, it } from 'vitest'
import { createInitialTrip } from '../data/seed'
import type { ScriptedVote } from '../data/seed'
import {
  MAX_POLL_OPTIONS,
  addOption,
  barFraction,
  canAddOption,
  castVote,
  closePoll,
  pickByChance,
  shouldClose,
  tally,
} from './poll'
import type { Poll } from './types'

const { pollScript, places } = createInitialTrip()

const apply = (poll: Poll, votes: ScriptedVote[]) =>
  votes.reduce((p, v) => castVote(p, v.member, v.optionId), poll)

const hifi = castVote(apply(pollScript.poll, pollScript.votesBeforeAri), 'ari', pollScript.expectedAriVote)
const allVoted = apply(hifi, pollScript.votesAfterAri)

describe('live poll', () => {
  it('starts empty', () => {
    const t = tally(pollScript.poll)
    expect(t.voted).toBe(0)
    expect(t.eligible).toBe(6)
    expect(t.leaders).toEqual([])
    expect(t.waitingFor).toEqual(['ari', 'maya', 'theo', 'sam', 'nic', 'ren'])
  })

  it('hi-fi state: 4 of 6 voted, Taberna leading, waiting for Sam and Ren', () => {
    const t = tally(hifi, places)
    expect(t.voted).toBe(4)
    expect(t.eligible).toBe(6)
    expect(t.counts).toEqual({ ramiro: 1, taberna: 2, cevicheria: 1 })
    expect(t.voters).toEqual({ ramiro: ['maya'], taberna: ['theo', 'nic'], cevicheria: ['ari'] })
    expect(t.leaders).toEqual(['taberna'])
    expect(t.waitingFor).toEqual(['sam', 'ren'])
    expect(t.options.map((o) => o.place?.name)).toEqual([
      'Cervejaria Ramiro',
      'Taberna da Rua das Flores',
      'A Cevicheria',
    ])
    expect(t.options[1].fraction).toBeCloseTo(2 / 6)
    expect(shouldClose(hifi, '19:00')).toBe(false)
  })

  it('05B: Sam and Ren vote, Ramiro overtakes and wins', () => {
    const t = tally(allVoted)
    expect(t.counts).toEqual({ ramiro: 3, taberna: 2, cevicheria: 1 })
    expect(t.voters.ramiro).toEqual(['maya', 'sam', 'ren'])
    expect(t.voted).toBe(6)
    expect(t.waitingFor).toEqual([])
    expect(t.leaders).toEqual(['ramiro'])
    expect(shouldClose(allVoted, '19:05')).toBe(true)

    const closed = closePoll(allVoted)
    expect(closed.status).toBe('closed')
    expect(closed.winnerId).toBe('ramiro')
    expect(closed.decidedBy).toBe('votes')
    expect(shouldClose(closed, '19:30')).toBe(false)
  })

  it('closes at the deadline even if someone never votes', () => {
    expect(shouldClose(hifi, '19:29')).toBe(false)
    expect(shouldClose(hifi, '19:30')).toBe(true)
    expect(shouldClose(hifi, '21:00')).toBe(true)
    expect(closePoll(hifi).winnerId).toBe('taberna')
  })

  it('a tie needs a tie-break winner from the tied options', () => {
    const tied = apply(castVote(apply(pollScript.poll, pollScript.votesBeforeAri), 'ari', 'taberna'), pollScript.votesAfterAri)
    const t = tally(tied)
    expect(t.counts).toEqual({ ramiro: 3, taberna: 3, cevicheria: 0 })
    expect(t.leaders).toEqual(['ramiro', 'taberna'])
    expect(() => closePoll(tied)).toThrow()
    expect(() => closePoll(tied, { tieBreakWinner: 'cevicheria' })).toThrow()

    const closed = closePoll(tied, { tieBreakWinner: pickByChance(t.leaders, () => 0.99) })
    expect(closed.winnerId).toBe('taberna')
    expect(closed.decidedBy).toBe('chance')
  })

  it('with zero votes every option counts as tied', () => {
    expect(() => closePoll(pollScript.poll)).toThrow()
    expect(closePoll(pollScript.poll, { tieBreakWinner: 'cevicheria' }).winnerId).toBe('cevicheria')
  })

  it('lets votes change until the poll closes', () => {
    const switched = castVote(hifi, 'ari', 'ramiro')
    expect(tally(switched).counts).toEqual({ ramiro: 2, taberna: 2, cevicheria: 0 })
    expect(tally(switched).voted).toBe(4)
    expect(hifi.votes.ari).toBe('cevicheria') // original untouched

    const closed = closePoll(allVoted)
    expect(castVote(closed, 'ari', 'ramiro')).toBe(closed)
  })

  it('counts each eligible member once', () => {
    const dup: Poll = { ...pollScript.poll, eligible: ['ari', 'maya', 'ari'] }
    const t = tally(castVote(castVote(dup, 'ari', 'ramiro'), 'maya', 'taberna'))
    expect(t.eligible).toBe(2)
    expect(t.voted).toBe(2)
    expect(t.waitingFor).toEqual([])
    expect(t.options[0].fraction).toBe(0.5)
  })

  it('ignores votes from non-eligible members and unknown options', () => {
    const notEligible: Poll = { ...pollScript.poll, eligible: ['ari', 'maya'] }
    expect(castVote(notEligible, 'ren', 'ramiro')).toBe(notEligible)
    expect(castVote(hifi, 'sam', 'nowhere')).toBe(hifi)
  })
})

describe('adding options', () => {
  it('Theo adds Time Out Market: existing votes stay', () => {
    const { addedBy, placeId } = pollScript.fourthOption
    expect(addedBy).toBe('theo')
    const four = addOption(hifi, placeId)
    expect(four.optionIds).toEqual(['ramiro', 'taberna', 'cevicheria', 'timeout'])
    expect(tally(four).counts).toEqual({ ramiro: 1, taberna: 2, cevicheria: 1, timeout: 0 })
    expect(tally(four).voted).toBe(4)
  })

  it('caps at 4 options and skips duplicates', () => {
    const four = addOption(hifi, 'timeout')
    expect(four.optionIds).toHaveLength(MAX_POLL_OPTIONS)
    expect(canAddOption(four)).toBe(false)
    expect(addOption(four, 'somewhere-else')).toBe(four)
    expect(addOption(hifi, 'ramiro')).toBe(hifi)
    expect(addOption(closePoll(allVoted), 'timeout').optionIds).toHaveLength(3)
  })
})

describe('barFraction', () => {
  it('scales bars to votes ÷ eligible voters', () => {
    expect(barFraction(3, 6)).toBe(0.5)
    expect(barFraction(0, 6)).toBe(0)
    expect(barFraction(1, 0)).toBe(0)
  })
})
