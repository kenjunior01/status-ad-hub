/**
 * sos-report.ts — Relatório de Entrega do SOS (v3.14.0).
 *
 * Consolida num único relatório o resultado REAL de todos os canais de
 * envio automático do SOS:
 *  - SMS local (SIM)           — enviado/falhado, POR NÚMERO
 *  - Retry SMS                 — 2.ª tentativa dos números que falharam
 *  - Email (SMTP do Google)    — enviado/falhado, POR ENDEREÇO
 *  - Fallback Twilio (nuvem)   — enviado/falhado
 *  - Web Push (outros disp.)   — ok/falha
 *  - Testemunhas BT/WiFi       — contagem anexada à nuvem
 *  - Áudio                     — gravado, link enviado, anexo enviado
 *
 * O relatório fica guardado no aparelho (últimos 20) e é resumido nos
 * Eventos da nuvem — o Painel Admin passa a ver a fiabilidade real das
 * entregas, e a página Emergência mostra ao utilizador o que foi enviado,
 * para quem e por que canal.
 */

export interface SosAttempt {
  sent: number
  failed: number
  failures?: { phone?: string; email?: string; error: string }[]
  skipped?: boolean
  error?: string
  at?: string
}

export interface SosDispatchReport {
  at: string
  alertId?: string | null
  name?: string | null
  location?: { lat: number; lng: number }
  channels: {
    smsLocal?: SosAttempt
    smsRetry?: SosAttempt
    email?: SosAttempt
    twilio?: SosAttempt
    pushOk?: boolean
  }
  witnesses?: { total: number; bt: number; wifi: number }
  audio?: { started?: boolean; smsLink?: boolean; emailAnexo?: boolean }
  offline?: boolean
  loggedToCloud?: boolean
}

const REPORTS_KEY = 'statusads-sos-reports'
const MAX_REPORTS = 20

/** Relatório em curso (o SOS é uma cadeia assíncrona de vários segundos). */
let current: SosDispatchReport | null = null

export function startSosReport(init: Partial<SosDispatchReport>): SosDispatchReport {
  current = {
    at: new Date().toISOString(),
    alertId: init.alertId ?? null,
    name: init.name ?? null,
    location: init.location,
    channels: {},
    audio: { started: false },
    offline: init.offline ?? false,
  }
  saveSosReport(current)
  return current
}

/**
 * Aplica alterações ao relatório em curso (merge raso de topo + canais).
 * Se chamado sem argumento devolve o relatório actual.
 */
export function patchSosReport(
  patch?: Partial<Omit<SosDispatchReport, 'channels'>> & {
    channels?: Partial<SosDispatchReport['channels']>
  }
): SosDispatchReport | null {
  if (!patch) return current
  if (!current) return null
  const { channels, ...rest } = patch
  if (channels) current.channels = { ...current.channels, ...channels }
  Object.assign(current, rest)
  saveSosReport(current)
  return current
}

/** Relatório em curso (para efeitos fora do useEmergency, ex.: áudio). */
export function currentSosReport(): SosDispatchReport | null {
  return current
}

function readAll(): SosDispatchReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** Grava o relatório (histórico local, últimos 20). */
export function saveSosReport(report: SosDispatchReport): void {
  try {
    const all = readAll().filter((r) => r.at !== report.at)
    all.unshift(report)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all.slice(0, MAX_REPORTS)))
  } catch { /* quota — o relatório segue em memória */ }
}

export function getSosReports(): SosDispatchReport[] {
  return readAll()
}

export function getLastSosReport(): SosDispatchReport | null {
  return readAll()[0] ?? null
}

/** Total enviado num canal (0 quando o canal não existe). */
function ch(r: SosDispatchReport, key: 'smsLocal' | 'smsRetry' | 'email' | 'twilio'): SosAttempt {
  return r.channels?.[key] || { sent: 0, failed: 0, skipped: true }
}

/**
 * Resumo compacto (1 linha) para o registo de Eventos na nuvem — é isto
 * que o Painel Admin mostra. Ex.:
 * "SMS 3/3 (retry 0) · Email 2/2 · Twilio skip · Push ok · Testemunhas 5 · Audio anexo"
 */
export function summarizeReport(r: SosDispatchReport): string {
  const sms = ch(r, 'smsLocal')
  const retry = ch(r, 'smsRetry')
  const email = ch(r, 'email')
  const tw = ch(r, 'twilio')
  const parts: string[] = []
  parts.push(`SMS ${sms.sent}/${sms.sent + sms.failed}${retry.sent > 0 ? ` (retry +${retry.sent})` : ''}`)
  if (!email.skipped || email.sent > 0 || email.failed > 0) parts.push(`Email ${email.sent}/${email.sent + email.failed}`)
  parts.push(`Twilio ${tw.skipped ? 'skip' : `${tw.sent}/${tw.sent + tw.failed}`}`)
  if (r.channels.pushOk !== undefined) parts.push(`Push ${r.channels.pushOk ? 'ok' : 'falha'}`)
  if (r.witnesses && r.witnesses.total > 0) parts.push(`Testemunhas ${r.witnesses.total}`)
  if (r.audio?.started) parts.push(`Audio${r.audio.emailAnexo ? ' anexo' : r.audio.smsLink ? ' link' : ''}`)
  if (r.offline) parts.push('OFFLINE')
  return parts.join(' · ')
}
