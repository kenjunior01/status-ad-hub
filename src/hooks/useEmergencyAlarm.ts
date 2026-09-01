import { useCallback, useRef, useState, useEffect } from 'react'
import { startEmergencyAlarm, stopEmergencyAlarm, isAlarmPlaying } from '@/lib/emergency-alarm'

/**
 * useEmergencyAlarm
 *
 * React hook wrapper for the emergency alarm system.
 * Provides:
 * - triggerAlarm() — starts siren + vibration
 * - silenceAlarm() — stops everything
 * - isSounding — reactive boolean
 * - Auto-silence after configurable duration
 */

export function useEmergencyAlarm(options?: {
  duration?: number   // Auto-stop after ms (default 30s)
  volume?: number     // 0-1 (default 0.7)
  vibrate?: boolean   // Enable vibration (default true)
}) {
  const [isSounding, setIsSounding] = useState(false)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const opts = options || {}

  const triggerAlarm = useCallback(() => {
    // Check if audio is available
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
      // Fallback: just vibrate
      if ('vibrate' in navigator) {
        try { (navigator as any).vibrate([200, 100, 200, 100, 200, 300, 200, 100, 200]) } catch {}
      }
      return
    }

    startEmergencyAlarm({
      duration: opts.duration,
      volume: opts.volume,
      vibrate: opts.vibrate,
    })
    setIsSounding(true)

    // Set auto-stop timer
    const dur = opts.duration ?? 30_000
    autoStopTimerRef.current = setTimeout(() => {
      silenceAlarm()
    }, dur)
  }, [opts.duration, opts.volume, opts.vibrate])

  const silenceAlarm = useCallback(() => {
    stopEmergencyAlarm()
    setIsSounding(false)
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = undefined
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEmergencyAlarm()
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
      }
    }
  }, [])

  return { triggerAlarm, silenceAlarm, isSounding }
}
