import type { HTMLAttributes } from 'react'
type Tone = 'paid' | 'cash' | 'qr' | 'neutral'
const TONE: Record<Tone, string> = {
  paid: 'text-phantom-success border-phantom-success/40 bg-phantom-success/10',
  cash: 'text-phantom-yellow border-phantom-yellow/35',
  qr: 'text-phantom-text border-phantom-line',
  neutral: 'text-phantom-muted border-phantom-line',
}
export function Chip({ tone = 'neutral', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={`inline-block rounded-full border px-3 py-1 font-kanit text-sm font-semibold ${TONE[tone]} ${className}`} {...props} />
}
