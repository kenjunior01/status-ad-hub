import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import type { HistoryPeriod, LocationEvent, DashboardStats } from '@/lib/types'

export function useHistory(period: HistoryPeriod = 'hoje') {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ['events', userId, period],
    queryFn: () => api.getEvents(userId!, period),
    enabled: !!userId,
    staleTime: 15_000,
  })
}

export function useDashboardStats() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: () => api.getDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
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