import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export function getTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  if (hours < 24) return `há ${hours}h`
  return `há ${days}d`
}

export function getBatteryColor(level: number): string {
  if (level > 60) return 'text-safe'
  if (level > 20) return 'text-warning'
  return 'text-danger'
}

export function getDeviceIcon(type: string): string {
  const icons: Record<string, string> = {
    airpods: 'headphones',
    smartwatch: 'watch',
    smartglasses: 'glasses',
    beacon: 'radio',
    tracker: 'navigation',
    phone: 'smartphone',
  }
  return icons[type.toLowerCase()] || 'bluetooth'
}

export const EMERGENCY_SHARE_URL = (emergencyId: string) =>
  `${window.location.origin}/emergency/${emergencyId}`
