import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

/**
 * useGeolocation
 *
 * Continuous GPS tracking hook using navigator.geolocation.watchPosition().
 * Provides real-time position updates, logs location to Supabase,
 * and exposes the current position for the map and geofence monitor.
 *
 * Features:
 * - watchPosition with high accuracy
 * - Automatic location logging to Supabase (throttled)
 * - Heading/speed from GPS when available
 * - Accuracy-based confidence indicator
 * - Pause/resume tracking
 */

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number       // meters
  altitude: number | null
  heading: number | null // degrees (0 = north)
  speed: number | null   // m/s
  timestamp: number
}

interface GeolocationState {
  position: GeoPosition | null
  error: string | null
  isTracking: boolean
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable'
  /** Number of position updates received since tracking started */
  updateCount: number
  /** Last time a location was logged to Supabase */
  lastLoggedAt: number | null
}

export function useGeolocation(
  /** How often to log location to Supabase (default 5 min) */
  logIntervalMs = 300_000,
  /** Enable automatic Supabase logging (default true when authenticated) */
  enableLogging = true
) {
  const { user } = useAuth()
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isTracking: false,
    permissionState: 'prompt',
    updateCount: 0,
    lastLoggedAt: null,
  })

  const watchIdRef = useRef<number | null>(null)
  const lastLogRef = useRef<number>(0)
  const positionRef = useRef<GeoPosition | null>(null)
  const [paused, setPaused] = useState(false)

  // Check permission state on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((s) => ({ ...s, permissionState: 'unavailable', error: 'Geolocalizacao nao suportada neste navegador' }))
      return
    }
    // Try to query permission state (only works in Chromium)
    try {
      (navigator.permissions as any).query({ name: 'geolocation' }).then((result: any) => {
        if (result.state === 'granted') setState((s) => ({ ...s, permissionState: 'granted' }))
        else if (result.state === 'denied') setState((s) => ({ ...s, permissionState: 'denied' }))
        else setState((s) => ({ ...s, permissionState: 'prompt' }))
      }).catch(() => {})
    } catch {
      // permissions API not available
    }
  }, [])

  const logPosition = useCallback(async (pos: GeoPosition) => {
    if (!enableLogging || !user?.id) return
    const now = Date.now()
    if (now - lastLogRef.current < logIntervalMs) return
    lastLogRef.current = now

    try {
      await api.logEvent(
        user.id,
        'location',
        `Localizacao GPS: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} (precisao: ${Math.round(pos.accuracy)}m)`,
        undefined,
        pos.latitude,
        pos.longitude
      )
      setState((s) => ({ ...s, lastLoggedAt: now }))
    } catch (err) {
      console.error('[GEO] Failed to log position:', err)
    }
  }, [user?.id, enableLogging, logIntervalMs])

  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return // already watching

    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalizacao nao suportada' }))
      return
    }

    setState((s) => ({ ...s, isTracking: true, error: null }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const geoPos: GeoPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        }
        positionRef.current = geoPos
        setState((s) => ({
          ...s,
          position: geoPos,
          error: null,
          permissionState: 'granted',
          updateCount: s.updateCount + 1,
        }))
        // Log periodically
        logPosition(geoPos)
      },
      (err) => {
        let errorMessage = 'Erro de geolocalizacao'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permissao de localizacao negada'
            setState((s) => ({ ...s, permissionState: 'denied' }))
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Localizacao indisponivel'
            break
          case err.TIMEOUT:
            errorMessage = 'Tempo de espera excedido'
            break
        }
        setState((s) => ({ ...s, error: errorMessage }))
        console.error('[GEO]', errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      }
    )
  }, [logPosition])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setState((s) => ({ ...s, isTracking: false }))
  }, [])

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  // Auto-start tracking when user is authenticated
  useEffect(() => {
    if (user?.id && !paused) {
      startTracking()
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [user?.id, paused, startTracking])

  /** Get a single position reading (for one-shot use) */
  const getCurrentPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalizacao nao suportada'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        }),
        reject,
        { enableHighAccuracy: true, timeout: 10_000 }
      )
    })
  }, [])

  /** Request geolocation permission (prompts the user) */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const pos = await getCurrentPosition()
      return !!pos
    } catch {
      return false
    }
  }, [getCurrentPosition])

  return {
    ...state,
    paused,
    startTracking,
    stopTracking,
    togglePause,
    getCurrentPosition,
    requestPermission,
  }
}