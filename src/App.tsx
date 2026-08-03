import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { DisplayScreen } from './screens/DisplayScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { loadDeviceConfig, clearDeviceConfig, type DeviceConfig } from './device/deviceConfig'
import { L } from './i18n/labels'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

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
        className="fixed bottom-3 right-3 z-40 flex min-h-[44px] items-center gap-1.5 rounded-full border border-phantom-line bg-phantom-surface/90 px-4 py-2 font-kanit text-sm font-semibold text-phantom-text shadow-lg transition hover:border-phantom-yellow/50 hover:bg-phantom-surface2"
      >
        ← {L('nav.setup').th} / {L('nav.setup').en}
      </button>
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
        >
          <Panel className="flex w-full max-w-sm flex-col gap-4 border-phantom-yellow/30 shadow-lg">
            <p className="font-kanit text-lg text-phantom-yellow">{L('nav.confirmBack').th}</p>
            <p className="text-sm text-phantom-muted">{L('nav.confirmBack').en}</p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={reset} className="min-h-[44px] flex-1">
                {L('nav.confirm').th} / {L('nav.confirm').en}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} className="min-h-[44px] flex-1">
                {L('nav.cancel').th} / {L('nav.cancel').en}
              </Button>
            </div>
          </Panel>
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
