import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useEmergency } from '@/hooks/useEmergency'
import * as api from '@/lib/api'
import type { CheckIn, CheckInConfig } from '@/lib/types'
import { toast } from 'sonner'

/**
 * useCheckIn — manages the safety check-in system.
 *
 * - Loads check-in config from Supabase
 * - Shows a countdown timer to next check-in
 * - Allows manual check-in with GPS location
 * - Auto-triggers alarm if check-in is missed
 * - Works offline via the offline queue
 */
export function useCheckIn() {
  const { user } = useAuth()
  const userId = user?.id
  const { position } = useGeolocation()
  const { queueEvent } = useOfflineQueue()
  const { logEvent } = useEmergency()
  const queryClient = useQueryClient()

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isOverdue, setIsOverdue] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCheckinTimeRef = useRef<Date | null>(null)

  // Fetch check-in config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['checkin-config', userId],
    queryFn: () => api.getCheckInConfig(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })

  // Fetch recent check-ins
  const { data: checkIns = [], isLoading: historyLoading } = useQuery({
    queryKey: ['checkins', userId],
    queryFn: () => api.getCheckIns(userId!, 50),
    enabled: !!userId,
    staleTime: 30_000,
  })

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (message?: string) => {
      const lat = position?.latitude ?? null
      const lng = position?.longitude ?? null
      return api.createCheckIn(userId!, lat, lng, message)
    },
    onSuccess: (data) => {
      lastCheckinTimeRef.current = new Date()
      setIsOverdue(false)
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      logEvent({
        type: 'checkin',
        description: 'Check-in realizado com sucesso',
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
      })
      toast.success('Check-in realizado!', {
        description: 'A sua seguranca foi confirmada.',
      })
    },
    onError: () => {
      queueEvent({
        type: 'checkin',
        description: 'Check-in offline queue',
      })
      toast.error('Falha no check-in', {
        description: 'Guardado offline. Sera sincronizado quando recuperar conexao.',
      })
    },
  })

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: (input: {
      interval_minutes: number
      is_active: boolean
      start_time: string | null
      end_time: string | null
      message_template: string | null
    }) => api.saveCheckInConfig(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-config'] })
      toast.success('Configuracao guardada')
    },
    onError: () => {
      toast.error('Erro ao guardar configuracao')
    },
  })

  // Countdown timer logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (!config?.is_active || !config.interval_minutes) {
      setSecondsRemaining(0)
      return
    }

    const intervalMs = config.interval_minutes * 60 * 1000

    const tick = () => {
      const now = Date.now()
      const lastCheckin = lastCheckinTimeRef.current
      const lastDbCheckin = checkIns[0]?.checked_at

      const lastTime = lastCheckin
        ? lastCheckin.getTime()
        : lastDbCheckin
          ? new Date(lastDbCheckin).getTime()
          : now

      const elapsed = now - lastTime
      const remaining = Math.max(0, intervalMs - elapsed)
      setSecondsRemaining(Math.floor(remaining / 1000))

      // Check if within active hours
      if (config.start_time && config.end_time) {
        const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
        if (currentHour < config.start_time || currentHour > config.end_time) {
          setSecondsRemaining(0)
          setIsOverdue(false)
          return
        }
      }

      if (remaining === 0 && lastCheckinTimeRef.current !== null) {
        setIsOverdue(true)
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [config, checkIns])

  // Check overdue status from DB
  useEffect(() => {
    const missed = checkIns.find(c => c.status === 'missed' && !c.checked_at)
    if (missed) {
      setIsOverdue(true)
    }
  }, [checkIns])

  // Subscribe to realtime check-in changes
  useEffect(() => {
    if (!userId) return
    const sub = api.subscribeToCheckIns(userId, () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    })
    return () => { sub.unsubscribe() }
  }, [userId, queryClient])

  const checkIn = useCallback((message?: string) => {
    checkInMutation.mutate(message)
  }, [checkInMutation])

  const saveConfig = useCallback((input: Parameters<typeof saveConfigMutation.mutate>[0]) => {
    saveConfigMutation.mutate(input)
  }, [saveConfigMutation])

  // Compute stats
  const totalCheckIns = checkIns.filter(c => c.status === 'checked_in').length
  const missedCheckIns = checkIns.filter(c => c.status === 'missed').length
  const streak = computeStreak(checkIns)

  return {
    config: config ?? null,
    configLoading,
    checkIns,
    historyLoading,
    secondsRemaining,
    isOverdue,
    totalCheckIns,
    missedCheckIns,
    streak,
    checkIn,
    isCheckingIn: checkInMutation.isPending,
    saveConfig,
    isSavingConfig: saveConfigMutation.isPending,
  }
}

function computeStreak(checkIns: CheckIn[]): number {
  const sorted = [...checkIns]
    .filter(c => c.status === 'checked_in' && c.checked_at)
    .sort((a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime())

  if (sorted.length === 0) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i - 1].checked_at!).getTime()
    const prev = new Date(sorted[i].checked_at!).getTime()
    const diffHours = (current - prev) / (1000 * 60 * 60)
    if (diffHours <= 24) {
      streak++
    } else {
      break
    }
  }
  return streak
}
