import { L, type LabelKey } from './labels'

export function BiLabel({ k }: { k: LabelKey }) {
  const { th, en } = L(k)
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="font-kanit">{th}</span>
      <span className="text-xs opacity-70">{en}</span>
    </span>
  )
}
