/**
 * guardian.ts — MODO GUARDIÃO: um único interruptor que arma o telemóvel todo.
 *
 * Filosofia do produto (v3.8.0): SEM encher de funcionalidades.
 *  1. Arma-se uma vez (cartão Guardião no Dashboard) — o telemóvel fica
 *     "de sentinela" à espera de um gatilho de pânico.
 *  2. Em perigo, UM gesto de 1 segundo dispara TODA a cadeia automática
 *     (gravação + fotos + SOS + SMS aos contactos + GPS em alta frequência),
 *     reutilizando o usePanicMode existente.
 *  3. A sentinela vive 24/7 num serviço foreground nativo (GuardianService):
 *     funciona MESMO COM A APP FECHADA e religa-se sozinha após reiniciar
 *     o telemóvel ou actualizar a app (BootReceiver).
 *
 * Gatilhos (todos armados só quando o Guardião está activo):
 *  · Agitação forte ×3 (agarraram-lhe o braço / luta)  → contagem 5s
 *  · Atalho "SOS" no ícone da app (long-press)          → contagem 2s
 *  · Tile "SOS" nos atalhos rápidos do Android          → contagem 2s
 *  · Botão Power ×4 com o ecrã apagado (no bolso)       → contagem 3s (sentinela nativa)
 *
 * Estado persistido em localStorage (WebView) + espelhado em SharedPreferences
 * nativas para os gatilhos funcionarem sem JS. Eventos via CustomEvent.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface GuardianConfig {
  armed: boolean
  armedAt: number | null
  /** Gravação de áudio + fotos automáticas ao disparar (default ON) */
  autoRecord: boolean
  /** Modo silencioso: sem sirene, sem toast alto (default ON — roubo) */
  silent: boolean
  /** Gesto de agitação armado (default ON) */
  shakeEnabled: boolean
}

export type PanicSource = 'shake' | 'shortcut' | 'tile' | 'power' | 'manual'

export const DEFAULT_GUARDIAN: GuardianConfig = {
  armed: false,
  armedAt: null,
  autoRecord: true,
  silent: true,
  shakeEnabled: true,
}

const KEY = 'statusads-guardian'

/** Segundos de contagem decrescente por gatilho (tempo para cancelar falso alarme) */
export const COUNTDOWN_SECONDS: Record<PanicSource, number> = {
  shake: 5,
  shortcut: 2,
  tile: 2,
  power: 3,
  manual: 0,
}

export const SOURCE_LABEL: Record<PanicSource, string> = {
  shake: 'Agitação detectada',
  shortcut: 'Atalho SOS no ícone',
  tile: 'Atalho rápido SOS',
  power: 'Botão Power ×4',
  manual: 'Botão SOS',
}

// ── Estado persistido ────────────────────────────────────────────────────────

export function loadGuardian(): GuardianConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_GUARDIAN }
    const parsed = JSON.parse(raw) as Partial<GuardianConfig>
    return { ...DEFAULT_GUARDIAN, ...parsed, armed: !!parsed.armed }
  } catch {
    return { ...DEFAULT_GUARDIAN }
  }
}

export function saveGuardian(cfg: GuardianConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    // storage cheio/bloqueado — modo não persistente
  }
  window.dispatchEvent(new CustomEvent('guardian-change', { detail: cfg }))
  syncNative(cfg)
}

export function armGuardian(opts?: Partial<Pick<GuardianConfig, 'autoRecord' | 'silent' | 'shakeEnabled'>>): GuardianConfig {
  const cfg: GuardianConfig = {
    ...loadGuardian(),
    ...opts,
    armed: true,
    armedAt: Date.now(),
  }
  saveGuardian(cfg)
  return cfg
}

export function disarmGuardian(): GuardianConfig {
  const cfg = { ...loadGuardian(), armed: false, armedAt: null }
  saveGuardian(cfg)
  return cfg
}

export function updateGuardian(patch: Partial<Omit<GuardianConfig, 'armed' | 'armedAt'>>): GuardianConfig {
  const cfg = { ...loadGuardian(), ...patch }
  saveGuardian(cfg)
  return cfg
}

export function isGuardianArmed(): boolean {
  return loadGuardian().armed
}

// ── Modo silencioso do pânico em curso ──────────────────────────────────────
// Lido por useEmergency (via isSilentPanic) para NÃO tocar a sirene quando o
// disparo veio do Guardião em modo silencioso.

let silentPanic = false

export function setSilentPanic(v: boolean): void {
  silentPanic = v
}

export function isSilentPanic(): boolean {
  return silentPanic
}

// ── Pedidos de contagem decrescente (overlay global) ────────────────────────

export interface CountdownRequest {
  source: PanicSource
  seconds: number
}

const COUNTDOWN_EVENT = 'guardian-countdown'

/** Chamado pelos gatilhos (shake, deep link, plugin nativo). */
export function requestPanicCountdown(source: PanicSource): boolean {
  if (!isGuardianArmed()) return false
  const seconds = COUNTDOWN_SECONDS[source] ?? 3
  if (seconds <= 0) {
    firePanicNow(source)
    return true
  }
  window.dispatchEvent(
    new CustomEvent<CountdownRequest>(COUNTDOWN_EVENT, { detail: { source, seconds } })
  )
  return true
}

export function onCountdownRequest(cb: (req: CountdownRequest) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CountdownRequest>).detail)
  window.addEventListener(COUNTDOWN_EVENT, handler)
  return () => window.removeEventListener(COUNTDOWN_EVENT, handler)
}

/** Dispara a cadeia de pânico REAL (definida pelo GuardianWatcher via setPanicExecutor) */
type PanicExecutor = (source: PanicSource, silent: boolean) => void
let panicExecutor: PanicExecutor | null = null

export function setPanicExecutor(fn: PanicExecutor): void {
  panicExecutor = fn
}

export function firePanicNow(source: PanicSource): void {
  const cfg = loadGuardian()
  if (panicExecutor) panicExecutor(source, cfg.silent)
}

// ── Ponte nativa (Android): sentinela 24/7 em GuardianService ────────────────

interface PanicNativeInterface {
  /** Espelha o estado no lado nativo e liga/desliga o serviço foreground. */
  setGuardian(cfg: { armed: boolean; shakeEnabled: boolean; silent: boolean }): Promise<void>
  /** true se a app já está isenta de optimizações de bateria. */
  batteryStatus(): Promise<{ exempt: boolean }>
  /** Abre o diálogo do sistema "Permitir sem optimizações de bateria". */
  requestBatteryExemption(): Promise<void>
}

let nativePanic: PanicNativeInterface | null = null

/** Plugin nativo só existe no Android; no web devolve null (sem erros). */
export function getNativePanic(): PanicNativeInterface | null {
  if (Capacitor.getPlatform() !== 'android') return null
  if (!nativePanic) {
    try {
      nativePanic = registerPlugin<PanicNativeInterface>('Panic')
    } catch {
      return null
    }
  }
  return nativePanic
}

/**
 * Espelha o estado do Guardião para o lado nativo: SharedPreferences
 * (para os gatilhos funcionarem sem JS) + serviço foreground on/off.
 * Fire-and-forget — o Guardião web funciona mesmo sem a ponte.
 */
function syncNative(cfg: GuardianConfig): void {
  const panic = getNativePanic()
  if (!panic) return
  panic
    .setGuardian({ armed: cfg.armed, shakeEnabled: cfg.shakeEnabled, silent: cfg.silent })
    .catch(() => {})
}
