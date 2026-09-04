/**
 * sms.ts — Ponte para o plugin nativo de SMS LOCAL (v3.11.0, "SOS Auto-Envio").
 *
 * Envia os avisos de emergência directamente do telemóvel (SmsManager do
 * Android) — SEM gateway/API externa. Usa o crédito do SIM e funciona
 * mesmo sem internet. No web/PWA é no-op (o fallback é a edge function
 * notify-contacts, quando há internet).
 *
 * Custo: cada SMS consome saldo do próprio utilizador (Moçambique:
 * ~1,5–2 MT/segmento de 160 caracteres) — infinitamente mais barato e
 * fiável que qualquer gateway SMS de terceiros.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface SmsFailure {
  phone: string
  error: string
}

export interface SmsSendResult {
  sent: number
  failed: number
  failures?: SmsFailure[]
  /** true quando não há plugin nativo (web) — nada foi tentado */
  skipped?: boolean
}

interface SmsPluginInterface {
  hasPermission(): Promise<{ granted: boolean }>
  requestPermission(): Promise<{ granted: boolean }>
  send(opts: { phones: string[]; message: string }): Promise<SmsSendResult>
}

const isAndroid = Capacitor.getPlatform() === 'android'

let smsPlugin: SmsPluginInterface | null = null

if (isAndroid) {
  try {
    smsPlugin = registerPlugin<SmsPluginInterface>('Sms')
  } catch {
    smsPlugin = null
  }
}

/** Plugin nativo disponível (APK Android)? */
export function nativeSmsAvailable(): boolean {
  return !!smsPlugin
}

/** Permissão SEND_SMS já concedida? (web: true — nada a pedir) */
export async function hasSmsPermission(): Promise<boolean> {
  if (!smsPlugin) return true
  try {
    const { granted } = await smsPlugin.hasPermission()
    return granted
  } catch {
    return false
  }
}

/** Pede a permissão SEND_SMS (diálogo do sistema). Devolve o resultado. */
export async function requestSmsPermission(): Promise<boolean> {
  if (!smsPlugin) return true
  try {
    const { granted } = await smsPlugin.requestPermission()
    return granted
  } catch {
    return false
  }
}

/**
 * Envia SMS para N números via SIM do telemóvel. Pede permissão em falta.
 * Nunca lança — devolve sempre um resultado (sent/failed) para o fluxo
 * de emergência continuar mesmo se falhar.
 */
export async function sendLocalSms(phones: string[], message: string): Promise<SmsSendResult> {
  if (!smsPlugin || !phones || phones.length === 0 || !message) {
    return { sent: 0, failed: 0, skipped: true }
  }

  // Números únicos e válidos (evita duplicados de fontes diferentes)
  const unique = Array.from(
    new Set(phones.map((p) => (p || '').trim()).filter((p) => p.length >= 7))
  )
  if (unique.length === 0) return { sent: 0, failed: 0, skipped: true }

  try {
    let granted = await hasSmsPermission()
    if (!granted) {
      granted = await requestSmsPermission()
    }
    if (!granted) {
      return { sent: 0, failed: unique.length, failures: unique.map((phone) => ({ phone, error: 'sem permissão SEND_SMS' })) }
    }
    return await smsPlugin.send({ phones: unique, message })
  } catch (err) {
    console.warn('[SMS] envio local falhou:', err)
    return { sent: 0, failed: unique.length, failures: unique.map((phone) => ({ phone, error: 'falha no envio' })) }
  }
}
