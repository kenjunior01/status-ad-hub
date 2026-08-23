import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import * as api from '@/lib/api'
import { sendEmergencyPush } from '@/lib/web-push'
import { toast } from 'sonner'

export function useEmergency() {
  const { user } = useAuth()
  const userId = user?.id
  const { notifyEmergency } = useNotifications()

  const triggerMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      api.triggerEmergency(userId!, latitude, longitude),
    onSuccess: async (result, vars) => {
      toast.success(`Emergencia activada! ${result.contactsNotified.length} contactos serao notificados.`)

      // Send Web Push notification (for background/other device delivery)
      if (userId) {
        sendEmergencyPush(userId, result.alertId, vars.latitude, vars.longitude).catch(() => {
          // Push failure is non-critical, user already got local notification
        })
      }

      // Also send local notification (works when app is in foreground)
      notifyEmergency(
        'EMERGENCIA — StatusAds Connect',
        `Emergencia activada! GPS: ${vars.latitude.toFixed(4)}, ${vars.longitude.toFixed(4)}`,
        { alertId: result.alertId, latitude: vars.latitude, longitude: vars.longitude }
      )
    },
    onError: () => {
      toast.error('Erro ao activar emergencia. Tente novamente.')
    },
  })

  const logMutation = useMutation({
    mutationFn: (params: {
      type: 'location' | 'alert' | 'shield' | 'bluetooth' | 'emergency' | 'geofence'
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
  }
}
