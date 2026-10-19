import { AnimatePresence, MotionConfig } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { focusLanding } from './components/focus'
import { LogBill } from './screens/bill/LogBill'
import { GuestPay } from './screens/guest/GuestPay'
import { GuestPoll } from './screens/guest/GuestPoll'
import { Home } from './screens/home/Home'
import { TripHub } from './screens/hub/TripHub'
import { PaySheet } from './screens/pay/PaySheet'
import { AddPeopleSheet } from './screens/sheets/AddPeopleSheet'
import { AddPlanSheet } from './screens/sheets/AddPlanSheet'
import { DecideSheet } from './screens/sheets/DecideSheet'
import { ExploreSheet } from './screens/sheets/ExploreSheet'
import { FullMapSheet } from './screens/sheets/FullMapSheet'
import { SuggestSheet } from './screens/sheets/SuggestSheet'
import { SquaredUp } from './screens/squared/SquaredUp'
import { TokensPreview } from './screens/TokensPreview'
import { Banner } from './shell/Banner'
import { DemoControl } from './shell/DemoControl'
import { DeviceFrame } from './shell/DeviceFrame'
import { Interlude } from './shell/Interlude'
import { Toast } from './shell/Toast'
import { useApp } from './store/app'
import type { SheetId } from './store/app'

const SHEETS: Record<SheetId, () => React.JSX.Element | null> = {
  'add-people': AddPeopleSheet,
  decide: DecideSheet,
  pay: PaySheet,
  suggest: SuggestSheet,
  'add-plan': AddPlanSheet,
  explore: ExploreSheet,
  'full-map': FullMapSheet,
}

export default function App() {
  const screen = useApp((s) => s.screen)
  const sheet = useApp((s) => s.sheet)
  const jumps = useApp((s) => s.jumps)
  const SheetView = sheet ? SHEETS[sheet] : null

  // A new screen starts keyboard and screen-reader users at its title, like a page load
  // (not on the first load, where the browser starts at the top anyway).
  const shown = useRef(screen)
  useEffect(() => {
    if (shown.current === screen) return
    shown.current = screen
    // After the new screen has painted, so moving focus doesn't force an extra layout mid-transition.
    const frame = requestAnimationFrame(() => {
      const device = document.querySelector('[data-device]')
      const title = device?.querySelector<HTMLElement>('main h1, h1') ?? device?.querySelector<HTMLElement>('main')
      if (title) focusLanding(title)
    })
    return () => cancelAnimationFrame(frame)
  }, [screen])

  return (
    // reducedMotion="user": Framer Motion follows prefers-reduced-motion
    <MotionConfig reducedMotion="user">
      <DeviceFrame>
        {/* First in the DOM, as on screen: Tab reaches a push before the screen under it (it is drawn on top by z-index). */}
        <Banner />
        {screen === 'home' && <Home />}
        {screen === 'hub' && <TripHub />}
        {screen === 'bill' && <LogBill />}
        {screen === 'squared' && <SquaredUp />}
        {screen === 'guest-poll' && <GuestPoll />}
        {screen === 'guest-pay' && <GuestPay />}
        {screen === 'preview-tokens' && <TokensPreview tone="violet" />}
        {screen === 'preview-light' && <TokensPreview tone="light" />}
        <AnimatePresence mode="wait">{SheetView && <SheetView key={`${sheet}-${jumps}`} />}</AnimatePresence>
        <Interlude />
        <Toast />
        <DemoControl />
      </DeviceFrame>
    </MotionConfig>
  )
}
