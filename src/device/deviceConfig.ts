import type { BoothId, Mode, Station } from '../domain/types'

const KEY = 'phantom.device'

export interface DeviceConfig {
  booth: BoothId
  mode: Mode
  station?: Station
}

export function saveDeviceConfig(cfg: DeviceConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function loadDeviceConfig(): DeviceConfig | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DeviceConfig
  } catch {
    return null
  }
}

export function clearDeviceConfig(): void {
  localStorage.removeItem(KEY)
}

export function isConfigValid(cfg: DeviceConfig): boolean {
  if (cfg.mode === 'order') return !!cfg.station
  return true
}
