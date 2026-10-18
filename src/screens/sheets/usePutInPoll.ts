import { canAddOption, MAX_POLL_OPTIONS } from '../../domain/poll'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'

/**
 * "Put in a poll" / "Add to a poll" from Explore and the map: no poll yet → the
 * Decide sheet; a live poll with room → the place joins it; otherwise say why.
 */
export function usePutInPoll() {
  const poll = useApp((s) => s.poll)
  const decided = useApp((s) => s.decided)
  const openSheet = useApp((s) => s.openSheet)
  const suggestPlace = useApp((s) => s.suggestPlace)
  const showToast = useApp((s) => s.showToast)

  return (place: Place) => {
    if (decided || poll?.status === 'closed') {
      showToast('Tonight’s dinner is already decided')
    } else if (!poll) {
      openSheet('decide')
    } else if (poll.optionIds.includes(place.id)) {
      showToast(`${place.name} is already in tonight’s poll`)
    } else if (!canAddOption(poll)) {
      showToast(`The poll already has ${MAX_POLL_OPTIONS} options`)
    } else {
      suggestPlace(place.id)
      showToast(`${place.name} added to tonight’s poll`)
    }
  }
}
