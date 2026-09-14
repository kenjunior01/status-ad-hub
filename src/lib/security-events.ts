/**
 * security-events.ts — DIÁRIO DE EVENTOS DE SEGURANÇA (v3.17.0).
 *
 * Registo local append-only de tudo o que acontece na app do ponto de
 * vista de segurança: ameaças de rede detectadas, rastreadores BLE,
 * SOS, check-ins falhados, PIN duress, scans, alterações de sistema.
 *
 * A vida na web e na APK: localStorage (máx. 300 eventos, 30 dias).
 * A Central de Segurança mostra o feed e permite sincronizar para a
 * nuvem (tabela security_events — migration 018) via src/lib/api.ts.
 */

// ── Tipos ─────────────────────────────────────────────────────────────────

export type SecurityEventKind =
  | 'threat'      // ameaça de rede detectada (open/evil twin/honeypot…)
  | 'tracker'     // rastreador/perseguidor BLE detectado
  | 'sos'         // SOS disparado
  | 'checkin'     // check-in falhado/confirmado
  | 'duress'      // PIN duress usado
  | 'scan'        // varredura executada (vigilância contínua)
  | 'system'      // alterações (permissões, modos, sync)

export interface SecurityEvent {
  id: string
  ts: number
  kind: SecurityEventKind
  severity: 'high' | 'medium' | 'low' | 'info'
  title: string
  detail?: string
  /** metadados livres (ex.: { bssid }, { mac }) */
  meta?: Record<string, unknown>
  /** true quando já foi enviado para a nuvem */
  synced?: boolean
}

// ── Persistência local ────────────────────────────────────────────────────

const LOG_KEY = 'statusads-security-events'
const LOG_MAX = 300
const LOG_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

function readRaw(): SecurityEvent[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - LOG_TTL_MS
    return (arr as SecurityEvent[]).filter((e) => (e.ts || 0) >= cutoff)
  } catch {
    return []
  }
}

function writeRaw(list: SecurityEvent[]): void {
  try {
    while (list.length > LOG_MAX) list.pop()
    localStorage.setItem(LOG_KEY, JSON.stringify(list))
  } catch { /* quota — segue */ }
}

/** Lê todos os eventos (mais recentes primeiro). */
export function getSecurityEvents(): SecurityEvent[] {
  return readRaw().sort((a, b) => b.ts - a.ts)
}

/** Apaga o diário local por inteiro. */
export function clearSecurityEvents(): void {
  try { localStorage.removeItem(LOG_KEY) } catch { /* segue */ }
}

/** Marca eventos como sincronizados na nuvem. */
export function markSynced(ids: string[]): void {
  if (!ids.length) return
  const set = new Set(ids)
  const list = readRaw().map((e) => (set.has(e.id) ? { ...e, synced: true } : e))
  writeRaw(list)
}

// ── Escrita ───────────────────────────────────────────────────────────────

function uid(): string {
  try { return crypto.randomUUID() } catch {
    return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Registra um evento de segurança. Devolve o evento criado (ou null se
 * for duplicado dentro da janela anti-spam).
 */
export function logSecurityEvent(
  kind: SecurityEventKind,
  severity: SecurityEvent['severity'],
  title: string,
  detail?: string,
  meta?: Record<string, unknown>,
  dedupWindowMs = 10 * 60_000,
): SecurityEvent | null {
  try {
    const list = readRaw()
    // anti-spam: mesmo título+kind dentro da janela não volta a registar
    const dup = list.find(
      (e) => e.kind === kind && e.title === title && Date.now() - e.ts < dedupWindowMs,
    )
    if (dup) return null
    const ev: SecurityEvent = {
      id: uid(),
      ts: Date.now(),
      kind,
      severity,
      title,
      detail,
      meta,
      synced: false,
    }
    list.unshift(ev)
    writeRaw(list)
    return ev
  } catch {
    return null
  }
}

// ── Apresentação ──────────────────────────────────────────────────────────

export const EVENT_KIND_LABEL: Record<SecurityEventKind, string> = {
  threat: 'Ameaça de rede',
  tracker: 'Rastreador',
  sos: 'SOS',
  checkin: 'Check-in',
  duress: 'PIN duress',
  scan: 'Varredura',
  system: 'Sistema',
}

/** Aplica eventos de ameaça de rede no diário (chamado após cada análise). */
export function logThreatsToSecurityLog(
  threats: Array<{ kind: string; severity: string; title: string; detail: string }>,
): number {
  let n = 0
  for (const t of threats || []) {
    const sev = t.severity === 'high' ? 'high' : t.severity === 'medium' ? 'medium' : 'low'
    const ev = logSecurityEvent('threat', sev, t.title, t.detail, { kind: t.kind })
    if (ev) n++
  }
  return n
}
