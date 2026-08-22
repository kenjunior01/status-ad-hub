import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import type { UpdateProfileInput, UserProfile } from '@/lib/types'
import { toast } from 'sonner'

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api.getProfile(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })

  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(userId!, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile', userId], updated)
      toast.success('Perfil actualizado')
    },
    onError: () => toast.error('Erro ao actualizar perfil'),
  })

  return {
    profile: query.data || null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}
