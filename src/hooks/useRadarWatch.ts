/**
 * useRadarWatch — VIGILÂNCIA CONTÍNUA (v3.17.0).
 *
 * Modo "sentinela": enquanto activo, faz auto-scan do ambiente a cada
 * ciclo (Wi-Fi + BLE na APK; rede actual na web), alimenta os registos
 * persistentes, analisa ameaças e escreve tudo no diário de segurança.
 *
 * Também mantém o HISTÓRICO DE RISCO (últimos 120 pontos) para a Central
 * de Segurança desenhar a evolução do ambiente ao longo do tempo.
 *
 * O estado é um singleton (useSyncExternalStore) — várias páginas podem
 * usar o hook sem duplicar timers nem scans.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { wifiScanNow, wifiGetRegistry, analyzeNetworkThreats, environmentRiskScore, isWifiRadarAvailable } from '@/lib/net-radar'
import { bleScanNowSafe } from '@/components/net/net-shared'
import { isBleRadarAvailable } from '@/lib/ble-radar'
import { bleRecordMany, detectTrackers } from '@/lib/radar-registry'
import { logSecurityEvent, logThreatsToSecurityLog } from '@/lib/security-events'
import { geoGetCurrent } from '@/lib/native'

// ── Estado singleton ──────────────────────────────────────────────────────

export interface RadarWatchState {
  /** vigilância contínua activa */
  watching: boolean
  /** último ciclo completo (timestamp) */
  lastCycleAt: number
  /** nº de ciclos executados nesta sessão */
  cycles: number
  /** risco actual do ambiente 0-100 */
  riskScore: number
  /** histórico de risco [{t, r}] — máx. 120 pontos */
  riskHistory: Array<{ t: number; r: number }>
  /** erro do último ciclo */
  lastError: string | null
}

const WATCH_KEY = 'statusads-radar-watch'
const HISTORY_KEY = 'statusads-risk-history'
const CYCLE_MS = 45_000 // ciclo padrão: 45s
const HISTORY_MAX = 120

let state: RadarWatchState = {
  watching: false,
  lastCycleAt: 0,
  cycles: 0,
  riskScore: 0,
  riskHistory: readHistory(),
  lastError: null,
}

const listeners = new Set<() => void>()

function readHistory(): RadarWatchState['riskHistory'] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.slice(-HISTORY_MAX) : []
  } catch {
    return []
  }
}

function persistHistory(): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.riskHistory.slice(-HISTORY_MAX)))
  } catch { /* quota */ }
}

function emit(): void {
  for (const l of listeners) {
    try { l() } catch { /* segue */ }
  }
}

function setState(patch: Partial<RadarWatchState>): void {
  state = { ...state, ...patch }
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// ── Motor de ciclo ────────────────────────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null
let cycling = false

async function runCycle(): Promise<void> {
  if (cycling) return
  cycling = true
  try {
    let risk = 0
    let err: string | null = null

    // 1. Wi-Fi (APK: scan real; web: sem scan — usa cache/ambiente)
    if (isWifiRadarAvailable()) {
      try {
        const nets = await wifiScanNow()
        if (nets.length > 0) {
          const reg = await wifiGetRegistry()
          const threats = analyzeNetworkThreats(nets, reg)
          risk = Math.max(risk, environmentRiskScore(threats, nets))
          logThreatsToSecurityLog(threats)
        }
      } catch (e) {
        err = 'Falha no scan Wi-Fi'
      }
    }

    // 2. BLE (APK) — registo + rastreadores
    if (isBleRadarAvailable()) {
      try {
        const devs = await bleScanNowSafe(3000)
        if (devs.length > 0) {
          const pos = await geoGetCurrent(8_000).catch(() => null)
          bleRecordMany(devs, pos ? { lat: pos.latitude, lng: pos.longitude } : undefined)
          const alerts = detectTrackers()
          for (const a of alerts) {
            logSecurityEvent(
              'tracker',
              a.severity === 'high' ? 'high' : 'medium',
              a.kind === 'known-tracker'
                ? `Rastreador detectado: ${a.name || a.mac}`
                : `Possível perseguidor: ${a.name || a.mac}`,
              a.reason,
              { mac: a.mac, kind: a.kind },
            )
          }
          if (alerts.some((a) => a.severity === 'high')) risk = Math.max(risk, 85)
          else if (alerts.length > 0) risk = Math.max(risk, 55)
        }
      } catch {
        err = err ? `${err} · BLE` : 'Falha no scan BLE'
      }
    }

    // 3. Web: risco baseado na ligação (offline = risco de comunicação)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      risk = Math.max(risk, 40)
      logSecurityEvent('system', 'low', 'Sem ligação à rede', 'A app está offline — o SOS usa SMS local.', undefined, 30 * 60_000)
    }

    // 4. histórico de risco
    const history = [...state.riskHistory, { t: Date.now(), r: risk }].slice(-HISTORY_MAX)
    persistHistory()

    setState({
      lastCycleAt: Date.now(),
      cycles: state.cycles + 1,
      riskScore: risk,
      riskHistory: history,
      lastError: err,
    })
  } finally {
    cycling = false
  }
}

function startWatch(): void {
  if (timer) return
  setState({ watching: true })
  try { localStorage.setItem(WATCH_KEY, '1') } catch { /* segue */ }
  logSecurityEvent('system', 'info', 'Vigilância contínua activada', 'A app passa a escanear o ambiente automaticamente.', undefined, 60 * 60_000)
  // primeiro ciclo imediato, depois o intervalo
  void runCycle()
  timer = setInterval(() => void runCycle(), CYCLE_MS)
}

function stopWatch(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  setState({ watching: false })
  try { localStorage.removeItem(WATCH_KEY) } catch { /* segue */ }
  logSecurityEvent('system', 'info', 'Vigilância contínua desactivada', undefined, undefined, 60 * 60_000)
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useRadarWatch() {
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )

  const toggle = useCallback((on?: boolean) => {
    const next = typeof on === 'boolean' ? on : !state.watching
    if (next) startWatch()
    else stopWatch()
    return next
  }, [])

  const runOnce = useCallback(async () => {
    await runCycle()
  }, [])

  return {
    ...snap,
    toggle,
    runOnce,
    /** scan BLE/Wi-Fi nativo disponível nesta plataforma */
    nativeRadar: isWifiRadarAvailable() || isBleRadarAvailable(),
  }
}

/** Reconecta a vigilância ao abrir a app se o utilizador a deixou activa. */
export function resumeWatchIfEnabled(): void {
  try {
    if (localStorage.getItem(WATCH_KEY) === '1' && !timer) startWatch()
  } catch { /* segue */ }
}
