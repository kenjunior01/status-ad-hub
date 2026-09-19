/**
 * full-sync.ts — SINCRONIZAÇÃO COMPLETA WEB ↔ APK (v3.35.0).
 *
 * A web e a APK partilham a MESMA conta no MESMO Supabase — este motor
 * garante que o que a app guarda no aparelho chega à nuvem (e vice-versa
 * nas leituras normais de cada módulo), com um resumo honesto por bloco:
 *
 *   · EVENTOS    — diário de segurança local → security_events (pendentes)
 *   · LOCAIS     — impressões digitais Wi-Fi → place_fingerprints (upsert)
 *   · WI-FI      — registo de redes vistas → wifi_registry (cap 400)
 *   · BLE        — registo BLE fica NO APARELHO por desenho (privacidade:
 *                  MACs de terceiros não precisam de sair daqui)
 *   · CONTACTOS/DISPOSITIVOS — vivem sempre na nuvem (contagem p/ paridade)
 *
 * Usado pelo cartão "Sincronização" (web) e painel táctico (APK).
 */

import { supabase } from '@/lib/supabase'
import { getSecurityEvents, markSynced } from '@/lib/security-events'
import {
  saveSecurityEvents, savePlaceFingerprints, saveWifiRegistry,
  getContacts, getDevices,
} from '@/lib/api'
import { getKnownPlaces } from '@/lib/net-intel'
import { wifiGetRegistry } from '@/lib/net-radar'
import { bleGetRegistry } from '@/lib/radar-registry'
import { getAccountInfo } from '@/lib/native-auth'

/** marca da última sincronização BEM-SUCEDIDA (epoch ms, v3.38.0) */
const LAST_SYNC_KEY = 'statusads-last-full-sync'
/** auto-sync corre UMA vez por sessão da app */
let autoSyncStarted = false

export function getLastFullSyncAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_SYNC_KEY) || 0)
    return v > 0 ? v : null
  } catch { return null }
}

/** "há 3 min" / "há 2 h" / "há 5 dias" — null quando nunca sincronizou. */
export function formatLastSync(at: number | null): string | null {
  if (!at) return null
  const s = Math.floor((Date.now() - at) / 1000)
  if (s < 60) return 'há menos de um minuto'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86_400) {
    const h = Math.floor(s / 3600)
    return `há ${h} h`
  }
  const d = Math.floor(s / 86_400)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}

export interface FullSyncResult {
  ok: boolean
  account: { email: string; provider: string } | null
  /** blocos empurrados para a nuvem nesta corrida */
  pushed: { eventos: number; locais: number; wifi: number }
  /** paridade com a web (contagens na nuvem) */
  cloud: { contactos: number; dispositivos: number; eventos: number }
  /** o que permanece só no aparelho (por desenho de privacidade) */
  local: { ble: number; pendentes: number }
  erros: string[]
}

export async function runFullSync(): Promise<FullSyncResult> {
  const res: FullSyncResult = {
    ok: false,
    account: null,
    pushed: { eventos: 0, locais: 0, wifi: 0 },
    cloud: { contactos: 0, dispositivos: 0, eventos: 0 },
    local: { ble: 0, pendentes: 0 },
    erros: [],
  }

  // ── conta (a MESMA da versão web) ─────────────────────────────────
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    res.erros.push('Sem sessão activa — entre na conta primeiro.')
    return res
  }
  res.account = await getAccountInfo()

  // ── 1. eventos de segurança pendentes ─────────────────────────────
  try {
    const pendentes = getSecurityEvents().filter((e) => !e.synced)
    res.local.pendentes = pendentes.length
    if (pendentes.length > 0) {
      const n = await saveSecurityEvents(user.id, pendentes)
      if (n > 0) {
        markSynced(pendentes.map((e) => e.id))
        res.pushed.eventos = pendentes.length
      }
    }
  } catch (e) {
    res.erros.push(`Eventos: ${e instanceof Error ? e.message : 'falha'}`)
  }

  // ── 2. locais conhecidos (impressões digitais Wi-Fi) ──────────────
  try {
    const places = getKnownPlaces()
    if (places.length > 0) {
      res.pushed.locais = await savePlaceFingerprints(user.id, places)
    }
  } catch (e) {
    res.erros.push(`Locais: ${e instanceof Error ? e.message : 'falha'}`)
  }

  // ── 3. registo de redes Wi-Fi vistas ──────────────────────────────
  try {
    const reg = await wifiGetRegistry()
    if (reg.length > 0) {
      res.pushed.wifi = await saveWifiRegistry(user.id, reg)
    }
  } catch (e) {
    res.erros.push(`Wi-Fi: ${e instanceof Error ? e.message : 'falha'}`)
  }

  // ── 4. BLE — contagem local (privado por desenho) ─────────────────
  try { res.local.ble = bleGetRegistry().length } catch { /* segue */ }

  // ── 5. paridade: o que a web também vê nesta conta ────────────────
  try {
    const contacts = await getContacts(user.id)
    res.cloud.contactos = contacts.length
  } catch { /* segue — contagem é best-effort */ }
  try {
    const devices = await getDevices(user.id)
    res.cloud.dispositivos = devices.length
  } catch { /* segue */ }
  try {
    const { count } = await supabase
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    res.cloud.eventos = count ?? 0
  } catch { /* segue */ }

  res.ok = res.erros.length === 0
  if (res.ok) {
    try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())) } catch { /* quota */ }
  }
  return res
}

/**
 * v3.38.0 — SINCRONIZAÇÃO AUTOMÁTICA NA ABERTURA: a app arranjar sessão
 * activa empurra sozinha o que ficou pendente (eventos, locais, Wi-Fi) —
 * o utilizador deixa de ter de lembrar-se do botão. Corre UMA vez por
 * sessão, é silenciosa (sem toasts) e nunca bloqueia o arranque.
 */
export async function maybeAutoSync(): Promise<FullSyncResult | null> {
  if (autoSyncStarted) return null
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  autoSyncStarted = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null // sem conta — o botão é o caminho
    return await runFullSync()
  } catch {
    return null // auto-sync é melhor esforço
  }
}
