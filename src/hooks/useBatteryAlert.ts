import { useEffect, useRef, useCallback, useState } from 'react'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useNotifications } from '@/hooks/useNotifications'
import { useEmergency } from '@/hooks/useEmergency'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { toast } from 'sonner'

interface BatteryAlert {
  deviceId: string
  deviceName: string
  batteryLevel: number
  timestamp: string
}

/**
 * useBatteryAlert — monitors connected BLE device battery levels
 * and triggers visual/push notifications when battery drops below threshold.
 */
export function useBatteryAlert(threshold: number = 20) {
  const { connections, readBattery } = useBluetooth()
  const { isPushSubscribed } = useNotifications()
  const { logEvent } = useEmergency()
  const { queueEvent } = useOfflineQueue()
  const [alerts, setAlerts] = useState<BatteryAlert[]>([])
  const alertedDevicesRef = useRef<Set<string>>(new Set())

  // Check battery levels periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const [deviceId, conn] of connections.entries()) {
        if (!conn.connected || conn.batteryLevel === null) continue

        const battery = conn.batteryLevel

        // Check if below threshold and not already alerted
        if (battery <= threshold && !alertedDevicesRef.current.has(deviceId)) {
          alertedDevicesRef.current.add(deviceId)
          const alert: BatteryAlert = {
            deviceId,
            deviceName: conn.deviceName || 'Dispositivo BLE',
            batteryLevel: battery,
            timestamp: new Date().toISOString(),
          }
          setAlerts(prev => [alert, ...prev].slice(0, 20))

          // Show toast
          toast.warning(`Bateria baixa: ${conn.deviceName}`, {
            description: `${battery}% restante. Carregue o dispositivo.`,
            duration: 8000,
          })

          // Log event
          logEvent({
            type: 'alert',
            description: `Bateria baixa detectada: ${conn.deviceName} (${battery}%)`,
            deviceId,
          })

          // Try push notification
          if (isPushSubscribed && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('StatusAds Connect - Bateria Baixa', {
                body: `${conn.deviceName}: ${battery}% restante`,
                icon: '/pwa-192x192.png',
                tag: `battery-${deviceId}`,
              })
            } catch { /* notification blocked */ }
          }
        }

        // Reset alert flag if battery goes above threshold + 10%
        if (battery > threshold + 10) {
          alertedDevicesRef.current.delete(deviceId)
        }
      }
    }, 30_000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [connections, threshold, isPushSubscribed, logEvent, queueEvent])

  const dismissAlert = useCallback((deviceId: string) => {
    setAlerts(prev => prev.filter(a => a.deviceId !== deviceId))
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return { alerts, dismissAlert, clearAlerts }
}
