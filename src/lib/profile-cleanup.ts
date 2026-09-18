/**
 * profile-cleanup.ts — Limpeza Seletiva de Dados Locais (v3.30.0).
 *
 * A app acumula vestígios úteis em condição normal, mas o utilizador pode
 * querer apagá-los a qualquer momento: diário de segurança, relatórios de
 * SOS, testemunhas BLE/Wi-Fi, radares de ambiente, caches de contactos…
 * Esta lib permite escolher MÓDULOS e apagar só o que foi seleccionado.
 *
 * Regras de segurança (mesma filosofia do profile-backup):
 *  · NUNCA toca em definições de segurança nem estado volátil — Guardião,
 *    Bloqueio de App, PINs, sessão de coerção activa, camuflagem, sal de
 *    privacidade, config SMTP/Chamada Falsa/Quedas, perfil médico, tema,
 *    admin de pagamentos (demo-*) e a fila offline de emergências
 *  · Só apaga chaves locais com os prefixes conhecidos (statusads-,
 *    statusads_, aegis-, aegis_) + o registo NATIVO de testemunhas quando
 *    o utilizador escolhe esse grupo (via PanicPlugin.clearWitnessLog)
 *  · Dados do servidor (contactos, plano, sessões, auth) não são locais —
 *    ficam fora por natureza
 *  · A app recarrega depois da limpeza (igual ao restauro do backup) para
 *    todos os subsistemas relerem o storage
 */

import { getNativePanic } from '@/lib/guardian'

export interface CleanupGroup {
  id: string
  label: string
  desc: string
  /** Chaves de localStorage deste grupo. */
  keys: string[]
  /** Limpa também o registo NATIVO de testemunhas (só Android). */
  nativeWitness?: boolean
  /** 'evidence' → aviso extra: pode ser precisa como prova depois. */
  risk?: 'evidence'
}

export interface ScannedCleanupGroup extends CleanupGroup {
  /** Chaves do grupo que existem neste momento. */
  count: number
  /** Tamanho aproximado em bytes (chave+valor, ×2 para UTF-16). */
  bytes: number
}

export interface CleanupResult {
  removed: number
  groupsCleared: string[]
}

/** Prefixos de dados locais da app (mesmos do profile-backup). */
const PREFIXES = ['statusads-', 'statusads_', 'aegis-', 'aegis_']

/**
 * Chaves que a limpeza NUNCA toca: definições de segurança, identidade,
 * estado volátil de sessão e dados pendentes de emergência.
 */
const NEVER = new Set<string>([
  // Guardião + gatilhos (definição de segurança)
  'statusads-guardian',
  // Bloqueio de App (definição + sessão)
  'aegis-app-lock',
  'aegis-app-lock-unlocked',
  'aegis-local-unlock',
  // Anti-coerção: configuração + sessão volátil activa (NUNCA apagar:
  // limpar a sessão de coerção poderia libertar a app em modo fantasma)
  'statusads-anti-coercion',
  'statusads-coercion-active',
  'statusads-coercion-active-time',
  'statusads-disguise-session',
  'statusads-pending-disguise',
  // PINs e estado duress
  'panic-deactivation-pin',
  'duress-login-armed',
  // Configurações de módulos (definições, não vestígios)
  'statusads-email-config',
  'statusads-fakecall-config',
  'statusads-fakecall-schedule',
  'statusads-fall-config',
  'statusads-medical-profile',
  'statusads-theme',
  'statusads-radar-watch',
  'sa_battery_alert_enabled',
  'sa_battery_threshold',
  'aegis_haptics',
  'aegis_swipe_nav',
  // Privacidade infra-estrutura (sal de hashing — consistência do histórico)
  'statusads-privacy-salt-v1',
  // Fila/buffer de emergências pendentes (dados críticos não enviados)
  'statusads_offline_buffer',
  'statusads-offline-queue', // nome da IndexedDB — documentado por clareza
  // Admin de pagamentos (demo)
  'statusads-demo-settings',
  'statusads-demo-plan',
  'statusads-demo-admin-codes',
  'statusads-demo-admin-promos',
  'statusads-demo-admin-seed-v1',
  'statusads-demo-payment-confirmed',
  'statusads-demo-payments',
  'statusads-demo-subscriptions',
  // Marcador interno
  'aegis-statusads',
])

/** Grupos de limpeza — dados/vestígios, nunca definições. */
export const CLEANUP_GROUPS: CleanupGroup[] = [
  {
    id: 'diario',
    label: 'Diário de Segurança',
    desc: 'Eventos de segurança (ameaças, SOS, sistema) e histórico de risco do ambiente',
    keys: ['statusads-security-events', 'statusads-risk-history'],
  },
  {
    id: 'sos-relatorios',
    label: 'Relatórios de SOS',
    desc: 'Relatórios de entrega dos últimos SOS (canais, testemunhas, GPS)',
    keys: ['statusads-sos-reports'],
  },
  {
    id: 'testemunhas',
    label: 'Registo de Testemunhas',
    desc: 'Dispositivos BLE/Wi-Fi vistos perto de si (registo nativo 24/7 + cópia local do snapshot)',
    keys: ['statusads-witness-snapshot'],
    nativeWitness: true,
  },
  {
    id: 'radares',
    label: 'Radares de Ambiente',
    desc: 'Histórico BLE, redes Wi-Fi vistas/ocultas e inteligência de locais (impressões digitais)',
    keys: [
      'statusads-ble-registry',
      'statusads-wifi-registry',
      'statusads-wifi-hidden',
      'statusads-intel-rssi-hist',
      'statusads-intel-places',
      'statusads-intel-place-state',
      'aegis-radio-anchors',
      'aegis-radio-fixes',
      'aegis-presence-devices',
    ],
  },
  {
    id: 'caches-sos',
    label: 'Caches de Contactos SOS',
    desc: 'Números e emails de contactos em cache para envio offline + hora do último SMS',
    keys: ['statusads-last-contacts', 'statusads-last-contact-emails', 'statusads-sos-sms-at'],
  },
  {
    id: 'evidencias',
    label: 'Evidências Locais (Cofre)',
    desc: 'Áudios e fotografias guardados só neste aparelho — podem ser precisos como prova',
    keys: ['statusads-local-evidence'],
    risk: 'evidence',
  },
  {
    id: 'bellvion',
    label: 'Dispositivos Bellvion',
    desc: 'Dispositivos vestíveis emparelhados localmente',
    keys: ['statusads-bellvion-devices'],
  },
  {
    id: 'tecnicos',
    label: 'Registos Técnicos',
    desc: 'Logs de erro/diagnóstico e flags de avisos (offline, online, emergência)',
    keys: [
      'statusads_error_cache',
      'statusads_error_log',
      'statusads-error-logs',
      'statusads-emergency-offline-warn',
      'statusads-offline-toast',
      'statusads-online-toast',
    ],
  },
  {
    id: 'onboarding',
    label: 'Onboarding & Tour',
    desc: 'Marcadores do tour guiado, onboarding e aviso de instalação PWA',
    keys: [
      'statusads_onboarding_dismissed',
      'statusads-tour-done',
      'statusads-pwa-prompt-dismissed-at',
    ],
  },
]

function isLocalDataKey(key: string): boolean {
  return PREFIXES.some((p) => key.startsWith(p))
}

/** Chaves locais actuais que não pertencem a nenhum grupo nem à lista NUNCA. */
function collectOtherKeys(): string[] {
  const classified = new Set<string>(NEVER)
  for (const g of CLEANUP_GROUPS) g.keys.forEach((k) => classified.add(k))
  const others: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || classified.has(k) || !isLocalDataKey(k)) continue
      others.push(k)
    }
  } catch {
    // storage indisponível — sem grupo "Outros"
  }
  return others
}

/** Mede os grupos com o estado ACTUAL do storage (contagem + bytes). */
export function scanCleanupGroups(): ScannedCleanupGroup[] {
  const result: ScannedCleanupGroup[] = []
  const others = new Set(collectOtherKeys())
  for (const g of CLEANUP_GROUPS) {
    let count = 0
    let bytes = 0
    for (const k of g.keys) {
      try {
        const v = localStorage.getItem(k)
        if (v == null) continue
        count++
        bytes += (k.length + v.length) * 2
      } catch {
        // storage indisponível — chave ignorada
      }
    }
    result.push({ ...g, count, bytes })
  }
  // Grupo "Outros": chaves locais não classificadas (futuros módulos)
  let oCount = 0
  let oBytes = 0
  for (const k of others) {
    try {
      const v = localStorage.getItem(k)
      if (v == null) continue
      oCount++
      oBytes += (k.length + v.length) * 2
    } catch {
      // ignorar
    }
  }
  result.push({
    id: 'outros',
    label: 'Outros dados locais',
    desc: 'Chaves locais de módulos sem grupo próprio (futuras funcionalidades)',
    keys: Array.from(others),
    count: oCount,
    bytes: oBytes,
  })
  return result
}

/**
 * Apaga os grupos seleccionados (só o que existe). O grupo de testemunhas
 * limpa também o registo NATIVO (memória do serviço + prefs) no Android.
 * Devolve quantos itens foram removidos — a UI recarrega a app depois.
 */
export async function applyCleanup(groupIds: string[]): Promise<CleanupResult> {
  const wanted = new Set(groupIds)
  let removed = 0
  const groupsCleared: string[] = []

  for (const g of CLEANUP_GROUPS) {
    if (!wanted.has(g.id)) continue
    let touched = false
    for (const k of g.keys) {
      try {
        if (localStorage.getItem(k) != null) {
          localStorage.removeItem(k)
          removed++
          touched = true
        }
      } catch {
        // storage indisponível — segue
      }
    }
    if (g.nativeWitness) {
      const panic = getNativePanic()
      if (panic) {
        try {
          await panic.clearWitnessLog()
          touched = true
        } catch {
          // nativo indisponível — a cópia local já foi apagada
        }
      }
    }
    if (touched) groupsCleared.push(g.label)
  }

  // Grupo "Outros" (chaves dinâmicas — não está em CLEANUP_GROUPS)
  if (wanted.has('outros')) {
    for (const k of collectOtherKeys()) {
      try {
        localStorage.removeItem(k)
        removed++
      } catch {
        // segue
      }
    }
    groupsCleared.push('Outros dados locais')
  }

  return { removed, groupsCleared }
}

/** Formata bytes para a UI (KB/MB curto). */
export function fmtCleanupBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  if (b >= 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${Math.round(b)} B`
}
