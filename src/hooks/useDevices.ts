import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import type { CreateDeviceInput, UpdateDeviceInput, Device } from '@/lib/types'
import { toast } from 'sonner'

export function useDevices() {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery({
    queryKey: ['devices', userId],
    queryFn: () => api.getDevices(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: (input: CreateDeviceInput) => api.createDevice(userId!, input),
    onSuccess: (newDevice) => {
      queryClient.setQueryData(['devices', userId], (old: Device[] | undefined) =>
        [...(old || []), newDevice]
      )
      toast.success('Dispositivo pareado com sucesso')
    },
    onError: () => toast.error('Erro ao parear dispositivo'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: UpdateDeviceInput & { id: string }) => api.updateDevice(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['devices', userId], (old: Device[] | undefined) =>
        (old || []).map(d => d.id === updated.id ? updated : d)
      )
    },
    onError: () => toast.error('Erro ao actualizar dispositivo'),
  })

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => api.deleteDevice(deviceId),
    onSuccess: (_data, deviceId) => {
      queryClient.setQueryData(['devices', userId], (old: Device[] | undefined) =>
        (old || []).filter(d => d.id !== deviceId)
      )
      toast.success('Dispositivo removido')
    },
    onError: () => toast.error('Erro ao remover dispositivo'),
  })

  return {
    devices: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addDevice: addMutation.mutate,
    updateDevice: updateMutation.mutate,
    deleteDevice: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDeviceLocations() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ['device-locations', userId],
    queryFn: () => api.getDeviceLocations(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
