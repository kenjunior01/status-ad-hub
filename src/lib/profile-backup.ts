/**
 * profile-backup.ts — Backup & Restauro do perfil de segurança local (v3.26.0).
 *
 * O Aegis guarda TODA a configuração de segurança no localStorage do aparelho
 * (Guardião, Bloqueio de App, Anti-Coerção, Chamada Falsa, Perfil Médico, …).
 * Sem backup, trocar de telemóvel ou limpar dados do navegador significa
 * reconfigurar tudo do zero — e quem depende do modo duress e do PIN de
 * desactivação do pânico não pode dar-se ao luxo de esquecer um passo.
 *
 * Este módulo:
 *  · Exporta as definições LOCAIS para um ficheiro .json (opcionalmente
 *    cifrado com AES-GCM 256 + PBKDF2 — o ficheiro contém hashes de PINs e
 *    caches de contactos, por isso a cifra é fortemente recomendada);
 *  · Importa e valida o ficheiro (app/formato correctos, descifragem com
 *    palavra-passe) e apresenta um resumo legível antes de restaurar;
 *  · Restaura por cima das definições actuais — a app reinicia para todos
 *    os subsistemas relerem o storage.
 *
 * O que NUNCA entra no backup: sessão de coerção activa, tokens de auth
 * (sb-*), estado transitório de UI, caches grandes de radar/intel e logs.
 * Contactos e plano vivem no servidor — ficam de fora por natureza.
 */

export const APP_VERSION = '3.31.0'

// ── Regras de inclusão ───────────────────────────────────────────────────────

/** Namespaces que pertencem ao perfil local do aparelho. */
const INCLUDE_PREFIXES = ['statusads-', 'statusads_', 'aegis-', 'aegis_']

/** Chaves úteis fora do namespace padrão. */
const INCLUDE_EXACT = [
  'panic-deactivation-pin',   // PIN de desactivação do pânico (usePanicMode)
  'duress-login-armed',       // modo duress no login (DuressPinLogin)
  'sa_battery_alert_enabled', // alerta de bateria da sentinela
  'sa_battery_threshold',
]

/** Chaves transitórias / de sessão / de infra que NÃO fazem parte do perfil. */
const EXCLUDE = new Set<string>([
  // estado vivo do modo duress — restaurar podia prender a app em modo fantasma
  'statusads-coercion-active',
  'statusads-coercion-active-time',
  // camuflagem: sessão e pendência de instalação
  'statusads-disguise-session',
  'statusads-pending-disguise',
  // sessão de desbloqueio do App Lock (flag por sessão)
  'aegis-app-lock-unlocked',
  // anti-duplicação e snapshots efémeros de SOS
  'statusads-sos-sms-at',
  'statusads-witness-snapshot',
  // logs e buffers de infra-estrutura
  'statusads_error_cache',
  'statusads_error_log',
  'statusads_offline_buffer',
  // config de admin (pagamentos) e subscrição — vivem no servidor
  'statusads-demo-settings',
  'statusads-demo-plan',
  // UX de primeira utilização — melhor re-mostrar no aparelho novo
  'statusads-pwa-prompt-dismissed-at',
  'statusads_onboarding_dismissed',
  // caches grandes de radar/intel — dados do aparelho, não do perfil
  'statusads-wifi-registry',
  'statusads-wifi-hidden',
  'statusads-ble-registry',
  'statusads-intel-rssi-hist',
  'statusads-intel-places',
  'statusads-intel-place-state',
  'statusads-risk-history',
  'statusads-security-events',
  'statusads-sos-reports',
  'statusads-bellvion-devices',
])

function isProfileKey(key: string): boolean {
  if (EXCLUDE.has(key)) return false
  if (INCLUDE_EXACT.includes(key)) return true
  return INCLUDE_PREFIXES.some((p) => key.startsWith(p))
}

/** Varre o localStorage e devolve só as chaves que fazem parte do perfil. */
export function collectProfileData(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !isProfileKey(key)) continue
      const value = localStorage.getItem(key)
      if (value !== null) out[key] = value
    }
  } catch {
    // storage bloqueado — devolve o que se conseguiu
  }
  return out
}

// ── Etiquetas para o resumo de importação ───────────────────────────────────

/** Ordem define a ordem do resumo na UI. */
const LABELS: Array<{ keys: string[]; label: string }> = [
  { keys: ['statusads-guardian'], label: 'Guardião (armado, gatilhos, fio BT)' },
  { keys: ['aegis-app-lock'], label: 'Bloqueio de App (PIN, biometria, auto-lock)' },
  { keys: ['statusads-anti-coercion'], label: 'Senha Anti-Coerção (duress)' },
  { keys: ['panic-deactivation-pin'], label: 'PIN de desactivação do Pânico' },
  { keys: ['duress-login-armed'], label: 'Modo duress no ecrã de login' },
  { keys: ['statusads-medical-profile'], label: 'Perfil Médico' },
  { keys: ['statusads-email-config'], label: 'Email de Emergência (SMTP)' },
  { keys: ['statusads-fakecall-config', 'statusads-fakecall-schedule'], label: 'Chamada Falsa' },
  { keys: ['statusads-fall-config'], label: 'Deteção de Quedas' },
  { keys: ['statusads-radar-watch'], label: 'Vigia do Radar' },
  { keys: ['statusads-last-contacts', 'statusads-last-contact-emails'], label: 'Cache offline de contactos SOS' },
  { keys: ['statusads-theme'], label: 'Tema visual' },
  { keys: ['aegis_haptics', 'aegis_swipe_nav'], label: 'Interação tátil (háptica, swipe)' },
  { keys: ['sa_battery_alert_enabled', 'sa_battery_threshold'], label: 'Alertas de bateria' },
]

export interface BackupGroup {
  label: string
  count: number
}

/** Agrupa as chaves de um backup em linhas legíveis (para a pré-visualização). */
export function summarizeBackup(data: Record<string, string>): BackupGroup[] {
  const groups: BackupGroup[] = []
  const seen = new Set<string>()
  for (const { keys, label } of LABELS) {
    const present = keys.filter((k) => k in data && !seen.has(k))
    present.forEach((k) => seen.add(k))
    if (present.length > 0) groups.push({ label, count: present.length })
  }
  const rest = Object.keys(data).filter((k) => !seen.has(k))
  if (rest.length > 0) groups.push({ label: 'Outras definições', count: rest.length })
  return groups
}

// ── Cifragem (AES-GCM 256 + PBKDF2) ─────────────────────────────────────────

const PBKDF2_ITERATIONS = 150_000
const CRYPTO_SCHEME = 'AES-GCM-256-PBKDF2-SHA256'

function b64encode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  crypto.getRandomValues(out)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Ficheiro de backup (formato 1) ──────────────────────────────────────────

export interface BackupMeta {
  app: 'aegis-statusads'
  format: 1
  appVersion: string
  exportedAt: string
  encrypted?: boolean
  scheme?: string
  iterations?: number
  salt?: string
  iv?: string
  ciphertext?: string
}

interface BackupFile {
  meta: BackupMeta
  data?: Record<string, string>
}

export interface ParsedBackup {
  meta: BackupMeta
  encrypted: boolean
  /** Presente quando o ficheiro vem aberto (sem cifra). */
  data: Record<string, string> | null
  /** Ficheiro cru — necessário para unlockBackup() quando cifrado. */
  raw: BackupFile
}

export class BackupError extends Error {}

function validateMeta(meta: unknown): BackupMeta {
  if (!meta || typeof meta !== 'object') throw new BackupError('Ficheiro sem cabeçalho válido.')
  const m = meta as Partial<BackupMeta>
  if (m.app !== 'aegis-statusads') throw new BackupError('Este ficheiro não é um backup do Aegis.')
  if (m.format !== 1) throw new BackupError(`Formato de backup desconhecido (v${String(m.format)}). Actualize a app.`)
  if (!m.exportedAt || typeof m.appVersion !== 'string') throw new BackupError('Cabeçalho do backup incompleto.')
  return m as BackupMeta
}

// ── Exportar ────────────────────────────────────────────────────────────────

function timestampSlug(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/**
 * Exporta o perfil local e descarrega o ficheiro. Devolve o nome do ficheiro
 * e o nº de chaves incluídas. Com `passphrase` (mín. 4 caracteres), o ficheiro
 * é cifrado — sem ela, fica legível (menos seguro, útil para inspecionar).
 */
export async function exportProfile(passphrase?: string): Promise<{ file: string; items: number }> {
  const data = collectProfileData()
  const items = Object.keys(data).length
  if (items === 0) throw new BackupError('Nada para exportar — o perfil deste aparelho está vazio.')

  let meta: BackupMeta = {
    app: 'aegis-statusads',
    format: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
  }
  let payload: BackupFile

  const pass = (passphrase || '').trim()
  if (pass.length > 0) {
    if (!crypto?.subtle) throw new BackupError('Cifragem indisponível neste contexto (precisa de HTTPS/APK).')
    if (pass.length < 4) throw new BackupError('A palavra-passe precisa de pelo menos 4 caracteres.')
    const salt = randomBytes(16)
    const iv = randomBytes(12)
    const key = await deriveKey(pass, salt, PBKDF2_ITERATIONS)
    const plain = new TextEncoder().encode(JSON.stringify(data))
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plain as BufferSource)
    meta = { ...meta, encrypted: true, scheme: CRYPTO_SCHEME, iterations: PBKDF2_ITERATIONS, salt: b64encode(salt), iv: b64encode(iv) }
    payload = { meta, ciphertext: b64encode(new Uint8Array(cipher)) }
  } else {
    payload = { meta, data }
  }

  const json = JSON.stringify(payload, null, 2)
  const file = `aegis-perfil-${timestampSlug()}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = file
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
  return { file, items }
}

// ── Importar ────────────────────────────────────────────────────────────────

/** Lê e valida o ficheiro. Se estiver cifrado, `data` vem null → pedir senha. */
export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new BackupError('Ficheiro ilegível — não é um JSON válido.')
  }
  if (!json || typeof json !== 'object') throw new BackupError('Estrutura de backup inválida.')
  const raw = json as BackupFile
  const meta = validateMeta(raw.meta)

  if (meta.encrypted) {
    if (!raw.ciphertext || !raw.salt || !raw.iv) throw new BackupError('Backup cifrado incompleto.')
    return { meta, encrypted: true, data: null, raw }
  }
  if (!raw.data || typeof raw.data !== 'object') throw new BackupError('Backup sem dados de perfil.')
  const clean = Object.fromEntries(
    Object.entries(raw.data).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
  ) as Record<string, string>
  return { meta, encrypted: false, data: clean, raw }
}

/** Descifra um backup cifrado com a palavra-passe do utilizador. */
export async function unlockBackup(parsed: ParsedBackup, passphrase: string): Promise<Record<string, string>> {
  if (!parsed.encrypted) return parsed.data as Record<string, string>
  const { meta } = parsed
  if (!crypto?.subtle) throw new BackupError('Descifragem indisponível neste contexto (precisa de HTTPS/APK).')
  try {
    const salt = b64decode(meta.salt as string)
    const iv = b64decode(meta.iv as string)
    const cipher = b64decode(meta.ciphertext as string)
    const key = await deriveKey(passphrase, salt, meta.iterations || PBKDF2_ITERATIONS)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher as BufferSource)
    const data = JSON.parse(new TextDecoder().decode(plain))
    if (!data || typeof data !== 'object') throw new Error('payload')
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
    ) as Record<string, string>
  } catch {
    throw new BackupError('Palavra-passe incorrecta ou ficheiro corrompido.')
  }
}

export interface ApplyResult {
  applied: number
  skipped: number
}

/**
 * Escreve o perfil restaurado por cima das definições actuais. Só aceita
 * chaves que passam as regras do perfil (defesa contra ficheiros manipulados).
 * O chamador deve reiniciar a app para os subsistemas relerem o storage.
 */
export function applyBackup(data: Record<string, string>): ApplyResult {
  let applied = 0
  let skipped = 0
  for (const [key, value] of Object.entries(data)) {
    if (!isProfileKey(key) || typeof value !== 'string') {
      skipped++
      continue
    }
    try {
      localStorage.setItem(key, value)
      applied++
    } catch {
      skipped++
    }
  }
  return { applied, skipped }
}
