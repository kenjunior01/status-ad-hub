/**
 * radar-snapshot.ts — CONTEXTO FORENSE DO REC (v3.36.0).
 *
 * Uma gravação de evidência é uma prova — mas o áudio sozinho não responde
 * a "quem estava à volta quando isto foi gravado?". Este módulo congela o
 * CONTEXTO DE RADAR no instante em que o REC começa e viaja nos metadados
 * da gravação nativa (EvidenceService › evidence_prefs):
 *
 *  · dispositivos à volta na janela recente (histórico de presenças 30 dias,
 *    filtrado a 15 min) — Wi-Fi e BLE, com dono atribuído quando existir
 *  · local actual (impressão digital de BSSIDs do net-intel)
 *  · posição aproximada (fix do motor de rádio: lat/lng/precisão/rumo/vel.)
 *  · risco do ambiente no último ciclo da sentinela
 *
 * Tudo é lido de forma SÍNCRONA do localStorage — o caminho do pânico não
 * pode esperar por scans. Nada sai do aparelho: os metadados vivem nas
 * evidence_prefs (como os .m4a vivem na pasta Evidence), a paridade com o
 * que a app já guarda local é intencional — é exactamente o que serve de
 * prova. Capacidade limitada (tecto de bytes na ponte nativa).
 */

import { getPresenceDevices, type PresenceEntry } from '@/lib/presence-history'
import { getPlaceState } from '@/lib/net-intel'
import { getRadioPositionState } from '@/lib/radio-position'

/** quem apareceu nos últimos 15 min conta como "à volta" */
const NOW_WINDOW_MS = 15 * 60_000
/** top N Wi-Fi e top N BLE guardados (metadados compactos, os mais fortes) */
const MAX_PER_KIND = 8
/** tecto do JSON que atravessa a ponte nativa (chars) */
const MAX_RAW_CHARS = 16_000

export interface RadarSnapshotDevice {
  /** BSSID (Wi-Fi) ou MAC (BLE) — fica no aparelho, igual ao histórico */
  id: string
  /** 'wifi' | 'ble' */
  k: PresenceEntry['kind']
  /** SSID ou nome anunciado */
  n?: string | null
  /** dono atribuído ("Maria", "carro do vizinho"…) */
  o?: string | null
  /** último sinal (dBm) */
  r?: number | null
  /** última vez visto (epoch ms) */
  s?: number
}

export interface RadarSnapshot {
  /** versão do formato — parse defensivo */
  v: 1
  capturedAt: number
  /** etiqueta do local actual (impressão digital de BSSIDs) */
  place?: string | null
  /** posição aproximada no momento (motor de rádio) */
  pos?: {
    lat: number
    lng: number
    /** precisão estimada (m) */
    acc: number
    mode?: string
    /** rumo (graus, 0=N) */
    heading?: number
    /** velocidade (m/s) */
    speedMs?: number
  } | null
  /** risco do ambiente 0-100 no último ciclo da sentinela */
  risk?: number | null
  wifi: RadarSnapshotDevice[]
  ble: RadarSnapshotDevice[]
  /** total de dispositivos à volta na janela (pode exceder os listados) */
  around: number
}

const RISK_HISTORY_KEY = 'statusads-risk-history' // mantido pelo useRadarWatch

/** último risco do ambiente (0-100) — leitura directa do histórico local. */
function readLastRisk(): number | null {
  try {
    const raw = localStorage.getItem(RISK_HISTORY_KEY)
    if (!raw) return null
    const arr = JSON.parse(raw) as Array<{ t?: number; r?: number }>
    if (!Array.isArray(arr) || arr.length === 0) return null
    const last = arr[arr.length - 1]
    return typeof last?.r === 'number' ? last.r : null
  } catch {
    return null
  }
}

function toDevice(e: PresenceEntry): RadarSnapshotDevice {
  return {
    id: e.id,
    k: e.kind,
    n: e.name ?? null,
    o: e.owner ?? null,
    r: e.lastRssi ?? e.bestRssi ?? null,
    s: e.lastSeen,
  }
}

/** mais forte primeiro (RSSI mais perto de 0 = mais perto) */
function bySignal(a: PresenceEntry, b: PresenceEntry): number {
  const ra = a.lastRssi ?? a.bestRssi ?? -999
  const rb = b.lastRssi ?? b.bestRssi ?? -999
  return rb - ra
}

/**
 * Congela o contexto de radar AGORA — síncrono, só localStorage (o caminho
 * do pânico não pode esperar por scans). Melhor esforço: falhas devolvem
 * um snapshot vazio mas válido, nunca bloqueiam o REC.
 */
export function captureRadarSnapshot(): RadarSnapshot {
  const now = Date.now()
  const snap: RadarSnapshot = { v: 1, capturedAt: now, wifi: [], ble: [], around: 0 }
  try {
    const cutoff = now - NOW_WINDOW_MS
    const around = getPresenceDevices().filter((e) => (e.lastSeen || 0) >= cutoff)
    snap.around = around.length
    snap.wifi = around.filter((e) => e.kind === 'wifi').sort(bySignal).slice(0, MAX_PER_KIND).map(toDevice)
    snap.ble = around.filter((e) => e.kind === 'ble').sort(bySignal).slice(0, MAX_PER_KIND).map(toDevice)
  } catch { /* presenças — melhor esforço */ }
  try {
    snap.place = getPlaceState().current?.label ?? null
  } catch { /* local — melhor esforço */ }
  try {
    const fix = getRadioPositionState().fix
    if (fix) {
      snap.pos = {
        lat: fix.lat,
        lng: fix.lng,
        acc: Math.round(fix.acc),
        mode: fix.mode,
        heading: typeof fix.heading === 'number' ? Math.round(fix.heading) : undefined,
        speedMs: typeof fix.speedMs === 'number' ? Math.round(fix.speedMs * 10) / 10 : undefined,
      }
    }
  } catch { /* posição — melhor esforço */ }
  snap.risk = readLastRisk()
  return snap
}

/**
 * Serializa para a ponte nativa — se estourar o tecto, devolve uma versão
 * reduzida (contagens sem listas): o contexto nunca parte o startEvidence.
 */
export function serializeRadarSnapshot(s: RadarSnapshot): string {
  try {
    const raw = JSON.stringify(s)
    if (raw.length <= MAX_RAW_CHARS) return raw
    const slim: RadarSnapshot = { ...s, wifi: [], ble: [] }
    return JSON.stringify(slim)
  } catch {
    return ''
  }
}

/** Parse defensivo do campo 'radar' dos metadados nativos (null = sem contexto). */
export function parseRadarSnapshot(raw?: string | null): RadarSnapshot | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as RadarSnapshot
    if (!o || o.v !== 1 || !Array.isArray(o.wifi) || !Array.isArray(o.ble)) return null
    return o
  } catch {
    return null
  }
}

/**
 * Linha de contexto pt-PT do snapshot — null quando não há nada relevante
 * (o SMS/email nunca levam "ambiente vazio"). Ex.:
 * "4 Wi-Fi · 2 BLE · Local 1 · ±14 m · risco 35".
 */
export function radarSnapshotContextLine(s: RadarSnapshot): string | null {
  const parts: string[] = []
  if (s.wifi.length > 0) parts.push(`${s.wifi.length} Wi-Fi`)
  if (s.ble.length > 0) parts.push(`${s.ble.length} BLE`)
  if (s.place) parts.push(s.place)
  if (s.pos && typeof s.pos.acc === 'number') parts.push(`±${s.pos.acc} m`)
  if (typeof s.risk === 'number' && s.risk > 0) parts.push(`risco ${s.risk}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Resumo pt-PT de uma linha: "4 Wi-Fi · 2 BLE · Local 1 · ±14 m · risco 35". */
export function radarSnapshotSummary(s: RadarSnapshot): string {
  return radarSnapshotContextLine(s) ?? 'ambiente vazio'
}

/**
 * v3.38.0 — "QUEM ESTAVA À VOLTA" para o SMS de emergência (ASCII puro,
 * GSM 7-bit). O canal mais fiável da app (sai pelo SIM mesmo sem internet)
 * passa a levar os DONOS atribuídos no histórico de presenças — a resposta
 * humana que as testemunhas ao vivo não têm.
 *
 * Regras de composição (espaço de SMS é caro):
 *  · só entra quando há PELO MENOS UM dono — sem donos, a linha não existe
 *  · um dono por entrada (o dispositivo com sinal mais forte ganha)
 *  · ordenado por sinal (mais perto primeiro), tecto de 3 nomes
 *  · dispositivos sem dono viram "+N sem dono" (contagem do snapshot)
 * Ex.: " Com quem: Maria (BLE), Pedro (WiFi); +5 sem dono."
 */
export function peopleSmsSummary(s: RadarSnapshot | null): string {
  if (!s) return ''
  const owned = new Map<string, { owner: string; kind: string; rssi: number }>()
  try {
    for (const d of [...(s.wifi || []), ...(s.ble || [])]) {
      const owner = (d.o || '').trim()
      if (!owner) continue
      const prev = owned.get(owner)
      const rssi = typeof d.r === 'number' ? d.r : -999
      if (!prev || rssi > prev.rssi) owned.set(owner, { owner, kind: d.k, rssi })
    }
  } catch { return '' }
  if (owned.size === 0) return ''
  const named = [...owned.values()]
    .sort((a, b) => b.rssi - a.rssi)
    .slice(0, 3)
    .map((o) => `${sanitizeSmsName(o.owner)} (${o.kind === 'wifi' ? 'WiFi' : 'BT'})`)
  const unnamed = Math.max(0, (s.around || 0) - owned.size)
  const tail = unnamed > 0 ? `; +${unnamed} sem dono` : ''
  return ` Com quem: ${named.join(', ')}${tail}.`
}

/** Nome para SMS: ASCII puro (GSM 7-bit), sem acentos, espaços colapsados. */
function sanitizeSmsName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
}
