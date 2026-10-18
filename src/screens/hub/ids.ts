import type { HubTab } from '../../store/app'

/** The Plan / Money panel (the hub's <main>), labelled by its tab in the header. */
export const HUB_PANEL_ID = 'hub-panel'
export const HUB_TAB_ID: Record<HubTab, string> = { plan: 'hub-tab-plan', money: 'hub-tab-money' }
