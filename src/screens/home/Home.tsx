import explore from '../../assets/icons/explore.png'
import mapDay5 from '../../assets/images/map-day5.webp'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { SectionTitle } from '../../components/SectionTitle'
import { DINNER_PLAN_ID } from '../../data/seed'
import { formatEUR } from '../../domain/money'
import { tally } from '../../domain/poll'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import { moneyView } from '../../store/selectors'
import { MapPin } from '../hub/MapPin'
import styles from './Home.module.css'

/** The cover shows the top of today's map, where the route and the dinner pin are (matches object-position in the CSS). */
const COVER_FOCUS_Y = 0.2

/** 01 · Home: my trips. The active trip is pinned with its next step. */
export function Home() {
  const state = useApp()
  const { data, poll, dinnerEnded, openTrip, showToast } = state
  const { trip, crew, plans, pastTrips } = data

  // Ari's trip balance, net of what she has already paid (calm, never red).
  const money = moneyView(state)
  const balance = money.myOpen
  const balanceLine =
    balance < 0
      ? `You owe ${formatEUR(-balance, { decimals: 'auto' })}`
      : balance > 0
        ? `You’re owed ${formatEUR(balance, { decimals: 'auto' })}`
        : money.allSettled
          ? 'Squared up ✓'
          : 'You’re all square'

  // "Next": the open question of the day, as it moves through the flow.
  const today = plans.filter((p) => p.day === trip.today)
  const dinner = plans.find((p) => p.id === DINNER_PLAN_ID)
  const after = dinner ? today.find((p) => p.time > dinner.time) : undefined
  const next = (() => {
    if (!dinner) return null
    if (dinner.status === 'decided') {
      if (dinnerEnded && after) return `${after.title} · ${after.time}`
      return `${dinner.title} · ${dinner.time}`
    }
    if (dinner.status === 'poll' && poll) {
      const t = tally(poll)
      return `Dinner tonight · ${t.voted} of ${t.eligible} voted`
    }
    return 'Dinner tonight · not planned yet'
  })()

  const planNewTrip = () => showToast('Not part of this demo: tonight is all about Lisbon')

  return (
    <div className={styles.screen}>
      <StatusBar tone="onLight" />
      <main className={styles.scroll}>
        <header className={styles.header}>
          <h1 className={styles.title}>My trips</h1>
          <button
            type="button"
            className={styles.profile}
            aria-label="Profile"
            onClick={() => showToast('Profile (payment methods, notifications) isn’t part of this demo')}
          >
            <Avatar member={trip.me} size={36} labelled={false} />
          </button>
        </header>

        <section className={styles.section} aria-labelledby="active-title">
          <SectionTitle id="active-title" level={2}>
            Active now
          </SectionTitle>
          <button type="button" className={styles.trip} onClick={openTrip}>
            <span className={styles.cover}>
              <img className={styles.coverImage} src={mapDay5} alt="" />
              {dinner?.status === 'decided' && <MapPin number={today.indexOf(dinner) + 1} focusY={COVER_FOCUS_Y} />}
            </span>
            <span className={styles.tripBody}>
              <span className={styles.tripTitles}>
                <span className={styles.tripName}>{trip.name}</span>
                <span className={styles.tripMeta}>{trip.homeSubtitle}</span>
              </span>
              {next && (
                <span className={styles.next}>
                  <span className={styles.nextLabel}>Next</span>
                  <span className={styles.nextText}>{next}</span>
                </span>
              )}
              <span className={styles.tripFoot}>
                <span className={styles.crew}>
                  {crew.map((m) => (
                    <Avatar key={m} member={m} size={28} ring="header" className={styles.crewAvatar} labelled={false} />
                  ))}
                </span>
                <span className={styles.balance}>{balanceLine}</span>
              </span>
            </span>
          </button>
        </section>

        <section className={styles.newTrip} aria-labelledby="new-trip-title">
          <div className={styles.newHead}>
            <span className={styles.newIcon}>
              <img src={explore} alt="" />
            </span>
            <div className={styles.newTitles}>
              <h2 id="new-trip-title" className={styles.newTitle}>
                Plan a new trip
              </h2>
              <p className={styles.caption}>Start from scratch, or tell AI where and when</p>
            </div>
          </div>
          <div className={styles.newActions}>
            <button type="button" className={`${styles.newButton} ${styles.newButtonAct}`} onClick={planNewTrip}>
              Plan with AI
            </button>
            <button type="button" className={`${styles.newButton} ${styles.newButtonQuiet}`} onClick={planNewTrip}>
              Start from scratch
            </button>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="past-title">
          <SectionTitle id="past-title" level={2}>
            Past trips
          </SectionTitle>
          {pastTrips.map((p) => (
            <button
              key={p.name}
              type="button"
              className={styles.past}
              onClick={() => showToast(`Not part of this demo: ${p.name} is already squared up`)}
            >
              <span className={styles.pastBadge} aria-hidden="true">
                <Icon name="check" size={24} />
              </span>
              <span className={styles.pastText}>
                <span className={styles.pastName}>{p.name}</span>
                <span className={styles.caption}>{p.subtitle}</span>
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  )
}
