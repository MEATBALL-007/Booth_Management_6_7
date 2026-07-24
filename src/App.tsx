import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { loadDeviceConfig, clearDeviceConfig, type DeviceConfig } from './device/deviceConfig'

export default function App() {
  const [config, setConfig] = useState<DeviceConfig | null>(() => loadDeviceConfig())

  if (!config) {
    return <SetupScreen onDone={() => setConfig(loadDeviceConfig())} />
  }

  const reset = () => {
    clearDeviceConfig()
    setConfig(null)
  }

  const ResetButton = (
    <button onClick={reset} className="self-start rounded-lg px-4 py-2 border border-white/30 font-kanit">
      เปลี่ยนค่า / Change setup
    </button>
  )

  if (config.mode === 'order' && config.station) {
    return (
      <div className="min-h-screen flex flex-col">
        <OrderStation booth={config.booth} station={config.station} />
        <div className="p-4">{ResetButton}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">
        ซุ้ม: {config.booth} · โหมด: {config.mode}
        {config.station ? ` · station ${config.station}` : ''}
      </p>
      <p className="opacity-60">หน้าจริงของโหมดนี้จะถูกสร้างในแผนถัดไป</p>
      {ResetButton}
    </div>
  )
}
