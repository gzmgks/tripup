import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './OptionCard.module.css'

interface OptionCardProps {
  title: ReactNode
  meta?: ReactNode
  /** Small line under meta, e.g. "In your Ideas · saved by Maya". */
  note?: ReactNode
  selected: boolean
  onSelect: () => void
  /** 'radio' = one of a group, 'check' = several can be on. */
  kind?: 'radio' | 'check'
  leading?: ReactNode
  trailing?: ReactNode
  disabled?: boolean
}

/**
 * A selectable card, extending the hi-fi system: BG fill like "Rest of the bill",
 * and when chosen a white card with a 2px Lime-dark ring and a Lime-dark check
 * (Lime = chosen; Lime dark on white).
 */
export function OptionCard({ title, meta, note, selected, onSelect, kind = 'radio', leading, trailing, disabled }: OptionCardProps) {
  return (
    <button
      type="button"
      role={kind === 'radio' ? 'radio' : 'checkbox'}
      aria-checked={selected}
      disabled={disabled}
      className={`${styles.card} ${selected ? styles.on : ''}`}
      onClick={onSelect}
    >
      {leading}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
        {note && <span className={styles.note}>{note}</span>}
      </span>
      {trailing}
      <span className={`${styles.mark} ${kind === 'check' ? styles.square : ''}`} aria-hidden="true">
        {selected && <Icon name="check" size={kind === 'check' ? 18 : 20} />}
      </span>
    </button>
  )
}
