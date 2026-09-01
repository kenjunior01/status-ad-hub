import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import * as api from '@/lib/api'

/**
 * useBackgroundTracking
 *
 * Intensified GPS recording during active emergencies.
 * Normal mode: logs every 5 minutes (handled by useGeolocation).
 * Emergency mode: logs every 15 seconds for real-time tracking.
 *
 * Features:
 * - Detects active emergency via useEmergencyAlerts
 * - Switches to high-frequency GPS logging during emergency
 * - Offline buffer: stores positions locally when offline, syncs when back online
 * - Automatically stops high-frequency tracking when emergency resolves
 * - Battery-aware: reduces frequency if battery is low
 */

interface TrackedPoint {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  synced: boolean
}

interface BackgroundTrackingState {
  /** Whether high-frequency emergency tracking is active */
  isEmergencyTracking: boolean
  /** Total points recorded during current emergency session */
  sessionPoints: number
  /** Points buffered offline (not yet synced) */
  offlineBuffer: number
  /** Last recorded position during emergency */
  lastPosition: { lat: number; lng: number; accuracy: number; time: string } | null
  /** Battery-aware mode active */
  batterySaver: boolean
}

const NORMAL_INTERVAL_MS = 300_000 // 5 min (handled by useGeolocation, this is fallback)
const EMERGENCY_INTERVAL_MS = 15_000 // 15 seconds
const LOW_BATTERY_THRESHOLD = 20 // percent
const BATTERY_CHECK_INTERVAL = 60_000 // 1 minute
const MAX_BUFFER_SIZE = 500 // max offline points before dropping oldest
const BUFFER_KEY = 'statusads_offline_buffer'

export function useBackgroundTracking() {
  const { user } = useAuth()
  const { activeEmergency } = useEmergencyAlerts()
  const userId = user?.id

  const [state, setState] = useState<BackgroundTrackingState>({
    isEmergencyTracking: false,
    sessionPoints: 0,
    offlineBuffer: 0,
    lastPosition: null,
    batterySaver: false,
  })

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batteryCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferRef = useRef<TrackedPoint[]>([])
  const isOnlineRef = useRef(navigator.onLine)
  const lastLogRef = useRef<number>(0)

  // Load offline buffer from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUFFER_KEY)
      if (stored) {
        bufferRef.current = JSON.parse(stored)
        setState(s => ({ ...s, offlineBuffer: bufferRef.current.filter(p => !p.synced).length }))
      }
    } catch {}
  }, [])

  // Save buffer to localStorage
  const saveBuffer = useCallback(() => {
    try {
      // Keep buffer size bounded
      if (bufferRef.current.length > MAX_BUFFER_SIZE) {
        bufferRef.current = bufferRef.current.slice(-MAX_BUFFER_SIZE)
      }
      localStorage.setItem(BUFFER_KEY, JSON.stringify(bufferRef.current))
    } catch {}
  }, [])

  // Sync offline buffer to Supabase
  const syncBuffer = useCallback(async () => {
    const unsynced = bufferRef.current.filter(p => !p.synced)
    if (unsynced.length === 0 || !userId) return

    setState(s => ({ ...s, offlineBuffer: 0 }))

    for (const point of unsynced) {
      try {
        await api.logEvent(
          userId,
          'location',
          `Localizacao (sync offline): ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} (precisao: ${Math.round(point.accuracy)}m)`,
          undefined,
          point.lat,
          point.lng
        )
        point.synced = true
      } catch {
        break // Stop on first error, will retry later
      }
    }

    // Clean up fully synced buffer
    bufferRef.current = bufferRef.current.filter(p => !p.synced)
    saveBuffer()
    setState(s => ({ ...s, offlineBuffer: bufferRef.current.length }))
  }, [userId, saveBuffer])

  // Log a position point
  const logPoint = useCallback(async (lat: number, lng: number, accuracy: number) => {
    if (!userId) return

    const point: TrackedPoint = {
      lat, lng, accuracy,
      timestamp: Date.now(),
      synced: isOnlineRef.current,
    }

    bufferRef.current.push(point)

    if (isOnlineRef.current) {
      // Try to log directly
      try {
        await api.logEvent(
          userId,
          'location',
          `Localizacao GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (precisao: ${Math.round(accuracy)}m)`,
          undefined,
          lat,
          lng
        )
        point.synced = true
        setState(s => ({
          ...s,
          sessionPoints: s.sessionPoints + 1,
          lastPosition: { lat, lng, accuracy, time: new Date().toISOString() },
        }))
      } catch {
        // Will be synced later
        setState(s => ({ ...s, offlineBuffer: s.offlineBuffer + 1 }))
      }
    } else {
      setState(s => ({ ...s, offlineBuffer: s.offlineBuffer + 1 }))
    }

    saveBuffer()
  }, [userId, saveBuffer])

  // Check battery level
  const checkBattery = useCallback(async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        const isLow = battery.level * 100 < LOW_BATTERY_THRESHOLD
        setState(s => ({ ...s, batterySaver: isLow }))
        return isLow
      }
    } catch {}
    return false
  }, [])

  // Start high-frequency tracking during emergency
  const startEmergencyTracking = useCallback(() => {
    if (watchIdRef.current !== null) return

    const isLowBattery = checkBattery()
    // In battery saver mode, use 30s interval instead of 15s
    const interval = isLowBattery ? 30_000 : EMERGENCY_INTERVAL_MS

    setState(s => ({ ...s, isEmergencyTracking: true }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastLogRef.current < interval) return
        lastLogRef.current = now
        logPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
      },
      (err) => console.warn('[BG-TRACK] GPS error during emergency:', err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 2_000 }
    )

    // Battery monitoring
    batteryCheckRef.current = setInterval(() => {
      checkBattery().then(isLow => {
        if (isLow) {
        }
      })
    }, BATTERY_CHECK_INTERVAL)
  }, [logPoint, checkBattery])

  // Stop high-frequency tracking
  const stopEmergencyTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (batteryCheckRef.current !== null) {
      clearInterval(batteryCheckRef.current)
      batteryCheckRef.current = null
    }
    setState(s => ({ ...s, isEmergencyTracking: false }))
  }, [])

  // React to emergency state changes
  useEffect(() => {
    if (activeEmergency?.status === 'active') {
      startEmergencyTracking()
    } else {
      stopEmergencyTracking()
    }
    return () => stopEmergencyTracking()
  }, [activeEmergency?.status, startEmergencyTracking, stopEmergencyTracking])

  // Online/offline event handlers
  useEffect(() => {
    const goOnline = () => {
      isOnlineRef.current = true
      syncBuffer()
    }
    const goOffline = () => {
      isOnlineRef.current = false
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [syncBuffer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEmergencyTracking()
      saveBuffer()
    }
  }, [stopEmergencyTracking, saveBuffer])

  return {
    ...state,
    syncBuffer,
    clearBuffer: () => {
      bufferRef.current = []
      localStorage.removeItem(BUFFER_KEY)
      setState(s => ({ ...s, offlineBuffer: 0 }))
    },
  }
}
