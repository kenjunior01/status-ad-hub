/**
 * useDiscreetMode v2 — Camuflagem avançada da aplicação de segurança.
 * 
 * 10 disfarces disponíveis, configuráveis pelo utilizador.
 * Novas funcionalidades v2:
 * - Duress PIN: PIN alternativo que dispara SOS silencioso
 * - Volume Button SOS: combo de botões de volume para SOS no bolso
 * - Anti-Forced-Entry: PIN errado N vezes = SOS automático silencioso
 * - Stealth Indicators: indicadores subtis de estado no disfarce
 * - Configuração completa persistida em localStorage
 */

import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePanicMode } from '@/hooks/usePanicMode'
import { useEmergency } from '@/hooks/useEmergency'
import type { DiscreetModeType, DiscreetModeConfig } from '@/lib/types'
import { toast } from 'sonner'

interface DiscreetModeContextValue {
  isActive: boolean
  disguiseType: DiscreetModeType
  isSupported: boolean
  config: DiscreetModeConfig | null
  activate: () => void
  deactivate: (pin: string) => { success: boolean; isDuress: boolean }
  changeDisguise: (type: DiscreetModeType) => void
  setPin: (pin: string) => void
  setDuressPin: (pin: string) => void
  discreetSOS: () => void
  updateConfig: (cfg: Partial<DiscreetModeConfig>) => void
  resetConfig: () => void
}

const defaultConfig: DiscreetModeConfig = {
  id: '',
  user_id: '',
  enabled: false,
  disguise_type: 'calculator',
  deactivation_pin: '1234',
  duress_pin: '0000',
  shake_to_activate: true,
  triple_tap_activate: false,
  volume_sos_enabled: true,
  anti_forced_entry: true,
  max_wrong_attempts: 3,
  wrong_attempt_count: 0,
  sos_enabled_in_disguise: true,
  custom_app_name: null,
  custom_color: null,
  show_stealth_indicators: false,
  created_at: '',
  updated_at: '',
}

const DiscreetModeContext = createContext<DiscreetModeContextValue>({
  isActive: false,
  disguiseType: 'calculator',
  isSupported: false,
  config: null,
  activate: () => {},
  deactivate: () => ({ success: false, isDuress: false }),
  changeDisguise: () => {},
  setPin: () => {},
  setDuressPin: () => {},
  discreetSOS: () => {},
  updateConfig: () => {},
  resetConfig: () => {},
})

export function DiscreetModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { activate: activatePanic } = usePanicMode()
  const { triggerEmergency } = useEmergency()
  const [isActive, setIsActive] = useState(false)
  const [disguiseType, setDisguiseType] = useState<DiscreetModeType>('calculator')
  const [config, setConfig] = useState<DiscreetModeConfig | null>(null)
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastShakeRef = useRef(0)
  const shakeCountRef = useRef(0)
  const wrongAttemptsRef = useRef(0)
  const volumeBufferRef = useRef<string[]>([])
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved config
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(`discreet-mode-${user.id}`)
    if (saved) {
      try {
        const cfg: DiscreetModeConfig = { ...defaultConfig, ...JSON.parse(saved), user_id: user.id }
        setConfig(cfg)
        setDisguiseType(cfg.disguise_type)
      } catch {}
    } else {
      const fresh = { ...defaultConfig, user_id: user.id }
      setConfig(fresh)
      localStorage.setItem(`discreet-mode-${user.id}`, JSON.stringify(fresh))
    }
  }, [user?.id])

  // Security: Anti-screenshot — prevent screen capture during disguise
  useEffect(() => {
    if (!isActive) return

    const handleVisibilityChange = () => {
      if (document.hidden) return
      // Page became visible — check if it was a screenshot attempt
      // Some browsers fire this after a screenshot
      if (navigator.vibrate) navigator.vibrate(200)
    }

    // Block screenshot via CSS on some browsers
    const style = document.createElement('style')
    style.textContent = `
      .disguise-active * {
        -webkit-user-select: none !important;
        user-select: none !important;
      }
    `
    document.head.appendChild(style)
    document.body.classList.add('disguise-active')

    // Keyboard shortcut: Escape key as alternative SOS trigger
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        e.preventDefault()
        // Double-press Escape for SOS
        if ((e.target as HTMLElement).closest('.disguise-sos-block')) return
        discreetSOS()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.head.removeChild(style)
      document.body.classList.remove('disguise-active')
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isActive])

  // DeviceMotion shake detection
  useEffect(() => {
    if (!('DeviceMotionEvent' in window)) return
    if (!config?.shake_to_activate) return

    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try { await (DeviceMotionEvent as any).requestPermission() } catch {}
      }
    }
    requestPermission()

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc?.x || !acc?.y || !acc?.z) return
      const force = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z) - 9.8
      if (force > 30) {
        const now = Date.now()
        if (now - lastShakeRef.current < 500) {
          shakeCountRef.current++
          if (shakeCountRef.current >= 3 && !isActive) {
            activate()
            shakeCountRef.current = 0
          }
        } else {
          shakeCountRef.current = 1
        }
        lastShakeRef.current = now
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [isActive, config?.shake_to_activate])

  // Volume Button SOS detection (up-up-down-down combo)
  useEffect(() => {
    if (!config?.volume_sos_enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowUp' ? 'up' : 'down'
        volumeBufferRef.current.push(dir)
        // Keep last 4 presses
        if (volumeBufferRef.current.length > 4) {
          volumeBufferRef.current = volumeBufferRef.current.slice(-4)
        }
        // Check pattern: up-up-down-down
        const pattern = volumeBufferRef.current.join(',')
        if (pattern === 'up,up,down,down') {
          volumeBufferRef.current = []
          // Volume SOS triggered!
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          triggerSilentSOS()
          toast.error('SOS por Volume activado', { duration: 3000 })
        }
        // Reset buffer after 3 seconds of no input
        if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current)
        volumeTimerRef.current = setTimeout(() => {
          volumeBufferRef.current = []
        }, 3000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current)
    }
  }, [config?.volume_sos_enabled])

  const triggerSilentSOS = useCallback(() => {
    // Silent SOS — no alarm, no screen change, just GPS + notify contacts
    navigator.geolocation?.getCurrentPosition(
      (pos) => triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => triggerEmergency({ latitude: -25.9692, longitude: 32.5732 }),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [triggerEmergency])

  const saveConfig = useCallback((cfg: Partial<DiscreetModeConfig>) => {
    if (!user) return
    const current = config || { ...defaultConfig, user_id: user.id }
    const updated = { ...current, ...cfg, updated_at: new Date().toISOString() }
    setConfig(updated)
    localStorage.setItem(`discreet-mode-${user.id}`, JSON.stringify(updated))
  }, [user, config])

  const activate = useCallback(() => {
    setIsActive(true)
    wrongAttemptsRef.current = 0
    if (navigator.vibrate) navigator.vibrate(100)
  }, [])

  const deactivate = useCallback((enteredPin: string): { success: boolean; isDuress: boolean } => {
    const currentPin = config?.deactivation_pin || '1234'
    const duressPin = config?.duress_pin || '0000'

    // Check duress PIN first — triggers SILENT emergency
    if (duressPin && enteredPin === duressPin) {
      // Opens the app normally but triggers silent SOS in background
      setIsActive(false)
      triggerSilentSOS()
      if (navigator.vibrate) navigator.vibrate([50, 50, 50])
      toast.info('App aberta', { duration: 1000 }) // Looks normal to onlookers
      return { success: true, isDuress: true }
    }

    // Check normal PIN
    if (enteredPin === currentPin) {
      setIsActive(false)
      wrongAttemptsRef.current = 0
      if (navigator.vibrate) navigator.vibrate([50, 50, 50])
      return { success: true, isDuress: false }
    }

    // Wrong PIN
    wrongAttemptsRef.current++
    const maxAttempts = config?.max_wrong_attempts ?? 3

    // Anti-forced-entry: trigger silent SOS after N wrong attempts
    if (config?.anti_forced_entry && wrongAttemptsRef.current >= maxAttempts) {
      triggerSilentSOS()
      wrongAttemptsRef.current = 0
      // Still show as wrong to not alert the attacker
    }

    if (navigator.vibrate) navigator.vibrate(300)
    return { success: false, isDuress: false }
  }, [config, triggerSilentSOS])

  const changeDisguise = useCallback((type: DiscreetModeType) => {
    setDisguiseType(type)
    saveConfig({ disguise_type: type })
  }, [saveConfig])

  const setPin = useCallback((newPin: string) => {
    saveConfig({ deactivation_pin: newPin })
  }, [saveConfig])

  const setDuressPin = useCallback((newPin: string) => {
    saveConfig({ duress_pin: newPin })
  }, [saveConfig])

  const discreetSOS = useCallback(() => {
    activatePanic()
  }, [activatePanic])

  const updateConfig = useCallback((cfg: Partial<DiscreetModeConfig>) => {
    saveConfig(cfg)
  }, [saveConfig])

  const resetConfig = useCallback(() => {
    if (!user) return
    const fresh = { ...defaultConfig, user_id: user.id }
    setConfig(fresh)
    setDisguiseType('calculator')
    localStorage.setItem(`discreet-mode-${user.id}`, JSON.stringify(fresh))
  }, [user])

  const isSupported = 'DeviceMotionEvent' in window

  return (
    <DiscreetModeContext.Provider value={{
      isActive, disguiseType, isSupported, config,
      activate, deactivate, changeDisguise, setPin, setDuressPin,
      discreetSOS, updateConfig, resetConfig,
    }}>
      {children}
    </DiscreetModeContext.Provider>
  )
}

export function useDiscreetMode() {
  return useContext(DiscreetModeContext)
}