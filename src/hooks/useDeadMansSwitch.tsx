/**
 * useDeadMansSwitch — Interruptor do Homem Morto Digital.
 * 
 * Se o utilizador não responder dentro do tempo configurado:
 * Nível 1: Notificação de aviso
 * Nível 2: SMS para contactos de emergência
 * Nível 3: Emergência completa automática
 * 
 * O timer reseta automaticamente com interacção do utilizador
 * (toque no ecrã, movimento, check-in).
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmergency } from '@/hooks/useEmergency'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useNotifications } from '@/hooks/useNotifications'
import { useNetworkState } from '@/hooks/useNetworkStatus'
import { toast } from 'sonner'
import * as api from '@/lib/api'
import { sendEmergencyPush } from '@/lib/web-push'
import type { DeadMansSwitchConfig, DeadMansSwitchEvent } from '@/lib/types'

interface DeadMansSwitchContextValue {
  config: DeadMansSwitchConfig | null
  isActive: boolean
  isEnabled: boolean
  secondsRemaining: number
  currentLevel: 'idle' | 'warning' | 'contacts_alerted' | 'emergency'
  warningCount: number
  enable: (timeoutMinutes?: number) => void
  disable: () => void
  acknowledge: () => void
  resetTimer: () => void
  updateConfig: (cfg: Partial<DeadMansSwitchConfig>) => void
}

const defaultConfig: DeadMansSwitchConfig = {
  id: '',
  user_id: '',
  enabled: false,
  timeout_minutes: 30,
  auto_escalate: true,
  warning_attempts: 2,
  warning_interval_minutes: 5,
  warning_message: null,
  active_start_time: null,
  active_end_time: null,
  created_at: '',
  updated_at: '',
}

const DeadMansSwitchContext = createContext<DeadMansSwitchContextValue>({
  config: defaultConfig,
  isActive: false,
  isEnabled: false,
  secondsRemaining: 0,
  currentLevel: 'idle',
  warningCount: 0,
  enable: () => {},
  disable: () => {},
  acknowledge: () => {},
  resetTimer: () => {},
  updateConfig: () => {},
})

export function DeadMansSwitchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { triggerEmergency } = useEmergency()
  const { queueEmergency } = useOfflineQueue()
  const { notifyEmergency } = useNotifications()
  const { isOnline } = useNetworkState()

  const [config, setConfig] = useState<DeadMansSwitchConfig | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [currentLevel, setCurrentLevel] = useState<'idle' | 'warning' | 'contacts_alerted' | 'emergency'>('idle')
  const [warningCount, setWarningCount] = useState(0)
  const [eventLog, setEventLog] = useState<DeadMansSwitchEvent[]>([])
  const lastActivityRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActive = currentLevel !== 'idle'
  const isEnabled = config?.enabled ?? false

  // Load config
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(`dms-config-${user.id}`)
    if (saved) {
      try {
        const cfg = JSON.parse(saved)
        setConfig({ ...defaultConfig, ...cfg, user_id: user.id })
      } catch {}
    } else {
      setConfig({ ...defaultConfig, user_id: user.id })
    }
  }, [user?.id])

  // Activity detection — reset timer on user interaction
  useEffect(() => {
    if (!isEnabled || !config) return

    const resetActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ['touchstart', 'mousedown', 'keydown', 'scroll', 'devicemotion'] as const
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }))

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity))
    }
  }, [isEnabled, config])

  // Main timer loop
  useEffect(() => {
    if (!isEnabled || !config || !user) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    // Check time window
    if (config.active_start_time && config.active_end_time) {
      const now = new Date()
      const [sh, sm] = config.active_start_time.split(':').map(Number)
      const [eh, em] = config.active_end_time.split(':').map(Number)
      const startMins = sh * 60 + sm
      const endMins = eh * 60 + em
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const inWindow = startMins < endMins
        ? nowMins >= startMins && nowMins <= endMins
        : nowMins >= startMins || nowMins <= endMins
      if (!inWindow) return
    }

    lastActivityRef.current = Date.now()
    setCurrentLevel('idle')
    setWarningCount(0)

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lastActivityRef.current) / 1000
      const timeoutSec = (config.timeout_minutes - (warningCount * config.warning_interval_minutes)) * 60
      const remaining = Math.max(0, timeoutSec - elapsed)

      setSecondsRemaining(Math.round(remaining))

      // Level 1: Warning
      if (remaining <= 0 && currentLevel === 'idle' && warningCount < config.warning_attempts) {
        setCurrentLevel('warning')
        setWarningCount(c => c + 1)
        lastActivityRef.current = Date.now() // Reset after warning

        toast.warning('Dead Man\'s Switch — Aviso!', {
          description: `Sem actividade detectada. Responda em ${config.warning_interval_minutes} minutos ou o sistema escalonará. (${warningCount + 1}/${config.warning_attempts})`,
          duration: 15000,
        })

        // Push notification
        notifyEmergency(
          'StatusAds — Aviso de Inactividade',
          `Responda em ${config.warning_interval_minutes} minutos. Aviso ${warningCount + 1} de ${config.warning_attempts}.`
        )

        logEvent('warning_sent')
      }

      // Level 2: Alert contacts
      if (remaining <= 0 && warningCount >= config.warning_attempts && currentLevel === 'warning') {
        setCurrentLevel('contacts_alerted')
        lastActivityRef.current = Date.now()

        toast.error('Dead Man\'s Switch — Contactos alertados!', {
          description: 'SMS enviado aos seus contactos de emergência.',
          duration: 10000,
        })

        // Send push to contacts
        sendEmergencyPush(user.id, 'dms-alert', 0, 0).catch(() => {})
        logEvent('escalated')
      }

      // Level 3: Full emergency
      const contactsTimeout = config.warning_interval_minutes * 60
      const contactsElapsed = (Date.now() - lastActivityRef.current) / 1000
      if (currentLevel === 'contacts_alerted' && contactsElapsed >= contactsTimeout) {
        setCurrentLevel('emergency')

        navigator.geolocation?.getCurrentPosition(
          (pos) => triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => { queueEmergency(-25.9692, 32.5732) },
          { enableHighAccuracy: true, timeout: 5000 }
        )

        logEvent('escalated')
      }
    }, 1000)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [isEnabled, config, user, currentLevel, warningCount])

  const logEvent = useCallback((type: DeadMansSwitchEvent['type']) => {
    if (!user) return
    const evt: DeadMansSwitchEvent = {
      id: crypto.randomUUID(),
      user_id: user.id,
      type,
      attempt_number: warningCount,
      response_time_seconds: null,
      emergency_alert_id: null,
      created_at: new Date().toISOString(),
    }
    setEventLog(prev => [...prev, evt])
    // Persist to Supabase
    api.logEvent(user.id, 'dead_mans_switch', `Dead Man's Switch: ${type}`, undefined, undefined, undefined).catch(() => {})
  }, [user, warningCount])

  const acknowledge = useCallback(() => {
    lastActivityRef.current = Date.now()
    setCurrentLevel('idle')
    logEvent('warning_acknowledged')
    toast.success('Dead Man\'s Switch — Respondido. Timer reiniciado.')
  }, [logEvent])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const enable = useCallback((timeoutMinutes?: number) => {
    if (!config) return
    const updated = { ...config, enabled: true, timeout_minutes: timeoutMinutes || config.timeout_minutes }
    setConfig(updated)
    localStorage.setItem(`dms-config-${user?.id || ''}`, JSON.stringify(updated))
    lastActivityRef.current = Date.now()
  }, [config, user?.id])

  const disable = useCallback(() => {
    if (!config) return
    const updated = { ...config, enabled: false }
    setConfig(updated)
    setCurrentLevel('idle')
    setWarningCount(0)
    localStorage.setItem(`dms-config-${user?.id || ''}`, JSON.stringify(updated))
  }, [config, user?.id])

  const updateConfig = useCallback((cfg: Partial<DeadMansSwitchConfig>) => {
    if (!config) return
    const updated = { ...config, ...cfg }
    setConfig(updated)
    localStorage.setItem(`dms-config-${user?.id || ''}`, JSON.stringify(updated))
  }, [config, user?.id])

  return (
    <DeadMansSwitchContext.Provider value={{
      config, isActive, isEnabled, secondsRemaining, currentLevel,
      warningCount, enable, disable, acknowledge, resetTimer, updateConfig,
    }}>
      {children}
    </DeadMansSwitchContext.Provider>
  )
}

export function useDeadMansSwitch() {
  return useContext(DeadMansSwitchContext)
}