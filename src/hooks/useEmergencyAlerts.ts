import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import * as api from '@/lib/api'
import { toast } from 'sonner'
import type { EmergencyAlert, EmergencyHistoryItem } from '@/lib/types'

/**
 * useEmergencyAlerts
 *
 * Manages active emergency state, resolution, and history.
 * Subscribes to realtime alerts so the UI updates immediately.
 */

export function useEmergencyAlerts() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()
  const { position } = useGeolocation()
  const { notifyEmergency, notify } = useNotifications()

  // Active emergency query
  const { data: activeEmergency, isLoading, refetch: refetchActive } = useQuery({
    queryKey: ['active-emergency', userId],
    queryFn: () => api.getActiveEmergency(userId!),
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  // Emergency history
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['emergency-history', userId],
    queryFn: () => api.getEmergencyHistory(userId!, 30),
    enabled: !!userId,
    staleTime: 30_000,
  })

  // Realtime subscription for new alerts
  useEffect(() => {
    if (!userId) return

    const channel = api.subscribeToAlerts(userId, (payload) => {
      if (payload.eventType === 'INSERT') {
        toast.error('EMERGENCIA ACTIVADA', {
          description: 'Uma emergencia foi detectada. Verifique o painel de emergencia.',
          duration: 15_000,
        })
        notifyEmergency(
          'EMERGENCIA — StatusAds',
          'Emergencia activada! Abra a app para ver detalhes e resolver.',
          { alertId: payload.new.id }
        )
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new.status === 'resolved') {
          toast.success('Emergencia resolvida', { duration: 8_000 })
          notify({
            title: 'Emergencia Resolvida',
            body: 'A emergencia foi marcada como resolvida.',
            tag: 'emergency-resolved',
          })
        } else if (payload.new.status === 'false_alarm') {
          toast.info('Falso alarme registado', { duration: 5_000 })
        }
      }
      // Refresh both queries
      refetchActive()
      refetchHistory()
    })

    return () => {
      supabaseChannelCleanup(channel)
    }
  }, [userId])

  // Resolve emergency mutation
  const resolveEmergency = useCallback(async (alertId: string, reason?: string) => {
    try {
      await api.resolveEmergency(alertId, reason)
      toast.success('Emergencia resolvida com sucesso')
      refetchActive()
      refetchHistory()
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch {
      toast.error('Erro ao resolver emergencia')
    }
  }, [userId, refetchActive, refetchHistory, queryClient])

  // Mark false alarm mutation
  const markFalseAlarm = useCallback(async (alertId: string) => {
    try {
      await api.markFalseAlarm(alertId)
      toast.info('Emergencia marcada como falso alarme')
      refetchActive()
      refetchHistory()
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch {
      toast.error('Erro ao registar falso alarme')
    }
  }, [userId, refetchActive, refetchHistory, queryClient])

  return {
    activeEmergency: activeEmergency as EmergencyAlert | null,
    isLoading,
    history: history as EmergencyHistoryItem[],
    resolveEmergency,
    markFalseAlarm,
    refetchActive,
  }
}

// ============================================
// Helpers
// ============================================

/** Clean up a Supabase realtime channel */
function supabaseChannelCleanup(channel: ReturnType<typeof api.subscribeToAlerts>) {
  if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
    ;(channel as any).unsubscribe()
  }
}
