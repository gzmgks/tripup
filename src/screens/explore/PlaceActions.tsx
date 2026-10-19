import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Sheet'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import shared from '../sheets/sheets.module.css'
import { useAddToPlan } from '../sheets/useAddToPlan'
import { usePutInPoll } from '../sheets/usePutInPoll'
import { asIdea, noSlotLine, placeActions } from './tonight'
import type { ActionRow } from './tonight'
import styles from './PlaceActions.module.css'

interface PlaceActionsProps {
  place: Place
  onClose: () => void
}

/**
 * "+ Add" on an Explore place: a small sheet over Explore with everything it can join on the
 * last night: the group's Ideas, tonight's 20:30 dinner or 23:30 drinks, the dinner poll.
 * Each row says where it stands before you tap (open, live 3 of 4, decided…), so nothing
 * fails after the fact. Rows are built like Add plan's choices.
 */
export function PlaceActions({ place, onClose }: PlaceActionsProps) {
  const trip = useApp(useShallow((s) => ({ data: s.data, poll: s.poll, decided: s.decided, ideas: s.ideas, clock: s.clock })))
  const saveIdea = useApp((s) => s.saveIdea)
  const closeSheet = useApp((s) => s.closeSheet)
  const showToast = useApp((s) => s.showToast)
  const hideToast = useApp((s) => s.hideToast)
  const addToPlan = useAddToPlan()
  const putInPoll = usePutInPoll()
  const rows = placeActions(trip, place)

  // This sheet closes first (focus goes back to "+ Add"), then the action runs; dinner and
  // the poll close Explore as well, to show the plan.
  const save = () => {
    onClose()
    saveIdea(asIdea(place, trip.data.trip.me))
    showToast(`✓ ${place.name} saved to Ideas`)
  }
  const dinner = () => {
    onClose()
    addToPlan(place, 'dinner')
  }
  const drinks = () => {
    onClose()
    closeSheet()
    addToPlan(place, 'drinks')
  }
  const poll = () => {
    onClose()
    putInPoll(place)
  }

  // A time ("20:30") needs a wider tile; then every tile is that wide, so the text column lines up.
  const wide = !!(rows.dinner || rows.drinks)
  // A toast from the step before would sit on top of the rows (as openSheet does for sheets).
  useEffect(() => hideToast(), [hideToast])

  return (
    <Sheet title={place.name} onClose={onClose}>
      <p className={styles.meta}>{place.meta}</p>
      <div className={shared.stack}>
        <Row wide={wide} icon={<Icon name="star" size={20} />} row={rows.ideas} onPick={save} />
        {rows.dinner && <Row wide icon={<span className={styles.time}>{rows.dinner.time}</span>} row={rows.dinner} onPick={dinner} />}
        {rows.drinks && <Row wide icon={<span className={styles.time}>{rows.drinks.time}</span>} row={rows.drinks} onPick={drinks} />}
        {rows.poll && <Row wide={wide} icon={<Icon name="list" size={20} />} row={rows.poll} onPick={poll} />}
      </div>
      {!rows.dinner && !rows.drinks && <p className={shared.note}>{noSlotLine(trip, place)}</p>}
      <div className={shared.end} aria-hidden="true" />
    </Sheet>
  )
}

/** Available = a button with a chevron; done = a Lime-dark ✓; blocked = the reason, nothing to tap. */
function Row({ icon, row, onPick, wide }: { icon: ReactNode; row: ActionRow; onPick: () => void; wide?: boolean }) {
  const content = (
    <>
      <span className={`${shared.iconTile} ${wide ? styles.timeTile : ''}`} aria-hidden="true">
        {icon}
      </span>
      <span className={shared.rowText}>
        <span className={`${shared.itemTitle} ${row.state === 'blocked' ? styles.off : ''}`}>{row.title}</span>
        <span className={shared.note}>{row.note}</span>
      </span>
    </>
  )
  if (row.state === 'available')
    return (
      <button type="button" className={`${shared.card} ${styles.row}`} onClick={onPick}>
        {content}
        <Icon name="chevron-left" size={20} className={shared.chevron} />
      </button>
    )
  return (
    <div className={`${shared.card} ${styles.row}`}>
      {content}
      {row.state === 'done' && <Icon name="check" size={20} className={styles.check} />}
    </div>
  )
}
