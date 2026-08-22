import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import type { CreateContactInput, UpdateContactInput, EmergencyContact } from '@/lib/types'
import { toast } from 'sonner'

export function useContacts() {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery({
    queryKey: ['contacts', userId],
    queryFn: () => api.getContacts(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })

  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: (input: CreateContactInput) => api.createContact(userId!, input),
    onSuccess: (newContact) => {
      queryClient.setQueryData(['contacts', userId], (old: EmergencyContact[] | undefined) =>
        [...(old || []), newContact]
      )
      toast.success('Contacto adicionado')
    },
    onError: () => toast.error('Erro ao adicionar contacto'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: UpdateContactInput & { id: string }) => api.updateContact(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['contacts', userId], (old: EmergencyContact[] | undefined) =>
        (old || []).map(c => c.id === updated.id ? updated : c)
      )
    },
    onError: () => toast.error('Erro ao actualizar contacto'),
  })

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.toggleContactAlert(id, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData(['contacts', userId], (old: EmergencyContact[] | undefined) =>
        (old || []).map(c => c.id === updated.id ? updated : c)
      )
    },
    onError: () => toast.error('Erro ao alterar alerta'),
  })

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => api.deleteContact(contactId),
    onSuccess: (_data, contactId) => {
      queryClient.setQueryData(['contacts', userId], (old: EmergencyContact[] | undefined) =>
        (old || []).filter(c => c.id !== contactId)
      )
      toast.success('Contacto removido')
    },
    onError: () => toast.error('Erro ao remover contacto'),
  })

  return {
    contacts: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addContact: addMutation.mutate,
    updateContact: updateMutation.mutate,
    toggleAlert: toggleAlertMutation.mutate,
    deleteContact: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
