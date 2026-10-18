import type { KeyboardEvent } from 'react'

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Arrow keys (and Home / End) for a radiogroup or tablist: focus moves to the next radio or
 * tab and selects it, as native radios and tabs do. Put it on the group's onKeyDown.
 * `select: false` only moves focus (for choices that act at once, e.g. "Who paid?").
 */
export const arrowKeys =
  ({ select = true }: { select?: boolean } = {}) =>
  (e: KeyboardEvent<HTMLElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"], [role="tab"]')].filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
    )
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    const to =
      e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key in STEP ? (at + STEP[e.key] + items.length) % items.length : -1
    if (to < 0) return
    e.preventDefault()
    const next = items[to]
    next.focus()
    const on = next.getAttribute('aria-checked') === 'true' || next.getAttribute('aria-selected') === 'true'
    if (select && !on) next.click()
  }
