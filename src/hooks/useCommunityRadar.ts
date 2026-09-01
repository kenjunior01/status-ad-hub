/**
 * useCommunityRadar — Radar de Segurança Comunitária.
 * 
 * Alertas anónimos de segurança de outros utilizadores na área.
 * Zonas de perigo mapeadas, actividades suspeitas, incidentes verificados.
 * Todos os alertas são anónimos — nunca mostra identidade real.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { CommunityAlert } from '@/lib/types'

const DEFAULT_RADIUS_KM = 5

export function useCommunityRadar() {
  const { user } = useAuth()
  const { position } = useGeolocation()
  const [alerts, setAlerts] = useState<CommunityAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [filter, setFilter] = useState<CommunityAlert['type'] | 'all'>('all')

  // Fetch alerts near current location
  const fetchAlerts = useCallback(async () => {
    if (!position || !user) return
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('community_alerts')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Client-side geofilter (PostGIS would be better but this works without migration)
      const filtered = (data || []).filter((alert: CommunityAlert) => {
        const lat = position.latitude
        const lng = position.longitude
        const d = haversine(lat, lng, alert.latitude, alert.longitude) * 1000 // meters
        return d <= radiusKm * 1000 + alert.radius_meters
      })

      setAlerts(filtered as CommunityAlert[])
    } catch (e) {
      console.warn('[CommunityRadar] Failed to fetch alerts')
    } finally {
      setIsLoading(false)
    }
  }, [position, user, radiusKm])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  // Subscribe to new alerts in realtime
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('community-alerts')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_alerts' },
        (payload) => {
          const newAlert = payload.new as CommunityAlert
          // Check if near user
          if (position) {
            const d = haversine(position.latitude, position.longitude, newAlert.latitude, newAlert.longitude) * 1000
            if (d <= radiusKm * 1000 + newAlert.radius_meters) {
              setAlerts(prev => [newAlert, ...prev])
              // Toast for nearby alerts
              if (newAlert.is_verified || newAlert.type === 'verified_incident') {
                toast.error('Alerta de segurança próximo!', {
                  description: newAlert.title,
                  duration: 8000,
                })
              } else {
                toast.warning('Nova actividade reportada na área', {
                  description: newAlert.title,
                  duration: 5000,
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, position, radiusKm])

  // Post a new community alert (anonymous)
  const postAlert = useCallback(async (input: {
    type: CommunityAlert['type']
    title: string
    description: string
    latitude: number
    longitude: number
    radiusMeters?: number
  }) => {
    if (!user) return

    const alert: Partial<CommunityAlert> = {
      user_id: user.id,
      anonymous_id: 'user_' + crypto.randomUUID().slice(0, 8),
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters || 500,
      title: input.title,
      description: input.description,
      is_verified: false,
      report_count: 1,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    }

    try {
      const { error } = await supabase.from('community_alerts').insert(alert)
      if (error) throw error
      toast.success('Alerta comunitário enviado (anónimo)')
    } catch {
      toast.error('Erro ao enviar alerta')
    }
  }, [user])

  // Filtered alerts
  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(a => a.type === filter)

  // Danger zone count near user
  const dangerZoneCount = alerts.filter(a => a.type === 'danger_zone' || a.type === 'verified_incident').length

  return {
    alerts: filteredAlerts,
    allAlerts: alerts,
    isLoading,
    radiusKm,
    setRadiusKm,
    filter,
    setFilter,
    fetchAlerts,
    postAlert,
    dangerZoneCount,
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