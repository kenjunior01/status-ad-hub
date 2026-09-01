import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

/**
 * useNetworkStatus
 *
 * Tracks online/offline connectivity state and provides:
 * - Real-time `isOnline` boolean
 * - Auto toast when connectivity changes
 * - `wasOffline` flag to detect recovery
 * - Time since last disconnect
 *
 * For a personal safety app, knowing connectivity state is critical:
 * - Emergency triggers may fail offline
 * - GPS points are buffered when offline
 * - SMS/Push delivery depends on server connectivity
 */

export interface NetworkState {
  isOnline: boolean
  wasOffline: boolean
  lastOfflineAt: number | null
  offlineDuration: number | null // ms since went offline, null if online
  since: string | null // ISO string of when the status last changed
}

const TOAST_OFFLINE_ID = 'statusads-offline-toast'
const TOAST_ONLINE_ID = 'statusads-online-toast'
const TOAST_EMERGENCY_WARN_ID = 'statusads-emergency-offline-warn'

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOfflineAt: null,
    offlineDuration: null,
    since: new Date().toISOString(),
  }))

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wentOfflineAtRef = useRef<number | null>(null)

  useEffect(() => {
    const goOffline = () => {
      wentOfflineAtRef.current = Date.now()
      setState({
        isOnline: false,
        wasOffline: true,
        lastOfflineAt: wentOfflineAtRef.current,
        offlineDuration: 0,
        since: new Date().toISOString(),
      })

      // Start counting offline duration
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        if (wentOfflineAtRef.current) {
          const elapsed = Date.now() - wentOfflineAtRef.current
          setState(prev => ({ ...prev, offlineDuration: elapsed }))
        }
      }, 1000)
    }

    const goOnline = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setState(prev => ({
        isOnline: true,
        wasOffline: prev.wasOffline || (prev.lastOfflineAt !== null),
        lastOfflineAt: prev.lastOfflineAt,
        offlineDuration: null,
        since: new Date().toISOString(),
      }))
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return state
}

/**
 * useNetworkStatus
 *
 * Convenience wrapper that adds auto-toasting on connectivity changes.
 * Use this in DashboardLayout for global status awareness.
 */
export function useNetworkStatus(showToasts = true): NetworkState {
  const state = useNetworkState()

  useEffect(() => {
    if (!showToasts) return

    if (!state.isOnline) {
      toast.error('Sem conexao a internet', {
        id: TOAST_OFFLINE_ID,
        description: 'Funcionalidades podem estar limitadas. Emergencias serao guardadas localmente.',
        duration: Infinity, // Stays until dismissed or back online
      })
    } else if (state.wasOffline) {
      toast.dismiss(TOAST_OFFLINE_ID)
      const offlineMs = state.lastOfflineAt ? Date.now() - state.lastOfflineAt : 0
      const mins = Math.floor(offlineMs / 60_000)
      const desc = mins > 0
        ? `Restabelecida apos ${mins} minuto${mins > 1 ? 's' : ''} offline. Dados sincronizados.`
        : 'Conexao restabelecida. Dados sincronizados.'
      toast.success('Conexao restabelecida', {
        id: TOAST_ONLINE_ID,
        description: desc,
        duration: 5000,
      })
    }
  }, [state.isOnline, state.wasOffline, state.lastOfflineAt, showToasts])

  return state
}

/**
 * Show an emergency-specific offline warning.
 * Call this when the user tries to trigger an emergency while offline.
 */
export function showEmergencyOfflineWarning() {
  toast.error('Sem conexao — Emergencia guardada localmente', {
    id: TOAST_EMERGENCY_WARN_ID,
    description: 'A emergencia sera enviada automaticamente quando a conexao for restabelecida.',
    duration: 8000,
  })
}

/**
 * Format offline duration for display (e.g. "3m 24s")
 */
export function formatOfflineDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}
