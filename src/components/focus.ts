/**
 * Move focus to a landing spot that isn't a control (a screen's title, a card that replaced
 * the focused button): focusable for this one visit, without a ring (see global.css).
 */
export function focusLanding(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) {
    el.tabIndex = -1
    el.dataset.landing = ''
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('tabindex')
        delete el.dataset.landing
      },
      { once: true },
    )
  }
  el.focus({ preventScroll: true })
}

/** Keyboard focus fell back to the page: the focused control was removed. */
export const focusLost = () => !document.activeElement || document.activeElement === document.body
