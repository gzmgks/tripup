import type { CSSProperties, ReactNode } from 'react'
import logoMark from '../../assets/brand/logo-mark.svg'
import { Icon } from '../../components/Icon'
import { StatusBar } from '../../shell/StatusBar'
import { useApp } from '../../store/app'
import styles from './Guest.module.css'

/**
 * Ren's phone (G1, G2): TripUp as a plain mobile web page, no app or account.
 * A light browser address bar on top, and a way back to Ari's phone for the demo.
 */
export function GuestChrome({ url, children }: { url: string; children: ReactNode }) {
  const leaveGuestView = useApp((s) => s.leaveGuestView)
  return (
    <div className={styles.screen}>
      <StatusBar tone="onLight" />
      <header className={styles.browser}>
        <button type="button" className={styles.back} onClick={leaveGuestView}>
          <Icon name="chevron-left" size={16} />
          <span>Back to Ari’s phone</span>
        </button>
        <div className={styles.address} role="note" aria-label={`Web page: ${url}`}>
          <span className={styles.favicon} aria-hidden="true">
            <span className={styles.faviconMark} style={{ '--logo': `url("${logoMark}")` } as CSSProperties} />
          </span>
          <span className={styles.url}>{url}</span>
        </div>
      </header>
      <main className={styles.page}>
        {children}
        <p className={styles.footer}>Only this dinner is visible · no app or account</p>
      </main>
    </div>
  )
}
