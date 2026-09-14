/**
 * radar-registry.ts — REGISTO PERSISTENTE DE DISPOSITIVOS BLE (v3.17.0).
 *
 * O Radar Wi-Fi já tinha registo nativo/web (net-radar.ts). Este módulo dá
 * ao BLUETOOTH o mesmo poder: cada dispositivo capturado fica registado
 * (1.ª vez, última vez, nº de vezes, melhor sinal, tipo, fabricante) e o
 * histórico alimenta a detecção de PERSEGUIDORES/RASTREADORES:
 *
 *   · Rastreadores conhecidos — AirTag, SmartTag, Tile, Chipolo, "Localizador"
 *   · Perseguidor heurístico — mesmo MAC visto ≥5 vezes ao longo de ≥30 min
 *     com sinal forte (≤ -65 dBm): alguém/equipamento que te segue
 *
 * Funciona IGUAL na web e na APK (persistência no localStorage da WebView,
 * que sobrevive a fechos/reinícios da app). O SOS continua a levar o
 * rastro nativo completo (ble_trails) — isto é a camada de histórico.
 */

import type { BleRadarDevice } from '@/lib/ble-radar'

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface BleRegistryEntry {
  mac: string
  name?: string | null
  kind?: string
  mfrId?: number
  mfr?: string
  bestRssi?: number
  lastRssi?: number
  firstSeen: number
  lastSeen: number
  seen: number
  lat?: number
  lng?: number
}

export interface TrackerAlert {
  mac: string
  name?: string | null
  kind: 'known-tracker' | 'following'
  reason: string
  severity: 'high' | 'medium'
  bestRssi?: number
  seen: number
  minutesTracked: number
}

// ── Persistência (localStorage — igual em web e WebView nativa) ───────────

const REG_KEY = 'statusads-ble-registry'
const REG_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
const REG_MAX = 600

function readRaw(): BleRegistryEntry[] {
  try {
    const raw = localStorage.getItem(REG_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - REG_TTL_MS
    return (arr as BleRegistryEntry[]).filter((e) => (e.lastSeen || 0) >= cutoff)
  } catch {
    return []
  }
}

function writeRaw(list: BleRegistryEntry[]): void {
  try {
    while (list.length > REG_MAX) list.pop()
    localStorage.setItem(REG_KEY, JSON.stringify(list))
  } catch { /* quota — segue */ }
}

/** Lê o registo completo de dispositivos BLE já vistos. */
export function bleGetRegistry(): BleRegistryEntry[] {
  return readRaw().sort((a, b) => b.lastSeen - a.lastSeen)
}

/** Apaga o registo BLE por inteiro. */
export function bleClearRegistry(): void {
  try { localStorage.removeItem(REG_KEY) } catch { /* segue */ }
}

/** Remove um dispositivo do registo (por MAC). */
export function bleRemoveEntry(mac: string): void {
  const list = readRaw().filter((e) => e.mac.toLowerCase() !== mac.toLowerCase())
  writeRaw(list)
}

/**
 * Regista/actualiza um dispositivo capturado pelo radar (chamado após cada
 * scan ao vivo). `pos` (opcional) anexa a última posição GPS conhecida.
 */
export function bleRecordObservation(dev: BleRadarDevice, pos?: { lat?: number; lng?: number }): BleRegistryEntry | null {
  if (!dev?.mac) return null
  const list = readRaw()
  const now = Date.now()
  const idx = list.findIndex((e) => e.mac.toLowerCase() === dev.mac.toLowerCase())
  if (idx >= 0) {
    const e = list[idx]
    e.lastSeen = now
    e.seen = (e.seen || 0) + 1
    if (dev.n) e.name = dev.n
    if (dev.k) e.kind = dev.k
    if (typeof dev.m === 'number') { e.mfrId = dev.m; e.mfr = dev.mf || e.mfr }
    else if (dev.mf) e.mfr = dev.mf
    e.lastRssi = dev.r
    if (typeof dev.r === 'number' && (e.bestRssi == null || dev.r > e.bestRssi)) e.bestRssi = dev.r
    if (pos?.lat != null) e.lat = pos.lat
    if (pos?.lng != null) e.lng = pos.lng
    list[idx] = e
    writeRaw(list)
    return e
  }
  const entry: BleRegistryEntry = {
    mac: dev.mac,
    name: dev.n || null,
    kind: dev.k,
    mfrId: dev.m,
    mfr: dev.mf,
    bestRssi: dev.r,
    lastRssi: dev.r,
    firstSeen: now,
    lastSeen: now,
    seen: 1,
    lat: pos?.lat,
    lng: pos?.lng,
  }
  list.unshift(entry)
  writeRaw(list)
  return entry
}

/** Regista vários dispositivos de uma vez (resultado de um scan). */
export function bleRecordMany(devs: BleRadarDevice[], pos?: { lat?: number; lng?: number }): number {
  let n = 0
  for (const d of devs || []) {
    if (bleRecordObservation(d, pos)) n++
  }
  return n
}

// ── Detecção de rastreadores / perseguidores ──────────────────────────────

/** Padrões de nome dos rastreadores comerciais mais comuns. */
const TRACKER_NAME_PATTERNS: RegExp[] = [
  /airtag/i,
  /smart\s?tag/i,       // Samsung SmartTag / SmartTag+
  /galaxy.*tag/i,
  /\btile\b/i,          // Tile Mate/Pro/Slim
  /chipolo/i,
  /trackr/i,
  /nut\s?mini/i,        // clones comuns
  /pet\s?tracker/i,
  /localizador/i,       // classificação nativa da app
  /rastreador/i,
]

function nameLooksLikeTracker(name?: string | null, kind?: string): boolean {
  const hay = `${name || ''} ${kind || ''}`
  return TRACKER_NAME_PATTERNS.some((re) => re.test(hay))
}

/**
 * Analisa o registo e devolve alertas de possíveis rastreadores/perseguidores.
 *
 *  · known-tracker — nome/classificação de rastreador comercial com sinal
 *    recente (visto nos últimos 30 min)
 *  · following — dispositivo sem nome de rastreador mas presente ≥5 vezes,
 *    ao longo de ≥30 min, sempre com sinal forte (melhor RSSI ≥ -65):
 *    padrão de quem se desloca CONTIGO (perseguidor, rastreador escondido
 *    no carro/mochila, ou ex com app de localização num telemóvel escondido)
 */
export function detectTrackers(registry?: BleRegistryEntry[]): TrackerAlert[] {
  const reg = registry || bleGetRegistry()
  const now = Date.now()
  const alerts: TrackerAlert[] = []

  for (const e of reg) {
    const minutes = Math.max(0, Math.round((e.lastSeen - e.firstSeen) / 60_000))

    // 1. Rastreador comercial conhecido visto recentemente
    if (nameLooksLikeTracker(e.name, e.kind)) {
      const recent = now - e.lastSeen <= 30 * 60_000
      if (recent && (e.bestRssi ?? -127) >= -75) {
        alerts.push({
          mac: e.mac,
          name: e.name,
          kind: 'known-tracker',
          reason: `${e.name || e.kind || 'Rastreador'} detectado a ${Math.max(1, Math.round(Math.pow(10, (-59 - (e.bestRssi ?? -59)) / 20)))} m de si nos últimos 30 min. Se não é seu, procure-o (bolsa, carro, rodas) e desactive-o.`,
          severity: 'high',
          bestRssi: e.bestRssi,
          seen: e.seen,
          minutesTracked: minutes,
        })
      }
      continue
    }

    // 2. Perseguidor heurístico: ≥5 observações, ≥30 min, sinal forte
    if (
      (e.seen || 0) >= 5 &&
      minutes >= 30 &&
      (e.bestRssi ?? -127) >= -65
    ) {
      alerts.push({
        mac: e.mac,
        name: e.name,
        kind: 'following',
        reason: `Dispositivo ${e.name || e.mfr || 'sem nome'} (${e.mac}) visto ${e.seen}× ao longo de ${minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}min`} SEMPRE perto de si (sinal ≤ ${Math.abs(e.bestRssi ?? 0)} m de alcance). Padrão de quem se desloca consigo.`,
        severity: 'medium',
        bestRssi: e.bestRssi,
        seen: e.seen,
        minutesTracked: minutes,
      })
    }
  }

  // high primeiro
  const order = { high: 0, medium: 1 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

// ── Score de segurança do ambiente BLE ────────────────────────────────────

/**
 * Contributo do ambiente BLE para o score de risco 0-100 (usado pela
 * Central de Segurança): rastreadores pesam muito, densidade alta de
 * dispositivos desconhecidos pesa pouco.
 */
export function bleRiskScore(alerts: TrackerAlert[], registryCount: number): number {
  let score = 0
  for (const a of alerts) score += a.severity === 'high' ? 45 : 20
  // muitos dispositivos anónimos por perto = ambiente denso (risco baixo extra)
  if (registryCount > 40) score += 5
  return Math.min(score, 100)
}
