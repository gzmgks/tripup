import { useSettled } from './useSettled'

interface AnnounceProps {
  text: string
  /** Wait until the text has stopped changing for this long (ms) before saying it. */
  settle?: number
  /** role="alert" (interrupts) instead of role="status". Only for errors. */
  assertive?: boolean
}

/**
 * A visually hidden live region. It stays mounted while its text changes, so screen
 * readers announce each change (a region that mounts together with its text often is not).
 */
export function Announce({ text, settle = 0, assertive = false }: AnnounceProps) {
  const settled = useSettled(text, settle)
  return (
    <span className="visually-hidden" role={assertive ? 'alert' : 'status'}>
      {settle > 0 ? settled : text}
    </span>
  )
}
