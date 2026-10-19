import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { DINNER_PLAN_ID } from '../../data/seed'
import { DAY5_CARD, DAY5_CARD_TOP, DAY5_PINS } from './dayMap'
import type { MapImage, MapPoint } from './dayMap'
import styles from './MapPin.module.css'

/**
 * A layer over a map image that is scaled to cover its box (object-fit: cover), in the
 * image's own coordinates: put <MapSpot>s in it. It is a size container, so the spots follow
 * the image however it is scaled. `focusY` must match the image's object-position y (0–1).
 */
export function MapLayer({
  map,
  focusY = 0.5,
  className,
  decorative,
  children,
}: {
  map: MapImage
  focusY?: number
  className?: string
  /** Hidden from screen readers: it only repeats what the image shows. */
  decorative?: boolean
  children: ReactNode
}) {
  const vars = { '--map-w': map.w, '--map-h': map.h, '--focus-y': focusY } as CSSProperties
  return (
    <span className={`${styles.layer} ${className ?? ''}`} style={vars} aria-hidden={decorative || undefined}>
      <span className={styles.plane}>{children}</span>
    </span>
  )
}

/** Centres its content on a point of the layer's map (image px). */
export function MapSpot({ map, at, className, children }: { map: MapImage; at: MapPoint; className?: string; children: ReactNode }) {
  return (
    <span className={`${styles.spot} ${className ?? ''}`} style={{ left: `${(at.x / map.w) * 100}%`, top: `${(at.y / map.h) * 100}%` }}>
      {children}
    </span>
  )
}

/** How a stop is drawn on the map, as in the Figma export: numbered (white, violet ring), the open "?" (dashed) or filled violet. */
export type PinKind = 'stop' | 'open' | 'filled'

/** A pin's face, sized by its parent. */
export function PinFace({ kind, children }: { kind: PinKind; children: ReactNode }) {
  return <span className={`${styles.face} ${kind === 'open' ? styles.faceOpen : kind === 'filled' ? styles.faceFilled : ''}`}>{children}</span>
}

/**
 * A numbered stop drawn over the dashed "?" baked into map-day5.webp, for when
 * the open slot is decided. Place it inside the map's positioned box; `focusY`
 * must match the image's object-position y (0–1), 0.5 when centred.
 * `pop`: the pin springs onto the "?" when it appears (put it in an
 * <AnimatePresence initial={false}> so it doesn't pop on first render).
 */
export function MapPin({ number, focusY = 0.5, pop = false }: { number: number; focusY?: number; pop?: boolean }) {
  const open = DAY5_PINS[DINNER_PLAN_ID]
  return (
    <MapLayer map={DAY5_CARD} focusY={focusY} decorative>
      <MapSpot map={DAY5_CARD} at={{ x: open.x, y: open.y - DAY5_CARD_TOP }} className={styles.pin}>
        <motion.span
          className={styles.pop}
          initial={pop ? { scale: 0.3, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16, opacity: { duration: 0.12 } }}
        >
          <PinFace kind="stop">{number}</PinFace>
        </motion.span>
      </MapSpot>
    </MapLayer>
  )
}
