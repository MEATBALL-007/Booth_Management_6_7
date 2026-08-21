import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-phantom-yellow to-phantom-orange text-phantom-bg shadow-glow-o',
  ghost: 'bg-phantom-surface2 text-phantom-text border border-phantom-line',
  danger: 'bg-phantom-orange text-phantom-bg',
}

/**
 * The 44px floor lives here, not at the call sites. Spec §4 asks for it on every
 * touch target; leaving it to each caller made "forgot one" the default failure
 * mode, and one caller (the Setup confirm button) had indeed forgotten. Callers may
 * still add padding or width — `className` is appended, so their classes win.
 */
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-[44px] rounded-xl px-5 py-3 font-kanit font-bold disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}
