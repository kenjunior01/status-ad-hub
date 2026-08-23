import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation, type GeoPosition } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import * as api from '@/lib/api'
import { toast } from 'sonner'

/**
 * useGeofenceMonitor
 *
 * Monitors the user's GPS position against their configured emergency zone.
 * When the user leaves the zone, it can trigger an emergency alert.
 *
 * Zone is a circle defined by (lat, lng, radius) stored in the user's profile.
 * Uses haversine distance calculation for accuracy.
 *
 * States: 'inside' | 'outside' | 'unknown' (no GPS yet)
 */

type ZoneState = 'inside' | 'outside' | 'unknown'

export interface GeofenceAlert {
  id: string
  type: 'exited' | 'entered'
  timestamp: string
  distance: number  // meters from zone center
  zoneRadius: number
  emergencyTriggered: boolean
}

export interface GeofenceZone {
  lat: number
  lng: number
  radius: number  // meters
}

export function useGeofenceMonitor() {
  const { user } = useAuth()
  const { position } = useGeolocation()
  const { notify, notifyEmergency } = useNotifications()
  const [zone, setZone] = useState<GeofenceZone | null>(null)
  const [zoneState, setZoneState] = useState<ZoneState>('unknown')
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)

  const previousStateRef = useRef<ZoneState>('unknown')
  const profileRef = useRef<any>(null)
  const cooldownRef = useRef(false)

  // Fetch user profile to get emergency zone settings
  useEffect(() => {
    if (!user?.id) return
    api.getProfile(user.id).then((profile) => {
      profileRef.current = profile
      if (profile?.emergency_zone_lat && profile?.emergency_zone_lng) {
        setZone({
          lat: profile.emergency_zone_lat,
          lng: profile.emergency_zone_lng,
          radius: profile.emergency_zone_radius || 500,
        })
        setIsMonitoring(true)
      }
    }).catch(() => {})
  }, [user?.id])

  /** Update the emergency zone (called from Settings) */
  const updateZone = useCallback(async (newZone: GeofenceZone) => {
    if (!user?.id) return
    setZone(newZone)
    try {
      await api.updateProfile(user.id, {
        emergency_zone_lat: newZone.lat,
        emergency_zone_lng: newZone.lng,
        emergency_zone_radius: newZone.radius,
      })
      setIsMonitoring(true)
      toast.success('Zona de emergencia actualizada')
    } catch {
      toast.error('Erro ao actualizar zona de emergencia')
    }
  }, [user?.id])

  /** Set zone from current GPS position */
  const setZoneFromCurrentPosition = useCallback(async (radius = 500) => {
    if (!position) {
      toast.error('Localizacao GPS indisponivel. Aguarde...')
      return
    }
    await updateZone({
      lat: position.latitude,
      lng: position.longitude,
      radius,
    })
  }, [position, updateZone])

  // Core geofence check — runs every time position updates
  useEffect(() => {
    if (!zone || !position) {
      setZoneState('unknown')
      setDistance(null)
      return
    }

    const dist = haversineDistance(
      position.latitude, position.longitude,
      zone.lat, zone.lng
    )
    setDistance(dist)

    const isInside = dist <= zone.radius
    const newState: ZoneState = isInside ? 'inside' : 'outside'
    const prevState = previousStateRef.current

    // State transition detected
    if (prevState !== 'unknown' && prevState !== newState) {
      handleTransition(prevState, newState, dist, zone.radius)
    }

    setZoneState(newState)
    previousStateRef.current = newState
  }, [position, zone])

  /** Handle zone enter/exit transitions */
  const handleTransition = useCallback(async (
    from: ZoneState,
    to: ZoneState,
    dist: number,
    zoneRadius: number
  ) => {
    if (!user?.id || !position) return

    // Cooldown: prevent rapid-fire alerts (e.g. GPS jitter at zone edge)
    if (cooldownRef.current) return
    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, 30_000) // 30s cooldown

    const profile = profileRef.current
    const autoActivate = profile?.auto_activate_emergency ?? true

    if (to === 'outside') {
      // ---- EXITED ZONE ----
      console.warn(`[GEOFENCE] Exited emergency zone! Distance: ${Math.round(dist)}m (zone: ${zoneRadius}m)`)

      // Log the exit event
      try {
        await api.logEvent(
          user.id,
          'geofence',
          `Saiu da zona de emergencia (${Math.round(dist)}m do centro)`,
          undefined,
          position.latitude,
          position.longitude
        )
      } catch {}

      let emergencyTriggered = false

      if (autoActivate) {
        try {
          await api.triggerEmergency(user.id, position.latitude, position.longitude)
          emergencyTriggered = true
          toast.error('EMERGENCIA — Saiu da zona de seguranca!', {
            description: `A ${Math.round(dist)}m do centro. Contactos serao notificados.`,
            duration: 12_000,
          })
          notifyEmergency(
            'EMERGENCIA — Zona de Seguranca',
            `Saiu da zona de seguranca! A ${Math.round(dist)}m do centro. Contactos notificados.`,
            { latitude: position.latitude, longitude: position.longitude, distance: dist }
          )
        } catch {
          toast.error('Alerta: Saiu da zona de seguranca', {
            description: 'Nao foi possivel activar emergencia automatica.',
            duration: 10_000,
          })
          notify({
            title: 'Saiu da Zona de Seguranca',
            body: `A ${Math.round(dist)}m do centro. Falha ao activar emergencia automatica.`,
            tag: 'geofence-exit-fail',
            data: { latitude: position.latitude, longitude: position.longitude },
          })
        }
      } else {
        toast.warning('Saiu da zona de seguranca', {
          description: 'Activacao automatica desactivada nas definicoes.',
          duration: 8_000,
        })
        notify({
          title: 'Saiu da Zona de Seguranca',
          body: 'Activacao automatica desactivada. Verifique manualmente.',
          tag: 'geofence-exit-manual',
        })
      }

      setAlerts((prev) => [{
        id: `exit-${Date.now()}`,
        type: 'exited',
        timestamp: new Date().toISOString(),
        distance: dist,
        zoneRadius,
        emergencyTriggered,
      }, ...prev])

    } else if (to === 'inside') {
      // ---- ENTERED ZONE ----
      console.log(`[GEOFENCE] Entered emergency zone. Distance: ${Math.round(dist)}m`)

      try {
        await api.logEvent(
          user.id,
          'geofence',
          `Entrou na zona de emergencia (${Math.round(dist)}m do centro)`,
          undefined,
          position.latitude,
          position.longitude
        )
      } catch {}

      toast.success('Entrou na zona de seguranca', { duration: 5_000 })
      notify({
        title: 'Zona de Seguranca',
        body: `Entrou na zona de seguranca (a ${Math.round(dist)}m do centro)`,
        tag: 'geofence-enter',
      })

      setAlerts((prev) => [{
        id: `enter-${Date.now()}`,
        type: 'entered',
        timestamp: new Date().toISOString(),
        distance: dist,
        zoneRadius,
        emergencyTriggered: false,
      }, ...prev])
    }
  }, [user?.id, position])

  return {
    zone,
    zoneState,
    distance,
    isMonitoring,
    alerts,
    updateZone,
    setZoneFromCurrentPosition,
    dismissAlert: (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
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
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
