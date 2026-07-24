import type { BoothId, Station } from '../domain/types'

const key = (booth: BoothId, station: Station) => `phantom.queue.${booth}.${station}`

export function formatQueueNumber(station: Station, n: number): string {
  return `${station}${n}`
}

export function peekLastQueueNumber(booth: BoothId, station: Station): number {
  const raw = localStorage.getItem(key(booth, station))
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function nextQueueNumber(booth: BoothId, station: Station): string {
  const n = peekLastQueueNumber(booth, station) + 1
  localStorage.setItem(key(booth, station), String(n))
  return formatQueueNumber(station, n)
}
