import type { ReactNode } from 'react'
import styles from './SectionTitle.module.css'

/** Section heading as Hi-fi 1 draws "Today": Plus Jakarta Sans Bold 16 in Grey 1 (the wireflow's overlines, in sentence case). */
export function SectionTitle({ children, id, aside, level = 3 }: { children: ReactNode; id?: string; aside?: ReactNode; level?: 2 | 3 }) {
  // Same look at either level: h2 directly under a screen's h1 (Home), h3 under a sheet or card title.
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className={styles.row}>
      <Heading id={id} className={styles.title}>
        {children}
      </Heading>
      {aside}
    </div>
  )
}
