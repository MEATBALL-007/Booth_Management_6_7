import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
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

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">
        ซุ้ม: {config.booth} · โหมด: {config.mode}
        {config.station ? ` · station ${config.station}` : ''}
      </p>
      <p className="opacity-60">หน้าจริงของโหมดนี้จะถูกสร้างในแผนถัดไป</p>
      <button
        onClick={reset}
        className="self-start rounded-lg px-4 py-2 border border-white/30 font-kanit"
      >
        เปลี่ยนค่า / Change setup
      </button>
    </div>
  )
}
