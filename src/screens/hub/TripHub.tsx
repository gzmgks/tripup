import { useApp } from '../../store/app'
import { MoneyTab } from '../money/MoneyTab'
import { PlanTab } from './PlanTab'
import { TripHeader } from './TripHeader'
import styles from './TripHub.module.css'

/** 02 / 05 / 06 · Trip hub: violet header, Plan and Money tabs (Hi-fi 1 layout). */
export function TripHub() {
  const hubTab = useApp((s) => s.hubTab)
  return (
    <div className={styles.screen}>
      <TripHeader />
      {hubTab === 'plan' ? <PlanTab /> : <MoneyTab />}
    </div>
  )
}
