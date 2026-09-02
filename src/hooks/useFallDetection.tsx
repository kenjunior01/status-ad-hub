/**
 * useFallDetection — Deteção de queda física via DeviceMotion.
 *
 * Como funciona:
 * 1. Monitoriza a aceleração total do telemóvel (m/s²).
 * 2. FASE FREE-FALL: magnitude < limiar (2.5–4.5 m/s² conforme
 *    sensibilidade) durante ≥ 250 ms — o telemóvel está em queda livre.
 * 3. FASE IMPACTO: magnitude > limiar de impacto dentro de 2 s —
 *    o telemóvel (a pessoa) bateu no chão.
 * 4. COUNTDOWN de cancelamento com beeps crescentes + vibração.
 * 5. Se ninguém cancelar → SOS automático via useEmergency (com GPS).
 *
 * Arquitectura: store singleton no módulo (padrão useSyncExternalStore)
 * para que o DashboardLayout (overlay global) e a página de configuração
 * partilhem o MESMO estado. Overlay renderizado uma vez no layout.
 *
 * Sem API, sem servidor, 100% no dispositivo.
 */

import { useSyncExternalStore, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PersonStanding, X, Siren } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { playBeep, vibrateSos, unlockAudio } from '@/lib/audio-utils'

/* ────────────────────────── Configuração ────────────────────────── */

export type FallSensitivity = 'low' | 'medium' | 'high'

export interface FallConfig {
  enabled: boolean
  sensitivity: FallSensitivity
  countdownSeconds: number
  autoSos: boolean
  vibration: boolean
}

const FALL_CONFIG_KEY = 'statusads-fall-config'

const DEFAULT_CONFIG: FallConfig = {
  enabled: false,
  sensitivity: 'medium',
  countdownSeconds: 15,
  autoSos: true,
  vibration: true,
}

/** Limiar de queda livre (m/s²) e de impacto (m/s²) por sensibilidade. */
const SENSITIVITY_THRESHOLDS: Record<FallSensitivity, { freeFall: number; impact: number }> = {
  low: { freeFall: 2.5, impact: 38 },
  medium: { freeFall: 3.5, impact: 30 },
  high: { freeFall: 4.5, impact: 24 },
}

function loadConfig(): FallConfig {
  try {
    const raw = localStorage.getItem(FALL_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function saveConfig(cfg: FallConfig): void {
  try {
    localStorage.setItem(FALL_CONFIG_KEY, JSON.stringify(cfg))
  } catch {
    /* noop */
  }
}

/* ────────────────────────── Estado singleton ────────────────────────── */

export type FallPhase = 'off' | 'monitoring' | 'freefall' | 'countdown' | 'dispatching'

interface FallState {
  phase: FallPhase
  countdownRemaining: number
  lastFallAt: number | null
  config: FallConfig
  sosTriggeredAt: number | null
}

let state: FallState = {
  phase: 'off',
  countdownRemaining: 0,
  lastFallAt: null,
  config: loadConfig(),
  sosTriggeredAt: null,
}

const listeners = new Set<() => void>()

function setState(patch: Partial<FallState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): FallState {
  return state
}

/* ────────────────────────── Motor (module-level) ────────────────────────── */

let watchId: number | null = null
let freefallStart: number | null = null
let countdownTimer: number | null = null
let beepTimer: number | null = null
let ringHandle: { stop: () => void } | null = null

/** Callback de SOS registado pela integração (DashboardLayout). */
let sosHandler: ((reason: string) => void) | null = null

export function registerFallSosHandler(fn: ((reason: string) => void) | null): void {
  sosHandler = fn
}

function clearCountdownTimers(): void {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (beepTimer !== null) {
    window.clearInterval(beepTimer)
    beepTimer = null
  }
  ringHandle?.stop()
  ringHandle = null
}

function startCountdown(): void {
  const { config } = state
  const total = config.countdownSeconds
  let remaining = total

  setState({ phase: 'countdown', countdownRemaining: remaining })

  // beeps de aviso — mais rápidos perto do fim
  const beep = () => {
    const frac = remaining / Math.max(total, 1)
    playBeep(frac < 0.3 ? 1200 : 880, 160, 0.4)
    if (config.vibration) {
      try { navigator.vibrate?.(150) } catch { /* noop */ }
    }
  }
  beep()
  beepTimer = window.setInterval(beep, 1000)

  countdownTimer = window.setInterval(() => {
    remaining -= 1
    if (remaining <= 0) {
      clearCountdownTimers()
      confirmFall()
    } else {
      setState({ countdownRemaining: remaining })
    }
  }, 1000)
}

function confirmFall(): void {
  setState({ phase: 'dispatching', sosTriggeredAt: Date.now() })
  playBeep(1400, 500, 0.5)
  vibrateSos()
  const reason = `Deteccao de queda automatica (${new Date().toLocaleTimeString('pt-PT')})`
  sosHandler?.(reason)
  // volta a monitorizar após o despacho
  window.setTimeout(() => {
    if (state.config.enabled) {
      setState({ phase: 'monitoring', countdownRemaining: 0 })
    } else {
      stopEngine()
      setState({ phase: 'off' })
    }
  }, 4000)
}

function handleMotion(e: DeviceMotionEvent): void {
  if (state.phase !== 'monitoring' && state.phase !== 'freefall') return
  const acc = e.accelerationIncludingGravity
  if (!acc || acc.x === null || acc.y === null || acc.z === null) return

  const mag = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2)
  const th = SENSITIVITY_THRESHOLDS[state.config.sensitivity]

  if (state.phase === 'monitoring') {
    // em queda livre? (gravidade ~9.8 m/s²; queda livre real → ~0)
    if (mag < th.freeFall) {
      if (freefallStart === null) freefallStart = Date.now()
      else if (Date.now() - freefallStart >= 250) {
        setState({ phase: 'freefall' })
      }
    } else {
      freefallStart = null
    }
  } else if (state.phase === 'freefall') {
    // procura impacto dentro de 2s após free-fall
    if (mag > th.impact) {
      freefallStart = null
      setState({ lastFallAt: Date.now() })
      startCountdown()
    } else if (Date.now() - (freefallStart ?? Date.now()) > 2000) {
      // estava em "queda livre" demasiado tempo sem impacto → falso positivo
      freefallStart = null
      setState({ phase: 'monitoring' })
    }
  }
}

function startEngine(): void {
  if (watchId !== null) return
  unlockAudio()

  const requestPermission = async () => {
    const DME = (window as any).DeviceMotionEvent
    if (DME && typeof DME.requestPermission === 'function') {
      try { await DME.requestPermission() } catch { /* negado — continua sem iOS */ }
    }
  }
  void requestPermission()

  window.addEventListener('devicemotion', handleMotion)
  watchId = 1 // marcador lógico (não usamos watchPosition para motion)
}

function stopEngine(): void {
  window.removeEventListener('devicemotion', handleMotion)
  watchId = null
  freefallStart = null
  clearCountdownTimers()
}

/* ────────────────────────── API pública do hook ────────────────────────── */

export function useFallDetection() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  const start = useCallback(() => {
    const cfg = { ...state.config, enabled: true }
    saveConfig(cfg)
    setState({ config: cfg, phase: 'monitoring', countdownRemaining: 0 })
    startEngine()
  }, [])

  const stop = useCallback(() => {
    const cfg = { ...state.config, enabled: false }
    saveConfig(cfg)
    stopEngine()
    setState({ config: cfg, phase: 'off', countdownRemaining: 0 })
  }, [])

  const cancel = useCallback(() => {
    // usuário confirmou que está bem
    clearCountdownTimers()
    if (state.config.enabled) {
      setState({ phase: 'monitoring', countdownRemaining: 0 })
    } else {
      stopEngine()
      setState({ phase: 'off', countdownRemaining: 0 })
    }
  }, [])

  const triggerSosNow = useCallback(() => {
    clearCountdownTimers()
    confirmFall()
  }, [])

  const updateConfig = useCallback((patch: Partial<FallConfig>) => {
    const cfg = { ...state.config, ...patch }
    saveConfig(cfg)
    setState({ config: cfg })
    if (cfg.enabled && state.phase === 'off') startEngine()
    if (!cfg.enabled && state.phase !== 'off' && state.phase !== 'countdown') {
      stopEngine()
      setState({ phase: 'off' })
    }
  }, [])

  /** Simula uma queda (para teste em desktop, onde não há acelerómetro). */
  const simulate = useCallback(() => {
    setState({ lastFallAt: Date.now() })
    startCountdown()
  }, [])

  return {
    ...snap,
    isMonitoring: snap.phase === 'monitoring' || snap.phase === 'freefall' || snap.phase === 'countdown',
    start,
    stop,
    cancel,
    triggerSosNow,
    updateConfig,
    simulate,
  }
}

/* ────────────────────────── Overlay global ────────────────────────── */

export function FallDetectionOverlay() {
  const { phase, countdownRemaining, cancel, triggerSosNow } = useFallDetection()
  const show = phase === 'countdown' || phase === 'dispatching'

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-red-950/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm text-center space-y-6"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="mx-auto h-20 w-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center"
            >
              <PersonStanding className="h-10 w-10 text-red-400" />
            </motion.div>

            {phase === 'countdown' ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-red-200">Queda detectada!</h2>
                  <p className="text-red-300/70 text-sm mt-1">
                    SOS automático em <span className="font-bold text-red-200">{countdownRemaining}s</span>
                  </p>
                </div>

                <motion.div
                  key={countdownRemaining}
                  initial={{ scale: 1.4, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-black text-white tabular-nums"
                >
                  {countdownRemaining}
                </motion.div>

                <div className="space-y-3">
                  <Button
                    onClick={cancel}
                    size="lg"
                    className="w-full h-14 text-lg font-bold bg-white text-red-700 hover:bg-red-50"
                  >
                    <X className="h-6 w-6 mr-2" />
                    Estou bem — Cancelar
                  </Button>
                  <Button
                    onClick={triggerSosNow}
                    variant="outline"
                    className="w-full h-12 border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white"
                  >
                    <Siren className="h-5 w-5 mr-2" />
                    Activar SOS agora
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <Siren className="h-6 w-6 animate-pulse" /> A activar SOS…
                </h2>
                <p className="text-red-200/60 text-sm">
                  Contactos de emergência estão a ser notificados com a sua localização.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/** Hook interno de montagem — limpa timers se o componente desmontar. */
export function useFallDetectionCleanup(): void {
  useEffect(() => () => { clearCountdownTimers() }, [])
}

/**
 * Mantém o motor activo: se o utilizador tiver a deteção ligada
 * (config.enabled) e o motor estiver parado (ex: recarregou a página),
 * arranca-o de novo. Usado no DashboardLayout — assim a monitorização
 * sobrevive a navegação e reloads enquanto o app estiver aberto.
 */
export function useFallDetectionKeepAlive(): void {
  useEffect(() => {
    const cfg = loadConfig()
    if (cfg.enabled && watchId === null) {
      // sincroniza o estado do store com a config persistida
      setState({ config: cfg, phase: 'monitoring' })
      startEngine()
    }
  }, [])
}

export const FALL_ICONS = { PersonStanding }
export const fallCx = cn
