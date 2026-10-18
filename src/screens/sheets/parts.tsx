import type { ReactNode } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import styles from './sheets.module.css'

interface ChipProps {
  selected?: boolean
  onClick: () => void
  children: ReactNode
  /** 'radio' (one of a row), 'checkbox' (filters), 'tab' (map views). */
  role?: 'radio' | 'checkbox' | 'tab'
  disabled?: boolean
  label?: string
  /** Sitting on a BG card: white fill so the chip keeps its edge. */
  onMuted?: boolean
}

/** Button_Grey, the day chips of Hi-fi 1: BG fill and Grey 1; chosen = Lime fill, ink text. */
export function Chip({ selected = false, onClick, children, role = 'radio', disabled, label, onMuted }: ChipProps) {
  // Tabs: one tab stop (the selected tab), arrow keys move between them (arrowKeys on the tablist).
  const state = role === 'tab' ? { 'aria-selected': selected, tabIndex: selected ? 0 : -1 } : { 'aria-checked': selected }
  return (
    <button
      type="button"
      role={role}
      {...state}
      aria-label={label}
      disabled={disabled}
      className={`${styles.chip} ${onMuted ? styles.chipOnMuted : ''} ${selected ? styles.chipOn : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface ActChipProps {
  onClick: () => void
  children: ReactNode
  /** Sitting on a BG card: white fill instead of Purple_Light. */
  onMuted?: boolean
  label?: string
  expanded?: boolean
}

/** Small violet action (violet = act), drawn like the "Live Poll" chip. */
export function ActChip({ onClick, children, onMuted, label, expanded }: ActChipProps) {
  return (
    <button
      type="button"
      className={`${styles.act} ${onMuted ? styles.actOnMuted : ''}`}
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  disabled?: boolean
}

/** The hi-fi segmented control ("How are we splitting this?"): BG track, Lime segment. */
export function Segmented<T extends string>({ label, options, value, onChange, disabled }: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label} onKeyDown={arrowKeys()}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          className={`${styles.segment} ${value === o.id ? styles.segmentOn : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface PlaceRowProps {
  title: ReactNode
  meta?: ReactNode
  note?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}

/** A place you can act on (Explore, Suggest, map ideas): BG card like "Rest of the bill". */
export function PlaceRow({ title, meta, note, trailing, children }: PlaceRowProps) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.rowText}>
          <p className={styles.itemTitle}>{title}</p>
          {meta && <p className={styles.note}>{meta}</p>}
          {note && <p className={styles.note}>{note}</p>}
        </div>
        {trailing}
      </div>
      {children}
    </div>
  )
}
