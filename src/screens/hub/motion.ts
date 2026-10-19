// Motion vocabulary for the Plan tab (stage 4). Decision moments (votes, ties,
// the winner) may be lively; everything else stays short and quiet. With reduced
// motion every helper here resolves to the end state at once.

/** --ease-out in tokens.css. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** The bars and the slot resize: alive, but settled within ~0.5s. */
export const BAR_SPRING = { type: 'spring', stiffness: 240, damping: 21 } as const
/** A voter's avatar landing in a stack: a small overshoot. */
export const POP_SPRING = { type: 'spring', stiffness: 520, damping: 17 } as const
/** Shared-layout travel (the winner's name, a moved vote). */
export const TRAVEL_SPRING = { type: 'spring', stiffness: 420, damping: 40 } as const

type Reduce = boolean | null

/** Shared layout id of a place's name: it travels from its poll row into the decided stop's title. */
export const placeNameId = (placeId: string) => `slot-place-${placeId}`

/**
 * A block that appears inside a flex column with `gap`: it grows from nothing
 * (the negative margin cancels the gap), so whatever sits below slides down
 * instead of jumping. Use inside <AnimatePresence initial={false}>.
 */
export function grow(gap: number, reduce: Reduce, delay = 0) {
  if (reduce) {
    return {
      initial: false as const,
      animate: { height: 'auto', opacity: 1, marginTop: 0 },
      // Leaves at full height: a collapsed box can paint for a frame before its opacity lands,
      // spilling its content over what's below. It's removed right after anyway.
      exit: { opacity: 0, transition: { duration: 0 } },
      transition: { duration: 0 },
    }
  }
  return {
    initial: { height: 0, opacity: 0, marginTop: -gap, overflow: 'hidden' },
    animate: { height: 'auto', opacity: 1, marginTop: 0, transitionEnd: { overflow: 'visible' } },
    exit: { height: 0, opacity: 0, marginTop: -gap, overflow: 'hidden', transition: { duration: 0.24, ease: EASE_OUT } },
    transition: { duration: 0.32, ease: EASE_OUT, delay, opacity: { duration: 0.22, delay: delay + 0.08 } },
  }
}

/** Content that fades and rises into place (an entrance only; no layout change). */
export function rise(play: boolean, reduce: Reduce, delay = 0, distance = 8) {
  if (!play || reduce) return { initial: false as const, animate: { opacity: 1, y: 0 } }
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: EASE_OUT, delay },
  }
}
