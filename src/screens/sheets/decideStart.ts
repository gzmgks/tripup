import { useApp } from '../../store/app'

/**
 * "Add to a poll" from Explore or the map when there's no poll yet: the Decide sheet opens
 * with that place among the options. The opener calls this just before openSheet('decide');
 * it holds until the poll starts or the dinner is decided, and a demo jump forgets it.
 */
let pending: { placeId: string; jumps: number } | null = null

export function decideWith(placeId: string) {
  pending = { placeId, jumps: useApp.getState().jumps }
}

/** Read by the Decide sheet as it mounts. */
export const decideStart = (): string | null => (pending && pending.jumps === useApp.getState().jumps ? pending.placeId : null)

export function resetDecideStart() {
  pending = null
}
