import type { TonightSlot } from '../../data/explore'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { noSlotLine, placeActions } from '../explore/tonight'

/**
 * "Add to a plan" from Explore and the map: the place fills the slot of tonight's plan it
 * fits, the open 20:30 dinner ("Pick a place · Choose it yourself, the group is notified")
 * or the 23:30 drinks; `slot` picks one when the caller asked. A catalog place joins the
 * trip's places first. Once a poll is live or the dinner is decided, say so instead.
 */
export function useAddToPlan() {
  const addPlace = useApp((s) => s.addPlace)
  const decideWithout = useApp((s) => s.decideWithout)
  const fillDrinks = useApp((s) => s.fillDrinks)
  const showToast = useApp((s) => s.showToast)

  return (place: Place, slot?: TonightSlot) => {
    const s = useApp.getState()
    const { dinner, drinks } = placeActions(s, place)
    if (slot !== 'drinks' && dinner?.state === 'available') {
      addPlace(place)
      decideWithout(place.id, s.data.trip.me)
    } else if (slot !== 'dinner' && drinks?.state === 'available') {
      fillDrinks(place)
      showToast(`✓ ${place.name} added to tonight’s plan`)
    } else if (drinks?.state === 'done') {
      showToast(`${place.name} is already tonight’s drinks`)
    } else if (dinner) {
      showToast(dinner.state === 'blocked' && s.poll?.status === 'open' ? 'Tonight’s poll is already live' : 'Tonight’s dinner is already decided')
    } else {
      showToast(noSlotLine(s, place))
    }
  }
}
