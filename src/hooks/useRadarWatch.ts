/**
 * useRadarWatch — VIGILÂNCIA CONTÍNUA (v3.17.0, inteligência v3.18.0).
 *
 * Modo "sentinela": enquanto activo, faz auto-scan do ambiente a cada
 * ciclo (Wi-Fi + BLE na APK; rede actual na web), alimenta os registos
 * persistentes, analisa ameaças e escreve tudo no diário de segurança.
 *
 * v3.18.0 — cada ciclo também:
 *   · guarda o HISTÓRICO DE SINAL por rede (sparklines no Radar)
 *   · faz CHECK-IN DE LOCAL (impressão digital de BSSIDs) e detecta
 *     DESLOCAMENTOS ABRUPTOS para locais desconhecidos (sinal de
 *     rapto/coação → evento high no diário + entra na correlação)
 *   · calcula o CONGESTIONAMENTO de canais do ambiente
 *   · expõe o VEREDICTO correlacionado (calmo/elevado/crítico)
 *
 * Também mantém o HISTÓRICO DE RISCO (últimos 120 pontos) para a Central
 * de Segurança desenhar a evolução do ambiente ao longo do tempo.
 *
 * O estado é um singleton (useSyncExternalStore) — várias páginas podem
 * usar o hook sem duplicar timers nem scans.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { wifiScanNow, wifiGetRegistry, analyzeNetworkThreats, environmentRiskScore, isWifiRadarAvailable, getWifiRadarPlugin } from '@/lib/net-radar'
import {
  updateRadioPosition, applyRttDistances, setRttSupported,
  type RadioObs,
} from '@/lib/radio-position'
import { bleScanNowSafe } from '@/components/net/net-shared'
import { isBleRadarAvailable } from '@/lib/ble-radar'
import { bleRecordMany, detectTrackers, type TrackerAlert } from '@/lib/radar-registry'
import { logSecurityEvent, logThreatsToSecurityLog } from '@/lib/security-events'
import { geoGetCurrent, haptic } from '@/lib/native'
import {
  recordRssiSamples, placeCheckIn, getPlaceState, assessPlaceAnomaly,
  analyzeChannelCongestion, correlateEnvironment,
  type ChannelCongestion, type PlaceState as IntelPlaceState, type AmbientVerdict,
} from '@/lib/net-intel'

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
  // ── v3.18.0 — inteligência de ambiente ─────────────────────────
  /** local actual (impressão digital de BSSIDs) */
  place: IntelPlaceState
  /** true quando o último ciclo detectou deslocamento abrupto para local novo */
  placeAnomaly: boolean
  /** congestionamento de canais do último ciclo */
  congestion: ChannelCongestion | null
  /** veredicto correlacionado (Wi-Fi + BLE + local) */
  verdict: AmbientVerdict | null
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
  place: getPlaceState(),
  placeAnomaly: false,
  congestion: null,
  verdict: null,
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
    let threats: ReturnType<typeof analyzeNetworkThreats> = []
    let trackers: TrackerAlert[] = []
    let congestion: ChannelCongestion | null = null
    let place = getPlaceState()
    let placeAnomaly = false

    // 1. Wi-Fi (APK: scan real; web: sem scan — usa cache/ambiente)
    let radioNets: Awaited<ReturnType<typeof wifiScanNow>> = []
    let radioBle: Array<{ mac: string; r: number; tx?: number }> = []
    if (isWifiRadarAvailable()) {
      try {
        const nets = await wifiScanNow()
        radioNets = nets
        if (nets.length > 0) {
          const reg = await wifiGetRegistry()
          threats = analyzeNetworkThreats(nets, reg)
          risk = Math.max(risk, environmentRiskScore(threats, nets))
          logThreatsToSecurityLog(threats)
          // v3.18.0 — histórico de sinal + congestionamento + check-in de local
          recordRssiSamples(nets)
          congestion = analyzeChannelCongestion(nets)
          const pos = await geoGetCurrent(8_000).catch(() => null)
          place = placeCheckIn(nets, pos ? { lat: pos.latitude, lng: pos.longitude } : null)
          const anomaly = assessPlaceAnomaly(place)
          placeAnomaly = anomaly.anomaly
          if (anomaly.anomaly) {
            logSecurityEvent('threat', 'high', anomaly.title, anomaly.detail, { hash: place.current?.hash }, 60 * 60_000)
            risk = Math.max(risk, 75)
            // v3.21.0 — háptica de alerta no deslocamento abrupto (máx. 1x/10min)
            if (Date.now() - lastAnomalyHaptic > 10 * 60_000) {
              lastAnomalyHaptic = Date.now()
              void haptic('heavy')
            }
          }
        }
      } catch (e) {
        err = 'Falha no scan Wi-Fi'
      }
    }

    // 2. BLE (APK) — registo + rastreadores
    if (isBleRadarAvailable()) {
      try {
        const devs = await bleScanNowSafe(3000)
        radioBle = devs.map((d) => ({ mac: d.mac, r: d.r, tx: d.tx }))
        if (devs.length > 0) {
          const pos = await geoGetCurrent(8_000).catch(() => null)
          bleRecordMany(devs, pos ? { lat: pos.latitude, lng: pos.longitude } : undefined)
          trackers = detectTrackers()
          // v3.21.0 — háptica só para rastreadores novos nesta sessão
          const novosTrackers = trackers.filter((a) => !alertedWatchTrackers.has(a.mac))
          novosTrackers.forEach((a) => alertedWatchTrackers.add(a.mac))
          if (novosTrackers.length > 0) void haptic('heavy')
          for (const a of trackers) {
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
          if (trackers.some((a) => a.severity === 'high')) risk = Math.max(risk, 85)
          else if (trackers.length > 0) risk = Math.max(risk, 55)
        }
      } catch {
        err = err ? `${err} · BLE` : 'Falha no scan BLE'
      }
    }

    // 2.5 v3.32.0 — MOTOR DE POSIÇÃO POR RÁDIO: com GPS bom calibra as
    // âncoras (routers/BLE com posição estimada); sem GPS navega por elas
    // (multilateração). RTT 802.11mc dá distância real quando o hardware
    // suporta; senão modelo log-distância de RSSI. Melhor esforço — nunca
    // trava a sentinela.
    try {
      let obsNets: RadioObs[] = radioNets.map((n) => ({ id: n.bssid, rssi: n.rssi, kind: 'wifi' as const, band: n.band }))
      if (obsNets.length > 0 && radioRttSupported !== false) {
        const rtt = await getWifiRadarPlugin()?.wifiRttRange().catch(() => null)
        if (rtt) {
          radioRttSupported = !!rtt.supported
          setRttSupported(radioRttSupported)
          if (rtt.supported && rtt.ranged?.length > 0) obsNets = applyRttDistances(obsNets, rtt.ranged)
        }
      }
      const rpos = await geoGetCurrent(10_000).catch(() => null)
      updateRadioPosition(
        obsNets,
        radioBle.map((d) => ({ id: d.mac, rssi: d.r, kind: 'ble' as const, tx: d.tx })),
        rpos ? { lat: rpos.latitude, lng: rpos.longitude, acc: rpos.accuracy } : null,
      )
    } catch { /* motor é melhor esforço */ }

    // 3. Web: risco baseado na ligação (offline = risco de comunicação)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      risk = Math.max(risk, 40)
      logSecurityEvent('system', 'low', 'Sem ligação à rede', 'A app está offline — o SOS usa SMS local.', undefined, 30 * 60_000)
    }

    // 4. v3.18.0 — veredicto correlacionado (Wi-Fi + BLE + local)
    const verdict = correlateEnvironment(threats, trackers, place)
    if (verdict.level === 'critical') risk = Math.max(risk, Math.max(risk, 90))

    // 5. histórico de risco
    const history = [...state.riskHistory, { t: Date.now(), r: risk }].slice(-HISTORY_MAX)
    persistHistory()

    setState({
      lastCycleAt: Date.now(),
      cycles: state.cycles + 1,
      riskScore: risk,
      riskHistory: history,
      lastError: err,
      place,
      placeAnomaly,
      congestion,
      verdict,
    })
  } finally {
    cycling = false
  }
}

/** rastreadores que já dispararam háptica na sentinela (por sessão) */
const alertedWatchTrackers = new Set<string>()
/** último háptico de deslocamento abrupto (evita repetição a cada ciclo) */
let lastAnomalyHaptic = 0
/** RTT 802.11mc deste aparelho (null = ainda não testado) — 1 só teste */
let radioRttSupported: boolean | null = null

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
