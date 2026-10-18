import { useEffect } from 'react'
import onVioletGlyphs from '../assets/statusbar/dark.svg'
import onLightGlyphs from '../assets/statusbar/light.svg'
import styles from './StatusBar.module.css'

/**
 * Static iOS status bar (9:41), exported from the hi-fi frames.
 * `onViolet` = "Status Bar - Dark" (white glyphs), `onLight` = "Status Bar - Light".
 * Long-pressing the top of the phone opens the demo controls (see DeviceFrame).
 */
export function StatusBar({ tone }: { tone: 'onViolet' | 'onLight' }) {
  // On phones the browser tints its own bar: match the top of the current screen.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    const token = tone === 'onViolet' ? '--act' : '--surface'
    meta.content = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || meta.content
  }, [tone])

  return (
    <div
      className={`${styles.bar} ${tone === 'onViolet' ? styles.onViolet : styles.onLight}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        className={styles.glyphs}
        src={tone === 'onViolet' ? onVioletGlyphs : onLightGlyphs}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </div>
  )
}
