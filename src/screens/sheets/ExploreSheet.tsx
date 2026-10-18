import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { SectionTitle } from '../../components/SectionTitle'
import { Sheet } from '../../components/Sheet'
import { DINNER_PLAN_ID } from '../../data/seed'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { ActChip, Chip, PlaceRow } from './parts'
import { useAddToPlan } from './useAddToPlan'
import { usePutInPoll } from './usePutInPoll'
import shared from './sheets.module.css'
import styles from './ExploreSheet.module.css'

const FILTERS = ['Near you', 'Open now', 'Food', 'Drinks'] as const
/** AI picks for the group, in the callout's order (129:4). */
const PICKS = ['taberna', 'ramiro']

/** "Cozy tasca · €€ · 8 min" + "open until 23:00" / "saved by Maya": the source without its kind. */
const metaWithSource = (p: Place) => [p.meta, ...p.source.split(' · ').slice(1)].join(' · ')
const inIdeas = (p: Place) => p.source.startsWith('In your Ideas')
const MENU_OPEN = { height: 'auto', opacity: 1 }

/** 02 callout · Explore with AI (129:4): nearby places for the group; save, plan or poll them. */
export function ExploreSheet() {
  const data = useApp((s) => s.data)
  const closeSheet = useApp((s) => s.closeSheet)
  const showToast = useApp((s) => s.showToast)
  const addToPlan = useAddToPlan()
  const putInPoll = usePutInPoll()

  const [filters, setFilters] = useState<string[]>(['Near you'])
  const [open, setOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const dinner = data.plans.find((p) => p.id === DINNER_PLAN_ID)
  const picks = PICKS.map((id) => data.places.find((p) => p.id === id)).filter((p) => p !== undefined)
  const toggleFilter = (f: string) => setFilters((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]))

  const save = (p: Place) =>
    showToast(inIdeas(p) ? `Already in your Ideas · ${p.source.split(' · ')[1]}` : `${p.name} saved to Ideas`)

  return (
    <Sheet title="Explore" onClose={closeSheet}>
      <p className={styles.prompt}>
        <span className={styles.ai}>AI ·</span> “Dinner for {dinner?.attendees.length} tonight, not too pricey”
      </p>

      <div className={shared.chips} role="group" aria-label="Filters">
        {FILTERS.map((f) => (
          <Chip key={f} role="checkbox" selected={filters.includes(f)} onClick={() => toggleFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      <section className={shared.section} aria-labelledby="ai-picks-title">
        <SectionTitle id="ai-picks-title">AI picks for the group</SectionTitle>
        <div className={shared.stack}>
          {picks.map((p) => (
            <PlaceRow
              key={p.id}
              title={p.name}
              meta={metaWithSource(p)}
              trailing={
                <ActChip onMuted expanded={open === p.id} label={`Add ${p.name}`} onClick={() => setOpen(open === p.id ? null : p.id)}>
                  + Add
                </ActChip>
              }
            >
              <AnimatePresence initial={false}>
                {open === p.id && (
                  <motion.div
                    key="menu"
                    className={styles.menuWrap}
                    ref={menuRef}
                    initial={{ height: 0, opacity: 0 }}
                    animate={MENU_OPEN}
                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    // Clips only while it opens or closes: open, the chips' tap areas and focus rings reach past it.
                    onAnimationComplete={(done) => {
                      if (done === MENU_OPEN && menuRef.current) menuRef.current.style.overflow = 'visible'
                    }}
                  >
                    <div className={shared.menu} role="group" aria-label={`Add ${p.name}`}>
                      <ActChip onMuted onClick={() => save(p)}>
                        Save to Ideas
                      </ActChip>
                      <ActChip onMuted onClick={() => addToPlan(p)}>
                        Add to a plan
                      </ActChip>
                      <ActChip onMuted onClick={() => putInPoll(p)}>
                        Put in a poll
                      </ActChip>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </PlaceRow>
          ))}
        </div>
      </section>
      <div className={shared.end} aria-hidden="true" />
    </Sheet>
  )
}
