import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useEmergencyAlarm } from '@/hooks/useEmergencyAlarm'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { showEmergencyOfflineWarning } from '@/hooks/useNetworkStatus'
import * as api from '@/lib/api'
import { sendEmergencyPush } from '@/lib/web-push'
import { supabase } from '@/lib/supabase'
import { isSilentPanic } from '@/lib/guardian'
import { toast } from 'sonner'

/**
 * Notify emergency contacts via the notify-contacts edge function.
 * Sends SMS to all contacts and Web Push to the user's other devices.
 * Called after trigger_emergency RPC succeeds.
 */
async function notifyContactsViaEdgeFunction(
  userId: string,
  alertId: string,
  latitude: number,
  longitude: number,
  contactPhones: string[]
): Promise<{ sent: number; failed: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-contacts', {
      body: {
        userId,
        alertId,
        latitude,
        longitude,
        contactPhones,
      },
    })

    if (error) {
      console.warn('[EMERGENCY] notify-contacts edge function error:', error)
      return { sent: 0, failed: contactPhones.length }
    }

    return (data as any) || { sent: 0, failed: 0 }
  } catch {
    // Edge function not deployed yet — DB trigger may handle it
    console.warn('[EMERGENCY] notify-contacts not available, relying on DB trigger')
    return { sent: 0, failed: 0 }
  }
}

export function useEmergency() {
  const { user } = useAuth()
  const userId = user?.id
  const { notifyEmergency } = useNotifications()
  const { triggerAlarm, silenceAlarm, isSounding } = useEmergencyAlarm({
    duration: 20_000,
    volume: 0.7,
    vibrate: true,
  })
  const { queueEmergency, pendingCount: offlinePending, isSyncing: offlineSyncing } = useOfflineQueue()
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3

  const triggerMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      api.triggerEmergency(userId!, latitude, longitude),
    onSuccess: async (result, vars) => {
      const { alertId, contactsNotified } = result

      // 1. Sound the emergency alarm (siren + vibration) — EXCEPTO em pânico silencioso
      //    (Guardião em modo roubo: nada de sirene que entregue a vítima)
      if (!isSilentPanic()) triggerAlarm()

      // 2. Show success toast
      toast.success(`Emergencia activada! ${contactsNotified.length} contacto(s) serao notificados via SMS.`, {
        duration: 8_000,
        action: {
          label: isSounding ? 'Silenciar' : 'Ver',
          onClick: () => {
            if (isSounding) silenceAlarm()
          },
        },
      })

      // 3. Send SMS to emergency contacts via edge function
      if (userId && contactsNotified.length > 0) {
        notifyContactsViaEdgeFunction(userId, alertId, vars.latitude, vars.longitude, contactsNotified).then(
          (smsResult) => {
            if (smsResult.sent > 0) {
              toast.success(`SMS enviado para ${smsResult.sent} contacto(s)`, { duration: 5_000 })
            }
          }
        ).catch(() => {
          // SMS failure is logged but not shown to user during emergency
        })
      }

      // 4. Send Web Push to user's own other devices
      if (userId) {
        sendEmergencyPush(userId, alertId, vars.latitude, vars.longitude).catch(() => {
          // Push failure is non-critical
        })
      }

      // 5. Local notification (foreground)
      notifyEmergency(
        'EMERGENCIA — StatusAds Connect',
        `Emergencia activada! GPS: ${vars.latitude.toFixed(4)}, ${vars.longitude.toFixed(4)}`,
        { alertId, latitude: vars.latitude, longitude: vars.longitude }
      )
    },
    onError: async (error, vars) => {
      // Security enhancement: auto-retry with exponential backoff
      retryCountRef.current++
      const isNetworkError = error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'))
      const isSupabaseUnavailable = error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('net::ERR_')
      )

      // Always sound alarm for immediate user feedback regardless of error type
      if (!isSilentPanic()) triggerAlarm()

      if (retryCountRef.current < MAX_RETRIES && (isNetworkError || isSupabaseUnavailable)) {
        // Auto-retry with exponential backoff (2s, 4s, 8s)
        const delay = Math.pow(2, retryCountRef.current) * 1000
        toast.warning(`Tentativa ${retryCountRef.current}/${MAX_RETRIES} em ${delay / 1000}s...`, { duration: delay - 500 })
        setTimeout(() => {
          triggerMutation.mutate(vars)
        }, delay)
        return
      }

      if ((isNetworkError || isSupabaseUnavailable) && userId) {
        // All retries exhausted — queue for offline sync
        await queueEmergency(vars.latitude, vars.longitude)
        showEmergencyOfflineWarning()

        // Local notification with enriched metadata
        notifyEmergency(
          'EMERGENCIA (OFFLINE) — StatusAds Connect',
          `Sem conexao apos ${MAX_RETRIES} tentativas. Emergencia guardada localmente. GPS: ${vars.latitude.toFixed(4)}, ${vars.longitude.toFixed(4)}`,
          { latitude: vars.latitude, longitude: vars.longitude, queued: true, retries: MAX_RETRIES, timestamp: new Date().toISOString() }
        )
      } else {
        toast.error('Erro ao activar emergencia. Tente novamente.')
      }

      // Reset retry counter after final attempt
      retryCountRef.current = 0
    },
    onSettled: () => {
      // Reset retry counter on success too
      retryCountRef.current = 0
    },
  })

  const logMutation = useMutation({
    mutationFn: (params: {
      type: 'location' | 'alert' | 'shield' | 'bluetooth' | 'emergency' | 'geofence' | 'checkin'
      description: string
      deviceId?: string
      latitude?: number
      longitude?: number
    }) => api.logEvent(userId!, params.type, params.description, params.deviceId, params.latitude, params.longitude),
  })

  return {
    triggerEmergency: triggerMutation.mutate,
    isTriggering: triggerMutation.isPending,
    logEvent: logMutation.mutate,
    triggerAlarm,
    silenceAlarm,
    isSounding,
    offlinePending,
    offlineSyncing,
  }
}
