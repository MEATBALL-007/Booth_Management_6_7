import { useState } from 'react'
import { unlockDashboard } from './pinStore'
import { L } from '../i18n/labels'

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('dashboard.pinPrompt').th} · {L('dashboard.pinPrompt').en}
      </h1>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        aria-label={L('dashboard.pinPrompt').th}
        className="rounded-lg bg-black/40 px-4 py-3 text-center font-mono text-2xl text-white"
      />
      {error && (
        <p role="alert" className="text-red-400 font-kanit">
          {L('dashboard.pinWrong').th} · {L('dashboard.pinWrong').en}
        </p>
      )}
      <button onClick={submit} className="rounded-xl px-6 py-3 bg-phantom-yellow text-phantom-bg font-kanit">
        {L('dashboard.unlock').th} · {L('dashboard.unlock').en}
      </button>
    </div>
  )
}
