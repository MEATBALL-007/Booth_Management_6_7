const KEY = 'phantom.deviceId'

export function getDeviceId(): string {
  const existing = localStorage.getItem(KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(KEY, id)
  return id
}
