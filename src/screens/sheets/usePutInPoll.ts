import { MAX_POLL_OPTIONS } from '../../domain/poll'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { placeActions } from '../explore/tonight'
import { decideWith } from './decideStart'

/**
 * "Put in a poll" / "Add to a poll" from Explore and the map: no poll yet → the
 * Decide sheet, with this place among the options; a live poll with room → the place joins it (a catalog place joins the
 * trip's places first); otherwise say why. Tonight's poll is for dinner places.
 */
export function usePutInPoll() {
  const addPlace = useApp((s) => s.addPlace)
  const openSheet = useApp((s) => s.openSheet)
  const suggestPlace = useApp((s) => s.suggestPlace)
  const showToast = useApp((s) => s.showToast)

  return (place: Place) => {
    const s = useApp.getState()
    const row = placeActions(s, place).poll
    if (!row) {
      showToast('Tonight’s poll is for dinner places')
    } else if (row.state === 'done') {
      showToast(`${place.name} is already in tonight’s poll`)
    } else if (row.state === 'blocked') {
      showToast(s.poll?.status === 'open' ? `The poll already has ${MAX_POLL_OPTIONS} options` : 'Tonight’s dinner is already decided')
    } else if (!s.poll) {
      addPlace(place)
      decideWith(place.id)
      openSheet('decide')
    } else {
      addPlace(place)
      suggestPlace(place.id)
      showToast(`✓ ${place.name} added to tonight’s poll`)
    }
  }
}
