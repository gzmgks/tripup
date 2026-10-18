import { Sheet } from '../../components/Sheet'
import { canAddOption, MAX_POLL_OPTIONS } from '../../domain/poll'
import { useApp } from '../../store/app'
import { ActChip, PlaceRow } from './parts'
import shared from './sheets.module.css'

/** "+ Suggest a place" on the live poll (05 callout 90:61): anyone can add one more, max 4. */
export function SuggestSheet() {
  const places = useApp((s) => s.data.places)
  const poll = useApp((s) => s.poll)
  const closeSheet = useApp((s) => s.closeSheet)
  const suggestPlace = useApp((s) => s.suggestPlace)

  const inPoll = poll?.optionIds ?? []
  const open = poll?.status === 'open'
  const room = open && poll ? canAddOption(poll) : false
  const others = places.filter((p) => !inPoll.includes(p.id))

  return (
    <Sheet
      title="Suggest a place"
      onClose={closeSheet}
      footer={<p className={shared.note}>{room ? `Up to ${MAX_POLL_OPTIONS} places per poll` : `The poll already has ${MAX_POLL_OPTIONS} options.`}</p>}
    >
      {room && others.length > 0 ? (
        <div className={shared.stack}>
          {others.map((p) => (
            <PlaceRow
              key={p.id}
              title={p.name}
              meta={p.meta}
              trailing={
                <ActChip onMuted onClick={() => suggestPlace(p.id)} label={`Add ${p.name} to the poll`}>
                  + Add
                </ActChip>
              }
            />
          ))}
        </div>
      ) : (
        <p className={shared.body}>
          {!open
            ? 'This poll has closed.'
            : !room
              ? `The poll already has ${MAX_POLL_OPTIONS} options.`
              : 'Every place you saved is already in the poll.'}
        </p>
      )}
    </Sheet>
  )
}
