import logoMark from '../../assets/brand/logo-mark.svg'
import explore from '../../assets/icons/explore.png'
import lisbonTram from '../../assets/images/lisbon-tram.webp'
import lisbonThumb from '../../assets/images/lisbon-tram-thumb.webp'
import portoThumb from '../../assets/images/porto-ribeira-thumb.webp'
import { Avatar } from '../../components/Avatar'
import { memberName } from '../../components/names'
import { SectionTitle } from '../../components/SectionTitle'
import { DINNER_PLAN_ID } from '../../data/seed'
import type { PastTrip } from '../../data/seed'
import { formatEUR } from '../../domain/money'
import type { MemberId } from '../../domain/types'
import { tally } from '../../domain/poll'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import { moneyView } from '../../store/selectors'
import { squareParts, tripPlace } from '../money/copy'
import styles from './Home.module.css'

const PAST_PHOTOS: Record<PastTrip['photo'], string> = { lisbon: lisbonThumb, porto: portoThumb }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "Sun 12 Oct" → "October" (as Porto's "March"). */
const monthOf = (date: string) => {
  const short = date.split(' ').at(-1)
  return MONTHS.find((m) => !!short && m.startsWith(short)) ?? ''
}

const list = new Intl.ListFormat('en-GB', { type: 'conjunction' })
/** "With Maya, Sam and Nic": who was on a past trip, for screen readers (the avatars are decoration). */
const withWords = (members: MemberId[], me: MemberId, guests: MemberId[]) => {
  const names = members.filter((m) => m !== me).map((m) => (guests.includes(m) ? `${memberName(m)} (guest)` : memberName(m)))
  return names.length ? `With ${list.format(names)}` : ''
}

/** 01 · Home: my trips. The active trip is pinned with its next step; once squared up it moves to Past trips. */
export function Home() {
  const state = useApp()
  const { data, poll, dinnerEnded, guestAdded, squaredSeen, openTrip, setHubTab, showToast } = state
  const { trip, crew, plans, pastTrips } = data
  const guests = data.members.filter((m) => m.kind === 'guest').map((m) => m.id)
  const me = trip.me
  const place = tripPlace(trip.name)

  // Ari's trip balance, net of what she has already paid (calm, never red). At €0 with the group,
  // Ren's open share is said too, stacked: "You’re square with the group" over "Ren owes you €25".
  const money = moneyView(state)
  const balance = money.myOpen
  const balanceLines =
    balance < 0
      ? [`You owe ${formatEUR(-balance, { decimals: 'auto' })}`]
      : balance > 0
        ? [`You’re owed ${formatEUR(balance, { decimals: 'auto' })}`]
        : money.allSettled
          ? ['Squared up ✓']
          : squareParts(money, me)

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
      return `Dinner ${dinner.time} · ${t.voted} of ${t.eligible} voted`
    }
    // Same words as the Plan tab's map chip.
    return `Dinner ${dinner.time} · not decided`
  })()
  const lastDay = trip.today === data.days.length
  const tag = lastDay ? `Last night in ${place}` : `Day ${trip.today} in ${place}`

  // Squared up: Lisbon closes and joins the past trips, newest first. It opens on its settled Money tab.
  const lisbon: PastTrip = {
    id: trip.id,
    name: trip.name,
    subtitle: `${monthOf(data.days.at(-1)?.date ?? '')} · Squared up ✓`,
    members: guestAdded ? [...crew, ...guests] : crew,
    photo: 'lisbon',
  }
  const past = squaredSeen ? [lisbon, ...pastTrips] : pastTrips
  const openPast = (p: PastTrip) => {
    if (p.id === trip.id) {
      openTrip()
      setHubTab('money')
    } else {
      showToast(`${p.name} is squared up · nothing left to settle`)
    }
  }

  const planNewTrip = () =>
    showToast(squaredSeen ? `Not part of this demo: the story ends with ${place} squared up` : `Not part of this demo: tonight is all about ${place}`)

  return (
    <div className={styles.screen}>
      <StatusBar tone="onLight" />
      <main className={styles.scroll}>
        <header className={styles.header}>
          <div className={styles.bar}>
            {/* The Figma lockup (158:293): the mark and a live "TripUp" wordmark, scaled together from the mark's height. */}
            <p className={styles.logo}>
              <img className={styles.logoMark} src={logoMark} alt="" />
              <span className={styles.wordmark}>TripUp</span>
            </p>
            <button
              type="button"
              className={styles.profile}
              aria-label="Profile"
              onClick={() => showToast('Profile (payment methods, notifications) isn’t part of this demo')}
            >
              <Avatar member={me} size={36} labelled={false} />
            </button>
          </div>
          <h1 className={styles.title}>My trips</h1>
        </header>

        {!squaredSeen && (
          <section className={styles.section} aria-labelledby="active-title">
            <SectionTitle id="active-title" level={2}>
              Active now
            </SectionTitle>
            <button type="button" className={styles.trip} onClick={openTrip}>
              <span className={styles.cover}>
                <img className={styles.coverImage} src={lisbonTram} alt="" />
                <span className={styles.tag}>
                  {lastDay && <MoonGlyph />}
                  {tag}
                </span>
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
                  <span className={styles.balance}>
                    {balanceLines.map((line, i) => (
                      <span key={line} className={styles.balanceLine}>
                        {i > 0 && <span className="visually-hidden">, </span>}
                        {line}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </button>
          </section>
        )}

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
          {past.map((p) => (
            <button key={p.id} type="button" className={styles.past} onClick={() => openPast(p)}>
              <span className={styles.pastPhoto}>
                <img src={PAST_PHOTOS[p.photo]} alt="" />
              </span>
              <span className={styles.pastText}>
                <span className={styles.pastName}>{p.name}</span>
                <span className={styles.caption}>{p.subtitle}</span>
                <span className={styles.pastCrew}>
                  {p.members.map((m) => (
                    <Avatar key={m} member={m} size={22} className={styles.pastAvatar} labelled={false} />
                  ))}
                </span>
                <span className="visually-hidden">{withWords(p.members, me, guests)}</span>
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  )
}

/** A small crescent for "Last night in Lisbon" (drawn, like the other glyphs; takes the text colour). */
function MoonGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M7.6 1.1a5 5 0 1 0 3.3 7.6A4.2 4.2 0 0 1 7.6 1.1Z" />
    </svg>
  )
}
