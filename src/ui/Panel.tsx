import type { HTMLAttributes } from 'react'
export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-phantom-surface border border-phantom-line rounded-2xl p-5 ${className}`} {...props} />
}
