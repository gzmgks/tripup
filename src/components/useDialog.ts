import { useIsPresent } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { focusLanding, focusLost } from './focus'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/** Tabbable and on screen (not in a leaving, aria-hidden phase). */
const tabbable = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'))

/**
 * Modal focus for a dialog panel (give it tabIndex={-1}):
 * - focus moves into the panel when it opens;
 * - on close (as soon as it starts sliding out) it goes back to the opener or, if the opener is
 *   gone (the open slot became the poll, a paid row lost its Pay button), to the nearest
 *   container of it that is still there;
 * - a focused control that disappears (a phase change) hands focus to the panel, not the page;
 * - Tab and Shift+Tab stay inside, Escape closes.
 * Returns the panel's onKeyDown.
 */
export function useDialog(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  const giveBack = useRef<() => void>(() => undefined)
  const present = useIsPresent()
  useEffect(() => {
    if (!present) giveBack.current()
  }, [present])

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const path: HTMLElement[] = []
    for (let el = opener; el && el !== document.body; el = el.parentElement) path.push(el)
    const p = panel.current
    p?.focus({ preventScroll: true })

    const lost = new MutationObserver(() => {
      if (p && focusLost()) p.focus({ preventScroll: true })
    })
    if (p) lost.observe(p, { childList: true, subtree: true })

    const restore = () => {
      const back = path.find((el) => el.isConnected)
      if (back === opener) back?.focus({ preventScroll: true })
      else if (back) focusLanding(back)
    }
    let given = false
    giveBack.current = () => {
      if (given) return
      given = true
      lost.disconnect()
      restore()
      // The opener may still be leaving (a Pay button fading out as its row turns paid): check again.
      window.setTimeout(() => {
        if (focusLost()) restore()
      }, 600)
    }
    return () => giveBack.current()
  }, [panel])

  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close.current()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = tabbable(panel.current)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === panel.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
