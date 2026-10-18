// Group poll logic for TripUp. Pure functions; every update returns a new Poll.

import { MEMBER_ORDER } from './money'
import type { ClockTime, MemberId, Place, Poll } from './types'

export const MAX_POLL_OPTIONS = 4

export interface PollOptionRow {
  optionId: string
  place?: Place
  count: number
  voters: MemberId[]
  /** Bar length: votes ÷ eligible voters. */
  fraction: number
  isLeader: boolean
}

export interface PollTally {
  counts: Record<string, number>
  voters: Record<string, MemberId[]>
  voted: number
  eligible: number
  /** Every option with the top count, in option order; [] when nobody voted. */
  leaders: string[]
  waitingFor: MemberId[]
  /** One row per option, in option order, with the place resolved when given. */
  options: PollOptionRow[]
}

export function barFraction(count: number, eligible: number): number {
  return eligible > 0 ? count / eligible : 0
}

/** Only votes from eligible members for current options count. */
function validVote(poll: Poll, member: MemberId): string | undefined {
  const choice = poll.votes[member]
  return poll.eligible.includes(member) && choice !== undefined && poll.optionIds.includes(choice)
    ? choice
    : undefined
}

export function tally(poll: Poll, places: readonly Place[] = []): PollTally {
  const counts: Record<string, number> = {}
  const voters: Record<string, MemberId[]> = {}
  for (const id of poll.optionIds) {
    counts[id] = 0
    voters[id] = []
  }

  const waitingFor: MemberId[] = []
  let voted = 0
  // Counted per member, so a repeated id in poll.eligible can't inflate "of 6".
  let eligible = 0
  for (const m of MEMBER_ORDER) {
    if (!poll.eligible.includes(m)) continue
    eligible += 1
    const choice = validVote(poll, m)
    if (choice === undefined) {
      waitingFor.push(m)
      continue
    }
    counts[choice] += 1
    voters[choice].push(m)
    voted += 1
  }

  const top = Math.max(0, ...poll.optionIds.map((id) => counts[id]))
  const leaders = top === 0 ? [] : poll.optionIds.filter((id) => counts[id] === top)

  const options = poll.optionIds.map((optionId) => ({
    optionId,
    place: places.find((p) => p.id === optionId),
    count: counts[optionId],
    voters: voters[optionId],
    fraction: barFraction(counts[optionId], eligible),
    isLeader: leaders.includes(optionId),
  }))

  return { counts, voters, voted, eligible, leaders, waitingFor, options }
}

/** Vote or change a vote. Ignored when the poll is closed, the member can't vote, or the option is unknown. */
export function castVote(poll: Poll, member: MemberId, optionId: string): Poll {
  if (poll.status !== 'open') return poll
  if (!poll.eligible.includes(member) || !poll.optionIds.includes(optionId)) return poll
  if (poll.votes[member] === optionId) return poll
  return { ...poll, votes: { ...poll.votes, [member]: optionId } }
}

export function canAddOption(poll: Poll): boolean {
  return poll.status === 'open' && poll.optionIds.length < MAX_POLL_OPTIONS
}

/** Add a place as an option (max 4, no duplicates). Existing votes stay. */
export function addOption(poll: Poll, placeId: string): Poll {
  if (!canAddOption(poll) || poll.optionIds.includes(placeId)) return poll
  return { ...poll, optionIds: [...poll.optionIds, placeId] }
}

export function clockToMinutes(clock: ClockTime): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock)
  if (!match) throw new Error(`expected 'HH:MM', got '${clock}'`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) throw new Error(`expected 'HH:MM', got '${clock}'`)
  return hours * 60 + minutes
}

/** An open poll closes once everyone eligible has voted, or at its deadline. */
export function shouldClose(poll: Poll, clock: ClockTime): boolean {
  if (poll.status !== 'open') return false
  if (tally(poll).waitingFor.length === 0) return true
  return clockToMinutes(clock) >= clockToMinutes(poll.closesAt)
}

export interface ClosePollOptions {
  /** Needed on a tie (or with zero votes): must be one of the tied options. */
  tieBreakWinner?: string
}

/**
 * Close the poll and set its winner. A single leader wins by votes. On a tie the
 * caller passes tieBreakWinner (the "Let fate decide" spin); with zero votes
 * every option counts as tied.
 */
export function closePoll(poll: Poll, opts: ClosePollOptions = {}): Poll {
  if (poll.status === 'closed') return poll
  if (poll.optionIds.length === 0) throw new Error('cannot close a poll without options')

  const { leaders } = tally(poll)
  const candidates = leaders.length > 0 ? leaders : poll.optionIds
  if (candidates.length === 1) {
    return { ...poll, status: 'closed', winnerId: candidates[0], decidedBy: 'votes' }
  }
  const pick = opts.tieBreakWinner
  if (pick === undefined || !candidates.includes(pick)) {
    throw new Error(`tie between ${candidates.join(', ')}: tieBreakWinner must be one of them`)
  }
  return { ...poll, status: 'closed', winnerId: pick, decidedBy: 'chance' }
}

/** The spin: pick one candidate at random (inject `random` for tests). */
export function pickByChance(candidates: readonly string[], random: () => number = Math.random): string {
  if (candidates.length === 0) throw new Error('pickByChance needs at least one candidate')
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index]
}
