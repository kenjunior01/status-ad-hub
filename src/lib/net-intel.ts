/**
 * net-intel.ts — INTELIGÊNCIA DE AMBIENTE (v3.18.0).
 *
 * Camada de análise que transforma as capturas cruas do Radar Wi-Fi/BLE
 * em inteligência accionável. Funciona IGUAL na web e na APK (é tudo
 * TypeScript partilhado — o mesmo código corre no browser e na WebView
 * nativa):
 *
 *   · FABRICANTE POR OUI — identifica o fabricante do router/aparelho a
 *     partir dos primeiros 3 bytes do MAC (base local, sem rede)
 *   · CLASSIFICAÇÃO DE REDES — router, hotspot/repetidor, mesh,
 *     enterprise, oculta, desconhecida
 *   · CONGESTIONAMENTO DE CANAIS — ocupação por canal, canais mais
 *     poluídos e RECOMENDAÇÃO do melhor canal (1/6/11 em 2.4 GHz)
 *   · HISTÓRICO DE SINAL — últimas 16 leituras de RSSI por BSSID
 *     (sparkline por rede: está a aproximar-se? a afastar-se?)
 *   · IMPRESSÃO DIGITAL DE LOCAL — hash estável dos 8 BSSIDs mais
 *     fortes; mantém a lista de "locais conhecidos" e detecta quando o
 *     telemóvel muda de local (deslocamento abrupto para local
 *     desconhecido = sinal de rapto/coação → entra no diário e no SOS)
 *   · CORRELAÇÃO — combina ameaças Wi-Fi + rastreadores BLE + anomalia
 *     de local num veredicto único (calmo/elevado/crítico)
 *
 * Persistência: localStorage (igual em web e WebView nativa), chaves
 * prefixadas "statusads-intel-*". Nada sai do aparelho sem o utilizador
 * pedir sync (tabela place_fingerprints, migration 019).
 */

import type { WifiRadarNetwork, WifiRegistryEntry } from '@/lib/net-radar'
import type { NetThreat } from '@/lib/net-radar'
import type { TrackerAlert } from '@/lib/radar-registry'

// ══════════════════════════════════════════════════════════════════════════
// 1. FABRICANTE POR OUI (primeiros 3 bytes do MAC)
// ══════════════════════════════════════════════════════════════════════════

/** OUIs comuns em Moçambique + globais (base local — não precisa de rede). */
const OUI_VENDORS: Record<string, string> = {
  // Routers / redes
  '00:1a:2b': 'Ayecom', '00:1e:2b': 'Tenda', '00:1f:33': 'Netgear',
  '00:24:7b': 'D-Link', '00:25:9c': 'TP-Link', '00:26:5a': 'Netgear',
  '04:bf:6d': 'Mikrotik', '08:00:27': 'PCS Systemtechnik', '0c:80:63': 'TP-Link',
  '10:27:f5': 'Huawei', '14:cc:20': 'TP-Link', '18:a6:f7': 'TP-Link',
  '1c:57:dc': 'TP-Link', '20:2b:c1': 'Huawei', '24:69:68': 'TP-Link',
  '28:ee:52': 'Huawei', '2c:56:dc': 'TP-Link', '30:b5:c2': 'TP-Link',
  '34:6b:d3': 'Huawei', '38:2c:4a': 'TP-Link', '3c:84:6a': 'TP-Link',
  '40:31:3c': 'Huawei', '44:6d:57': 'Huawei', '48:46:fb': 'TP-Link',
  '4c:cc:6a': 'Huawei', '50:c2:e8': 'Netcore', '54:2a:1b': 'TP-Link',
  '5c:b3:95': 'TP-Link', '60:32:b1': 'TP-Link', '64:09:80': 'Huawei',
  '68:ff:7b': 'Huawei', '6c:b7:49': 'TP-Link', '70:54:d5': 'Huawei',
  '74:da:38': 'TP-Link', '78:44:fd': 'Huawei', '7c:b7:1c': 'Huawei',
  '80:89:17': 'Huawei', '84:16:f9': 'TP-Link', '88:28:b3': 'Huawei',
  '8c:a6:df': 'Netcore', '90:94:97': 'TP-Link', '94:77:2b': 'TP-Link',
  '98:da:c4': 'TP-Link', '9c:a2:f4': 'Huawei', 'a0:07:a8': 'Huawei',
  'a4:7b:2c': 'TP-Link', 'a8:57:4e': 'Huawei', 'ac:84:c6': 'TP-Link',
  'b0:5b:67': 'TP-Link', 'b4:15:c7': 'Huawei', 'b8:08:cf': 'TP-Link',
  'bc:46:99': 'Netcore', 'c0:3d:92': 'Huawei', 'c4:e9:84': 'TP-Link',
  'c8:3a:35': 'TP-Link', 'cc:32:e5': 'Huawei', 'd0:7e:35': 'Huawei',
  'd4:6e:0e': 'TP-Link', 'd8:0d:17': 'TP-Link', 'dc:d9:16': 'Huawei',
  'e0:05:c5': 'Huawei', 'e4:c2:d1': 'Huawei', 'e8:cd:2d': 'Huawei',
  'ec:38:8f': 'TP-Link', 'f0:43:47': 'Huawei', 'f4:2c:f5': 'TP-Link',
  'f8:1a:67': 'TP-Link', 'fc:ec:da': 'Huawei',
  '00:0c:29': 'VMware', '00:50:56': 'VMware', 'b8:27:eb': 'Raspberry',
  'dc:a6:32': 'Raspberry', 'e4:5f:01': 'Raspberry', '00:1a:11': 'Google',
  '00:25:da': 'FFnonprofit', 'f4:f2:6d': 'Ubiquiti', '24:5a:4c': 'Ubiquiti',
  '78:8a:20': 'Ubiquiti', '74:ac:b9': 'Ubiquiti',
  // Telemóveis / hotspots
  '00:08:22': 'Samsung', '00:12:47': 'Motorola', '00:16:32': 'Sony',
  '00:17:c4': 'Motorola', '00:1a:1b': 'ZTE', '00:1e:10': 'Fon',
  '00:21:09': 'Nokia', '00:23:d6': 'HTC', '00:26:37': 'Micro-Star',
  '00:0f:cc': 'Foxconn', '04:46:65': 'Samsung', '08:d4:0f': 'HTC',
  '0c:1d:af': 'Innotek', '10:68:3f': 'Apple', '14:10:9f': 'D-Link',
  '18:af:61': 'Apple', '1c:5c:f2': 'Apple', '20:64:32': 'Apple',
  '24:a0:74': 'Apple', '28:6a:ba': 'Apple', '2c:be:08': 'G2 Tech',
  '30:f7:c5': 'Apple', '34:36:3b': 'Samsung', '38:01:67': 'Apple',
  '3c:07:54': 'Apple', '40:9f:38': 'GIGA-BYTE', '44:d4:e0': 'Intel',
  '48:74:6e': 'Apple', '4c:8b:ef': 'Apple', '50:32:37': 'Apple',
  '54:26:96': 'Apple', '58:55:ca': 'Apple', '5c:ad:cf': 'CF',
  '60:fa:cd': 'Apple', '64:a3:cb': 'Apple', '68:a8:6d': 'Apple',
  '6c:4a:85': 'Apple', '70:de:e2': 'Apple', '74:81:14': 'Apple',
  '78:fd:94': 'Apple', '7c:6d:62': 'Apple', '80:e6:50': 'Apple',
  '84:fc:e6': 'FFnonprofit', '88:66:a5': 'Apple', '8c:29:37': 'Apple',
  '90:b2:1f': 'Apple', '94:94:26': 'Intel', '98:01:a7': 'Apple',
  '9c:20:7b': 'Apple', 'a0:99:9b': 'Apple', 'a4:d1:8c': 'Apple',
  'a8:88:08': 'Apple', 'ac:bc:32': 'Apple', 'b0:9f:ba': 'Intel',
  'b4:18:c1': 'Intel', 'b8:e8:56': 'Apple', 'bc:52:b7': 'Apple',
  'c0:63:94': 'Apple', 'c4:2c:03': 'Apple', 'c8:69:cd': 'Apple',
  'cc:08:e0': 'Apple', 'd0:03:4b': 'Intel', 'd4:90:9c': 'Intel',
  'd8:00:4d': 'Intel', 'dc:2b:61': 'Apple', 'e0:f8:47': 'Apple',
  'e4:ce:8f': 'Apple', 'e8:80:2e': 'Apple', 'ec:35:86': 'Apple',
  'f0:18:98': 'Apple', 'f4:1b:a1': 'Apple', 'f8:1e:df': 'DFP',
  'fc:25:3f': 'Apple',
  '08:05:2a': 'AMD', '0c:9d:a1': 'Apple', '10:dd:b1': 'Apple',
  '18:81:0e': 'Intel', '18:e8:29': 'Apple', '20:ab:37': 'Wistron',
  '24:fd:5b': 'Apple', '28:b7:ad': 'Intel', '2c:1f:23': 'G2 Tech',
  '34:23:ba': 'Apple', '38:c9:86': 'Apple', '3c:15:c2': 'Apple',
  '40:b0:fa': 'Apple', '44:2a:60': 'Intel', '48:2c:a0': 'iRiver',
  '4c:34:88': 'Intel', '50:ea:d3': 'Apple', '54:9f:35': 'AzureWave',
  '5c:f9:38': 'Intel', '60:c5:47': 'Apple', '64:b3:10': 'Intel',
  '68:64:4b': 'Intel', '6c:70:9f': 'AzureWave', '70:56:81': 'Actiontec',
  '74:e2:f5': 'AzureWave', '78:e4:00': 'Intel', '7c:d1:c3': 'Apple',
  '80:00:60': 'Samsung', '80:d0:9b': 'AzureWave', '84:a6:c8': 'AzureWave',
  '88:53:d4': 'AzureWave', '8c:85:90': 'Apple', '90:72:40': 'Hon Hai',
  '94:eb:2c': 'AzureWave', '98:3b:8f': 'Apple', '9c:b6:d0': 'Rivet',
  'a0:88:b4': 'AzureWave', 'a4:5e:60': 'Apple', 'a8:bb:cf': 'Rivet',
  'ac:de:48': 'Apple', 'b0:34:95': 'AzureWave', 'b4:7c:9c': 'Intel',
  'b8:6b:23': 'Intel', 'bc:6c:e4': 'Intel', 'c0:9f:05': 'Intel',
  'c4:6e:1f': 'TP-Link', 'c8:f7:50': 'AzureWave', 'cc:af:78': 'Intel',
  'd0:22:be': 'AzureWave', 'd4:ae:05': 'Microsoft', 'd8:bb:c1': 'AzureWave',
  'dc:56:e7': 'AzureWave', 'e0:b9:a5': 'AzureWave', 'e4:e7:51': 'AzureWave',
  'e8:4e:06': 'RXTX', 'ec:fa:bc': 'AzureWave', 'f0:9f:c2': 'Ubiquiti',
  'f4:06:69': 'HTC', 'f8:bc:12': 'AzureWave', 'fc:f8:ae': 'AzureWave',
  '00:1d:7e': 'Cisco', '00:23:04': 'Cisco', '00:26:0b': 'Cisco',
  '24:b6:57': 'Zioncom', '58:d5:6e': 'ZTE', '8c:be:be': 'ZTE',
  '98:0c:82': 'ZTE', 'c8:64:c7': 'ZTE', 'f4:6a:92': 'ZTE',
  '34:4b:50': 'Xiaomi', '64:09:81': 'Xiaomi', '74:23:44': 'Xiaomi',
  '78:02:f8': 'Xiaomi', '84:f3:eb': 'Xiaomi',
  '98:fa:e8': 'Xiaomi', 'a4:77:33': 'Xiaomi', 'ac:c1:ee': 'Xiaomi',
  'c4:0b:cb': 'Xiaomi', 'd4:97:0b': 'Xiaomi', 'e4:46:da': 'Xiaomi',
  'f0:b4:29': 'Xiaomi', 'f8:a4:5f': 'Xiaomi', 'fc:64:ba': 'Xiaomi',
  '10:2a:b3': 'OPPO', '18:d6:c7': 'OPPO', '34:0a:63': 'OPPO',
  '48:9e:19': 'OPPO', '5c:57:a9': 'OPPO', '6c:ee:d6': 'vivo',
  '94:65:2d': 'OPPO', '9c:4f:da': 'vivo', 'a0:09:71': 'OPPO',
  'ac:5f:3e': 'vivo', 'b4:0f:3b': 'vivo', 'c0:11:73': 'vivo',
  'd0:22:a4': 'OPPO', 'e8:da:20': 'OPPO', 'f4:80:a7': 'vivo',
  'fc:48:0c': 'OPPO', '30:74:96': 'Honor', '38:a4:ed': 'Honor',
  '4c:1f:59': 'Honor', '54:92:be': 'Honor', '5c:c5:d4': 'Honor',
  '64:16:f0': 'Honor', '6c:29:95': 'Honor', '78:1d:d9': 'Honor',
  '84:5b:12': 'Honor', '94:fe:22': 'Honor', 'a8:dc:d4': 'Honor',
  'b4:cd:27': 'Honor', 'c8:0c:1a': 'Honor', 'dc:09:4c': 'Honor',
  'e0:36:76': 'Honor', 'f4:63:1f': 'Honor',
  '00:09:0f': 'Fortinet', '00:0d:b9': 'PCPC', '00:40:05': 'Giganet',
  '00:60:b0': 'Hewlett', '24:f5:a2': 'Tenda', '2c:05:47': 'Tenda',
  '36:33:e1': 'Tenda', '50:2b:73': 'Tenda', '6c:19:8f': 'Tenda',
  '74:7d:79': 'Tenda', '76:1d:b4': 'Tenda', 'a8:0a:66': 'Tenda',
  'c8:0a:a9': 'Tenda', 'd2:0f:e9': 'Tenda', 'f0:62:3f': 'Tenda',
  'f8:c4:88': 'Tenda', 'fc:2a:7d': 'Tenda', '00:14:78': 'VMware',
  '00:05:69': 'VMware', '00:1c:14': 'VMware', '00:e0:4c': 'Realtek',
  '52:54:00': 'QEMU/KVM', '00:16:3e': 'Xensource', '42:01:0a': 'Google Cloud',
}

/** Normaliza um MAC para o formato "aa:bb:cc" (OUI minúsculo). */
export function macOui(mac?: string | null): string {
  if (!mac) return ''
  const clean = mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  if (clean.length < 6) return ''
  return `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)}`
}

/** Fabricante a partir do MAC (BSSID). Devolve '' quando desconhecido. */
export function wifiVendor(bssid?: string | null): string {
  return OUI_VENDORS[macOui(bssid)] || ''
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CLASSIFICAÇÃO DE REDES
// ══════════════════════════════════════════════════════════════════════════

export type WifiNetworkKind =
  | 'router'      // router/residencial normal
  | 'hotspot'     // hotspot de telemóvel/mifi
  | 'mesh'        // sistema mesh/repetidor (mesmo SSID já detectado fora)
  | 'enterprise'  // WPA-Enterprise (empresa/estado)
  | 'hidden'      // SSID oculto
  | 'unknown'

const HOTSPOT_PATTERNS: RegExp[] = [
  /^android\s?ap/i, /^androidhotspot/i, /^mi\s?\d+\s?hotspot/i, /^xiaomi\s?hotspot/i,
  /^redmi\s?hotspot/i, /^iphone(\s|$)/i, /^ipad(\s|$)/i, /^galaxy\s?[a-z]?\d*\s?hotspot/i,
  /hotspot/i, /mifi/i, /mobile\s?hotspot/i, /^portatil.*direct/i, /direct-/i,
  /^huawei\s?[py]\d+/i, /^honor\s?hotspot/i, /tethering/i,
]

export interface WifiNetworkClass {
  kind: WifiNetworkKind
  /** etiqueta humana curta */
  label: string
  vendor: string
}

/** Classifica uma rede capturada (fabricante + tipo). */
export function classifyWifiNetwork(net: WifiRadarNetwork): WifiNetworkClass {
  const ssid = (net.ssid || '').trim()
  const vendor = wifiVendor(net.bssid)
  const sec = (net.sec || '').toUpperCase()

  if (!ssid || ssid === '<oculta>') return { kind: 'hidden', label: 'Rede oculta', vendor }

  if (sec.includes('ENTERPRISE')) return { kind: 'enterprise', label: 'Enterprise', vendor }
  if (HOTSPOT_PATTERNS.some((re) => re.test(ssid))) return { kind: 'hotspot', label: 'Hotspot', vendor }
  // repetidor/mesh: muitos repetidores usam "SSID EXT"/"+ EXT"/"_ext"/"2G/5G" no fim
  if (/\s?(ext|extended|repetidor|mesh|plus|-5g$|_5g$|-2g$|_2g$|2\.4g|5ghz)$/i.test(ssid)) {
    return { kind: 'mesh', label: 'Repetidor/Mesh', vendor }
  }
  return { kind: 'router', label: 'Router', vendor }
}

// ══════════════════════════════════════════════════════════════════════════
// 3. CONGESTIONAMENTO DE CANAIS
// ══════════════════════════════════════════════════════════════════════════

export interface ChannelUse {
  ch: number
  band: string
  /** nº de redes neste canal */
  count: number
  /** força média (RSSI) das redes do canal — canal "pesado" = vizinhos perto */
  avgRssi: number
}

export interface ChannelCongestion {
  /** ocupação por canal (ordenado: mais carregado primeiro) */
  channels: ChannelUse[]
  /** 0-100 — quão poluído está o ambiente */
  congestionPct: number
  /** canal 2.4 GHz recomendado (1/6/11) ou null */
  best2g: number | null
  /** canal 5 GHz recomendado ou null */
  best5g: number | null
  /** canal mais carregado (o "trânsito") */
  worstCh: number | null
  /** resumo humano curto */
  summary: string
}

/** Analisa a ocupação de canais a partir das redes capturadas. */
export function analyzeChannelCongestion(networks: WifiRadarNetwork[]): ChannelCongestion | null {
  if (!networks || networks.length === 0) return null

  const byCh = new Map<number, { count: number; sum: number; band: string }>()
  for (const n of networks) {
    if (!n.ch) continue
    const e = byCh.get(n.ch) || { count: 0, sum: 0, band: n.band || `${n.freq >= 5000 ? '5' : '2.4'} GHz` }
    e.count++
    e.sum += n.rssi ?? -100
    byCh.set(n.ch, e)
  }
  if (byCh.size === 0) return null

  const channels: ChannelUse[] = Array.from(byCh.entries())
    .map(([ch, e]) => ({ ch, band: e.band, count: e.count, avgRssi: Math.round(e.sum / e.count) }))
    .sort((a, b) => b.count - a.count)

  // peso: nº de redes + bónus se o sinal médio é forte (vizinho real)
  const weight = (c: ChannelUse) => c.count + (c.avgRssi >= -65 ? 1.5 : c.avgRssi >= -75 ? 0.7 : 0)
  const totalWeight = channels.reduce((s, c) => s + weight(c), 0)
  // 2.4 GHz tem 3 canais não sobrepostos — acima de ~8 redes é congestionado
  const congestionPct = Math.min(100, Math.round((totalWeight / 9) * 100))

  const pick = (want2g: boolean): number | null => {
    const pool = channels.filter((c) =>
      want2g ? c.ch >= 1 && c.ch <= 14 : c.ch >= 32,
    )
    if (pool.length === 0) return null
    const preferred = want2g ? [1, 6, 11] : pool.map((c) => c.ch)
    let best: number | null = null
    let bestW = Infinity
    for (const ch of preferred) {
      const use = pool.find((c) => c.ch === ch)
      const w = use ? weight(use) : 0
      if (w < bestW) {
        bestW = w
        best = ch
      }
    }
    return best
  }

  const best2g = pick(true)
  const best5g = pick(false)
  const worst = channels[0]

  const parts: string[] = []
  parts.push(`${networks.length} redes em ${byCh.size} canais`)
  if (worst && worst.count >= 2) parts.push(`canal ${worst.ch} mais carregado (${worst.count} redes)`)
  if (best2g) parts.push(`melhor em 2.4 GHz: canal ${best2g}`)
  if (best5g) parts.push(`5 GHz: canal ${best5g}`)

  return {
    channels,
    congestionPct,
    best2g,
    best5g,
    worstCh: worst?.ch ?? null,
    summary: parts.join(' · '),
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 4. HISTÓRICO DE SINAL POR REDE (sparkline)
// ══════════════════════════════════════════════════════════════════════════

const RSSI_HIST_KEY = 'statusads-intel-rssi-hist'
const RSSI_HIST_MAX_PER = 16
const RSSI_HIST_MAX_KEYS = 500

type RssiHistMap = Record<string, Array<{ t: number; r: number }>>

function readRssiHist(): RssiHistMap {
  try {
    const raw = localStorage.getItem(RSSI_HIST_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj as RssiHistMap : {}
  } catch {
    return {}
  }
}

function writeRssiHist(map: RssiHistMap): void {
  try {
    // poda: mantém os 500 BSSIDs com amostra mais recente
    const keys = Object.keys(map)
    if (keys.length > RSSI_HIST_MAX_KEYS) {
      keys.sort((a, b) => {
        const la = map[a][map[a].length - 1]?.t || 0
        const lb = map[b][map[b].length - 1]?.t || 0
        return lb - la
      })
      for (const k of keys.slice(RSSI_HIST_MAX_KEYS)) delete map[k]
    }
    localStorage.setItem(RSSI_HIST_KEY, JSON.stringify(map))
  } catch { /* quota — segue */ }
}

/** Acrescenta as leituras de um scan ao histórico (por BSSID). */
export function recordRssiSamples(networks: WifiRadarNetwork[]): void {
  if (!networks || networks.length === 0) return
  const map = readRssiHist()
  const now = Date.now()
  for (const n of networks) {
    if (!n.bssid || typeof n.rssi !== 'number') continue
    const key = n.bssid.toLowerCase()
    const arr = map[key] || []
    const last = arr[arr.length - 1]
    // anti-duplicado: não guardar a mesma leitura com menos de 20s
    if (last && now - last.t < 20_000) {
      last.r = n.rssi
      continue
    }
    arr.push({ t: now, r: n.rssi })
    map[key] = arr.slice(-RSSI_HIST_MAX_PER)
  }
  writeRssiHist(map)
}

/** Histórico de sinal de uma rede (mais antigo → mais recente). */
export function getRssiHistory(bssid?: string | null): Array<{ t: number; r: number }> {
  if (!bssid) return []
  return readRssiHist()[bssid.toLowerCase()] || []
}

/** Tendência do sinal: 'stronger' | 'weaker' | 'stable' | 'none'. */
export function rssiTrend(bssid?: string | null): 'stronger' | 'weaker' | 'stable' | 'none' {
  const h = getRssiHistory(bssid)
  if (h.length < 3) return 'none'
  const recent = h.slice(-3).reduce((s, p) => s + p.r, 0) / 3
  const older = h.slice(-9, -3)
  if (older.length === 0) return 'none'
  const base = older.reduce((s, p) => s + p.r, 0) / older.length
  const delta = recent - base
  if (delta > 4) return 'stronger'
  if (delta < -4) return 'weaker'
  return 'stable'
}

// ══════════════════════════════════════════════════════════════════════════
// 5. IMPRESSÃO DIGITAL DE LOCAL (fingerprint de BSSIDs)
// ══════════════════════════════════════════════════════════════════════════

export interface PlaceFingerprint {
  /** hash estável dos BSSIDs dominantes */
  hash: string
  /** etiqueta auto-atribuída: "Local 1", "Local 2"… */
  label: string
  firstSeen: number
  lastSeen: number
  seenCount: number
  lat?: number
  lng?: number
  /** SSIDs exemplo (para o utilizador reconhecer o local) */
  sampleSsids: string[]
}

export interface PlaceState {
  /** local actual */
  current: PlaceFingerprint | null
  /** local anterior (quando houve mudança recente) */
  previous: PlaceFingerprint | null
  /** true quando a mudança foi para um local NOVO (nunca visto) */
  changedToNew: boolean
  /** timestamp da mudança (0 = sem mudança nesta sessão) */
  changedAt: number
}

const PLACES_KEY = 'statusads-intel-places'
const PLACE_STATE_KEY = 'statusads-intel-place-state'
const PLACES_MAX = 80
/** mudança de local em menos de 25 min = deslocamento abrupto */
const ABRUPT_WINDOW_MS = 25 * 60_000

function fnv1a(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Hash estável do local: os 8 BSSIDs mais fortes, ordenados alfabeticamente
 * (para o hash não depender da ordem de captura).
 */
export function computePlaceFingerprint(networks: WifiRadarNetwork[]): string | null {
  const strong = networks
    .filter((n) => n.bssid)
    .sort((a, b) => (b.rssi ?? -127) - (a.rssi ?? -127))
    .slice(0, 8)
  if (strong.length < 3) return null // ambiente pobre — fingerprint pouco fiável
  const ids = strong.map((n) => n.bssid.toLowerCase()).sort()
  return fnv1a(ids.join('|'))
}

function readPlaces(): PlaceFingerprint[] {
  try {
    const raw = localStorage.getItem(PLACES_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writePlaces(list: PlaceFingerprint[]): void {
  try { localStorage.setItem(PLACES_KEY, JSON.stringify(list.slice(0, PLACES_MAX))) } catch { /* quota */ }
}

/** Lista de locais conhecidos (mais recentes primeiro). */
export function getKnownPlaces(): PlaceFingerprint[] {
  return readPlaces().sort((a, b) => b.lastSeen - a.lastSeen)
}

export function clearKnownPlaces(): void {
  try { localStorage.removeItem(PLACES_KEY); localStorage.removeItem(PLACE_STATE_KEY) } catch { /* segue */ }
}

function readPlaceState(): PlaceState {
  try {
    const raw = localStorage.getItem(PLACE_STATE_KEY)
    if (!raw) return { current: null, previous: null, changedToNew: false, changedAt: 0 }
    const obj = JSON.parse(raw)
    return {
      current: obj.current ?? null,
      previous: obj.previous ?? null,
      changedToNew: !!obj.changedToNew,
      changedAt: obj.changedAt || 0,
    }
  } catch {
    return { current: null, previous: null, changedToNew: false, changedAt: 0 }
  }
}

/** Estado do local actual (sem tocar em nada — leitura barata). */
export function getPlaceState(): PlaceState {
  return readPlaceState()
}

/**
 * Check-in de local: chama após cada scan Wi-Fi com redes suficientes.
 *
 * · Se o fingerprint actual é de um local já conhecido → actualiza
 *   lastSeen/seenCount e devolve o estado (sem anomalia).
 * · Se é um local NOVO → regista com etiqueta "Local N" e marca a
 *   transição. Se o local anterior foi visto há MENOS de 25 min,
 *   `changedToNew` = true — padrão de deslocamento forçado (a vítima
 *   estava num sítio e foi levada para outro desconhecido).
 */
export function placeCheckIn(networks: WifiRadarNetwork[], pos?: { lat?: number; lng?: number } | null): PlaceState {
  const hash = computePlaceFingerprint(networks)
  if (!hash) return readPlaceState()

  const now = Date.now()
  const places = readPlaces()
  const idx = places.findIndex((p) => p.hash === hash)
  const sampleSsids = networks
    .filter((n) => n.ssid && n.ssid !== '<oculta>')
    .sort((a, b) => (b.rssi ?? -127) - (a.rssi ?? -127))
    .slice(0, 4)
    .map((n) => n.ssid)

  let place: PlaceFingerprint
  let isNew = false
  if (idx >= 0) {
    place = places[idx]
    place.lastSeen = now
    place.seenCount = (place.seenCount || 1) + 1
    if (pos?.lat != null) { place.lat = pos.lat; place.lng = pos.lng }
    places[idx] = place
  } else {
    isNew = true
    place = {
      hash,
      label: `Local ${places.length + 1}`,
      firstSeen: now,
      lastSeen: now,
      seenCount: 1,
      lat: pos?.lat,
      lng: pos?.lng,
      sampleSsids,
    }
    places.unshift(place)
  }
  writePlaces(places)

  const prev = readPlaceState()
  const sameAsBefore = prev.current?.hash === hash
  const state: PlaceState = {
    current: place,
    previous: sameAsBefore ? prev.previous : prev.current,
    changedToNew: sameAsBefore ? false : isNew && !!prev.current,
    changedAt: sameAsBefore ? prev.changedAt : now,
  }
  try { localStorage.setItem(PLACE_STATE_KEY, JSON.stringify(state)) } catch { /* segue */ }
  return state
}

/**
 * Avalia o risco de MOVIMENTO: deslocamento abrupto (local anterior visto
 * há <25 min) para um local NOVO, nunca frequentado. É um dos sinais
 * clássicos de rapto/coação — alimenta a correlação e o diário.
 */
export function assessPlaceAnomaly(state?: PlaceState | null): {
  anomaly: boolean
  severity: 'high' | 'medium' | 'none'
  title: string
  detail: string
} {
  const s = state || readPlaceState()
  if (!s.changedToNew || !s.current || !s.previous) {
    return { anomaly: false, severity: 'none', title: '', detail: '' }
  }
  const mins = s.changedAt ? Math.round((Date.now() - s.changedAt) / 60_000) : 0
  const abrupt = s.previous.lastSeen > 0 && (Date.now() - s.previous.lastSeen) <= ABRUPT_WINDOW_MS
  if (!abrupt) {
    return { anomaly: false, severity: 'none', title: '', detail: '' }
  }
  return {
    anomaly: true,
    severity: 'high',
    title: `Deslocamento abrupto para ${s.current.label}`,
    detail: `Estava noutro local há menos de 25 min e agora está num local NOVO (${s.current.sampleSsids.slice(0, 2).join(', ') || 'redes desconhecidas'}). Se não se deslocou de propósito, partilhe a localização com um contacto de confiança.`,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 6. CORRELAÇÃO Wi-Fi + BLE + LOCAL
// ══════════════════════════════════════════════════════════════════════════

export type AmbientLevel = 'calm' | 'elevated' | 'critical'

export interface AmbientVerdict {
  level: AmbientLevel
  /** etiqueta humana: "Ambiente calmo", "Ambiente elevado", "SITUAÇÃO CRÍTICA" */
  label: string
  /** razões que elevaram o nível (humanas, curtas) */
  reasons: string[]
}

/**
 * Correlaciona TUDO o que o ambiente mostra: ameaças de rede, rastreadores
 * BLE e anomalia de local. Regras:
 *
 *   · CRÍTICO  — anomalia de local + (rastreador OU ameaça alta) OU
 *                ≥2 rastreadores activos
 *   · ELEVADO  — rastreador activo, OU ameaça high, OU deslocamento
 *                recente para local novo sem mais sinais
 *   · CALMO    — nada do acima
 */
export function correlateEnvironment(
  threats: NetThreat[],
  trackers: TrackerAlert[],
  placeState?: PlaceState | null,
): AmbientVerdict {
  const reasons: string[] = []
  const placeAnomaly = assessPlaceAnomaly(placeState)
  const highThreats = threats.filter((t) => t.severity === 'high')
  const highTrackers = trackers.filter((t) => t.severity === 'high')

  if (placeAnomaly.anomaly) reasons.push('Deslocamento abrupto para local desconhecido')
  if (highTrackers.length > 0) reasons.push(`Rastreador activo: ${highTrackers[0].name || highTrackers[0].mac}`)
  else if (trackers.length > 0) reasons.push(`Possível perseguidor: ${trackers[0].name || trackers[0].mac}`)
  if (highThreats.length > 0) reasons.push(highThreats[0].title)

  let level: AmbientLevel = 'calm'
  if (trackers.length >= 2 || (placeAnomaly.anomaly && (highTrackers.length > 0 || highThreats.length > 0))) {
    level = 'critical'
  } else if (trackers.length > 0 || highThreats.length > 0 || placeAnomaly.anomaly) {
    level = 'elevated'
  }

  const label = level === 'critical'
    ? 'SITUAÇÃO CRÍTICA — considere SOS'
    : level === 'elevated'
      ? 'Ambiente elevado — vigie'
      : 'Ambiente calmo'

  return { level, label, reasons }
}

// ══════════════════════════════════════════════════════════════════════════
// 7. Utilitários de apresentação
// ══════════════════════════════════════════════════════════════════════════

/** Cor de apresentação por nível do ambiente. */
export function ambientLevelColor(level: AmbientLevel): string {
  return level === 'critical' ? '#f87171' : level === 'elevated' ? '#fbbf24' : '#34d399'
}

/** Reforma a lista de canais para gráfico de barras (top N, por banda). */
export function topChannels(congestion: ChannelCongestion | null, n = 8): ChannelUse[] {
  if (!congestion) return []
  return [...congestion.channels].sort((a, b) => b.count - a.count).slice(0, n)
}

/** Tipo do registo Wi-Fi (para o painel do registo — usa dados guardados). */
export function classifyRegistryEntry(entry: WifiRegistryEntry): WifiNetworkClass {
  return classifyWifiNetwork({
    bssid: entry.bssid,
    ssid: entry.ssid,
    rssi: entry.rssi ?? -100,
    freq: entry.freq ?? 0,
    ch: entry.freq ? (entry.freq >= 5000 ? 36 : 6) : 0,
    band: entry.freq && entry.freq >= 5000 ? '5 GHz' : '2.4 GHz',
    sec: entry.sec,
  })
}

// ══════════════════════════════════════════════════════════════════════════
// 8. CLASSIFICAÇÃO BLE (complemento ao lado nativo — funciona na web)
// ══════════════════════════════════════════════════════════════════════════

export type BleDeviceKind =
  | 'tracker'    // rastreador comercial (AirTag, SmartTag, Tile…)
  | 'phone'      // telemóvel/computador
  | 'audio'      // auscultadores/colunas
  | 'wearable'   // relógio/banda
  | 'vehicle'    // carro/mota (unidade principal)
  | 'network'    // router/mesh/BLE bridge
  | 'unknown'

const BLE_KIND_PATTERNS: Array<{ kind: BleDeviceKind; re: RegExp }> = [
  { kind: 'tracker', re: /airtag|smart\s?tag|galaxy.*tag|\btile\b|chipolo|trackr|nut\s?mini|localizador|rastreador|tracker/i },
  { kind: 'audio', re: /airpods|buds|headset|headphones|earbuds|jbl|bose|soundcore|speaker|coluna|auscultador|wh-|wf-|tozo|anker/i },
  { kind: 'wearable', re: /watch|band|fit|mi\s?band|galaxy\s?fit|amazfit|garmin|bracel/i },
  { kind: 'phone', re: /iphone|ipad|android|galaxy\s?[sae]\d|pixel|redmi|huawei\s?[pmy]\d|macbook|laptop|notebook|pc\b/i },
  { kind: 'vehicle', re: /bmw|mercedes|audi|toyota|volkswagen|vw\b|renault|peugeot|nissan|ford|car\s?(kit|link)|carplay|android\s?auto/i },
  { kind: 'network', re: /router|mesh|extender|repetidor|tv\s?|bravia|qled|thermometer|gateway|bridge/i },
]

/**
 * Classifica um dispositivo BLE pelo nome/tipo anunciado. Complementa a
 * classificação nativa (`k`) — útil na web (Web Bluetooth devolve pouco)
 * e para dispositivos que o lado nativo não classificou.
 */
export function classifyBleDevice(name?: string | null, kind?: string): BleDeviceKind {
  const hay = `${name || ''} ${kind || ''}`
  if (!hay.trim()) return 'unknown'
  for (const p of BLE_KIND_PATTERNS) {
    if (p.re.test(hay)) return p.kind
  }
  return 'unknown'
}

/** Etiqueta humana curta da classificação BLE (PT). */
export function bleKindLabel(kind?: string | null): string {
  switch (kind) {
    case 'tracker': return 'Rastreador'
    case 'phone': return 'Telemóvel/PC'
    case 'audio': return 'Áudio'
    case 'wearable': return 'Vestível'
    case 'vehicle': return 'Veículo'
    case 'network': return 'Rede/TV'
    default: return ''
  }
}
