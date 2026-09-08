/**
 * ble-radar.ts — RADAR BLUETOOTH SEM EMPARELHAR (v3.15.0).
 *
 * Ponte para o plugin nativo "BleRadar" (Android): puxa TODA a informação
 * dos dispositivos BLE próximos SEM emparelhar e SEM dialogs do sistema:
 *
 *   · MAC real · nome anunciado · RSSI real (distância aproximada)
 *   · Fabricante (Apple/Samsung/Google/Xiaomi/Huawei/Toyota...) · TX power
 *   · Service UUIDs · payload do fabricante (fingerprints AirTag etc.)
 *
 * Dois modos:
 *  · scanNow() — radar pontual na app, resultados ao vivo (evento bleDevice)
 *  · RASTRO (trail) — a cada intervalo: ponto GPS + dispositivos visíveis.
 *    Se acontecer algo, a trilha "Quem/Onde/Quando" sai com o SOS (SMS +
 *    email + nuvem) e ajuda a localizar/reconstituir o percurso da vítima.
 *
 * No web/PWA não há acesso BLE sem emparelhar: as funções tornam-se no-op
 * seguras (isNativeAvailable() = false) e a UI explica a limitação.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

// ── Tipos ─────────────────────────────────────────────────────────────────

/** Dispositivo BLE capturado pelo radar (formato do plugin nativo). */
export interface BleRadarDevice {
  mac: string
  n?: string | null
  r: number
  m?: number
  mf?: string
  md?: string
  s?: string
  tx?: number
  k?: string
  ts?: number
}

/** Ponto do rastro: GPS + dispositivos visíveis naquele momento. */
export interface BleTrailPoint {
  t: number
  lat?: number
  lng?: number
  acc?: number
  n: number
  u: number
  d: BleRadarDevice[]
}

interface BleRadarPluginInterface {
  scanNow(opts?: { durationMs?: number }): Promise<{ found: number; devices: BleRadarDevice[] }>
  stopScan(): Promise<void>
  startTrail(opts?: { intervalSec?: number }): Promise<void>
  stopTrail(): Promise<void>
  getTrail(): Promise<{ points: BleTrailPoint[]; running: boolean; intervalSec?: number }>
  trailStatus(): Promise<{ running: boolean; points: number; lastPointAt: number; intervalSec?: number }>
  clearTrail(): Promise<void>
  hasPermissions(): Promise<{ granted: boolean; btEnabled: boolean }>
  requestPermissions(): Promise<void>
  addListener(eventName: 'bleDevice', cb: (ev: { device: BleRadarDevice }) => void): Promise<PluginListenerHandleLike>
  addListener(eventName: 'trailPoint', cb: (ev: { point: BleTrailPoint }) => void): Promise<PluginListenerHandleLike>
  removeAllListeners(): Promise<void>
}

export interface PluginListenerHandleLike {
  remove: () => Promise<void>
}

const isAndroid = Capacitor.getPlatform() === 'android'

let plugin: BleRadarPluginInterface | null = null
if (isAndroid) {
  try {
    plugin = registerPlugin<BleRadarPluginInterface>('BleRadar')
  } catch {
    plugin = null
  }
}

/** true quando o radar nativo está disponível (só no APK Android). */
export function isBleRadarAvailable(): boolean {
  return !!plugin
}

// ── Fabricantes (espelho da tabela SIG do lado nativo) ────────────────────

const MFR_NAMES: Record<number, string> = {
  1: 'Nokia',
  6: 'Microsoft',
  76: 'Apple',
  87: 'Harman/JBL',
  117: 'Samsung',
  135: 'Garmin',
  158: 'Bose',
  174: 'LG',
  224: 'Google',
  301: 'Sony',
  369: 'Lenovo',
  637: 'Huawei',
  911: 'Xiaomi',
  741: 'Realme',
  1194: 'Honor',
}

export function manufacturerName(id?: number): string {
  if (id == null || id < 0) return ''
  return MFR_NAMES[id] || `ID 0x${id.toString(16).toUpperCase().padStart(4, '0')}`
}

// ── Distância aproximada a partir do RSSI ─────────────────────────────────

/** Estimativa de distância (metros) — path-loss 2.0, TX padrão -59 dBm. */
export function rssiToMeters(rssi: number, tx?: number): number {
  const txPower = typeof tx === 'number' && tx !== 0 ? tx : -59
  const d = Math.pow(10, (txPower - rssi) / 20)
  return Math.round(d * 10) / 10
}

/** Distância em texto humano — para cartões/emails. */
export function distanceLabel(rssi: number, tx?: number): string {
  const m = rssiToMeters(rssi, tx)
  if (m < 1.5) return 'Ao lado (<2m)'
  if (m < 5) return 'Muito perto (~5m)'
  if (m < 10) return 'Perto (~10m)'
  if (m < 25) return 'A alguns metros (~20m)'
  return 'Longe (>25m)'
}

/** Barras de sinal (1-4) a partir do RSSI. */
export function rssiBars(rssi: number): number {
  if (rssi >= -55) return 4
  if (rssi >= -70) return 3
  if (rssi >= -85) return 2
  return 1
}

// ── Scan pontual ──────────────────────────────────────────────────────────

/** Radar pontual: devolve dispositivos encontrados (janela de 4s por defeito). */
export async function bleScanNow(durationMs = 4000): Promise<BleRadarDevice[]> {
  if (!plugin) return []
  try {
    const res = await plugin.scanNow({ durationMs })
    return res?.devices || []
  } catch {
    return []
  }
}

// ── Rastro automático ─────────────────────────────────────────────────────

export async function bleStartTrail(intervalSec = 60): Promise<boolean> {
  if (!plugin) return false
  try {
    await plugin.startTrail({ intervalSec })
    return true
  } catch {
    return false
  }
}

export async function bleStopTrail(): Promise<void> {
  await plugin?.stopTrail().catch(() => {})
}

export async function bleGetTrail(): Promise<{ points: BleTrailPoint[]; running: boolean; intervalSec?: number }> {
  if (!plugin) return { points: [], running: false }
  try {
    const res = await plugin.getTrail()
    return { points: res?.points || [], running: !!res?.running, intervalSec: res?.intervalSec }
  } catch {
    return { points: [], running: false }
  }
}

export async function bleClearTrail(): Promise<void> {
  await plugin?.clearTrail().catch(() => {})
}

export async function bleHasPermissions(): Promise<{ granted: boolean; btEnabled: boolean }> {
  if (!plugin) return { granted: true, btEnabled: true }
  try {
    return await plugin.hasPermissions()
  } catch {
    return { granted: false, btEnabled: false }
  }
}

export async function bleRequestPermissions(): Promise<boolean> {
  if (!plugin) return true
  try {
    await plugin.requestPermissions()
    return true
  } catch {
    return false
  }
}

/** Subscreve resultados ao vivo do radar (só nativo). */
export function onBleDevice(
  cb: (device: BleRadarDevice) => void
): () => void {
  if (!plugin) return () => {}
  let handle: PluginListenerHandleLike | null = null
  plugin.addListener('bleDevice', (ev) => {
    if (ev?.device) cb(ev.device)
  }).then((h) => { handle = h }).catch(() => {})
  return () => { handle?.remove().catch(() => {}) }
}

// ── Snapshot para o SOS ───────────────────────────────────────────────────

export interface BleRadarSnapshot {
  /** nº de pontos do rastro disponíveis */
  points: number
  /** total de observações de dispositivos nos pontos enviados */
  observations: number
  /** MACs únicos nos pontos enviados */
  uniqueDevices: number
  /** nomes/classificações dos dispositivos mais próximos (sem repetição) */
  topNames: string[]
  /** últimos 10 pontos do rastro (para o email e a nuvem) */
  recentPoints: BleTrailPoint[]
  /** rastro estava activo no momento do SOS */
  running: boolean
}

/**
 * Lê o rastro BLE actual (instantâneo — nada de scan no caminho crítico
 * do SOS). Usado pelo useEmergency para anexar o "Quem/Onde/Quando" ao
 * SMS, email e nuvem.
 */
export async function readBleRadarSnapshot(maxPoints = 10): Promise<BleRadarSnapshot> {
  const empty: BleRadarSnapshot = {
    points: 0,
    observations: 0,
    uniqueDevices: 0,
    topNames: [],
    recentPoints: [],
    running: false,
  }
  if (!plugin) return empty
  try {
    const { points, running } = await bleGetTrail()
    if (!points || points.length === 0) return { ...empty, running }
    const recent = points.slice(-maxPoints)
    const seen = new Set<string>()
    const names: string[] = []
    let observations = 0
    // mais próximos primeiro (RSSI maior) nos últimos pontos
    const flat: BleRadarDevice[] = []
    for (const p of recent) flat.push(...(p.d || []))
    flat.sort((a, b) => (b.r || -127) - (a.r || -127))
    for (const d of flat) {
      observations++
      if (d.mac) seen.add(d.mac)
      const label = d.n || d.k || (d.mf ? d.mf : null)
      if (label && names.length < 5 && !names.includes(label)) names.push(label)
    }
    return {
      points: points.length,
      observations,
      uniqueDevices: seen.size,
      topNames: names,
      recentPoints: recent,
      running,
    }
  } catch {
    return empty
  }
}

// ── Formatação para SMS/email ─────────────────────────────────────────────

/** Resumo 1-linha do rastro para o SMS (GSM 7-bit, sem acentos). */
export function bleRadarSmsSummary(snap: BleRadarSnapshot | null): string {
  if (!snap || snap.observations === 0) return ''
  const parts: string[] = []
  if (snap.topNames.length > 0) parts.push(snap.topNames.slice(0, 3).join(', '))
  return ` Rastro BLE: ${snap.observations} deteccoes (${parts.join(' / ')}).`
}

/** Lista de devices "nome — MAC — sinal" para o email (top N por proximidade). */
export function formatBleDeviceLine(d: BleRadarDevice): string {
  const nome = d.n || d.k || 'Dispositivo sem nome'
  const mfr = d.mf || manufacturerName(d.m)
  const rssi = `sinal ${d.r}dBm (~${rssiToMeters(d.r, d.tx)}m)`
  const kind = d.k && d.k !== nome ? ` [${d.k}]` : ''
  return `  - ${nome}${kind} — MAC ${d.mac} — ${rssi}${mfr ? ` — ${mfr}` : ''}`
}
