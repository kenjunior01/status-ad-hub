// ============================================================
// useAppSettings — Configurações globais (números de pagamento
// manual, suporte). Leitura para todos; escrita para admins.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAppSettings, updateAppSetting } from '@/lib/app-settings'

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: fetchAppSettings,
    staleTime: 5 * 60_000,
  })
}

export function useUpdateAppSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: 'payment_numbers' | 'support'; value: Record<string, string> }) => {
      await updateAppSetting(key, value)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}
