import type { CSSProperties } from 'react'
import camera from '../assets/icons/camera.svg'
import cancel from '../assets/icons/cancel.svg'
import check from '../assets/icons/check.svg'
import chevronLeft from '../assets/icons/chevron-left.svg'
import dropdown from '../assets/icons/dropdown.svg'
import expand from '../assets/icons/expand.svg'
import list from '../assets/icons/list.svg'
import plus from '../assets/icons/plus.svg'
import star from '../assets/icons/star.svg'
import x from '../assets/icons/x.svg'
import styles from './Icon.module.css'

/** Icons exported from the Figma icon set; drawn as masks so they take `color`. */
const ICONS = {
  camera,
  cancel,
  check,
  'chevron-left': chevronLeft,
  dropdown,
  expand,
  list,
  plus,
  star,
  x,
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  /** Box size in px (width; height defaults to the same). */
  size: number
  height?: number
  className?: string
}

export function Icon({ name, size, height, className }: IconProps) {
  const style = {
    '--icon': `url("${ICONS[name]}")`,
    width: size,
    height: height ?? size,
  } as CSSProperties
  return <span className={`${styles.icon} ${className ?? ''}`} style={style} aria-hidden="true" />
}
