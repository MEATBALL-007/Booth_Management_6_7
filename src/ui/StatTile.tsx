export function StatTile({ testid, label, value, accent = false }: { testid: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-phantom-surface2 border border-phantom-line rounded-2xl p-4">
      <div className="font-kanit text-sm text-phantom-muted">{label}</div>
      <div data-testid={testid} className={`font-mono font-extrabold text-3xl mt-1 ${accent ? 'text-phantom-yellow glow-y' : 'text-phantom-text'}`}>{value}</div>
    </div>
  )
}
