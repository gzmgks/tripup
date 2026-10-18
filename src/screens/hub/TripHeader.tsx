import { arrowKeys } from '../../components/arrowKeys'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import type { MemberId } from '../../domain/types'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import type { HubTab } from '../../store/app'
import { HUB_PANEL_ID, HUB_TAB_ID } from './ids'
import styles from './TripHeader.module.css'

/** Order of the photo avatars in Hi-fi 1's header (143:265). */
const HEADER_ORDER: MemberId[] = ['ari', 'nic', 'theo', 'maya', 'sam']

export function TripHeader() {
  const {
    data,
    guestAdded,
    hubTab,
    setHubTab,
    goHome,
    openSheet,
  } = useApp(
    useShallow((s) => ({
      data: s.data,
      guestAdded: s.guestAdded,
      hubTab: s.hubTab,
      setHubTab: s.setHubTab,
      goHome: s.goHome,
      openSheet: s.openSheet,
    })),
  )
  const { trip } = data

  const tab = (id: HubTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={HUB_TAB_ID[id]}
      aria-selected={hubTab === id}
      aria-controls={HUB_PANEL_ID}
      tabIndex={hubTab === id ? 0 : -1}
      className={`${styles.tab} ${hubTab === id ? styles.tabOn : ''}`}
      onClick={() => setHubTab(id)}
    >
      {label}
    </button>
  )

  return (
    <>
      <StatusBar tone="onViolet" />
      <header className={styles.upper}>
        <div className={styles.top}>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.back}
              aria-label="Back to my trips"
              onClick={goHome}
            >
              <Icon name="chevron-left" size={24} />
            </button>
            <div className={styles.titles}>
              <h1 className={styles.title}>{trip.name}</h1>
              <p className={styles.subtitle}>{trip.subtitle}</p>
            </div>
          </div>

          <div className={styles.people} role="group" aria-label="People on this trip">
            {HEADER_ORDER.map((m) => (
              <Avatar key={m} member={m} size={36} ring="header" className={styles.stacked} />
            ))}
            {guestAdded && (
              <span className={`${styles.guest} ${styles.stacked}`}>
                <span className={styles.guestName}>Ren</span>
                <span>(Guest)</span>
              </span>
            )}
            <button type="button" className={styles.add} aria-label="Add people" onClick={() => openSheet('add-people')}>
              <span className={styles.addIcon}>
                <Icon name="plus" size={12} />
              </span>
              <span className={styles.addLabel}>Add</span>
            </button>
          </div>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Trip" onKeyDown={arrowKeys()}>
          {tab('plan', 'Plan')}
          {tab('money', 'Money')}
        </div>
      </header>
    </>
  )
}
