export function QueueNumber({ value, size = 'card' }: { value: string; size?: 'display' | 'card' }) {
  const cls = size === 'display'
    ? 'text-[clamp(96px,22vw,320px)] leading-none glow-o'
    : 'text-5xl glow-o'
  return (
    <span className={`font-mono font-extrabold bg-gradient-to-b from-[#FFD65a] to-phantom-orange bg-clip-text text-transparent ${cls}`}>
      {value}
    </span>
  )
}
