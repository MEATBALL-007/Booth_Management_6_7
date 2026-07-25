import { APP_CONFIG } from '../domain/appConfig'

const KEY = 'phantom.dashboardPin'

export function isDashboardUnlocked(): boolean {
  return localStorage.getItem(KEY) === 'unlocked'
}

export function unlockDashboard(pin: string): boolean {
  if (pin === APP_CONFIG.dashboardPin) {
    localStorage.setItem(KEY, 'unlocked')
    return true
  }
  return false
}

export function lockDashboard(): void {
  localStorage.removeItem(KEY)
}
