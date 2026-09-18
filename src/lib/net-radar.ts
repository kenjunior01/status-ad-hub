/**
 * net-radar.ts — RADAR WI-FI + REDE MÓVEL SEM LIGAÇÃO (v3.16.0).
 *
 * Ponte para o plugin nativo "WifiRadar" (Android) + ANÁLISE DE SEGURANÇA
 * partilhada entre web e nativo. Puxa TODA a informação das redes Wi-Fi
 * próximas SEM SE LIGAR a elas:
 *
 *   · BSSID real (MAC do router) · SSID · RSSI (distância aproximada)
 *   · Frequência/canal · banda (2.4/5/6 GHz)
 *   · Segurança anunciada (ABERTA/WEP/WPA/WPA2/WPA3/Enterprise)
 *   · Operadora móvel + torres celulares visíveis (testemunhas GSM/LTE/5G)
 *
 * REGISTO — todas as redes já vistas ficam registadas (1.ª vez, última
 * vez, nº de vezes, melhor sinal, GPS aproximado). Na APK o registo vive
 * no lado nativo (sobrevive a reinícios); na web, no localStorage.
 *
 * ANÁLISE DE SEGURANÇA (funciona na web E na APK):
 *   · Redes ABERTAS perto (tráfego interceptável, honeypots)
 *   · WEP (encriptação quebrada) e WPA (TKIP obsoleto)
 *   · EVIL TWINS — mesmo SSID com vários BSSID (ataque de imitação)
 *   · Nomes suspeitos (imitação de operadoras/portais, "Free Wi-Fi")
 *   · Redes NOVAS no registo (nunca vistas neste local)
 *   · Score de risco por rede + índice de ameaça do ambiente
 *
 * No web/PWA não há acesso ao scan Wi-Fi do sistema: scanNow() devolve
 * o ambiente pelo Network Information API (ligação actual) e o registo
 * manual funciona normalmente. A UI explica a limitação.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { getPlaceState, analyzeChannelCongestion } from '@/lib/net-intel'

// ── Tipos ─────────────────────────────────────────────────────────────────

/** Rede Wi-Fi capturada pelo radar (formato do plugin nativo). */
export interface WifiRadarNetwork {
  /** BSSID (MAC do router) */
  bssid: string
  ssid: string
  /** RSSI em dBm (mais perto de 0 = mais forte) */
  rssi: number
  /** frequência em MHz */
  freq: number
  /** canal */
  ch: number
  /** banda: 2.4 GHz / 5 GHz / 6 GHz */
  band: string
  /** segurança: ABERTA / WEP / WPA / WPA2 / WPA3 / WPA2/WPA3 / *-ENTERPRISE */
  sec: string
  /** capacidades extra (WPS, 802.11mc, largura de canal) */
  caps?: string
  ts?: number
  // ── v3.32.0 — dados máximos para o motor de posição por rádio ──
  /** responde a ranging 802.11mc (distância real por RTT possível) */
  mc?: boolean
  /** rede Passpoint/Hotspot 2.0 */
  passpoint?: boolean
  /** nome do recinto anunciado (venue) */
  venue?: string
  /** nome do operador anunciado (Passpoint) */
  operator?: string
  /** largura de canal em MHz (20/40/80/160) */
  widthMhz?: number
  /** frequência central do canal primário agregado */
  cf0?: number
  /** idade da amostra no firmware (µs) */
  ageUs?: number
  /** distância REAL por RTT em metros (só quando wifiRttRange correu) */
  distM?: number
}

/** Entrada do registo — uma rede já vista alguma vez. */
export interface WifiRegistryEntry {
  bssid: string
  ssid: string
  sec: string
  freq?: number
  rssi?: number
  firstSeen: number
  lastSeen: number
  seen: number
  lat?: number
  lng?: number
}

/** Torre celular visível (testemunha da rede móvel). */
export interface CellTower {
  type: string
  cid?: number
  nci?: number
  lac?: number
  tac?: number
  pci?: number
  dbm?: number
  ts?: number
}

/** Ponto do rastro: GPS + redes Wi-Fi visíveis + torres naquele momento. */
export interface NetTrailPoint {
  t: number
  lat?: number
  lng?: number
  acc?: number
  n: number
  u: number
  w: Array<{ b: string; s: string; r: number; f: number; sec: string }>
  c?: CellTower[]
  cc?: number
}

interface WifiRadarPluginInterface {
  scanNow(opts?: { windowMs?: number }): Promise<{ found: number; networks: WifiRadarNetwork[] }>
  getNetworks(): Promise<{ found: number; networks: WifiRadarNetwork[] }>
  getRegistry(): Promise<{ entries: WifiRegistryEntry[]; count: number }>
  clearRegistry(): Promise<void>
  startTrail(opts?: { intervalSec?: number }): Promise<void>
  stopTrail(): Promise<void>
  getTrail(): Promise<{ points: NetTrailPoint[]; running: boolean; intervalSec?: number }>
  trailStatus(): Promise<{ running: boolean; points: number; lastPointAt: number; intervalSec?: number }>
  clearTrail(): Promise<void>
  getWifiInfo(): Promise<WifiCurrentInfo>
  getCellInfo(): Promise<{ operator?: string | null; mcc?: string; mnc?: string; towers: CellTower[] }>
  /** v3.32.0 — distância real por RTT (802.11mc) aos routers compatíveis */
  wifiRttRange(): Promise<{ supported: boolean; reason?: string; ranged: Array<{ bssid: string; status: number; distMm?: number; distSdMm?: number; rssi?: number }> }>
  hasPermissions(): Promise<{ granted: boolean; wifiEnabled: boolean; locationOn: boolean }>
  requestPermissions(): Promise<void>
  addListener(eventName: 'wifiNetwork', cb: (ev: { network: WifiRadarNetwork }) => void): Promise<PluginListenerHandleLike>
  addListener(eventName: 'netTrailPoint', cb: (ev: { point: NetTrailPoint }) => void): Promise<PluginListenerHandleLike>
  removeAllListeners(): Promise<void>
}

export interface WifiCurrentInfo {
  connected: boolean
  ssid?: string
  bssid?: string | null
  rssi?: number
  frequency?: number
  linkSpeedMbps?: number
  error?: string
}

export interface PluginListenerHandleLike {
  remove: () => Promise<void>
}

const isAndroid = Capacitor.getPlatform() === 'android'

let plugin: WifiRadarPluginInterface | null = null
if (isAndroid) {
  try {
    plugin = registerPlugin<WifiRadarPluginInterface>('WifiRadar')
  } catch {
    plugin = null
  }
}

/** true quando o radar Wi-Fi nativo está disponível (só no APK Android). */
export function isWifiRadarAvailable(): boolean {
  return !!plugin
}

/** Plugin bruto (v3.32.0 — RTT 802.11mc e métodos avançados). */
export function getWifiRadarPlugin(): WifiRadarPluginInterface | null {
  return plugin
}

// ══════════════════════════════════════════════════════════════════════════
// ANÁLISE DE SEGURANÇA (partilhada web + nativo)
// ══════════════════════════════════════════════════════════════════════════

/** Nível de segurança de uma rede: 0 = perigosa, 4 = forte. */
export function securityLevel(sec: string): 0 | 1 | 2 | 3 | 4 {
  const s = (sec || '').toUpperCase()
  if (s === 'ABERTA' || s.includes('OPEN')) return 0
  if (s.includes('WEP')) return 1
  if (s.startsWith('WPA/') || s === 'WPA') return 2
  if (s.includes('ENTERPRISE')) return 4
  if (s.includes('WPA3')) return 4
  if (s.includes('WPA2')) return 3
  return 2
}

/** Etiqueta humana do nível de segurança. */
export function securityLabel(sec: string): { text: string; tone: 'danger' | 'warn' | 'ok' | 'good' } {
  const lvl = securityLevel(sec)
  if (lvl === 0) return { text: 'Rede aberta — sem encriptação', tone: 'danger' }
  if (lvl === 1) return { text: 'WEP — encriptação quebrada', tone: 'danger' }
  if (lvl === 2) return { text: 'WPA (TKIP) — obsoleta', tone: 'warn' }
  if (lvl === 3) return { text: 'WPA2 — aceitável', tone: 'ok' }
  return { text: 'WPA3/Enterprise — forte', tone: 'good' }
}

/** Distância aproximada a partir do RSSI (path-loss 2.0, TX padrão -59 dBm). */
export function wifiRssiToMeters(rssi: number): number {
  const d = Math.pow(10, (-59 - rssi) / 20)
  return Math.round(d * 10) / 10
}

export function wifiDistanceLabel(rssi: number): string {
  const m = wifiRssiToMeters(rssi)
  if (m < 3) return 'Ao lado (<3m)'
  if (m < 8) return 'Muito perto (~5m)'
  if (m < 20) return 'Perto (~15m)'
  if (m < 45) return 'A alguns metros (~30m)'
  return 'Longe (>45m)'
}

/** Barras de sinal (1-4) a partir do RSSI. */
export function wifiRssiBars(rssi: number): number {
  if (rssi >= -55) return 4
  if (rssi >= -68) return 3
  if (rssi >= -80) return 2
  return 1
}

// ── Detecção de ameaças ──────────────────────────────────────────────────

export type NetThreatKind =
  | 'open'          // rede aberta por perto
  | 'weak'          // WEP/WPA quebrada
  | 'evil-twin'     // mesmo SSID com vários BSSID
  | 'suspicious'    // nome suspeito (honeypot)
  | 'new-network'   // rede nunca vista no registo
  | 'wps'           // WPS activo (brute-force de PIN)
  | 'hidden'        // rede oculta

export interface NetThreat {
  kind: NetThreatKind
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  bssids: string[]
  ssid?: string
}

/** Nomes que aparecem em honeypots/ataques de imitação (heurística). */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /free\s*(wifi|wi-fi|net|internet)/i,
  /wifi\s*gr[áa]tis/i,
  /internet\s*gr[áa]tis/i,
  /gratis\s*wifi/i,
  /m-pesa|mpesa/i,          // imitar marca conhecida
  /mpesa\s*wifi/i,
  /vodafone\s*free/i,
  /movitel\s*free/i,
  /tmcel\s*free/i,
  /login|portal|hotel|airport|aeroport/i, // portais cativos a céu aberto
]

/** Heurística de nome suspeito (honeypot/evil twin de portal). */
export function isSuspiciousSsid(net: WifiRadarNetwork): boolean {
  const ssid = (net.ssid || '').trim()
  if (!ssid || ssid === '<oculta>') return false
  // nome "livre" + rede aberta = honeypot clássico
  if (securityLevel(net.sec) === 0 && SUSPICIOUS_PATTERNS.some((re) => re.test(ssid))) return true
  return SUSPICIOUS_PATTERNS.some((re) => re.test(ssid)) && securityLevel(net.sec) <= 2
}

/**
 * Analisa o ambiente e devolve a lista de ameaças ordenada por severidade.
 * `registry` (opcional) permite marcar redes nunca antes vistas.
 */
export function analyzeNetworkThreats(
  networks: WifiRadarNetwork[],
  registry?: WifiRegistryEntry[]
): NetThreat[] {
  const threats: NetThreat[] = []
  if (!networks || networks.length === 0) return threats

  // 1. Redes abertas por perto
  const open = networks.filter((n) => securityLevel(n.sec) === 0)
  if (open.length > 0) {
    const closest = open.reduce((a, b) => (b.rssi > a.rssi ? b : a))
    threats.push({
      kind: 'open',
      severity: 'high',
      title: `${open.length} rede(s) aberta(s) por perto`,
      detail: `${closest.ssid} está a ${wifiDistanceLabel(closest.rssi)}. Ligar-se a redes abertas expõe o tráfego; bandidos usam-nas para interceptar dados.`,
      bssids: open.map((n) => n.bssid),
    })
  }

  // 2. Encriptação quebrada (WEP/WPA-TKIP)
  const weak = networks.filter((n) => securityLevel(n.sec) <= 1)
  if (weak.length > 0) {
    threats.push({
      kind: 'weak',
      severity: 'high',
      title: `${weak.length} rede(s) com encriptação quebrada (WEP/WPA)`,
      detail: 'WEP e WPA-TKIP podem ser quebradas em minutos. Estas redes não devem ser usadas para nada sensível.',
      bssids: weak.map((n) => n.bssid),
    })
  }

  // 3. EVIL TWINS — mesmo SSID com BSSIDs diferentes
  const bySsid = new Map<string, WifiRadarNetwork[]>()
  for (const n of networks) {
    const ssid = (n.ssid || '').trim()
    if (!ssid || ssid === '<oculta>') continue
    const arr = bySsid.get(ssid) || []
    arr.push(n)
    bySsid.set(ssid, arr)
  }
  const twins: WifiRadarNetwork[][] = []
  for (const arr of bySsid.values()) {
    const uniq = new Set(arr.map((n) => n.bssid.toLowerCase()))
    if (uniq.size >= 2) twins.push(arr)
  }
  if (twins.length > 0) {
    threats.push({
      kind: 'evil-twin',
      severity: 'high',
      title: `${twins.length} SSID com múltiplos pontos de acesso`,
      detail: `${twins.map((t) => t[0].ssid).join(', ')} aparece com ${twins.map((t) => new Set(t.map((n) => n.bssid)).size).join('/')} BSSIDs distintos — pode ser legítimo (repetidores) OU um ataque "evil twin" a imitar a rede. Confirme o BSSID antes de ligar.`,
      bssids: twins.flat().map((n) => n.bssid),
    })
  }

  // 4. Nomes suspeitos
  const susp = networks.filter(isSuspiciousSsid)
  if (susp.length > 0) {
    threats.push({
      kind: 'suspicious',
      severity: 'medium',
      title: `${susp.length} rede(s) com nome suspeito`,
      detail: `${susp.map((n) => n.ssid).slice(0, 3).join(', ')} — nomes "grátis"/imitação de marcas são o padrão clássico de honeypots. Evite ligar-se.`,
      bssids: susp.map((n) => n.bssid),
    })
  }

  // 5. WPS activo + sinal forte
  const wps = networks.filter((n) => (n.caps || '').includes('WPS') && n.rssi >= -70 && securityLevel(n.sec) >= 1)
  if (wps.length > 0) {
    threats.push({
      kind: 'wps',
      severity: 'low',
      title: `${wps.length} rede(s) com WPS activo e sinal forte`,
      detail: 'O WPS (botão/PIN) é vulnerável a força-bruta offline. Próximas de si, aumentam a superfície de ataque no local.',
      bssids: wps.map((n) => n.bssid),
    })
  }

  // 6. Redes ocultas com sinal forte
  const hidden = networks.filter((n) => n.ssid === '<oculta>' && n.rssi >= -70)
  if (hidden.length > 0) {
    threats.push({
      kind: 'hidden',
      severity: 'low',
      title: `${hidden.length} rede(s) oculta(s) por perto`,
      detail: 'Redes com SSID escondido não são necessariamente más, mas escondem-se deliberadamente — vale registar quem as opera.',
      bssids: hidden.map((n) => n.bssid),
    })
  }

  // 7. Redes novas (nunca vistas no registo)
  if (registry && registry.length > 0) {
    const known = new Set(registry.map((e) => e.bssid.toLowerCase()))
    const fresh = networks.filter((n) => !known.has(n.bssid.toLowerCase()) && n.rssi >= -65)
    if (fresh.length > 0) {
      threats.push({
        kind: 'new-network',
        severity: 'medium',
        title: `${fresh.length} rede(s) NOVA(s) com sinal forte`,
        detail: `${fresh.map((n) => n.ssid).slice(0, 3).join(', ')} nunca foram vistas antes neste ambiente e estão perto de si — vigie.`,
        bssids: fresh.map((n) => n.bssid),
      })
    }
  }

  // severidade: high → medium → low
  const order = { high: 0, medium: 1, low: 2 }
  return threats.sort((a, b) => order[a.severity] - order[b.severity])
}

/** Índice de risco do ambiente 0-100 (para o medidor de ameaça). */
export function environmentRiskScore(threats: NetThreat[], networks: WifiRadarNetwork[]): number {
  let score = 0
  for (const t of threats) {
    if (t.severity === 'high') score += 28
    else if (t.severity === 'medium') score += 14
    else score += 6
  }
  // muitas redes abertas fortes aumentam o risco
  const openStrong = networks.filter((n) => securityLevel(n.sec) === 0 && n.rssi >= -60).length
  score += Math.min(openStrong * 5, 20)
  return Math.min(Math.round(score), 100)
}

// ══════════════════════════════════════════════════════════════════════════
// Scan pontual + leitura
// ══════════════════════════════════════════════════════════════════════════

/** Radar Wi-Fi pontual: devolve TODAS as redes próximas (janela ~3.5s). */
export async function wifiScanNow(): Promise<WifiRadarNetwork[]> {
  if (!plugin) return []
  try {
    const res = await plugin.scanNow()
    return res?.networks || []
  } catch {
    return []
  }
}

/** Lê a cache recente de redes SEM disparar scan (barato). */
export async function wifiGetNetworks(): Promise<WifiRadarNetwork[]> {
  if (!plugin) return []
  try {
    const res = await plugin.getNetworks()
    return res?.networks || []
  } catch {
    return []
  }
}

// ── Info da ligação actual (web + nativo) ────────────────────────────────

export interface NetEnvironmentInfo {
  online: boolean
  connectionType?: string
  downlinkMbps?: number
  rttMs?: number
  effectiveType?: string
  saveData?: boolean
  wifi?: WifiCurrentInfo
  operator?: string | null
  towers?: CellTower[]
}

/** Informação do ambiente de rede (nativo: Wi-Fi + celular; web: NIA). */
export async function readNetEnvironment(): Promise<NetEnvironmentInfo> {
  const out: NetEnvironmentInfo = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : false,
  }
  // Network Information API (web + WebView)
  try {
    const conn = (navigator as unknown as { connection?: Record<string, unknown> }).connection
    if (conn) {
      out.connectionType = conn.type as string
      out.downlinkMbps = conn.downlink as number
      out.rttMs = conn.rtt as number
      out.effectiveType = conn.effectiveType as string
      out.saveData = conn.saveData as boolean
    }
  } catch { /* sem NIA */ }

  if (plugin) {
    out.wifi = await plugin.getWifiInfo().catch(() => undefined)
    const cell = await plugin.getCellInfo().catch(() => null)
    if (cell) {
      out.operator = cell.operator
      out.towers = cell.towers || []
    }
  }
  return out
}

// ══════════════════════════════════════════════════════════════════════════
// Registo (registry) — nativo via plugin, web via localStorage
// ══════════════════════════════════════════════════════════════════════════

const WEB_REGISTRY_KEY = 'statusads-wifi-registry'
const WEB_REGISTRY_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 dias
const WEB_REGISTRY_MAX = 400
const WEB_HIDDEN_KEY = 'statusads-wifi-hidden'

/** BSSIDs "esquecidos" pelo utilizador (v3.22.0) — escondidos mesmo na APK,
 *  onde o registo vive no plugin nativo e não tem remoção por entrada. */
function readHiddenWifi(): Set<string> {
  try {
    const raw = localStorage.getItem(WEB_HIDDEN_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(arr) ? arr.map((v) => String(v)) : [])
  } catch {
    return new Set()
  }
}

function wifiHiddenKey(e: { bssid?: string; ssid: string }): string {
  return (e.bssid || e.ssid || '').toLowerCase()
}

export async function wifiGetRegistry(): Promise<WifiRegistryEntry[]> {
  const hidden = readHiddenWifi()
  if (plugin) {
    try {
      const res = await plugin.getRegistry()
      return (res?.entries || []).filter((e: WifiRegistryEntry) => !hidden.has(wifiHiddenKey(e)))
    } catch {
      return []
    }
  }
  // web: localStorage
  try {
    const raw = localStorage.getItem(WEB_REGISTRY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - WEB_REGISTRY_TTL_MS
    return (arr as WifiRegistryEntry[]).filter(
      (e) => (e.lastSeen || 0) >= cutoff && !hidden.has(wifiHiddenKey(e))
    )
  } catch {
    return []
  }
}

/** Regista/atualiza manualmente uma rede (usado na web e pelo sync). */
export async function wifiRegisterManual(entry: Partial<WifiRegistryEntry> & { bssid?: string; ssid: string }): Promise<void> {
  if (plugin) return // nativo: o registo é feito pelo scan
  try {
    const now = Date.now()
    const list = await wifiGetRegistry()
    const key = (entry.bssid || entry.ssid).toLowerCase()
    const idx = list.findIndex((e) => (e.bssid || e.ssid).toLowerCase() === key)
    if (idx >= 0) {
      const e = list[idx]
      e.lastSeen = now
      e.seen = (e.seen || 0) + 1
      if (typeof entry.rssi === 'number' && (e.rssi == null || entry.rssi > e.rssi)) e.rssi = entry.rssi
      if (entry.sec) e.sec = entry.sec
      if (entry.freq) e.freq = entry.freq
      list[idx] = e
    } else {
      list.unshift({
        bssid: entry.bssid || '',
        ssid: entry.ssid,
        sec: entry.sec || 'DESCONHECIDA',
        freq: entry.freq,
        rssi: entry.rssi,
        firstSeen: now,
        lastSeen: now,
        seen: 1,
      })
    }
    while (list.length > WEB_REGISTRY_MAX) list.pop()
    localStorage.setItem(WEB_REGISTRY_KEY, JSON.stringify(list))
  } catch { /* quota — segue */ }
}

/**
 * Regista automaticamente um lote de redes capturadas pelo scan (v3.17.0).
 * Na APK o registo é nativo (o plugin faz isto sozinho); na web este
 * método alimenta o registo local a partir dos scans da página — assim o
 * histórico "redes já vistas" funciona nas duas versões.
 */
export async function wifiRecordMany(nets: WifiRadarNetwork[], pos?: { lat?: number; lng?: number }): Promise<number> {
  if (plugin) return 0 // nativo: registo feito no lado Java
  let n = 0
  for (const net of nets || []) {
    if (!net || !net.ssid) continue
    try {
      await wifiRegisterManual({
        bssid: net.bssid,
        ssid: net.ssid,
        sec: net.sec,
        freq: net.freq,
        rssi: net.rssi,
        lat: pos?.lat,
        lng: pos?.lng,
      })
      n++
    } catch { /* segue */ }
  }
  return n
}

export async function wifiClearRegistry(): Promise<void> {
  if (plugin) {
    await plugin.clearRegistry().catch(() => {})
    return
  }
  try { localStorage.removeItem(WEB_REGISTRY_KEY) } catch { /* segue */ }
}

/**
 * "Esquecer" uma rede específica do histórico (v3.22.0).
 * Web: remove a entrada do registo local. APK: o registo vive no plugin
 * nativo (sem remoção por entrada) — a rede entra na lista de ocultos que
 * o wifiGetRegistry respeita. Em ambas as plataformas o efeito imediato é
 * a rede desaparecer do histórico.
 */
export async function wifiRemoveEntry(bssid: string, ssid?: string): Promise<void> {
  const key = (bssid || ssid || '').toLowerCase()
  if (!key) return
  if (!plugin) {
    try {
      const raw = localStorage.getItem(WEB_REGISTRY_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as WifiRegistryEntry[]
        localStorage.setItem(
          WEB_REGISTRY_KEY,
          JSON.stringify(arr.filter((e) => wifiHiddenKey(e) !== key))
        )
      }
    } catch { /* segue */ }
  }
  try {
    const hidden = readHiddenWifi()
    hidden.add(key)
    localStorage.setItem(WEB_HIDDEN_KEY, JSON.stringify(Array.from(hidden).slice(-300)))
  } catch { /* segue */ }
}

// ══════════════════════════════════════════════════════════════════════════
// Rastro automático
// ══════════════════════════════════════════════════════════════════════════

export async function netStartTrail(intervalSec = 60): Promise<boolean> {
  if (!plugin) return false
  try {
    await plugin.startTrail({ intervalSec })
    return true
  } catch {
    return false
  }
}

export async function netStopTrail(): Promise<void> {
  await plugin?.stopTrail().catch(() => {})
}

export async function netGetTrail(): Promise<{ points: NetTrailPoint[]; running: boolean; intervalSec?: number }> {
  if (!plugin) return { points: [], running: false }
  try {
    const res = await plugin.getTrail()
    return { points: res?.points || [], running: !!res?.running, intervalSec: res?.intervalSec }
  } catch {
    return { points: [], running: false }
  }
}

export async function netClearTrail(): Promise<void> {
  await plugin?.clearTrail().catch(() => {})
}

/** Subscreve redes ao vivo do radar (só nativo). */
export function onWifiNetwork(cb: (net: WifiRadarNetwork) => void): () => void {
  if (!plugin) return () => {}
  let handle: PluginListenerHandleLike | null = null
  plugin.addListener('wifiNetwork', (ev) => {
    if (ev?.network) cb(ev.network)
  }).then((h) => { handle = h }).catch(() => {})
  return () => { handle?.remove().catch(() => {}) }
}

/** Subscreve pontos do rastro (só nativo). */
export function onNetTrailPoint(cb: (point: NetTrailPoint) => void): () => void {
  if (!plugin) return () => {}
  let handle: PluginListenerHandleLike | null = null
  plugin.addListener('netTrailPoint', (ev) => {
    if (ev?.point) cb(ev.point)
  }).then((h) => { handle = h }).catch(() => {})
  return () => { handle?.remove().catch(() => {}) }
}

export async function wifiHasPermissions(): Promise<{ granted: boolean; wifiEnabled: boolean; locationOn: boolean }> {
  if (!plugin) return { granted: true, wifiEnabled: true, locationOn: true }
  try {
    return await plugin.hasPermissions()
  } catch {
    return { granted: false, wifiEnabled: false, locationOn: false }
  }
}

export async function wifiRequestPermissions(): Promise<boolean> {
  if (!plugin) return true
  try {
    await plugin.requestPermissions()
    return true
  } catch {
    return false
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Snapshot para o SOS
// ══════════════════════════════════════════════════════════════════════════

export interface NetRadarSnapshot {
  /** redes visíveis no último scan/trail */
  visibleNetworks: number
  /** total de redes no registo */
  registrySize: number
  /** ameaças detectadas (títulos) */
  threats: string[]
  /** SSIDs das redes mais próximas (sem repetição) */
  topSsids: string[]
  /** operadora móvel + nº de torres visíveis */
  operator?: string | null
  towers?: number
  /** rastro estava activo no momento do SOS */
  running: boolean
  // ── v3.18.0 — inteligência de ambiente ───────────────────────
  /** etiqueta do local actual (impressão digital Wi-Fi) */
  placeLabel?: string
  /** true se o local actual nunca tinha sido visto antes */
  placeIsNew?: boolean
  /** congestionamento do ambiente (0-100) */
  congestionPct?: number
}

/**
 * Lê o ambiente de rede actual (instantâneo — nada de scan no caminho
 * crítico do SOS). Usado pelo useEmergency para anexar o ambiente Wi-Fi
 * + celular ao SMS, email e nuvem.
 */
export async function readNetRadarSnapshot(): Promise<NetRadarSnapshot> {
  const empty: NetRadarSnapshot = {
    visibleNetworks: 0,
    registrySize: 0,
    threats: [],
    topSsids: [],
    running: false,
  }
  try {
    const [nets, registry, trail] = await Promise.all([
      wifiGetNetworks(),
      wifiGetRegistry(),
      netGetTrail(),
    ])
    const threats = analyzeNetworkThreats(nets, registry)
    const env = plugin ? await readNetEnvironment().catch(() => null) : null
    const seen = new Set<string>()
    const top: string[] = []
    for (const n of nets.sort((a, b) => b.rssi - a.rssi)) {
      if (n.ssid && n.ssid !== '<oculta>' && !seen.has(n.ssid)) {
        seen.add(n.ssid)
        top.push(n.ssid)
        if (top.length >= 4) break
      }
    }
    // v3.18.0 — local actual (leitura local, barata, sem scan)
    const placeState = getPlaceState()
    const place = placeState.current
    return {
      visibleNetworks: nets.length,
      registrySize: registry.length,
      threats: threats.slice(0, 3).map((t) => t.title),
      topSsids: top,
      operator: env?.operator ?? null,
      towers: env?.towers?.length ?? 0,
      running: trail.running,
      placeLabel: place?.label,
      placeIsNew: place ? place.seenCount <= 1 : undefined,
      congestionPct: analyzeChannelCongestion(nets)?.congestionPct,
    }
  } catch {
    return empty
  }
}

// ── Formatação para SMS/email ─────────────────────────────────────────────

/** Resumo 1-linha do ambiente Wi-Fi para o SMS (GSM 7-bit, sem acentos). */
export function netRadarSmsSummary(snap: NetRadarSnapshot | null): string {
  if (!snap) return ''
  const parts: string[] = []
  if (snap.visibleNetworks > 0) parts.push(`${snap.visibleNetworks} redes WiFi`)
  if (snap.operator) parts.push(`${snap.operator}${snap.towers ? ` (${snap.towers} torres)` : ''}`)
  // v3.18.0 — local pela impressão digital (socorristas sabem o padrão)
  if (snap.placeLabel) parts.push(`${snap.placeLabel}${snap.placeIsNew ? ' (NOVO)' : ''}`)
  if (parts.length === 0) return ''
  return ` Ambiente: ${parts.join(', ')}.`
}
