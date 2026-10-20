import { create } from 'zustand'
import type { DrinksAnswer, MemberId, Place, Transfer } from '../domain/types'
import { favourite, nextEvent, runEvent, runReady } from './events'
import type { ScriptEvent } from './events'
import * as sc from './scenario'
import type { DecideMode, HubTab, PayMethod, ScenarioState, SheetId, SplitPreset, WineChoice } from './scenario'
import { moneyView } from './selectors'

export type { BillDraftState, DecideMode, HubTab, PayMethod, ScreenId, SheetId, SplitPreset, WineChoice } from './scenario'

/**
 * App store: the trip as data plus the scenario state (src/store/scenario.ts).
 * Screens read from here and derive every number through src/domain.
 */

export interface Toast {
  id: number
  text: string
}

interface AppState extends ScenarioState {
  /** Demo step the scenario was last reset to (for the demo control). */
  stepId: string
  /** Counts demo jumps, so an open sheet remounts with the new state (its local state resets). */
  jumps: number
  demoOpen: boolean
  toast: Toast | null
  /** Group events run on timers (autopilot.ts). Off with ?auto=0 or from the demo controls. */
  autoplay: boolean
  /** The "Later that evening" moment between dinner and 22:30. */
  interlude: boolean
  setAutoplay: (on: boolean) => void
  runEndDinnerWithInterlude: () => void

  // shell
  openDemo: () => void
  closeDemo: () => void
  jumpTo: (stepId: string) => void
  restart: () => void
  showToast: (text: string) => void
  hideToast: () => void
  notInDemo: () => void
  dismissBanner: () => void

  // navigation
  openTrip: () => void
  goHome: () => void
  setHubTab: (tab: HubTab) => void
  openSheet: (sheet: SheetId) => void
  closeSheet: () => void

  // Explore · Ideas
  /** Make an Explore catalog place a trip place, so plans and polls can use it. */
  addPlace: (place: Place) => void
  /** Save to the group's Ideas (adds the place too). */
  saveIdea: (place: Place) => void
  /** Fill tonight's 23:30 drinks slot with a place (adds the place too). */
  fillDrinks: (place: Place) => void

  // 03 · 04 · 05 · 06
  addGuest: (planIds: string[]) => void
  setDecideMode: (mode: DecideMode) => void
  startPoll: (optionIds: string[], closesAt?: string) => void
  decideWithout: (placeId: string, pickedBy?: MemberId) => void
  vote: (optionId: string) => void
  suggestPlace: (placeId: string) => void
  dismissPollNotice: () => void
  breakTie: () => void
  switchSpot: () => void
  answerDrinks: (answer: DrinksAnswer) => void
  endDinner: () => void

  // 07
  openBill: () => void
  setWine: (member: MemberId, choice: WineChoice) => void
  setPreset: (preset: SplitPreset) => void
  setTip: (tipCents: number) => void
  setPaidBy: (member: MemberId) => void
  saveBill: () => void
  closeBill: () => void

  // 08 · 09 · 10
  startPay: (transfer: Transfer) => void
  choosePayMethod: (method: PayMethod) => void
  confirmPay: () => void
  retryPay: () => void
  payAnotherWay: () => void
  finishPay: () => void
  remind: (name: string) => void
  showSquaredUp: () => void

  // G1 · G2: Ren's phone (mobile web, no app)
  openGuestView: (screen: 'guest-join' | 'guest-poll' | 'guest-pay') => void
  guestJoin: () => void
  leaveGuestView: () => void
  guestVote: (optionId: string) => void
  guestPay: () => void

  // scripted system events (stage 3: from the demo controls)
  pendingEvent: () => ScriptEvent | undefined
  runNextEvent: () => void
  setFailNextPayment: (on: boolean) => void
}

// ── Demo jump points, built by replaying the real flow ──────────────────

const me = 'ari'
const S = sc.freshScenario
const hub = () => sc.openTrip(S())
const invited = () => sc.inviteGuest(hub())
const guest = () => sc.addGuest(hub())
const pollSent = () => sc.startPoll(guest())
const hifi1 = () => ({ ...sc.vote(runReady(pollSent()), me, 'cevicheria'), banner: null })
const everyone = () => runReady(hifi1(), (x) => !!x.poll?.votes.ren)
const decided = () => runReady(everyone(), (x) => ['maya', 'theo', 'sam', 'nic'].every((m) => x.drinks[m as MemberId] !== null))
const whoPaid = () => sc.endDinner(decided())
const hifi2 = () => sc.openBill(whoPaid())
const bill07b = () => sc.setWine(hifi2(), 'ren', 'out')
const money = () => sc.saveBill(bill07b())
const myTransfer = (s: ScenarioState) => moneyView(s).rows.find((r) => r.transfer.from === me)!.transfer
const pay = () => {
  const s = money()
  return sc.startPay(s, myTransfer(s))
}
const paid = () => {
  const s = pay()
  const t = myTransfer(s)
  return sc.setPayPhase(sc.recordPayment(s, { ...t, method: 'bank' }), 'paid')
}
const othersPaid = () => runReady(sc.closeSheet(paid()), (x) => x.payments.length >= 4)
const squared = () => runReady(othersPaid())
const homeAfter = () => sc.goHome(squared())
// Edge case: nobody switches, Ari picks Taberna, Sam and Ren pick Ramiro → 3–3.
const tie = () => {
  const s = sc.vote(runReady(pollSent()), me, 'taberna')
  return { ...runReady({ ...s, done: [...s.done, 'switch-nic', 'switch-theo'] }), banner: null }
}
const fourth = () => ({ ...sc.suggestPlace(hifi1(), 'timeout', 'theo') })
const failed = () => sc.setPayPhase(pay(), 'failed')

export interface DemoStep {
  id: string
  label: string
  build: () => ScenarioState
}

export const DEMO_STEPS: DemoStep[] = [
  { id: 'home', label: '01 · Home: my trips', build: S },
  { id: 'hub', label: '02 · Trip hub, dinner not decided', build: hub },
  { id: 'add-people', label: '03 · Add people', build: () => ({ ...hub(), sheet: 'add-people' }) },
  { id: 'invited', label: '03B · Ren invited, waiting to join', build: invited },
  { id: 'guest-join', label: 'G0 · Ren joins from the link', build: () => ({ ...invited(), screen: 'guest-join', guestReturn: 'hub' }) },
  { id: 'decide', label: '04 · How should we decide?', build: () => ({ ...guest(), sheet: 'decide' }) },
  { id: 'poll-sent', label: '05 · Poll sent to the group', build: pollSent },
  { id: 'hifi-1', label: '05 · Live poll, 4 of 6 (Hi-fi 1)', build: hifi1 },
  { id: 'poll-all', label: '05B · Everyone has voted', build: everyone },
  { id: 'decided', label: '06 · Decision lands on the plan', build: decided },
  { id: 'who-paid', label: '06B · 22:30, who paid?', build: whoPaid },
  { id: 'hifi-2', label: '07 · Log the bill (Hi-fi 2)', build: hifi2 },
  { id: 'bill-07b', label: '07B · Ren off the wine', build: bill07b },
  { id: 'money', label: '08 · Money: balances updated', build: money },
  { id: 'pay', label: '09 · Pay Maya', build: pay },
  { id: 'others-paid', label: '09B · Friends pay from their phones', build: othersPaid },
  { id: 'squared', label: '10 · Squared up', build: squared },
  { id: 'home-after', label: '10B · Home: Lisbon is a past trip', build: homeAfter },
  { id: 'tie', label: 'Edge · Tie, let fate decide', build: tie },
  { id: 'fourth', label: 'Edge · Theo adds a 4th place', build: fourth },
  { id: 'pay-failed', label: 'Edge · A payment fails', build: failed },
  { id: 'guest-poll', label: 'G1 · Ren votes from the link', build: () => ({ ...pollSent(), banner: null, screen: 'guest-poll' }) },
  { id: 'guest-pay', label: 'G2 · Ren pays his share', build: () => ({ ...money(), screen: 'guest-pay' }) },
  { id: 'tokens', label: 'Tokens on violet', build: () => ({ ...S(), screen: 'preview-tokens' }) },
  { id: 'tokens-light', label: 'Type on white', build: () => ({ ...S(), screen: 'preview-light' }) },
]

/** `?step=<id>` deep-links to a demo step (handy for presenting and for screenshots). */
function stepFromUrl(): DemoStep {
  const id = new URLSearchParams(window.location.search).get('step')
  return DEMO_STEPS.find((s) => s.id === id) ?? DEMO_STEPS[0]
}
const startStep = stepFromUrl()
const autoplayFromUrl = new URLSearchParams(window.location.search).get('auto') !== '0'

let toastId = 0
const timers = new Set<number>()
const later = (ms: number, fn: () => void) => {
  const t = window.setTimeout(() => {
    timers.delete(t)
    fn()
  }, ms)
  timers.add(t)
}
const clearTimers = () => {
  for (const t of timers) window.clearTimeout(t)
  timers.clear()
}

export const useApp = create<AppState>((set, get) => {
  /** Apply a pure scenario transition. */
  const apply = (f: (s: ScenarioState) => ScenarioState) => set((s) => f(s))

  return {
    ...startStep.build(),
    stepId: startStep.id,
    jumps: 0,
    demoOpen: false,
    toast: null,
    autoplay: autoplayFromUrl,
    interlude: false,

    openDemo: () => set({ demoOpen: true }),
    closeDemo: () => set({ demoOpen: false }),
    jumpTo: (stepId) => {
      const step = DEMO_STEPS.find((s) => s.id === stepId)
      if (!step) return
      clearTimers()
      set((s) => ({ ...step.build(), stepId: step.id, jumps: s.jumps + 1, demoOpen: false, toast: null, interlude: false }))
      // Keep the address in sync, so a reload stays where the presenter is (and Restart goes home).
      const url = new URL(window.location.href)
      if (step.id === DEMO_STEPS[0].id) url.searchParams.delete('step')
      else url.searchParams.set('step', step.id)
      window.history.replaceState(null, '', url)
    },
    restart: () => get().jumpTo(DEMO_STEPS[0].id),

    hideToast: () => set({ toast: null }),
    showToast: (text) => {
      const id = ++toastId
      set({ toast: { id, text } })
      later(2400, () => {
        if (get().toast?.id === id) set({ toast: null })
      })
    },
    notInDemo: () => get().showToast('Not part of this demo'),
    dismissBanner: () => set({ banner: null }),

    openTrip: () => apply(sc.openTrip),
    goHome: () => apply(sc.goHome),
    setHubTab: (hubTab) => set({ hubTab }),
    // A toast from the step before shouldn't sit on top of the sheet's content.
    openSheet: (sheet) => set({ sheet, toast: null }),
    closeSheet: () => apply(sc.closeSheet),

    addPlace: (place) => apply((s) => sc.addPlace(s, place)),
    saveIdea: (place) => apply((s) => sc.saveIdea(sc.addPlace(s, place), place.id)),
    fillDrinks: (place) => apply((s) => sc.fillDrinks(sc.addPlace(s, place), place.id)),

    addGuest: (planIds) => {
      const editing = get().guestInvited
      apply((s) => sc.inviteGuest(s, planIds))
      const titles = get()
        .data.plans.filter((p) => planIds.includes(p.id))
        .map((p) => (p.id === 'd5-dinner' ? 'tonight’s dinner' : p.title.charAt(0).toLowerCase() + p.title.slice(1)))
      get().showToast(editing ? '✓ Ren’s plans are saved' : `✓ Ren invited for ${titles.join(' and ') || 'tonight’s dinner'} · link copied`)
    },
    // Ren's phone (G0): Join, then back to Ari's, where "Ren joined" shows once.
    guestJoin: () => apply((s) => ({ ...sc.joinGuest(s), done: s.done.includes('ren-joins') ? s.done : [...s.done, 'ren-joins'] })),
    setDecideMode: (decideMode) => set({ decideMode }),
    startPoll: (optionIds, closesAt) => {
      apply((s) => sc.startPoll(s, optionIds, closesAt))
      // "What the group got" stays long enough to read, then gets out of the way.
      const id = get().banner?.id
      later(2600, () => {
        if (get().banner?.id === id && get().banner?.kind === 'group-push') set({ banner: null })
      })
    },
    decideWithout: (placeId, pickedBy) => {
      apply((s) => sc.decideWithout(s, placeId, pickedBy))
      const place = get().data.places.find((p) => p.id === placeId)
      get().showToast(`✓ ${place?.name} added to tonight’s plan`)
    },
    vote: (optionId) => apply((s) => sc.vote(s, s.data.trip.me, optionId)),
    suggestPlace: (placeId) => apply((s) => sc.suggestPlace(s, placeId, s.data.trip.me)),
    dismissPollNotice: () => apply(sc.dismissPollNotice),
    breakTie: () => {
      apply((s) => sc.decide(s))
      const place = get().data.places.find((p) => p.id === get().poll?.winnerId)
      get().showToast(`✓ ${place?.name} added to tonight’s plan`)
    },
    switchSpot: () => {
      apply(sc.switchSpot)
      const plan = get().data.plans.find((p) => p.id === 'd5-dinner')
      get().showToast(`✓ Switched to ${plan?.title.replace('Dinner at ', '')} · the group is notified`)
    },
    answerDrinks: (answer) => apply((s) => sc.answerDrinks(s, s.data.trip.me, answer)),
    endDinner: () => apply(sc.endDinner),

    openBill: () => apply(sc.openBill),
    setWine: (member, choice) => apply((s) => sc.setWine(s, member, choice)),
    setPreset: (preset) => apply((s) => sc.setPreset(s, preset)),
    setTip: (tip) => apply((s) => sc.setTip(s, tip)),
    setPaidBy: (member) => apply((s) => sc.setPaidBy(s, member)),
    saveBill: () => apply(sc.saveBill),

    startPay: (transfer) => apply((s) => sc.startPay(s, transfer)),
    choosePayMethod: (method) => apply((s) => sc.choosePayMethod(s, method)),
    confirmPay: () => {
      const flow = get().payFlow
      if (!flow || flow.phase !== 'choose') return
      const { transfer, method } = flow
      const record = () => apply((s) => sc.recordPayment(s, { ...transfer, method }))
      if (method === 'cash') {
        record()
        apply((s) => sc.setPayPhase(s, 'awaiting-confirmation'))
        return
      }
      // Simulated bank approval and processing: short, deterministic delays.
      const fail = method === 'bank' && get().failNextPayment
      apply((s) => sc.setPayPhase(s, method === 'bank' ? 'approving' : 'processing'))
      const finish = () => {
        if (fail) {
          set({ failNextPayment: false })
          apply((s) => sc.setPayPhase(s, 'failed'))
          return
        }
        record()
        apply((s) => sc.setPayPhase(s, 'paid'))
      }
      if (method === 'bank') {
        later(1400, () => {
          apply((s) => sc.setPayPhase(s, 'processing'))
          later(1000, finish)
        })
      } else {
        later(1400, finish)
      }
    },
    retryPay: () => apply((s) => sc.setPayPhase(s, 'choose')),
    payAnotherWay: () => apply((s) => sc.choosePayMethod(s, 'card')),
    finishPay: () => set({ sheet: null, payFlow: null }),
    remind: (name) => get().showToast(`✓ Friendly reminder sent to ${name}`),
    showSquaredUp: () => apply(sc.showSquaredUp),
    closeBill: () => set({ screen: 'hub', hubTab: 'plan' }),

    openGuestView: (screen) => set((s) => ({ screen, sheet: null, banner: null, guestReturn: s.screen.startsWith('guest') ? s.guestReturn : s.screen })),
    leaveGuestView: () => {
      const s = get()
      const joinedNow = s.screen === 'guest-join' && s.guestAdded && !s.done.includes('ren-back')
      set({ screen: s.guestReturn, done: joinedNow ? [...s.done, 'ren-back'] : s.done })
      if (joinedNow) get().showToast('✓ Ren joined')
    },
    guestVote: (optionId) =>
      apply((s) => {
        let next = { ...sc.vote(s, 'ren', optionId), done: s.done.includes('vote-ren') ? s.done : [...s.done, 'vote-ren'] }
        // His vote, the last one, would leave it level: Theo comes round, as 'switch-theo' does.
        if (next.pollNotice === 'tie' && !next.done.includes('switch-theo') && next.poll?.votes.theo !== favourite(next)) {
          next = { ...sc.vote(next, 'theo', favourite(next)), done: [...next.done, 'switch-theo'] }
        }
        return next
      }),
    guestPay: () =>
      apply((s) => {
        const row = moneyView(s).rows.find((r) => r.guest && r.transfer.from === 'ren')
        if (!row) return s
        const next = sc.recordPayment(s, { ...row.transfer, method: 'bank', guest: true })
        return { ...next, done: s.done.includes('pay-ren') ? s.done : [...s.done, 'pay-ren'] }
      }),

    pendingEvent: () => nextEvent(get()),
    runNextEvent: () => {
      const e = nextEvent(get())
      if (!e) return
      apply((s) => runEvent(s, e))
      if (e.id === 'ren-back') get().showToast('✓ Ren joined')
      if (e.id === 'close-poll') {
        const place = get().data.places.find((p) => p.id === get().poll?.winnerId)
        if (place) get().showToast(`✓ ${place.name} added to tonight’s plan`)
      }
    },
    setFailNextPayment: (failNextPayment) => set({ failNextPayment }),
    setAutoplay: (autoplay) => set({ autoplay }),
    runEndDinnerWithInterlude: () => {
      if (get().interlude) return
      set({ interlude: true })
      later(1700, () => {
        set({ interlude: false })
        apply((s) => ({ ...sc.endDinner(s), done: s.done.includes('end-dinner') ? s.done : [...s.done, 'end-dinner'] }))
      })
    },
  }
})
