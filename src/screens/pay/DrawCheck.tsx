import { motion } from 'framer-motion'

/**
 * The check from the icon set as a stroke, so it can draw itself (stroke-dashoffset via
 * pathLength). Same 24-unit geometry and weight as icons/check.svg; takes `color`.
 */
export function DrawCheck({ size, draw, delay = 0 }: { size: number; draw: boolean; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M3.7 12.2 9.2 17.5 20.3 6.4"
        stroke="currentColor"
        strokeWidth={3.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={draw ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 0.34, delay, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.01, delay } }}
      />
    </svg>
  )
}
