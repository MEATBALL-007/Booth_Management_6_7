import { APP_CONFIG } from '../domain/appConfig'

const KEY = 'phantom.dashboardPin'

export function isDashboardUnlocked(): boolean {
  return localStorage.getItem(KEY) === 'unlocked'
}

export function unlockDashboard(pin: string): boolean {
  // Fail closed. With the PIN now coming from the environment, a missing
  // VITE_DASHBOARD_PIN would otherwise make an empty input a valid unlock.
  if (!APP_CONFIG.dashboardPin) return false
  if (pin === APP_CONFIG.dashboardPin) {
    localStorage.setItem(KEY, 'unlocked')
    return true
  }
  return false
}

export function lockDashboard(): void {
  localStorage.removeItem(KEY)
}
