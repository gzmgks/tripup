import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

/**
 * primary   = Hi-fi 2 "Save": violet, 14px radius, Button 2 text (violet = act).
 * secondary = BG fill, ink text, same shape.
 * quiet     = text-only violet action.
 */
export function Button({ variant = 'primary', className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${styles.button} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  )
}
