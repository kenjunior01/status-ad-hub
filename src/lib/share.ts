import { toast } from 'sonner'

/**
 * Share the user's live location with emergency contacts.
 * Uses the Web Share API on mobile (native share sheet),
 * falls back to copying a Google Maps link to clipboard.
 */
export interface ShareLocationOptions {
  latitude: number
  longitude: number
  accuracy?: number
  deviceName?: string
}

export async function shareLocation(options: ShareLocationOptions): Promise<boolean> {
  const { latitude, longitude, accuracy, deviceName } = options
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
  const accuracyStr = accuracy ? ` (precisao: ${Math.round(accuracy)}m)` : ''
  const shareText = deviceName
    ? `📍 ${deviceName} — Minha localizacao actual:${accuracyStr}\n${mapsUrl}\n\nEnviado via StatusAds Connect`
    : `📍 Minha localizacao actual via StatusAds Connect:${accuracyStr}\n${mapsUrl}`

  // Try Web Share API (works on mobile, some desktop browsers)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'StatusAds Connect — Localizacao',
        text: shareText,
        url: mapsUrl,
      })
      return true
    } catch (err: any) {
      // User cancelled the share sheet — not an error
      if (err.name === 'AbortError') return false
      // Fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(shareText)
    toast.success('Localizacao copiada', {
      description: 'Cole e envie aos seus contactos de emergencia.',
      duration: 5_000,
    })
    return true
  } catch {
    // Final fallback: open in new tab
    window.open(mapsUrl, '_blank')
    toast.success('Mapa aberto', {
      description: 'Copie o link e partilhe manualmente.',
    })
    return true
  }
}

/**
 * Generate a shareable emergency link with location and timestamp.
 */
export function generateEmergencyShareUrl(
  latitude: number,
  longitude: number,
  alertId?: string
): string {
  const params = new URLSearchParams({
    lat: latitude.toFixed(6),
    lng: longitude.toFixed(6),
    t: new Date().toISOString(),
    ...(alertId ? { alert: alertId } : {}),
  })
  return `${window.location.origin}/dashboard?${params.toString()}`
}
