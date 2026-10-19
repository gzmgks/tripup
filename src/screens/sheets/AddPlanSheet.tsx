import type { ReactNode } from 'react'
import exploreIcon from '../../assets/icons/explore.png'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Sheet'
import { DINNER_PLAN_ID } from '../../data/seed'
import { useApp } from '../../store/app'
import { exploreAt } from '../explore/startView'
import type { ExploreStart } from '../explore/startView'
import shared from './sheets.module.css'
import styles from './AddPlanSheet.module.css'

/** 02 callout · Add plan (97:148): a new slot, then how its place gets chosen. */
export function AddPlanSheet() {
  const dinner = useApp((s) => s.data.plans.find((p) => p.id === DINNER_PLAN_ID))
  const closeSheet = useApp((s) => s.closeSheet)
  const openSheet = useApp((s) => s.openSheet)
  const showToast = useApp((s) => s.showToast)

  // The choices below fill tonight's open slot, so the day and time stay as they are.
  const fixedWhen = () => showToast(`It’s the last night: the new plan is tonight at ${dinner?.time}`)
  // "Pick a place" lands on Explore's Food list, "Ask AI for ideas" on the agent.
  const explore = (start: ExploreStart) => {
    exploreAt(start)
    openSheet('explore')
  }

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
          onOpen={() => openSheet('decide')}
          icon={<Icon name="list" size={20} />}
        />
        <Choice
          title="Pick a place"
          meta="Choose it yourself, the group is notified"
          onOpen={() => explore('food')}
          icon={<Icon name="star" size={20} />}
        />
        <Choice
          title="Ask AI for ideas"
          meta="A short chat: what, where, when, budget"
          onOpen={() => explore('ai')}
          icon={<img className={styles.exploreIcon} src={exploreIcon} alt="" />}
        />
      </div>
      <div className={shared.end} aria-hidden="true" />
    </Sheet>
  )
}

interface ChoiceProps {
  title: string
  meta: string
  onOpen: () => void
  icon: ReactNode
}

function Choice({ title, meta, onOpen, icon }: ChoiceProps) {
  return (
    <button type="button" className={`${shared.card} ${styles.choice}`} onClick={onOpen}>
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
