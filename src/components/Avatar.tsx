import ari from '../assets/avatars/ari.webp'
import maya from '../assets/avatars/maya.webp'
import nic from '../assets/avatars/nic.webp'
import sam from '../assets/avatars/sam.webp'
import theo from '../assets/avatars/theo.webp'
import type { MemberId } from '../domain/types'
import { memberName } from './names'
import styles from './Avatar.module.css'

const PHOTOS: Partial<Record<MemberId, string>> = { ari, maya, theo, sam, nic }

/** Ring styles used by the Avatars component instances in the hi-fi frames. */
export type AvatarRing = 'header' | 'poll' | 'chosen' | 'off' | 'none'

interface AvatarProps {
  member: MemberId
  size: number
  ring?: AvatarRing
  className?: string
  /** Set false when a visible name sits next to the photo. */
  labelled?: boolean
}

export function Avatar({ member, size, ring = 'none', className, labelled = true }: AvatarProps) {
  const photo = PHOTOS[member]
  return (
    <span
      className={`${styles.avatar} ${styles[ring]} ${member === 'theo' ? styles.topAligned : ''} ${className ?? ''}`}
      style={{ width: size, height: size }}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? memberName(member) : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {photo ? (
        // Photos keep Figma's crop: a 1361:1712 box filled by the photo, centred in the circle
        // (Theo's is top-aligned and mirrored, as in the component).
        <span className={`${styles.crop} ${member === 'theo' ? styles.mirrored : ''}`}>
          <img src={photo} alt="" draggable={false} />
        </span>
      ) : (
        <span className={styles.initial}>{memberName(member)[0]}</span>
      )}
    </span>
  )
}
