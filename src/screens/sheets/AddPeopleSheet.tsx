import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { OptionCard } from '../../components/OptionCard'
import { SectionTitle } from '../../components/SectionTitle'
import { Sheet } from '../../components/Sheet'
import { DINNER_PLAN_ID } from '../../data/seed'
import type { Plan } from '../../domain/types'
import { useApp } from '../../store/app'
import { ActChip } from './parts'
import { QrPlaceholder } from './QrPlaceholder'
import shared from './sheets.module.css'
import styles from './AddPeopleSheet.module.css'

const GUEST_LINK = 'tripup.app/p/lisbon-dinner'

type JoinAs = 'member' | 'guest'

/** "Tonight 20:30 · Dinner (deciding now)": the dinner slot is named by what is open about it. */
function planLabel(plan: Plan): string {
  const what = plan.id === DINNER_PLAN_ID && plan.status !== 'decided' ? 'Dinner (deciding now)' : plan.title
  return `Tonight ${plan.time} · ${what}`
}

/** 03 · Add people: Ren joins by link, as a guest for the plans Ari ticks. */
export function AddPeopleSheet() {
  const data = useApp((s) => s.data)
  const guestAdded = useApp((s) => s.guestAdded)
  const initialPlans = useApp((s) => s.guestPlanIds)
  const closeSheet = useApp((s) => s.closeSheet)
  const addGuest = useApp((s) => s.addGuest)
  const showToast = useApp((s) => s.showToast)

  const [name, setName] = useState('Ren')
  const [joinAs, setJoinAs] = useState<JoinAs>('guest')
  const [planIds, setPlanIds] = useState<string[]>(initialPlans)
  const [qr, setQr] = useState(false)

  // Plans still ahead today: the ones a guest can be added to.
  const upcoming = data.plans.filter((p) => p.day === data.trip.today && p.status !== 'done')
  const togglePlan = (id: string) =>
    setPlanIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : upcoming.map((p) => p.id).filter((x) => ids.includes(x) || x === id)))

  const canAdd = name.trim().length > 0 && (joinAs === 'member' || planIds.length > 0)
  const confirm = () => {
    if (joinAs === 'member') {
      showToast('Not part of this demo: Ren joins as a guest')
      return
    }
    addGuest(planIds)
  }

  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(`https://${GUEST_LINK}`).catch(() => undefined)
    } catch {
      // Clipboard can be blocked (insecure origin, permissions): the toast still confirms.
    }
    showToast(`✓ Link copied · ${GUEST_LINK}`)
  }

  return (
    <Sheet
      title="Add people"
      onClose={closeSheet}
      footer={
        <>
          <Button onClick={confirm} disabled={!canAdd}>
            {guestAdded ? 'Save Ren’s plans' : 'Add Ren & share link'}
          </Button>
          <div className={styles.share}>
            <ActChip onClick={() => setQr((v) => !v)} expanded={qr}>
              {qr ? 'Hide QR code' : 'Show QR code'}
            </ActChip>
            <ActChip onClick={copyLink}>Copy link</ActChip>
            <ActChip onClick={() => showToast('Not part of this demo: WhatsApp opens with the link')}>WhatsApp</ActChip>
          </div>
          <AnimatePresence initial={false}>
            {qr && (
              <motion.div
                key="qr"
                className={styles.qrWrap}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={`${shared.card} ${styles.qr}`}>
                  <span className={styles.qrTile}>
                    <QrPlaceholder link={GUEST_LINK} size={88} />
                  </span>
                  <div className={shared.rowText}>
                    <p className={shared.itemTitle}>Scan to join</p>
                    <p className={shared.note}>{GUEST_LINK}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className={`${shared.note} ${styles.footnote}`}>Ren joins in any browser. No app or account needed.</p>
        </>
      }
    >
      <label className="visually-hidden" htmlFor="add-people-name">
        Name
      </label>
      <input
        id="add-people-name"
        className={styles.field}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
      />

      <section className={shared.section} aria-labelledby="join-title">
        <SectionTitle id="join-title">How should Ren join?</SectionTitle>
        <div className={shared.stack} role="radiogroup" aria-labelledby="join-title" onKeyDown={arrowKeys()}>
          <OptionCard
            title="Full trip member"
            meta="Shares all days and past expenses"
            selected={joinAs === 'member'}
            onSelect={() => setJoinAs('member')}
          />
          <OptionCard
            title="Guest for selected plans"
            meta="Sees only these plans, their bills and his share"
            selected={joinAs === 'guest'}
            onSelect={() => setJoinAs('guest')}
          />
        </div>

        <AnimatePresence initial={false}>
          {joinAs === 'guest' && (
            <motion.div
              key="plans"
              className={styles.plansWrap}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.plans} role="group" aria-label="Plans Ren can see">
                {upcoming.map((p) => {
                  const on = planIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      className={`${styles.plan} ${on ? styles.planOn : ''}`}
                      onClick={() => togglePlan(p.id)}
                    >
                      <span className={styles.box} aria-hidden="true">
                        {on && <Icon name="check" size={18} />}
                      </span>
                      <span className={styles.planLabel}>{planLabel(p)}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </Sheet>
  )
}
