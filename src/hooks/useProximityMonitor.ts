import { useEffect, useRef, useCallback, useState } from 'react'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import * as api from '@/lib/api'
import { toast } from 'sonner'

/**
 * useProximityMonitor v2
 *
 * Core anti-kidnapping logic: monitors BLE device connections and triggers
 * alerts when a monitored device disconnects unexpectedly.
 *
 * v2 additions:
 * - Grace period countdown state (visible in UI)
 * - Offline queue integration (emergency queued if offline)
 * - Emergency alarm integration (auto-sound on trigger)
 * - Structured monitoring status per device
 */

export interface BLEDeviceStatus {
  deviceId: string
  deviceName: string
  connected: boolean
  inGracePeriod: boolean
  graceRemaining: number  // seconds remaining (0 when not in grace)
  disconnectedAt: string | null
}

export interface DisconnectionAlert {
  deviceId: string
  deviceName: string
  disconnectedAt: string
  emergencyTriggered: boolean
  handled: boolean
}

export function useProximityMonitor(
  checkIntervalMs = 15_000,
  gracePeriodMs = 60_000
) {
  const { user } = useAuth()
  const { connections } = useBluetooth()
  const { notify, notifyEmergency } = useNotifications()
  const { queueEmergency } = useOfflineQueue()

  const [alerts, setAlerts] = useState<DisconnectionAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [deviceStatuses, setDeviceStatuses] = useState<BLEDeviceStatus[]>([])

  const graceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const graceStartRef = useRef<Map<string, number>>(new Map())
  const wasConnectedRef = useRef<Map<string, boolean>>(new Map())
  const devicesRef = useRef<any[]>([])
  const graceCountdownRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // Fetch user's monitored devices from Supabase
  useEffect(() => {
    if (!user?.id) return
    api.getDevices(user.id).then((devs) => {
      devicesRef.current = devs.filter((d) => d.is_monitored)
    }).catch(() => {})
  }, [user?.id])

  /**
   * Handle a device disconnection after grace period.
   * This is the critical anti-kidnapping logic.
   */
  const handleDisconnection = useCallback(async (
    deviceId: string,
    deviceName: string
  ) => {
    if (!user?.id) return

    // Clear countdown
    const cdInterval = graceCountdownRef.current.get(deviceId)
    if (cdInterval) { clearInterval(cdInterval); graceCountdownRef.current.delete(deviceId) }
    setDeviceStatuses(prev => prev.map(d => d.deviceId === deviceId ? { ...d, inGracePeriod: false, graceRemaining: 0 } : d))

    // Find the matching Supabase device to update
    const device = devicesRef.current.find((d) =>
      d.mac_address.includes(deviceId.slice(-8)) || d.name === deviceName
    )

    console.warn(`[PROXIMITY] Device disconnected: ${deviceName} (${deviceId})`)

    // Update device status to offline in Supabase
    if (device) {
      try { await api.updateDevice(device.id, { status: 'offline' }) } catch (err) {
        console.error('[PROXIMITY] Failed to update device status:', err)
      }
    }

    // Log the disconnection event
    try {
      await api.logEvent(user.id, 'bluetooth', `Dispositivo desconectado: ${deviceName}`, device?.id, undefined, undefined)
    } catch (err) {
      console.error('[PROXIMITY] Failed to log disconnection:', err)
    }

    // Get user profile to check auto_activate_emergency
    let autoActivate = true
    try {
      const profile = await api.getProfile(user.id)
      autoActivate = profile?.auto_activate_emergency ?? true
    } catch {}

    if (autoActivate) {
      // Get current GPS position
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 10_000,
          })
        })

        const { latitude, longitude } = position.coords

        // Check if inside emergency zone
        let inEmergencyZone = false
        try {
          const profile = await api.getProfile(user.id)
          if (profile?.emergency_zone_lat && profile?.emergency_zone_lng && profile?.emergency_zone_radius) {
            const dist = haversineDistance(latitude, longitude, profile.emergency_zone_lat, profile.emergency_zone_lng)
            inEmergencyZone = dist <= profile.emergency_zone_radius
          }
        } catch {}

        if (inEmergencyZone) {
          try {
            await api.triggerEmergency(user.id, latitude, longitude)
            triggerLocalAlarm()
            toast.error('EMERGENCIA ACTIVADA — Dispositivo desconectado na zona de seguranca!', {
              duration: 10_000,
            })
            notifyEmergency(
              'EMERGENCIA — StatusAds',
              `${deviceName} desconectado na zona de seguranca! GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              { latitude, longitude, deviceId, deviceName }
            )
            setAlerts((prev) => [
              ...prev,
              { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: true, handled: false },
            ])
          } catch (err) {
            // Network error — queue for later
            console.error('[PROXIMITY] Failed to trigger emergency:', err)
            const isNetErr = err instanceof Error && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed'))
            if (isNetErr) {
              await queueEmergency(latitude, longitude)
              toast.error('EMERGENCIA (OFFLINE) — Dispositivo desconectado! Guardada localmente.', { duration: 10_000 })
            } else {
              toast.error('Alerta: Dispositivo desconectado. Nao foi possivel activar emergencia automatica.')
            }
            notify({
              title: 'Alerta StatusAds',
              body: `${deviceName} desconectado. Falha ao activar emergencia automatica.`,
              tag: 'proximity-alert',
              data: { latitude, longitude },
            })
            setAlerts((prev) => [
              ...prev,
              { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false, handled: false },
            ])
          }
        } else {
          toast.warning(`Dispositivo desconectado: ${deviceName}`, {
            description: 'Fora da zona de emergencia. Monitorize a situacao.',
            duration: 8_000,
          })
          notify({
            title: 'Dispositivo Desconectado',
            body: `${deviceName} fora da zona de emergencia. Verifique manualmente.`,
            tag: `ble-disconnect-${deviceId}`,
          })
          setAlerts((prev) => [
            ...prev,
            { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false, handled: false },
          ])
        }
      } catch {
        toast.warning(`Dispositivo desconectado: ${deviceName}`, {
          description: 'GPS indisponivel. Verifique manualmente.',
          duration: 8_000,
        })
        notify({
          title: 'BLE Desconectado',
          body: `${deviceName} desconectado. GPS indisponivel — verifique manualmente.`,
          tag: `ble-gps-fail-${deviceId}`,
        })
        setAlerts((prev) => [
          ...prev,
          { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false, handled: false },
        ])
      }
    } else {
      toast.warning(`Dispositivo desconectado: ${deviceName}`, {
        description: 'Activacao automatica desactivada nas definicoes.',
      })
      setAlerts((prev) => [
        ...prev,
        { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false, handled: false },
      ])
    }
  }, [user?.id, queueEmergency, notify, notifyEmergency])

  // Main monitoring loop
  useEffect(() => {
    if (!user?.id || connections.size === 0) {
      setIsMonitoring(false)
      setDeviceStatuses([])
      return
    }

    setIsMonitoring(true)

    // Initialize device statuses for all connections
    setDeviceStatuses(prev => {
      const existing = new Map(prev.map(d => [d.deviceId, d]))
      const updated: BLEDeviceStatus[] = []
      connections.forEach((conn, deviceId) => {
        const ex = existing.get(deviceId)
        updated.push({
          deviceId,
          deviceName: conn.deviceName || 'Dispositivo',
          connected: conn.connected,
          inGracePeriod: ex?.inGracePeriod ?? false,
          graceRemaining: ex?.graceRemaining ?? 0,
          disconnectedAt: ex?.disconnectedAt ?? null,
        })
      })
      return updated
    })

    const interval = setInterval(() => {
      connections.forEach((conn, deviceId) => {
        const wasConnected = wasConnectedRef.current.get(deviceId) ?? false
        const nowConnected = conn.connected

        // Transition: connected → disconnected
        if (wasConnected && !nowConnected) {
          if (!graceTimersRef.current.has(deviceId)) {

            const disconnectedAt = new Date().toISOString()
            const startTime = Date.now()
            graceStartRef.current.set(deviceId, startTime)

            // Update status: in grace period
            setDeviceStatuses(prev => prev.map(d => d.deviceId === deviceId
              ? { ...d, connected: false, inGracePeriod: true, graceRemaining: Math.ceil(gracePeriodMs / 1000), disconnectedAt }
              : d
            ))

            // Start countdown interval (update every second)
            const cd = setInterval(() => {
              const elapsed = Date.now() - startTime
              const remaining = Math.max(0, Math.ceil((gracePeriodMs - elapsed) / 1000))
              setDeviceStatuses(prev => prev.map(d => d.deviceId === deviceId ? { ...d, graceRemaining: remaining } : d))
            }, 1000)
            graceCountdownRef.current.set(deviceId, cd)

            // Start grace timer
            const timer = setTimeout(() => {
              handleDisconnection(deviceId, conn.deviceName)
              graceTimersRef.current.delete(deviceId)
              graceStartRef.current.delete(deviceId)
            }, gracePeriodMs)
            graceTimersRef.current.set(deviceId, timer)
          }
        }

        // Transition: disconnected → connected (reconnected within grace)
        if (!wasConnected && nowConnected) {
          const timer = graceTimersRef.current.get(deviceId)
          if (timer) {
            clearTimeout(timer)
            graceTimersRef.current.delete(deviceId)
            graceStartRef.current.delete(deviceId)
            toast.success(`${conn.deviceName} reconectado`)

            // Clear countdown
            const cd = graceCountdownRef.current.get(deviceId)
            if (cd) { clearInterval(cd); graceCountdownRef.current.delete(deviceId) }

            // Update status: reconnected
            setDeviceStatuses(prev => prev.map(d => d.deviceId === deviceId
              ? { ...d, connected: true, inGracePeriod: false, graceRemaining: 0, disconnectedAt: null }
              : d
            ))

            // Update device status back to online
            const device = devicesRef.current.find((d) =>
              d.mac_address.includes(deviceId.slice(-8)) || d.name === conn.deviceName
            )
            if (device) {
              api.updateDevice(device.id, { status: 'online' }).catch(() => {})
            }
          }
        }

        wasConnectedRef.current.set(deviceId, nowConnected)
      })
    }, checkIntervalMs)

    return () => {
      clearInterval(interval)
      graceTimersRef.current.forEach((timer) => clearTimeout(timer))
      graceTimersRef.current.clear()
      graceCountdownRef.current.forEach((cd) => clearInterval(cd))
      graceCountdownRef.current.clear()
      graceStartRef.current.clear()
    }
  }, [user?.id, connections, handleDisconnection, checkIntervalMs, gracePeriodMs])

  // Cleanup alerts older than 1 hour
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = Date.now() - 3_600_000
      setAlerts((prev) => prev.filter((a) => new Date(a.disconnectedAt).getTime() > oneHourAgo))
    }, 60_000)
    return () => clearInterval(cleanup)
  }, [])

  return {
    isMonitoring,
    alerts,
    deviceStatuses,
    dismissAlert: (deviceId: string) =>
      setAlerts((prev) => prev.filter((a) => a.deviceId !== deviceId)),
    clearAlerts: () => setAlerts([]),
  }
}

// ============================================
// Helpers
// ============================================

/** Haversine distance in meters between two lat/lng points */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Trigger the local emergency alarm (Web Audio siren) */
function triggerLocalAlarm() {
  try {
    // Dynamic import to avoid circular dependency
    import('@/lib/emergency-alarm').then(m => m.startEmergencyAlarm()).catch(() => {})
  } catch { /* alarm not available */ }
}
