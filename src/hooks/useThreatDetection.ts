/**
 * useThreatDetection — React hook para detecção de ameaças em tempo real.
 * Integra o ThreatDetector com o React e dispara acções automáticas.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getThreatDetector } from '@/lib/threat-detector'
import type { ThreatAssessment } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { useEmergency } from '@/hooks/useEmergency'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { toast } from 'sonner'
import * as api from '@/lib/api'

export function useThreatDetection() {
  const { user } = useAuth()
  const { triggerEmergency } = useEmergency()
  const { position } = useGeolocation()
  const { connections } = useBluetooth()
  const { queueEmergency } = useOfflineQueue()
  const detectorRef = useRef<ReturnType<typeof getThreatDetector> | null>(null)

  const [assessment, setAssessment] = useState<ThreatAssessment>({
    level: 'safe', score: 0, factors: [],
    timestamp: Date.now(),
    recommendation: 'Sistema inactivo.',
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [history, setHistory] = useState<ThreatAssessment[]>([])

  // Push GPS data to detector
  useEffect(() => {
    if (!position || !detectorRef.current) return
    const speed = position.speed ?? null
    const heading = position.heading ?? null
    detectorRef.current.pushReading({ speed, heading })
  }, [position?.timestamp])

  // Push BLE RSSI to detector
  useEffect(() => {
    if (!detectorRef.current) return
    const monitoredConns = Object.values(connections)
    if (monitoredConns.length > 0) {
      const firstConn = monitoredConns[0]
      // Use a representative RSSI value (or null)
      const rssi = (firstConn as any)?.rssi ?? null
      detectorRef.current.pushReading({ rssi })
    }
  }, [connections, Object.values(connections).length])

  const startMonitoring = useCallback(() => {
    const detector = getThreatDetector()
    detectorRef.current = detector

    detector.onAssessment((newAssessment) => {
      setAssessment(newAssessment)
      setHistory(prev => [...prev.slice(-19), newAssessment])

      // Auto-trigger on critical
      if (newAssessment.level === 'critical' && !autoTriggered && user) {
        setAutoTriggered(true)
        toast.error('Ameaça crítica detectada!', {
          description: newAssessment.recommendation,
          duration: 8000,
        })

        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          },
          () => { if (user) queueEmergency(-25.9692, 32.5732) },
          { enableHighAccuracy: true, timeout: 5000 }
        )

        api.logEvent(user.id, 'threat_detected',
          `Ameaça detectada: score=${newAssessment.score}, factores=[${newAssessment.factors.join(', ')}]`,
          undefined, position?.latitude, position?.longitude
        ).catch(() => {})
      }

      // Toast for high level
      if (newAssessment.level === 'high' && newAssessment.score > 50) {
        toast.warning('Nível de risco elevado detectado', {
          description: newAssessment.factors.join('. '),
          duration: 5000,
        })
      }
    })

    detector.start()
    setIsMonitoring(true)

    return () => {
      detector.stop()
    }
  }, [user, autoTriggered, triggerEmergency, queueEmergency, position])

  const stopMonitoring = useCallback(() => {
    detectorRef.current?.stop()
    setIsMonitoring(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { detectorRef.current?.stop() }
  }, [])

  return {
    assessment,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    history,
    autoTriggered,
    resetAutoTrigger: () => setAutoTriggered(false),
  }
}