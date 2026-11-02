/** Analisa alertas comunit?rios pr?ximos da linha directa entre dois pontos. */

import { useState, useCallback } from 'react'
import { useCommunityRadar } from './useCommunityRadar'
import { useGeolocation } from './useGeolocation'

export interface SafeRoutePoint {
  lat: number
  lng: number
  name?: string
  dangerLevel: 'unmarked' | 'caution' | 'danger'
  reason?: string
}

export interface SafeRouteResult {
  waypoints: SafeRoutePoint[]
  totalDistanceKm: number
  estimatedMinutes: number
  dangerZonesDetected: number
  warnings: string[]
}

export function useSafeRoute() {
  const { position } = useGeolocation()
  const { allAlerts } = useCommunityRadar()
  const [result, setResult] = useState<SafeRouteResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateSafeRoute = useCallback(async (destLat: number, destLng: number) => {
    if (!position) {
      return { error: 'Localiza??o actual indispon?vel' }
    }

    setIsCalculating(true)

    try {
      const originLat = position.latitude
      const originLng = position.longitude
      const steps = 20
      const warnings: string[] = []
      const dangerZonesDetected = new Set<string>()

      const waypoints: SafeRoutePoint[] = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps
        return {
          lat: originLat + (destLat - originLat) * t,
          lng: originLng + (destLng - originLng) * t,
          dangerLevel: 'unmarked' as const,
        }
      })

      for (const alert of allAlerts) {
        if (alert.type === 'safe_route_tip') continue

        const radiusMeters = Number.isFinite(alert.radius_meters)
          ? Math.max(0, alert.radius_meters)
          : 0
        const { distanceMeters, fraction } = distanceToSegmentMeters(
          alert.latitude,
          alert.longitude,
          originLat,
          originLng,
          destLat,
          destLng,
        )
        if (distanceMeters > radiusMeters * 2) continue

        const waypointIndex = Math.round(fraction * steps)
        const waypoint = waypoints[waypointIndex]
        if (distanceMeters <= radiusMeters) {
          dangerZonesDetected.add(alert.id)
          waypoint.dangerLevel = 'danger'
          waypoint.reason = alert.title
        } else if (waypoint.dangerLevel === 'unmarked') {
          waypoint.dangerLevel = 'caution'
          waypoint.reason = `Perto de: ${alert.title}`
        }
      }

      if (dangerZonesDetected.size > 0) {
        warnings.push(
          `${dangerZonesDetected.size} alerta(s) comunit?rio(s) intersectam a linha directa. Esta an?lise n?o calcula desvios.`
        )
      }

      const totalDistance = haversine(originLat, originLng, destLat, destLng)
      const estimatedMinutes = Math.round((totalDistance / 5) * 60)

      const routeResult: SafeRouteResult = {
        waypoints,
        totalDistanceKm: totalDistance,
        estimatedMinutes,
        dangerZonesDetected: dangerZonesDetected.size,
        warnings,
      }

      setResult(routeResult)
      return routeResult
    } catch (error) {
      console.error('[SafeRoute] Falha ao analisar alertas comunit?rios', error)
      return { error: 'N?o foi poss?vel analisar o percurso.' }
    } finally {
      setIsCalculating(false)
    }
  }, [position, allAlerts])

  return {
    result,
    isCalculating,
    calculateSafeRoute,
    clearRoute: () => setResult(null),
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceToSegmentMeters(
  pointLat: number,
  pointLng: number,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): { distanceMeters: number; fraction: number } {
  const averageLatitude = ((pointLat + startLat + endLat) / 3) * Math.PI / 180
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(averageLatitude)
  const endX = (endLng - startLng) * metersPerDegreeLng
  const endY = (endLat - startLat) * metersPerDegreeLat
  const pointX = (pointLng - startLng) * metersPerDegreeLng
  const pointY = (pointLat - startLat) * metersPerDegreeLat
  const segmentLengthSquared = endX ** 2 + endY ** 2
  const fraction = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (pointX * endX + pointY * endY) / segmentLengthSquared))
  const distanceX = pointX - endX * fraction
  const distanceY = pointY - endY * fraction

  return {
    distanceMeters: Math.hypot(distanceX, distanceY),
    fraction,
  }
}