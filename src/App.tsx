import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { DisplayScreen } from './screens/DisplayScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { loadDeviceConfig, clearDeviceConfig, type DeviceConfig } from './device/deviceConfig'
import { L } from './i18n/labels'

export default function App() {
  const [config, setConfig] = useState<DeviceConfig | null>(() => loadDeviceConfig())
  const [confirming, setConfirming] = useState(false)

  if (!config) {
    return <SetupScreen onDone={() => setConfig(loadDeviceConfig())} />
  }

  const reset = () => {
    clearDeviceConfig()
    setConfig(null)
    setConfirming(false)
  }

  // Visible on every mode: a clear "back to Setup" control that asks to confirm
  // first (so a customer/child can't reset the device by accident).
  const chrome = (
    <>
      <button
        onClick={() => setConfirming(true)}
        aria-label={L('nav.backToSetup').th}
        className="fixed bottom-3 right-3 z-40 rounded-full bg-phantom-bg/90 border border-white/40 px-4 py-2 font-kanit text-sm text-white shadow-lg"
      >
        ← {L('nav.setup').th} / {L('nav.setup').en}
      </button>
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-phantom-bg p-6 flex flex-col gap-4">
            <p className="font-kanit text-lg text-phantom-yellow">{L('nav.confirmBack').th}</p>
            <p className="text-sm opacity-70">{L('nav.confirmBack').en}</p>
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 rounded-xl py-3 bg-phantom-orange font-kanit">
                {L('nav.confirm').th} / {L('nav.confirm').en}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl py-3 border border-white/30 font-kanit"
              >
                {L('nav.cancel').th} / {L('nav.cancel').en}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (config.mode === 'order' && config.station) {
    return (
      <div className="min-h-screen">
        <OrderStation booth={config.booth} station={config.station} />
        {chrome}
      </div>
    )
  }

  if (config.mode === 'display') {
    return (
      <div className="min-h-screen">
        <DisplayScreen booth={config.booth} />
        {chrome}
      </div>
    )
  }

  if (config.mode === 'dashboard') {
    return (
      <div className="min-h-screen">
        <DashboardScreen />
        {chrome}
      </div>
    )
  }

  // Safety fallback (e.g. order mode with no station — prevented by isConfigValid).
  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">ซุ้ม: {config.booth} · โหมด: {config.mode}</p>
      {chrome}
    </div>
  )
}
