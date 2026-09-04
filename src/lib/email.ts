/**
 * email.ts — SOS por Email via SMTP do Google (v3.12.0).
 *
 * Envia os avisos de emergência por email usando o SMTP do Gmail
 * (smtp.gmail.com:465) com "Palavra-passe de aplicação" — grátis, global,
 * sem nenhum serviço/API pago. O cliente SMTP corre nativamente no APK
 * (EmailPlugin.java, sockets SSL puros, zero bibliotecas).
 *
 * A grande vantagem sobre o SMS: o email leva ANEXOS — o áudio gravado
 * no SOS vai directamente para a caixa de entrada dos contactos, mais o
 * corpo detalhado com testemunhas BT/WiFi e link de localização.
 *
 * Configuração (uma vez, em Definições › Email de Emergência):
 *  1. Criar uma conta Gmail (ideal: conta dedicada só para a app)
 *  2. Activar Verificação em 2 passos: myaccount.google.com/security
 *  3. Gerar Palavra-passe de aplicação: myaccount.google.com/apppasswords
 *  4. Colar a palavra-passe de 16 caracteres na app
 *
 * Nota web/PWA: sem plugin nativo é no-op (o SMS local e a edge function
 * continuam a funcionar como canais alternativos).
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import type { WitnessSnapshot } from '@/lib/guardian'

export interface EmailAttachment {
  filename: string
  mime: string
  /** conteúdo em base64 puro (sem prefixo data:) */
  base64: string
}

export interface EmailSendResult {
  sent: number
  failed: number
  errors?: string[]
  skipped?: boolean
}

export interface EmailConfig {
  /** Conta Gmail remetente (ex.: statusads.alertas@gmail.com) */
  user: string
  /** App Password de 16 caracteres */
  pass: string
  enabled: boolean
}

interface EmailPluginInterface {
  send(opts: {
    host?: string
    port?: number
    user: string
    pass: string
    to: string[]
    subject: string
    body: string
    attachments?: EmailAttachment[]
  }): Promise<EmailSendResult>
}

const isAndroid = Capacitor.getPlatform() === 'android'

let emailPlugin: EmailPluginInterface | null = null
if (isAndroid) {
  try {
    emailPlugin = registerPlugin<EmailPluginInterface>('Email')
  } catch {
    emailPlugin = null
  }
}

// ── Configuração (no dispositivo — é ele que envia) ──────────────────────

const EMAIL_CFG_KEY = 'statusads-email-config'

/** Config guardada (pass em base64 simples — não é cifra, é obfuscação). */
export function getEmailConfig(): EmailConfig | null {
  try {
    const raw = localStorage.getItem(EMAIL_CFG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as { user?: string; passB64?: string; enabled?: boolean }
    if (!cfg?.user || !cfg?.passB64) return null
    const pass = atob(cfg.passB64)
    if (!pass) return null
    return { user: cfg.user, pass, enabled: cfg.enabled !== false }
  } catch {
    return null
  }
}

export function setEmailConfig(user: string, pass: string, enabled = true): void {
  localStorage.setItem(
    EMAIL_CFG_KEY,
    JSON.stringify({ user: user.trim().toLowerCase(), passB64: btoa(pass), enabled })
  )
}

export function clearEmailConfig(): void {
  localStorage.removeItem(EMAIL_CFG_KEY)
}

/** Email configurado e activo? */
export function isEmailReady(): boolean {
  const cfg = getEmailConfig()
  return !!cfg && cfg.enabled && isAndroid
}

// ── Cache de emails dos contactos (para o caminho offline/erro) ──────────

const EMAILS_CACHE_KEY = 'statusads-last-contact-emails'

export function cacheContactEmails(emails: string[]): void {
  try {
    const clean = (emails || []).map((e) => (e || '').trim().toLowerCase()).filter((e) => e.includes('@'))
    if (clean.length > 0) localStorage.setItem(EMAILS_CACHE_KEY, JSON.stringify(clean))
  } catch { /* quota — segue */ }
}

export function getCachedContactEmails(): string[] {
  try {
    const raw = localStorage.getItem(EMAILS_CACHE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((e: unknown) => typeof e === 'string' && e.includes('@')) : []
  } catch {
    return []
  }
}

/** Une fontes de emails, sem duplicados, preservando a ordem. */
export function mergeEmails(...sources: Array<string[] | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const src of sources) {
    for (const e of src || []) {
      const email = (e || '').trim().toLowerCase()
      if (email.includes('@') && !seen.has(email)) {
        seen.add(email)
        out.push(email)
      }
    }
  }
  return out
}

// ── Envio ────────────────────────────────────────────────────────────────

/**
 * Envia um email via SMTP configurado. Nunca lança — devolve sempre
 * resultado para o fluxo de emergência continuar.
 */
export async function sendSmtpEmail(
  to: string[],
  subject: string,
  body: string,
  attachments?: EmailAttachment[]
): Promise<EmailSendResult> {
  const cfg = getEmailConfig()
  if (!emailPlugin || !cfg || !cfg.enabled || to.length === 0) {
    return { sent: 0, failed: 0, skipped: true }
  }
  try {
    return await emailPlugin.send({
      user: cfg.user,
      pass: cfg.pass,
      to,
      subject,
      body,
      attachments,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'falha SMTP'
    return { sent: 0, failed: to.length, errors: [message] }
  }
}

// ── Composição das mensagens SOS ─────────────────────────────────────────

function witnessDetail(snap?: WitnessSnapshot | null): string {
  if (!snap || !Array.isArray(snap.devices) || snap.devices.length === 0) {
    return 'Testemunhas: nenhuma capturada (Radar desligado ou sem dispositivos perto).'
  }
  const bt = snap.devices.filter((d) => d.t === 'b').length
  const wifi = snap.devices.filter((d) => d.t === 'w').length
  const when = new Date(snap.capturedAt).toLocaleString('pt-PT')
  const lines: string[] = [
    `TESTEMUNHAS PERTO (${snap.devices.length} dispositivos: ${bt} Bluetooth, ${wifi} WiFi) — capturado em ${when}:`,
  ]
  const top = [...snap.devices].sort((a, b) => (b.c || 0) - (a.c || 0)).slice(0, 10)
  for (const d of top) {
    const tipo = d.t === 'w' ? 'WiFi' : 'BT'
    const nome = d.n ? ` nome="${d.n}"` : ''
    const sinal = typeof d.r === 'number' ? ` sinal=${d.r}dBm` : ''
    const vezes = typeof d.c === 'number' ? `, visto ${d.c}x` : ''
    lines.push(`  - [${tipo}] ${d.h}${nome}${sinal}${vezes}`)
  }
  if (snap.devices.length > top.length) {
    lines.push(`  ... e mais ${snap.devices.length - top.length} dispositivos (lista completa na nuvem).`)
  }
  return lines.join('\n')
}

export interface SosEmailOptions {
  name?: string | null
  lat: number
  lng: number
  witness?: WitnessSnapshot | null
  recording?: boolean
  /** hora local do disparo (legível) */
  at?: Date
}

/** Assunto do email SOS. */
export function buildSosEmailSubject(opts: { name?: string | null }): string {
  const who = (opts.name || '').trim()
  return who ? `SOS StatusAds: ${who} precisa de ajuda AGORA` : 'SOS StatusAds: pedido de socorro'
}

/** Corpo detalhado do email SOS (texto puro, PT). */
export function buildSosEmailBody(opts: SosEmailOptions): string {
  const who = (opts.name || 'Alguém').trim()
  const at = (opts.at || new Date()).toLocaleString('pt-PT')
  const maps = `https://maps.google.com/?q=${opts.lat.toFixed(5)},${opts.lng.toFixed(5)}`
  return [
    `PEDIDO DE SOCORRO — StatusAds Connect`,
    ``,
    `${who} activou o alerta de emergência em ${at}.`,
    ``,
    `LOCALIZAÇÃO ACTUAL:`,
    `  ${maps}`,
    `  Coordenadas: ${opts.lat.toFixed(6)}, ${opts.lng.toFixed(6)}`,
    ``,
    witnessDetail(opts.witness),
    ``,
    opts.recording
      ? `GRAVAÇÃO DE ÁUDIO: activada — segue em anexo assim que estiver disponível (ou disponível no cofre de evidências).`
      : `GRAVAÇÃO DE ÁUDIO: não activada.`,
    ``,
    `— Mensagem automática enviada pelo telemóvel de ${who} via StatusAds Connect.`,
  ].join('\n')
}

/** Corpo do email de follow-up com o áudio anexado. */
export function buildAudioEmailBody(durationSeconds: number, at?: Date): string {
  const when = (at || new Date()).toLocaleString('pt-PT')
  const min = Math.floor(durationSeconds / 60)
  const sec = String(Math.round(durationSeconds % 60)).padStart(2, '0')
  return [
    `EVIDÊNCIA DE ÁUDIO — StatusAds Connect`,
    ``,
    `Segue em anexo a gravação de áudio capturada durante a emergência (${min}:${sec} min).`,
    `Hora do envio: ${when}`,
    ``,
    `A gravação também está guardada no cofre de evidências da app.`,
    ``,
    `— Mensagem automática enviada pelo StatusAds Connect.`,
  ].join('\n')
}
