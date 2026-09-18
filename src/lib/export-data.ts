/**
 * export-data.ts — EXPORTAÇÃO DE DADOS DO RADAR (v3.17.0).
 *
 * Transforma registos (Wi-Fi, BLE, eventos de segurança) em CSV/JSON e
 * entrega-os ao utilizador:
 *
 *   · Web/PWA — download directo via blob (Chrome/Firefox/Safari)
 *   · APK (Capacitor WebView) — fallback para a ficha de partilha nativa
 *     do Android (texto) + clipboard, porque o download de blob dentro da
 *     WebView nem sempre está disponível
 */

import { isNative, nativeShare } from '@/lib/native'
import { toast } from 'sonner'
import type { WifiRegistryEntry } from '@/lib/net-radar'
import type { BleRegistryEntry } from '@/lib/radar-registry'
import type { SecurityEvent } from '@/lib/security-events'
import type { PlaceFingerprint } from '@/lib/net-intel'
import type { PresenceEntry } from '@/lib/presence-history'

// ── Serialização ──────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(r.map(csvEscape).join(','))
  return lines.join('\n')
}

function fmtDate(ts?: number): string {
  if (!ts) return ''
  return new Date(ts).toISOString()
}

// ── Entrega ───────────────────────────────────────────────────────────────

/**
 * Descarrega um ficheiro (web) ou partilha o conteúdo (APK).
 * Devolve true quando o utilizador recebeu os dados de alguma forma.
 */
export async function deliverFile(
  filename: string,
  content: string,
  mime = 'text/csv',
): Promise<boolean> {
  if (!isNative()) {
    try {
      const blob = new Blob([content], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      return true
    } catch {
      return false
    }
  }
  // APK: download de blob não é fiável na WebView → partilha nativa
  try {
    const preview = content.length > 8000 ? content.slice(0, 8000) + '\n… (truncado)' : content
    const ok = await nativeShare('StatusAds Connect', `${filename}\n\n${preview}`)
    if (ok) return true
  } catch { /* segue para clipboard */ }
  try {
    await navigator.clipboard.writeText(content)
    toast.info('Dados copiados para a área de transferência')
    return true
  } catch {
    return false
  }
}

// ── Wi-Fi ─────────────────────────────────────────────────────────────────

export function wifiRegistryToCsv(entries: WifiRegistryEntry[]): string {
  return toCsv(
    ['ssid', 'bssid', 'seguranca', 'frequencia_mhz', 'melhor_sinal_dbm', 'primeira_vez', 'ultima_vez', 'n_vezes', 'lat', 'lng'],
    entries.map((e) => [
      e.ssid, e.bssid, e.sec, e.freq ?? '', e.rssi ?? '',
      fmtDate(e.firstSeen), fmtDate(e.lastSeen), e.seen ?? '',
      e.lat ?? '', e.lng ?? '',
    ]),
  )
}

export function wifiRegistryToJson(entries: WifiRegistryEntry[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), type: 'wifi-registry', count: entries.length, entries }, null, 2)
}

// ── Bluetooth ─────────────────────────────────────────────────────────────

export function bleRegistryToCsv(entries: BleRegistryEntry[]): string {
  return toCsv(
    ['nome', 'mac', 'tipo', 'fabricante', 'melhor_sinal_dbm', 'ultimo_sinal_dbm', 'primeira_vez', 'ultima_vez', 'n_vezes', 'lat', 'lng'],
    entries.map((e) => [
      e.name || '', e.mac, e.kind || '', e.mfr || (e.mfrId ?? ''),
      e.bestRssi ?? '', e.lastRssi ?? '',
      fmtDate(e.firstSeen), fmtDate(e.lastSeen), e.seen ?? '',
      e.lat ?? '', e.lng ?? '',
    ]),
  )
}

export function bleRegistryToJson(entries: BleRegistryEntry[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), type: 'ble-registry', count: entries.length, entries }, null, 2)
}

// ── Locais conhecidos (v3.18.0) ───────────────────────────────────────────

export function placesToCsv(places: PlaceFingerprint[]): string {
  return toCsv(
    ['etiqueta', 'hash', 'primeira_vez', 'ultima_vez', 'n_visitas', 'lat', 'lng', 'redes_exemplo'],
    places.map((p) => [
      p.label, p.hash,
      fmtDate(p.firstSeen), fmtDate(p.lastSeen), p.seenCount ?? '',
      p.lat ?? '', p.lng ?? '',
      (p.sampleSsids || []).join(' | '),
    ]),
  )
}

export function placesToJson(places: PlaceFingerprint[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), type: 'place-fingerprints', count: places.length, places }, null, 2)
}

// ── Eventos de segurança ──────────────────────────────────────────────────

export function securityEventsToCsv(events: SecurityEvent[]): string {
  return toCsv(
    ['quando', 'tipo', 'severidade', 'titulo', 'detalhe', 'sincronizado'],
    events.map((e) => [
      fmtDate(e.ts), e.kind, e.severity, e.title, e.detail || '', e.synced ? 'sim' : 'nao',
    ]),
  )
}

// ── Presenças / Companhias de Caminho (v3.36.0) ──────────────────────────

export function presenceToCsv(entries: PresenceEntry[]): string {
  return toCsv(
    ['nome', 'dono', 'tipo', 'id', 'melhor_sinal_dbm', 'ultimo_sinal_dbm', 'primeira_vez', 'ultima_vez', 'n_vezes', 'locais', 'pontos_caminho', 'vezes_em_movimento', 'lat', 'lng'],
    entries.map((e) => [
      e.name || '', e.owner || '', e.kind, e.id,
      e.bestRssi ?? '', e.lastRssi ?? '',
      fmtDate(e.firstSeen), fmtDate(e.lastSeen), e.seen ?? '',
      Object.entries(e.places || {}).map(([l, c]) => `${l}×${c}`).join(' | '),
      e.pathPoints ?? 0, e.movingSeen ?? 0,
      e.lastPos?.lat ?? '', e.lastPos?.lng ?? '',
    ]),
  )
}

export function presenceToJson(entries: PresenceEntry[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), type: 'presence-history', count: entries.length, entries }, null, 2)
}

// ── Atalhos de alto nível (um clique nas páginas) ─────────────────────────

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export async function exportWifiRegistry(entries: WifiRegistryEntry[], format: 'csv' | 'json' = 'csv'): Promise<boolean> {
  if (!entries.length) {
    toast.info('Registo Wi-Fi vazio — nada para exportar')
    return false
  }
  const content = format === 'csv' ? wifiRegistryToCsv(entries) : wifiRegistryToJson(entries)
  const ok = await deliverFile(`statusads-wifi-${stamp()}.${format}`, content, format === 'csv' ? 'text/csv' : 'application/json')
  if (ok) toast.success(`Registo Wi-Fi exportado (${entries.length} redes)`)
  return ok
}

export async function exportBleRegistry(entries: BleRegistryEntry[], format: 'csv' | 'json' = 'csv'): Promise<boolean> {
  if (!entries.length) {
    toast.info('Registo Bluetooth vazio — nada para exportar')
    return false
  }
  const content = format === 'csv' ? bleRegistryToCsv(entries) : bleRegistryToJson(entries)
  const ok = await deliverFile(`statusads-ble-${stamp()}.${format}`, content, format === 'csv' ? 'text/csv' : 'application/json')
  if (ok) toast.success(`Registo Bluetooth exportado (${entries.length} dispositivos)`)
  return ok
}

export async function exportSecurityEvents(events: SecurityEvent[]): Promise<boolean> {
  if (!events.length) {
    toast.info('Diário de segurança vazio — nada para exportar')
    return false
  }
  const ok = await deliverFile(`statusads-seguranca-${stamp()}.csv`, securityEventsToCsv(events))
  if (ok) toast.success(`Diário exportado (${events.length} eventos)`)
  return ok
}

export async function exportPlaces(places: PlaceFingerprint[], format: 'csv' | 'json' = 'csv'): Promise<boolean> {
  if (!places.length) {
    toast.info('Sem locais registados — nada para exportar')
    return false
  }
  const content = format === 'csv' ? placesToCsv(places) : placesToJson(places)
  const ok = await deliverFile(`statusads-locais-${stamp()}.${format}`, content, format === 'csv' ? 'text/csv' : 'application/json')
  if (ok) toast.success(`Locais exportados (${places.length})`)
  return ok
}

export async function exportPresenceHistory(entries: PresenceEntry[], format: 'csv' | 'json' = 'csv'): Promise<boolean> {
  if (!entries.length) {
    toast.info('Histórico de presenças vazio — nada para exportar')
    return false
  }
  const content = format === 'csv' ? presenceToCsv(entries) : presenceToJson(entries)
  const ok = await deliverFile(`statusads-presencas-${stamp()}.${format}`, content, format === 'csv' ? 'text/csv' : 'application/json')
  if (ok) toast.success(`Presenças exportadas (${entries.length} dispositivos)`)
  return ok
}
