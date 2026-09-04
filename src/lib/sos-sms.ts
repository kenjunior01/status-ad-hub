/**
 * sos-sms.ts — Orquestração do SMS de emergência LOCAL (v3.11.0).
 *
 * Constrói a mensagem SOS (GPS + testemunhas BT/WiFi + gravação de áudio)
 * e envia-a via SIM do próprio telemóvel — sem qualquer API externa.
 * Funciona MESMO SEM INTERNET: quando os dados morrem, o SMS é o único
 * canal que ainda sai do aparelho.
 *
 * Mensagens são compostas SEM ACENTOS (charset GSM 7-bit do SMS — evita
 * trocar para UCS-2 a 70 caracteres por segmento e duplicar o custo).
 */

import { sendLocalSms, type SmsSendResult } from '@/lib/sms'
import type { WitnessSnapshot } from '@/lib/guardian'

/** Cache dos telefones dos contactos (para o caminho offline) */
const CONTACTS_CACHE_KEY = 'statusads-last-contacts'
/** Anti-duplicação do SMS de SOS (janela de 45 s — retries do RPC) */
const LAST_SOS_SMS_KEY = 'statusads-sos-sms-at'
const DEDUPE_WINDOW_MS = 45_000

// ── Cache de contactos ──────────────────────────────────────────────────

export function cacheContactPhones(phones: string[]): void {
  try {
    const clean = (phones || []).map((p) => (p || '').trim()).filter((p) => p.length >= 7)
    if (clean.length > 0) {
      localStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(clean))
    }
  } catch { /* quota — segue */ }
}

export function getCachedContactPhones(): string[] {
  try {
    const raw = localStorage.getItem(CONTACTS_CACHE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((p: unknown) => typeof p === 'string' && p.length >= 7) : []
  } catch {
    return []
  }
}

/** Une duas fontes de telefones, sem duplicados, preservando a ordem. */
export function mergePhones(...sources: Array<string[] | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const src of sources) {
    for (const p of src || []) {
      const phone = (p || '').trim()
      if (phone.length >= 7 && !seen.has(phone)) {
        seen.add(phone)
        out.push(phone)
      }
    }
  }
  return out
}

// ── Composição das mensagens (ASCII puro — GSM 7-bit) ────────────────────

export interface SosSmsOptions {
  /** Nome de quem pede ajuda (opcional — melhor personalização) */
  name?: string | null
  lat: number
  lng: number
  /** Snapshot de testemunhas BT/WiFi (v3.10.0 Radar) — contagem entra no SMS */
  witness?: WitnessSnapshot | null
  /** Indica que a gravação de áudio foi activada */
  recording?: boolean
}

function witnessSummary(snap?: WitnessSnapshot | null): string {
  if (!snap || !Array.isArray(snap.devices) || snap.devices.length === 0) return ''
  const bt = snap.devices.filter((d) => d.t === 'b').length
  const wifi = snap.devices.filter((d) => d.t === 'w').length
  return ` Testemunhas perto: ${snap.devices.length} disp (${bt} BT, ${wifi} WiFi).`
}

/**
 * Mensagem principal do SOS — ex.:
 * "SOS StatusAds: Joao precisa de ajuda agora. Local: https://maps.google.com/?q=-25.96,32.57
 *  Testemunhas perto: 5 disp (3 BT, 2 WiFi). Audio a gravar."
 */
export function buildSosSmsMessage(opts: SosSmsOptions): string {
  const who = (opts.name || '').trim()
  const maps = `https://maps.google.com/?q=${opts.lat.toFixed(5)},${opts.lng.toFixed(5)}`
  let msg = who
    ? `SOS StatusAds: ${who} precisa de ajuda agora. Local: ${maps}`
    : `SOS StatusAds: pedido de socorro! Local: ${maps}`
  msg += witnessSummary(opts.witness)
  if (opts.recording) msg += ' Audio a gravar.'
  return msg.trim()
}

/** Follow-up com o link do áudio gravado (URL assinada, válida 2h). */
export function buildAudioSmsMessage(audioUrl: string): string {
  return `StatusAds: audio da emergencia (valido 2h): ${audioUrl}`
}

// ── Envio com anti-duplicação ─────────────────────────────────────────────

function lastSosSmsAt(): number {
  try { return Number(localStorage.getItem(LAST_SOS_SMS_KEY) || 0) } catch { return 0 }
}

/**
 * Envia o SMS de SOS (com dedupe de 45 s — protecção contra retries do
 * RPC dispararem mensagens duplicadas). Devolve o resultado do envio.
 */
export async function dispatchSosSms(phones: string[], message: string): Promise<SmsSendResult> {
  if (!phones || phones.length === 0) return { sent: 0, failed: 0, skipped: true }

  const now = Date.now()
  if (now - lastSosSmsAt() < DEDUPE_WINDOW_MS) {
    return { sent: 0, failed: 0, skipped: true }
  }

  const result = await sendLocalSms(phones, message)
  if (result.sent > 0) {
    try { localStorage.setItem(LAST_SOS_SMS_KEY, String(now)) } catch { /* segue */ }
  }
  return result
}
