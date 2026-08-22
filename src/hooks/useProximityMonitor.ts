import { useEffect, useRef, useCallback, useState } from 'react'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import { toast } from 'sonner'

/**
 * useProximityMonitor
 * 
 * Core anti-kidnapping logic: monitors BLE device connections and triggers
 * alerts when a monitored device disconnects unexpectedly.
 * 
 * - Polls connection state every N seconds
 * - When a monitored device goes offline, checks grace period
 * - After grace period, logs disconnection event and optionally triggers emergency
 * - Updates device status in Supabase (online/offline)
 * 
 * @param checkIntervalMs — how often to check connections (default 15s)
 * @param gracePeriodMs   — how long before triggering alert (default 60s)
 */

interface DisconnectionAlert {
  deviceId: string
  deviceName: string
  disconnectedAt: string
  emergencyTriggered: boolean
}

export function useProximityMonitor(
  checkIntervalMs = 15_000,
  gracePeriodMs = 60_000
) {
  const { user } = useAuth()
  const { connections, disconnectDevice } = useBluetooth()
  const [alerts, setAlerts] = useState<DisconnectionAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const graceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const wasConnectedRef = useRef<Map<string, boolean>>(new Map())
  const devicesRef = useRef<any[]>([]) // Supabase devices

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

    // Find the matching Supabase device to update
    const device = devicesRef.current.find((d) =>
      d.mac_address.includes(deviceId.slice(-8)) || d.name === deviceName
    )

    console.warn(`[PROXIMITY] Device disconnected: ${deviceName} (${deviceId})`)

    // Update device status to offline in Supabase
    if (device) {
      try {
        await api.updateDevice(device.id, { status: 'offline' })
      } catch (err) {
        console.error('[PROXIMITY] Failed to update device status:', err)
      }
    }

    // Log the disconnection event
    try {
      await api.logEvent(
        user.id,
        'bluetooth',
        `Dispositivo desconectado: ${deviceName}`,
        device?.id,
        undefined,
        undefined
      )
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
            enableHighAccuracy: true,
            timeout: 10_000,
          })
        })

        const { latitude, longitude } = position.coords

        // Check if inside emergency zone
        let inEmergencyZone = false
        try {
          const profile = await api.getProfile(user.id)
          if (profile?.emergency_zone_lat && profile?.emergency_zone_lng && profile?.emergency_zone_radius) {
            const dist = haversineDistance(
              latitude, longitude,
              profile.emergency_zone_lat, profile.emergency_zone_lng
            )
            inEmergencyZone = dist <= profile.emergency_zone_radius
          }
        } catch {}

        // If inside emergency zone, trigger full emergency
        if (inEmergencyZone) {
          try {
            await api.triggerEmergency(user.id, latitude, longitude)
            toast.error('EMERGENCIA ACTIVADA — Dispositivo desconectado na zona de seguranca!', {
              duration: 10_000,
            })
            setAlerts((prev) => [
              ...prev,
              { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: true },
            ])
          } catch (err) {
            console.error('[PROXIMITY] Failed to trigger emergency:', err)
            toast.error('Alerta: Dispositivo desconectado. Nao foi possivel activar emergencia automatica.')
          }
        } else {
          // Outside zone — just log a warning
          toast.warning(`Dispositivo desconectado: ${deviceName}`, {
            description: 'Fora da zona de emergencia. Monitorize a situacao.',
            duration: 8_000,
          })
          setAlerts((prev) => [
            ...prev,
            { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false },
          ])
        }
      } catch {
        // GPS unavailable
        toast.warning(`Dispositivo desconectado: ${deviceName}`, {
          description: 'GPS indisponivel. Verifique manualmente.',
          duration: 8_000,
        })
        setAlerts((prev) => [
          ...prev,
          { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false },
        ])
      }
    } else {
      toast.warning(`Dispositivo desconectado: ${deviceName}`, {
        description: 'Activacao automatica desactivada nas definicoes.',
      })
      setAlerts((prev) => [
        ...prev,
        { deviceId, deviceName, disconnectedAt: new Date().toISOString(), emergencyTriggered: false },
      ])
    }
  }, [user?.id])

  // Main monitoring loop
  useEffect(() => {
    if (!user?.id || connections.size === 0) {
      setIsMonitoring(false)
      return
    }

    setIsMonitoring(true)

    const interval = setInterval(() => {
      connections.forEach((conn, deviceId) => {
        const wasConnected = wasConnectedRef.current.get(deviceId) ?? false
        const nowConnected = conn.connected

        // Transition: connected → disconnected
        if (wasConnected && !nowConnected) {
          // Start grace timer
          if (!graceTimersRef.current.has(deviceId)) {
            console.log(`[PROXIMITY] Device ${conn.deviceName} disconnected. Starting grace period (${gracePeriodMs / 1000}s)...`)
            const timer = setTimeout(() => {
              handleDisconnection(deviceId, conn.deviceName)
              graceTimersRef.current.delete(deviceId)
            }, gracePeriodMs)
            graceTimersRef.current.set(deviceId, timer)
          }
        }

        // Transition: disconnected → connected (reconnected within grace)
        if (!wasConnected && nowConnected) {
          // Cancel grace timer
          const timer = graceTimersRef.current.get(deviceId)
          if (timer) {
            clearTimeout(timer)
            graceTimersRef.current.delete(deviceId)
            console.log(`[PROXIMITY] Device ${conn.deviceName} reconnected. Grace period cancelled.`)
            toast.success(`${conn.deviceName} reconectado`)

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
      // Clear all grace timers
      graceTimersRef.current.forEach((timer) => clearTimeout(timer))
      graceTimersRef.current.clear()
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
  const R = 6_371_000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}