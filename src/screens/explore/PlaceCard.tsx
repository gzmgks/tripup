import type { Place } from '../../domain/types'
import { ActChip, PlaceRow } from '../sheets/parts'

interface PlaceCardProps {
  place: Place
  /** Where it stands: "In tonight’s poll", "Been here · Day 2", "In Ideas ✓"… */
  note?: string
  onAdd: (place: Place) => void
}

/** A place in Explore (agent replies and lists): name, meta, its state, and "+ Add" for the menu. */
export function PlaceCard({ place, note, onAdd }: PlaceCardProps) {
  return (
    <PlaceRow
      title={place.name}
      meta={place.meta}
      note={note || undefined}
      trailing={
        <ActChip onMuted label={`Add ${place.name} to Ideas, a plan or a poll`} onClick={() => onAdd(place)}>
          + Add
        </ActChip>
      }
    />
  )
}
