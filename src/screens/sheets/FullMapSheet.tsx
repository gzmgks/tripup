import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import mapDay5 from '../../assets/images/map-day5.webp'
import { arrowKeys } from '../../components/arrowKeys'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Sheet'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { ActChip, Chip, PlaceRow } from './parts'
import { useAddToPlan } from './useAddToPlan'
import { usePutInPoll } from './usePutInPoll'
import shared from './sheets.module.css'
import styles from './FullMapSheet.module.css'

/** Where the group's saved ideas sit on the Day 5 map (percent of the map box, clear of the route). */
const IDEA_PINS: Record<string, { left: string; top: string }> = {
  ramiro: { left: '78%', top: '60%' },
  cevicheria: { left: '15%', top: '24%' },
}

/** 02 callout · Full trip map (128:25): the timeline in space, plus the group's ★ ideas. */
export function FullMapSheet() {
  const data = useApp((s) => s.data)
  const closeSheet = useApp((s) => s.closeSheet)
  const showToast = useApp((s) => s.showToast)
  const addToPlan = useAddToPlan()
  const putInPoll = usePutInPoll()
  const [picked, setPicked] = useState<string | null>(null)

  const ideas = data.places.filter((p) => p.source.startsWith('In your Ideas') && IDEA_PINS[p.id])
  const idea: Place | undefined = ideas.find((p) => p.id === picked)

  return (
    <Sheet title="Full trip map" onClose={closeSheet}>
      <div className={shared.chips} role="tablist" aria-label="Map view" onKeyDown={arrowKeys()}>
        <Chip role="tab" selected onClick={() => undefined}>
          Today
        </Chip>
        <Chip role="tab" onClick={() => showToast('Not part of this demo: today is Day 5')}>
          Whole trip
        </Chip>
        <Chip role="tab" onClick={() => showToast('Not part of this demo: the group’s ideas are the ★ on this map')}>
          Ideas · {data.trip.ideasCount}
        </Chip>
      </div>

      <div className={styles.map}>
        <img className={styles.mapImage} src={mapDay5} alt="Map of today’s stops in Lisbon" />
        {ideas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.idea} ${picked === p.id ? styles.ideaOn : ''}`}
            style={IDEA_PINS[p.id]}
            aria-label={`${p.name}, saved by the group`}
            aria-pressed={picked === p.id}
            onClick={() => setPicked(picked === p.id ? null : p.id)}
          >
            <Icon name="star" size={14} />
          </button>
        ))}
      </div>

      <ul className={styles.legend} aria-label="Legend">
        <li>
          <span className={styles.dot} aria-hidden="true" />
          Planned stop
        </li>
        <li>
          <span className={styles.open} aria-hidden="true">
            ?
          </span>
          Open slot
        </li>
        <li>
          <span className={styles.star} aria-hidden="true">
            <Icon name="star" size={12} />
          </span>
          Saved by the group
        </li>
      </ul>

      <AnimatePresence mode="wait" initial={false}>
        {idea ? (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            <PlaceRow title={idea.name} meta={idea.meta} note={idea.source}>
              <div className={shared.menu}>
                <ActChip onMuted onClick={() => addToPlan(idea)}>
                  Add to a plan
                </ActChip>
                <ActChip onMuted onClick={() => putInPoll(idea)}>
                  Add to a poll
                </ActChip>
              </div>
            </PlaceRow>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            className={shared.note}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            Tap a ★ to add it to a plan or a poll.
          </motion.p>
        )}
      </AnimatePresence>
      <div className={shared.end} aria-hidden="true" />
    </Sheet>
  )
}
