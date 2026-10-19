import { DINNER_PLAN_ID, DRINKS_PLAN_ID } from '../../data/seed'

/** A map export and its size in image px. */
export interface MapImage {
  w: number
  h: number
}

export interface MapPoint {
  x: number
  y: number
}

/** Today's whole map as Figma exports it (map-day5-full.webp): the route with every stop drawn on it. */
export const DAY5_MAP: MapImage = { w: 880, h: 1916 }

/** The Plan tab's map card and the Home cover (map-day5.webp): rows 467–842 of the whole map. */
export const DAY5_CARD: MapImage = { w: 880, h: 375 }
export const DAY5_CARD_TOP = 467

/** Centres of the stops drawn into the whole map (image px), by plan id. */
export const DAY5_PINS: Record<string, MapPoint> = {
  'd5-belem-tower': { x: 440, y: 885.6 },
  'd5-lx-factory': { x: 317.4, y: 707.6 },
  // The dashed "?" of the open dinner slot.
  [DINNER_PLAN_ID]: { x: 465.4, y: 519.2 },
  [DRINKS_PLAN_ID]: { x: 694, y: 413.6 },
}
