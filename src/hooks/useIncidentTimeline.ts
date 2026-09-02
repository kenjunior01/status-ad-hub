/**
 * useIncidentTimeline — Reconstrução da linha do tempo de um incidente.
 * 
 * Compila todos os eventos (GPS, BLE, voz, fotos, áudio, alertas)
 * numa linha temporal unificada para análise pós-incidente.
 * Calcula estatísticas: duração, distância, velocidade média.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { IncidentTimeline, TimelineEvent } from '@/lib/types'

export function useIncidentTimeline(emergencyAlertId: string | null) {
  const { user } = useAuth()
  const [timeline, setTimeline] = useState<IncidentTimeline | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildTimeline = useCallback(async () => {
    if (!user || !emergencyAlertId) return
    setIsLoading(true)
    setError(null)

    try {
      // Fetch the emergency alert
      const { data: alert, error: alertErr } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('id', emergencyAlertId)
        .single()
      if (alertErr) throw alertErr

      // Fetch all events from 5 min before to now
      const alertTime = new Date(alert.created_at)
 const startTime = new Date(alertTime.getTime() - 5 * 60 * 1000).toISOString()

      const { data: events, error: eventsErr } = await supabase
        .from('location_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startTime)
        .order('created_at', { ascending: true })
      if (eventsErr) throw eventsErr

      // Fetch audio evidence
      const { data: audioEvidence } = await supabase
        .from('audio_evidence')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startTime)
        .order('created_at', { ascending: true })

      // Build timeline events
      const timelineEvents: TimelineEvent[] = []

      // Add emergency start
      timelineEvents.push({
        timestamp: alert.created_at,
        type: 'emergency_start',
        title: 'Emergência Activada',
        description: `Latitude: ${alert.latitude.toFixed(4)}, Longitude: ${alert.longitude.toFixed(4)}`,
        latitude: alert.latitude,
        longitude: alert.longitude,
        metadata: { contacts_notified: alert.contacts_notified },
      })

      // Add location events
      for (const evt of (events || [])) {
        const typeLabels: Record<string, { title: string; color: string }> = {
          location: { title: 'Localização GPS', color: '#D4AF37' },
          alert: { title: 'Alerta', color: '#F59E0B' },
          bluetooth: { title: 'Bluetooth', color: '#3B82F6' },
          geofence: { title: 'Geofence', color: '#8B5CF6' },
          voice_sos: { title: 'SOS por Voz', color: '#EF4444' },
          panic_mode: { title: 'Modo Pânico', color: '#EF4444' },
          threat_detected: { title: 'Ameaça Detectada', color: '#EF4444' },
          dead_mans_switch: { title: 'Dead Man\'s Switch', color: '#F97316' },
          glasses_sos: { title: 'SOS Óculos', color: '#EC4899' },
          audio_evidence: { title: 'Gravação Áudio', color: '#06B6D4' },
          photo_evidence: { title: 'Foto Evidência', color: '#14B8A6' },
          checkin: { title: 'Check-in', color: '#22C55E' },
          glasses_removal: { title: 'Remoção Óculos', color: '#F43F5E' },
        }
        const label = typeLabels[evt.type] || { title: evt.type, color: '#6B7280' }
        timelineEvents.push({
          timestamp: evt.created_at,
          type: evt.type,
          title: label.title,
          description: evt.description,
          latitude: evt.latitude,
          longitude: evt.longitude,
          metadata: evt.metadata || {},
        })
      }

      // Add audio evidence events
      for (const audio of (audioEvidence || [])) {
        timelineEvents.push({
          timestamp: audio.created_at,
          type: 'audio_evidence',
          title: `Gravação Áudio (${audio.duration_seconds}s)`,
          description: `${audio.mime_type}, ${(audio.file_size_bytes / 1024).toFixed(0)} KB`,
          latitude: null, longitude: null,
          metadata: { audio_id: audio.id, duration: audio.duration_seconds },
        })
      }

      // Add resolution if applicable
      if (alert.resolved_at) {
        timelineEvents.push({
          timestamp: alert.resolved_at,
          type: 'resolved',
          title: 'Emergência Resolvida',
          description: alert.resolve_reason || 'Sem motivo especificado',
          latitude: null, longitude: null,
          metadata: {},
        })
      }

      // Sort by timestamp
      timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Calculate reconstruction stats
      const startTimeMs = new Date(timelineEvents[0]?.timestamp || alert.created_at).getTime()
      const endTimeMs = new Date(timelineEvents[timelineEvents.length - 1]?.timestamp || alert.created_at).getTime()
      const totalDuration = (endTimeMs - startTimeMs) / 1000

      // Calculate max distance from start
      let maxDist = 0
      const startLat = alert.latitude
      const startLng = alert.longitude
      for (const evt of timelineEvents) {
        if (evt.latitude && evt.longitude) {
          const d = haversine(startLat, startLng, evt.latitude, evt.longitude)
          maxDist = Math.max(maxDist, d)
        }
      }

      // Count events by type
      const eventsByType: Record<string, number> = {}
      for (const evt of timelineEvents) {
        eventsByType[evt.type] = (eventsByType[evt.type] || 0) + 1
      }

      setTimeline({
        emergency_alert_id: emergencyAlertId,
        events: timelineEvents,
        reconstruction: {
          totalDuration,
          maxDistanceFromStart: maxDist * 1000, // meters
          avgSpeed: totalDuration > 0 ? (maxDist * 1000) / totalDuration : 0, // m/s
          eventsByType,
        },
      })
    } catch (e: any) {
      setError(e.message || 'Erro ao construir linha temporal')
    } finally {
      setIsLoading(false)
    }
  }, [user, emergencyAlertId])

  useEffect(() => { buildTimeline() }, [buildTimeline])

  return { timeline, isLoading, error, rebuild: buildTimeline }
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