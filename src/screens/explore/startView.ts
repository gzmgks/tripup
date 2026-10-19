import type { ListId } from '../../data/explore'

/** Where Explore opens: the AI agent, a curated list, or the group's Ideas. */
export type ExploreStart = 'ai' | 'ideas' | ListId

let next: ExploreStart = 'ai'

/**
 * Openers that land somewhere specific call this just before openSheet('explore'):
 * "Ideas (7)" → 'ideas', "Pick a place" → 'food'. A plain open starts at the agent.
 */
export function exploreAt(start: ExploreStart) {
  next = start
}

/** Read by Explore as it mounts (StrictMode reads it twice, so the reset is separate). */
export const exploreStart = (): ExploreStart => next

export function resetExploreStart() {
  next = 'ai'
}
