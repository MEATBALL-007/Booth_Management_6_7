import { useState } from 'react'
import { unlockDashboard } from './pinStore'
import { L } from '../i18n/labels'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (unlockDashboard(pin)) {
      onUnlock()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <Panel className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="font-kanit text-2xl text-phantom-yellow">
          {L('dashboard.pinPrompt').th} · {L('dashboard.pinPrompt').en}
        </h1>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          aria-label={L('dashboard.pinPrompt').th}
          className="w-full min-h-[44px] rounded-xl border border-phantom-line bg-phantom-surface2 px-4 py-4 text-center font-mono text-3xl tracking-[0.3em] text-phantom-text focus:border-phantom-yellow/60 focus:outline-none"
        />
        {error && (
          <p role="alert" className="font-kanit text-red-400">
            {L('dashboard.pinWrong').th} · {L('dashboard.pinWrong').en}
          </p>
        )}
        <Button variant="primary" onClick={submit} className="min-h-[44px] w-full text-lg">
          {L('dashboard.unlock').th} · {L('dashboard.unlock').en}
        </Button>
      </Panel>
    </div>
  )
}
