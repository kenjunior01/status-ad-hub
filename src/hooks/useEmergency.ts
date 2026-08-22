import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import { toast } from 'sonner'

export function useEmergency() {
  const { user } = useAuth()
  const userId = user?.id

  const triggerMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      api.triggerEmergency(userId!, latitude, longitude),
    onSuccess: (result) => {
      toast.success(`Emergencia activada! ${result.contactsNotified.length} contactos serao notificados.`)
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
