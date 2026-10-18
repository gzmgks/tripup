import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../store/app'
import styles from './DeviceFrame.module.css'

/** Long-press this far from the top of the phone (status bar and header) to open the demo controls. */
const LONG_PRESS_ZONE = 64
const LONG_PRESS_MS = 600
const MOVE_TOLERANCE = 10

export function DeviceFrame({ children }: { children: ReactNode }) {
  const openDemo = useApp((s) => s.openDemo)
  // Hi-fi 2 sits its home indicator 2pt lower than Hi-fi 1.
  const lowIndicator = useApp((s) => s.screen === 'bill')
  const device = useRef<HTMLDivElement>(null)

  // Presenter gesture: a long press near the top opens the demo controls. A quick tap still
  // works normally; after a long press, the click the browser sends on release is swallowed
  // so it can't land on whatever just opened under the finger.
  useEffect(() => {
    const el = device.current
    if (!el) return
    let timer = 0
    let start: { x: number; y: number } | null = null
    let swallowUntil = 0
    const cancel = () => {
      window.clearTimeout(timer)
      start = null
    }
    const onDown = (e: PointerEvent) => {
      const top = el.getBoundingClientRect().top
      if (e.clientY - top > LONG_PRESS_ZONE || (e.pointerType === 'mouse' && e.button !== 0)) return
      start = { x: e.clientX, y: e.clientY }
      timer = window.setTimeout(() => {
        start = null
        swallowUntil = performance.now() + 800
        openDemo()
      }, LONG_PRESS_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancel()
    }
    const onClick = (e: MouseEvent) => {
      if (performance.now() < swallowUntil) {
        swallowUntil = 0
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', cancel)
    el.addEventListener('pointercancel', cancel)
    window.addEventListener('click', onClick, true)
    return () => {
      cancel()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', cancel)
      el.removeEventListener('pointercancel', cancel)
      window.removeEventListener('click', onClick, true)
    }
  }, [openDemo])

  return (
    <div className={styles.page}>
      <div ref={device} className={styles.device} data-device>
        {children}
        <div className={`${styles.homeIndicator} ${lowIndicator ? styles.homeIndicatorLow : ''}`} aria-hidden="true" />
      </div>
      {/* Below the phone, so it never mixes with the product UI. On phones: long-press the top of the screen. */}
      <button type="button" className={styles.demoTrigger} onClick={openDemo}>
        Demo controls
      </button>
    </div>
  )
}
