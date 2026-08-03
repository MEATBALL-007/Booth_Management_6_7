import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-phantom-yellow to-phantom-orange text-phantom-bg shadow-glow-o',
  ghost: 'bg-phantom-surface2 text-phantom-text border border-phantom-line',
  danger: 'bg-phantom-orange text-phantom-bg',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-xl px-5 py-3 font-kanit font-bold disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}
