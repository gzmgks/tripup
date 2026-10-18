import { useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Roughly how long the slot takes to settle after a jump in its content's height. */
export const RESIZE_MS = 340

/** Critically damped follower: stiffness k, damping 2√k (no overshoot). */
const K = 420
const C = 2 * Math.sqrt(K)
/** Content changes closer together than this are one continuous change (an inner animation). */
const STREAM_MS = 50
/** A change bigger than this in one step is a jump, not a moving edge. */
const JUMP_PX = 60

/**
 * A box whose height follows its content smoothly: when the content jumps (a
 * poll becomes a stop) the box eases to the new height; when the content grows
 * by itself (a callout unfolding) the box tracks it closely. Either way the
 * timeline below slides instead of jumping. At rest it is plain `height: auto`
 * with no clipping, so static screens are untouched; the box clips its content
 * only while it moves. With reduced motion it simply follows the content.
 */
export function SmoothHeight({
  children,
  className,
  innerClassName,
  onSettle,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
  /** Called when the box has come to rest at its content's height after a change. */
  onSettle?: () => void
}) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const settle = useRef(onSettle)
  const reduce = useReducedMotion()

  useEffect(() => {
    settle.current = onSettle
  })

  useLayoutEffect(() => {
    const box = outer.current
    const content = inner.current
    if (!box || !content) return

    let target = content.offsetHeight
    let y = target
    let v = 0
    // Velocity of the content's own edge, so a growing callout is tracked without lag.
    let edgeV = 0
    let lastEvent = 0
    let lastStep = 0
    let raf = 0
    let moving = false

    const release = () => {
      box.style.height = ''
      box.style.overflow = ''
      moving = false
      window.cancelAnimationFrame(raf)
    }
    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0, (now - lastStep) / 1000))
      lastStep = now
      if (now - lastEvent > STREAM_MS) edgeV = 0
      const e = y - target
      const a = -K * e - C * (v - edgeV)
      v += a * dt
      y += v * dt
      if (Math.abs(y - target) < 0.5 && Math.abs(v - edgeV) < 8 && edgeV === 0) {
        release()
        settle.current?.()
        return
      }
      box.style.height = `${y}px`
    }
    const loop = (now: number) => {
      step(now)
      if (moving) raf = window.requestAnimationFrame(loop)
    }

    // ResizeObserver fires after layout and before paint, so the box is held at
    // its old height before the new one is ever drawn: no one-frame jump.
    const observer = new ResizeObserver(() => {
      const next = content.offsetHeight
      if (next === target) return
      const now = performance.now()
      if (reduce) {
        target = y = next
        release()
        settle.current?.()
        return
      }
      const dt = now - lastEvent
      const delta = next - target
      edgeV = dt < STREAM_MS && Math.abs(delta) < JUMP_PX ? (delta / dt) * 1000 : 0
      lastEvent = now
      target = next
      if (!moving) {
        moving = true
        v = 0
        lastStep = now
        box.style.overflow = 'hidden'
        box.style.height = `${y}px`
        raf = window.requestAnimationFrame(loop)
      } else {
        step(now)
      }
    })
    observer.observe(content)
    return () => {
      observer.disconnect()
      release()
    }
  }, [reduce])

  return (
    <div ref={outer} className={className}>
      <div ref={inner} className={innerClassName}>
        {children}
      </div>
    </div>
  )
}
