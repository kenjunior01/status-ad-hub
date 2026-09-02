/**
 * useFakeCall — Chamada Falsa para escapar de situações desconfortáveis.
 *
 * Cenário real: estás numa situação estranha (boleia arriscada, encontro
 * agressivo, pressão social) e precisas de uma desculpa incontestável para
 * sair. O telemóvel "toca" com uma chamada realista — nome, número,
 * operadora, ringtone sintetizado e vibração. Atendes e "conversas" —
 * ou apenas mostras o ecrã — e tens motivo legítimo para partir.
 *
 * Ringtone: gerado por WebAudio (padrão internacional 440+480 Hz),
 * vibração nativa — ZERO API, ZERO rede, funciona 100% offline.
 *
 * Arquitectura: store singleton (useSyncExternalStore) partilhado entre
 * a página de configuração e o overlay global montado no DashboardLayout —
 * a chamada agendada toca esteja onde estiveres no app.
 */

import { useSyncExternalStore, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Grid3X3, Video, Phone, PhoneOff, Contact } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startRingtone, vibrateCall, unlockAudio } from '@/lib/audio-utils'

/* ────────────────────────── Configuração ────────────────────────── */

export type Carrier = 'vodacom' | 'tmcel' | 'movitel' | 'generico'
export type CallDelay = 0 | 10 | 30 | 60 | 300

export interface FakeCallConfig {
  callerName: string
  callerNumber: string
  carrier: Carrier
  delaySeconds: CallDelay
  ringtone: boolean
  vibration: boolean
}

const FAKECALL_CONFIG_KEY = 'statusads-fakecall-config'
const FAKECALL_SCHEDULE_KEY = 'statusads-fakecall-schedule'

const DEFAULT_FAKECALL_CONFIG: FakeCallConfig = {
  callerName: 'Chefe',
  callerNumber: '+258 84 000 0000',
  carrier: 'vodacom',
  delaySeconds: 0,
  ringtone: true,
  vibration: true,
}

/** Preenche a config com valores realistas por defeito se campos vazios. */
function hydrateConfig(partial: Partial<FakeCallConfig>): FakeCallConfig {
  const cfg = { ...DEFAULT_FAKECALL_CONFIG, ...partial }
  if (!cfg.callerName.trim()) cfg.callerName = DEFAULT_FAKECALL_CONFIG.callerName
  if (!cfg.callerNumber.trim()) cfg.callerNumber = DEFAULT_FAKECALL_CONFIG.callerNumber
  return cfg
}

function loadFakeCallConfig(): FakeCallConfig {
  try {
    const raw = localStorage.getItem(FAKECALL_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_FAKECALL_CONFIG }
    return hydrateConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_FAKECALL_CONFIG }
  }
}

function saveFakeCallConfig(cfg: FakeCallConfig): void {
  try {
    localStorage.setItem(FAKECALL_CONFIG_KEY, JSON.stringify(cfg))
  } catch {
    /* noop */
  }
}

export const CARRIER_LABELS: Record<Carrier, string> = {
  vodacom: 'Vodacom',
  tmcel: 'Tmcel',
  movitel: 'Movitel',
  generico: 'Telefone',
}

export const CARRIER_COLORS: Record<Carrier, string> = {
  vodacom: 'text-red-400',
  tmcel: 'text-sky-400',
  movitel: 'text-orange-400',
  generico: 'text-white/50',
}

/* ────────────────────────── Estado singleton ────────────────────────── */

type FakeCallPhase = 'idle' | 'scheduled' | 'ringing' | 'answered'

interface FakeCallState {
  phase: FakeCallPhase
  config: FakeCallConfig
  scheduledEndsAt: number | null
  answeredAt: number | null
  muted: boolean
  speaker: boolean
}

let fcState: FakeCallState = {
  phase: 'idle',
  config: loadFakeCallConfig(),
  scheduledEndsAt: null,
  answeredAt: null,
  muted: false,
  speaker: false,
}

const fcListeners = new Set<() => void>()

function fcSetState(patch: Partial<FakeCallState>): void {
  fcState = { ...fcState, ...patch }
  fcListeners.forEach((l) => l())
}

function fcSubscribe(listener: () => void): () => void {
  fcListeners.add(listener)
  return () => fcListeners.delete(listener)
}

function fcSnapshot(): FakeCallState {
  return fcState
}

/* ────────────────────────── Persistência do agendamento ────────────────────────── */

function persistSchedule(endsAt: number | null): void {
  try {
    if (endsAt) localStorage.setItem(FAKECALL_SCHEDULE_KEY, String(endsAt))
    else localStorage.removeItem(FAKECALL_SCHEDULE_KEY)
  } catch { /* noop */ }
}

/**
 * Retoma agendamento perdido por reload da página:
 * - ainda no futuro → continua a contagem;
 * - já expirado → toca imediatamente (a chamada "perdida" enquanto o app estava fechado).
 */
function restoreSchedule(): void {
  try {
    const raw = localStorage.getItem(FAKECALL_SCHEDULE_KEY)
    if (!raw) return
    const endsAt = parseInt(raw, 10)
    persistSchedule(null)
    if (Number.isNaN(endsAt)) return
    const remaining = endsAt - Date.now()
    const cfg = fcState.config
    if (remaining > 800) {
      fcSetState({ phase: 'scheduled', scheduledEndsAt: endsAt })
      tickInterval = window.setInterval(() => fcSetState({}), 1000)
      scheduleTimer = window.setTimeout(() => {
        clearSchedule()
        dispatchCall(cfg)
      }, remaining)
    } else {
      // expirou enquanto o app estava fechado → toca logo
      dispatchCall(cfg)
    }
  } catch { /* noop */ }
}

// restaura no arranque do módulo
restoreSchedule()

/* ────────────────────────── Motor ────────────────────────── */

let scheduleTimer: number | null = null
let ring: { stop: () => void } | null = null
let vibrateInterval: number | null = null
let tickInterval: number | null = null

function stopRinging(): void {
  ring?.stop()
  ring = null
  if (vibrateInterval !== null) {
    window.clearInterval(vibrateInterval)
    vibrateInterval = null
  }
}

function startRinging(cfg: FakeCallConfig): void {
  unlockAudio()
  if (cfg.ringtone) {
    ring = startRingtone(0.55)
  }
  if (cfg.vibration) {
    vibrateCall()
    vibrateInterval = window.setInterval(vibrateCall, 6000)
  }
}

function dispatchCall(cfg: FakeCallConfig): void {
  fcSetState({ phase: 'ringing' })
  startRinging(cfg)
}

function clearSchedule(): void {
  if (scheduleTimer !== null) {
    window.clearTimeout(scheduleTimer)
    scheduleTimer = null
  }
  if (tickInterval !== null) {
    window.clearInterval(tickInterval)
    tickInterval = null
  }
}

/** Tick de 1s para o cronómetro da chamada em curso. */
function startAnsweredTick(): void {
  if (tickInterval !== null) window.clearInterval(tickInterval)
  tickInterval = window.setInterval(() => {
    fcSetState({}) // força re-render por segundo
  }, 1000)
}

/* ────────────────────────── Hook público ────────────────────────── */

export function useFakeCall() {
  const snap = useSyncExternalStore(fcSubscribe, fcSnapshot)

  const startCall = useCallback((override?: Partial<FakeCallConfig>) => {
    clearSchedule()
    const cfg = hydrateConfig({ ...fcState.config, ...override })
    saveFakeCallConfig(cfg)

    if (override && override.delaySeconds !== undefined) cfg.delaySeconds = override.delaySeconds

    if (cfg.delaySeconds > 0) {
      const endsAt = Date.now() + cfg.delaySeconds * 1000
      fcSetState({
        config: cfg,
        phase: 'scheduled',
        scheduledEndsAt: endsAt,
        answeredAt: null,
        muted: false,
        speaker: false,
      })
      persistSchedule(endsAt)
      tickInterval = window.setInterval(() => {
        // força re-render por segundo para o countdown
        fcSetState({})
      }, 1000)
      scheduleTimer = window.setTimeout(() => {
        clearSchedule()
        persistSchedule(null)
        dispatchCall(cfg)
      }, cfg.delaySeconds * 1000)
    } else {
      fcSetState({
        config: cfg,
        phase: 'ringing',
        scheduledEndsAt: null,
        answeredAt: null,
        muted: false,
        speaker: false,
      })
      startRinging(cfg)
    }
  }, [])

  const answer = useCallback(() => {
    stopRinging()
    fcSetState({ phase: 'answered', answeredAt: Date.now() })
    startAnsweredTick()
  }, [])

  const reject = useCallback(() => {
    stopRinging()
    clearSchedule()
    persistSchedule(null)
    fcSetState({ phase: 'idle', scheduledEndsAt: null, answeredAt: null })
  }, [])

  const cancelScheduled = useCallback(() => {
    clearSchedule()
    persistSchedule(null)
    fcSetState({ phase: 'idle', scheduledEndsAt: null })
  }, [])

  const hangUp = useCallback(() => {
    stopRinging()
    clearSchedule()
    persistSchedule(null)
    fcSetState({ phase: 'idle', scheduledEndsAt: null, answeredAt: null })
  }, [])

  const toggleMute = useCallback(() => {
    fcSetState({ muted: !fcState.muted })
  }, [fcState.muted])

  const toggleSpeaker = useCallback(() => {
    fcSetState({ speaker: !fcState.speaker })
  }, [fcState.speaker])

  const updateConfig = useCallback((patch: Partial<FakeCallConfig>) => {
    const cfg = hydrateConfig({ ...fcState.config, ...patch })
    saveFakeCallConfig(cfg)
    fcSetState({ config: cfg })
  }, [fcState.config])

  const secondsUntilCall = snap.scheduledEndsAt
    ? Math.max(0, Math.ceil((snap.scheduledEndsAt - Date.now()) / 1000))
    : 0

  return {
    ...snap,
    secondsUntilCall,
    isActive: snap.phase !== 'idle',
    startCall,
    answer,
    reject,
    cancelScheduled,
    hangUp,
    toggleMute,
    toggleSpeaker,
    updateConfig,
  }
}

/* ────────────────────────── Overlay global ────────────────────────── */

const AVATAR_GRADIENTS = [
  'from-amber-400 to-amber-600',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
]

function avatarGradient(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length]
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** Overlay global de chamada — montar UMA vez no DashboardLayout. */
export function FakeCallOverlay() {
  const {
    phase, config, answeredAt, muted, speaker,
    answer, reject, hangUp, toggleMute, toggleSpeaker,
  } = useFakeCall()

  const showRinging = phase === 'ringing'
  const showAnswered = phase === 'answered'
  const show = showRinging || showAnswered

  if (typeof document === 'undefined') return null

  const initials = config.callerName
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const gradient = avatarGradient(config.callerName)

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-0 z-[210] bg-black text-white flex flex-col"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* fundo suave */}
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />

          {/* ── Corpo da chamada ── */}
          <div className="relative flex-1 flex flex-col items-center justify-center gap-4 px-6">
            {/* avatar */}
            <motion.div
              animate={showRinging ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={showRinging ? { repeat: Infinity, duration: 1.6 } : {}}
              className={cn(
                'h-24 w-24 rounded-full bg-gradient-to-br flex items-center justify-center shadow-2xl',
                gradient
              )}
            >
              <span className="text-3xl font-semibold text-white/95">{initials}</span>
            </motion.div>

            <div className="text-center">
              <h2 className="text-3xl font-light tracking-wide">{config.callerName}</h2>
              <p className={cn('text-sm mt-1 font-medium', CARRIER_COLORS[config.carrier])}>
                {CARRIER_LABELS[config.carrier]} · {config.callerNumber}
              </p>
            </div>

            <p className="text-white/50 text-sm tabular-nums h-5">
              {showRinging
                ? 'Chamada a entrar…'
                : answeredAt
                  ? formatDuration(Math.floor((Date.now() - answeredAt) / 1000))
                  : ''}
            </p>
          </div>

          {/* ── Controlos ── */}
          {showAnswered && (
            <div className="relative grid grid-cols-3 gap-6 px-10 pb-6">
              <button
                onClick={toggleMute}
                className="flex flex-col items-center gap-2"
              >
                <div className={cn(
                  'h-14 w-14 rounded-full flex items-center justify-center transition-colors',
                  muted ? 'bg-white text-black' : 'bg-white/10'
                )}>
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </div>
                <span className="text-[11px] text-white/60">Silenciar</span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Grid3X3 className="h-6 w-6" />
                </div>
                <span className="text-[11px] text-white/60">Teclado</span>
              </button>

              <button
                onClick={toggleSpeaker}
                className="flex flex-col items-center gap-2"
              >
                <div className={cn(
                  'h-14 w-14 rounded-full flex items-center justify-center transition-colors',
                  speaker ? 'bg-white text-black' : 'bg-white/10'
                )}>
                  <Volume2 className="h-6 w-6" />
                </div>
                <span className="text-[11px] text-white/60">Altifalante</span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Video className="h-6 w-6" />
                </div>
                <span className="text-[11px] text-white/60">Vídeo</span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Contact className="h-6 w-6" />
                </div>
                <span className="text-[11px] text-white/60">Contactos</span>
              </button>

              <button
                onClick={hangUp}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <PhoneOff className="h-6 w-6" />
                </div>
                <span className="text-[11px] text-white/60">Terminar</span>
              </button>
            </div>
          )}

          {/* ── Aceitar / Recusar ── */}
          {showRinging && (
            <div className="relative flex items-center justify-around px-10 pb-14">
              <button onClick={reject} className="flex flex-col items-center gap-3">
                <div className="h-18 w-18 h-[72px] w-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 active:scale-95 transition-transform">
                  <PhoneOff className="h-8 w-8" />
                </div>
                <span className="text-xs text-white/70">Recusar</span>
              </button>

              <button onClick={answer} className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="h-[72px] w-[72px] rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40"
                >
                  <Phone className="h-8 w-8" />
                </motion.div>
                <span className="text-xs text-white/70">Aceitar</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
