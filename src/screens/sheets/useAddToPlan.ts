import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'

/**
 * "Add to a plan" from Explore and the map: the place fills tonight's open dinner slot
 * ("Pick a place · Choose it yourself, the group is notified"); once a poll is live or the
 * dinner is decided, say so instead.
 */
export function useAddToPlan() {
  const poll = useApp((s) => s.poll)
  const decided = useApp((s) => s.decided)
  const me = useApp((s) => s.data.trip.me)
  const decideWithout = useApp((s) => s.decideWithout)
  const showToast = useApp((s) => s.showToast)

  return (place: Place) => {
    if (decided || poll?.status === 'closed') showToast('Tonight’s dinner is already decided')
    else if (poll) showToast('Tonight’s poll is already live')
    else decideWithout(place.id, me)
  }
}
