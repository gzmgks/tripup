import { useShallow } from 'zustand/react/shallow'
import { arrowKeys } from '../../components/arrowKeys'
import { exploreEntry, LISTS, placeFor } from '../../data/explore'
import type { ListId } from '../../data/explore'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { Chip } from '../sheets/parts'
import shared from '../sheets/sheets.module.css'
import { slotHint } from './agent'
import { PlaceCard } from './PlaceCard'
import { agentContext, placeNote } from './tonight'
import styles from './ExploreLists.module.css'

const useTrip = () => useApp(useShallow((s) => ({ data: s.data, poll: s.poll, decided: s.decided, ideas: s.ideas, clock: s.clock })))

/** The curated lists: Top 10 in Lisbon, Food, Nightlife, Hidden gems (one at a time, chips as tabs). */
export function ExploreLists({ list, onList, onAdd }: { list: ListId; onList: (id: ListId) => void; onAdd: (place: Place) => void }) {
  const trip = useTrip()
  const current = LISTS.find((l) => l.id === list) ?? LISTS[0]
  const places = current.ids.map((id) => placeFor(id, trip.data.places)).filter((p) => p !== undefined)
  // The crew's own trip, counted from the ledger: "You’ve been to 6."
  const been = current.ids.filter((id) => {
    const b = exploreEntry(id)?.been
    return b && !b.who
  }).length
  const hint = list === 'food' ? slotHint('dinner', agentContext(trip)) : list === 'nightlife' ? slotHint('drinks', agentContext(trip)) : null

  return (
    <>
      <div className={shared.chips} role="tablist" aria-label="Lists" onKeyDown={arrowKeys()}>
        {LISTS.map((l) => (
          <Chip key={l.id} role="tab" selected={l.id === current.id} onClick={() => onList(l.id)}>
            {l.title}
          </Chip>
        ))}
      </div>
      <div className={shared.section}>
        <p className={`${shared.body} ${styles.blurb}`}>
          {current.blurb}
          {been > 0 && ` You’ve been to ${been}.`}
        </p>
        {hint && <p className={shared.note}>{hint}</p>}
      </div>
      <div className={shared.stack}>
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} note={placeNote(trip, p.id)} onAdd={onAdd} />
        ))}
      </div>
    </>
  )
}

/** "Your Ideas": everything in the group's list, with who saved it. */
export function ExploreIdeas({ onAdd }: { onAdd: (place: Place) => void }) {
  const trip = useTrip()
  const places = trip.ideas.map((id) => placeFor(id, trip.data.places)).filter((p) => p !== undefined)
  return (
    <>
      <p className={`${shared.body} ${styles.blurb}`}>Everything the group saved, for tonight or next time.</p>
      <div className={shared.stack}>
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} note={placeNote(trip, p.id, { savers: true })} onAdd={onAdd} />
        ))}
      </div>
    </>
  )
}
