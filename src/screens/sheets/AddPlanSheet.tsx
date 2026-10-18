import type { ReactNode } from 'react'
import explore from '../../assets/icons/explore.png'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Sheet'
import { DINNER_PLAN_ID } from '../../data/seed'
import { useApp } from '../../store/app'
import type { SheetId } from '../../store/app'
import shared from './sheets.module.css'
import styles from './AddPlanSheet.module.css'

/** 02 callout · Add plan (97:148): a new slot, then how its place gets chosen. */
export function AddPlanSheet() {
  const dinner = useApp((s) => s.data.plans.find((p) => p.id === DINNER_PLAN_ID))
  const closeSheet = useApp((s) => s.closeSheet)
  const openSheet = useApp((s) => s.openSheet)
  const showToast = useApp((s) => s.showToast)

  // The choices below fill tonight's open slot, so the day and time stay as they are.
  const fixedWhen = () => showToast(`Not part of this demo: the new plan is tonight at ${dinner?.time}`)

  return (
    <Sheet title="New plan" onClose={closeSheet}>
      <div className={styles.when} role="group" aria-label="When">
        <button type="button" className={shared.dropdown} onClick={fixedWhen}>
          Tonight
          <Icon name="dropdown" size={12} className={shared.dropdownIcon} />
        </button>
        <button type="button" className={shared.dropdown} onClick={fixedWhen}>
          {dinner?.time}
          <Icon name="dropdown" size={12} className={shared.dropdownIcon} />
        </button>
      </div>

      <div className={shared.stack}>
        <Choice
          title="Decide together"
          meta="Vote, leave it to chance, or let someone pick"
          to="decide"
          onOpen={openSheet}
          icon={<Icon name="list" size={20} />}
        />
        <Choice
          title="Pick a place"
          meta="Choose it yourself, the group is notified"
          to="explore"
          onOpen={openSheet}
          icon={<Icon name="star" size={20} />}
        />
        <Choice
          title="Ask AI for ideas"
          meta="Nearby, open now, different vibes"
          to="explore"
          onOpen={openSheet}
          icon={<img className={styles.exploreIcon} src={explore} alt="" />}
        />
      </div>
      <div className={shared.end} aria-hidden="true" />
    </Sheet>
  )
}

interface ChoiceProps {
  title: string
  meta: string
  to: SheetId
  onOpen: (sheet: SheetId) => void
  icon: ReactNode
}

function Choice({ title, meta, to, onOpen, icon }: ChoiceProps) {
  return (
    <button type="button" className={`${shared.card} ${styles.choice}`} onClick={() => onOpen(to)}>
      <span className={shared.iconTile} aria-hidden="true">
        {icon}
      </span>
      <span className={shared.rowText}>
        <span className={shared.itemTitle}>{title}</span>
        <span className={shared.note}>{meta}</span>
      </span>
      <Icon name="chevron-left" size={20} className={shared.chevron} />
    </button>
  )
}
