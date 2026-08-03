import type { BoothId, Mode, Station } from '../domain/types'

export type PresetCode = 'need_help' | 'low_stock' | 'cleared'
export type MessageKind = 'alert' | 'text' | 'broadcast'

export interface Message {
  id: string
  fromDeviceId: string
  fromBooth: BoothId
  fromMode: Mode
  scope: 'all' | BoothId
  kind: MessageKind
  presetCode?: PresetCode
  text?: string
  createdAt: number
  ackBy: string[]
}

export interface Presence {
  id: string
  deviceId: string
  booth: BoothId
  mode: Mode
  station?: Station
  lastSeen: number
}
