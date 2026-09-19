/**
 * presence-history.ts — HISTÓRICO DE PRESENÇAS DE 30 DIAS (v3.33.0).
 *
 * Cada ciclo da sentinela regista os dispositivos vistos (Wi-Fi + BLE)
 * COM CONTEXTO: sinal, local conhecido (net-intel), posição aproximada
 * e se o utilizador estava EM MOVIMENTO no momento. Com 30 dias de
 * retenção o histórico passa a responder as perguntas que importam:
 *
 *  · DE QUEM SÃO — o utilizador atribui donos ("telemóvel da Maria",
 *    "carro do vizinho") e o motor sugere pela correlação de local
 *    ("visto 18× em Casa → provavelmente alguém do prédio")
 *  · COMPANHIAS DE CAMINHO — dispositivos vistos em ≥2 pontos distintos
 *    do percurso (≥40 m entre pontos): estiveram NO CAMINHO consigo,
 *    não apenas no mesmo sítio (padrão de quem se desloca junto)
 *  · CONTEXTO ACTUAL — quantos dispositivos estão à volta agora,
 *    quantos companheiros presentes, quantos já conhecidos
 *
 * Tudo LOCAL (chave aegis-presence-devices, incluída na Limpeza de
 * Dados › Radares). Nada sobe para a nuvem — mas desde a v3.37.0 VIAJA
 * no backup cifrado do perfil: exportar/restaurar leva o histórico
 * (e os DONOS que o utilizador ensinou) para o aparelho novo, com
 * MERGE consciente em vez de overwrite cego.
 */

import { haversineM } from '@/lib/radio-position'

// ── Tipos ────────────────────────────────────────────────────────────────

export type PresenceKind = 'wifi' | 'ble'

/** Uma observação de um ciclo (Wi-Fi ou BLE). */
export interface PresenceInput {
  /** BSSID (Wi-Fi) ou MAC (BLE) */
  id: string
  kind: PresenceKind
  /** SSID (Wi-Fi) ou nome anunciado (BLE) */
  name?: string | null
  /** contexto extra (segurança/banda, fabricante/classe) */
  meta?: string | null
  rssi: number
}

export interface PresenceEntry {
  id: string
  kind: PresenceKind
  name?: string | null
  meta?: string | null
  firstSeen: number
  lastSeen: number
  seen: number
  bestRssi?: number
  lastRssi?: number
  /** atribuído pelo utilizador ("Maria", "carro do vizinho"…) */
  owner?: string
  /** local conhecido → nº de vezes visto lá (net-intel "Local N") */
  places: Record<string, number>
  /** pontos distintos do caminho onde foi visto (≥40 m entre pontos) */
  pathPoints: number
  /** vezes visto com o utilizador em movimento */
  movingSeen: number
  lastPos?: { lat: number; lng: number }
}

export interface PresenceContext {
  /** dispositivos vistos nos últimos 10 min */
  total: PresenceEntry[]
  /** companheiros de caminho presentes agora */
  companions: PresenceEntry[]
  /** dispositivos com dono atribuído presentes agora */
  owned: PresenceEntry[]
}

// ── Persistência ─────────────────────────────────────────────────────────

/** chave do histórico — partilhada com o backup do perfil (v3.37.0) */
export const PRESENCE_KEY = 'aegis-presence-devices'

const KEY = PRESENCE_KEY
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
const MAX_DEVICES = 800
/** separação mínima entre pontos de caminho distintos (m) */
const PATH_SEP_M = 40
/** janela "à volta agora" (ms) */
const NOW_WINDOW_MS = 10 * 60_000
/** mínimo de vistos para contar como companhia de caminho */
const COMPANION_MIN_SEEN = 3
const COMPANION_MIN_POINTS = 2

function readRaw(): PresenceEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - RETENTION_MS
    return (arr as PresenceEntry[]).filter((e) => (e.lastSeen || 0) >= cutoff)
  } catch {
    return []
  }
}

function writeRaw(list: PresenceEntry[]): void {
  try {
    while (list.length > MAX_DEVICES) list.pop()
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* quota — segue */ }
}

/** Lê o histórico completo (purga >30 dias implícita). */
export function getPresenceDevices(): PresenceEntry[] {
  return readRaw().sort((a, b) => b.lastSeen - a.lastSeen)
}

/** Apaga o histórico por inteiro. */
export function clearPresenceHistory(): void {
  try { localStorage.removeItem(KEY) } catch { /* segue */ }
}

/** nº de dispositivos no histórico (para contadores). */
export function presenceHistoryCount(): number {
  return readRaw().length
}

// ── Registo ──────────────────────────────────────────────────────────────

/**
 * Regista um ciclo completo de presenças. `placeLabel` vem do net-intel
 * ("Local 1"…), `pos` da última posição conhecida e `moving` indica se
 * o utilizador se estava a deslocar (velocidade do motor de rádio).
 */
export function recordPresenceCycle(
  items: PresenceInput[],
  ctx: { pos?: { lat: number; lng: number } | null; placeLabel?: string | null; moving: boolean },
): void {
  if (!items || items.length === 0) return
  const list = readRaw()
  const byId = new Map(list.map((e) => [e.id.toLowerCase(), e]))
  const now = Date.now()
  const placeLabel = ctx.placeLabel || null

  for (const it of items) {
    if (!it?.id) continue
    const id = it.id.toLowerCase()
    let e = byId.get(id)
    if (!e) {
      e = {
        id: it.id,
        kind: it.kind,
        name: it.name ?? null,
        meta: it.meta ?? null,
        firstSeen: now,
        lastSeen: now,
        seen: 0,
        places: {},
        pathPoints: 0,
        movingSeen: 0,
      }
      list.push(e)
      byId.set(id, e)
    }
    e.kind = it.kind
    if (it.name) e.name = it.name
    if (it.meta) e.meta = it.meta
    e.lastSeen = now
    e.seen = (e.seen || 0) + 1
    if (typeof it.rssi === 'number' && !Number.isNaN(it.rssi)) {
      e.lastRssi = it.rssi
      if (e.bestRssi == null || it.rssi > e.bestRssi) e.bestRssi = it.rssi
    }
    // local conhecido mais frequente
    if (placeLabel) e.places[placeLabel] = (e.places[placeLabel] || 0) + 1
    // ponto de caminho distinto: posição ≥40 m de todas as anteriores
    if (ctx.pos?.lat != null) {
      const prev = e.lastPos
      if (!prev || haversineM(prev.lat, prev.lng, ctx.pos.lat, ctx.pos.lng) >= PATH_SEP_M) {
        e.pathPoints = (e.pathPoints || 0) + 1
      }
      e.lastPos = { lat: ctx.pos.lat, lng: ctx.pos.lng }
    }
    if (ctx.moving) e.movingSeen = (e.movingSeen || 0) + 1
  }

  writeRaw(list)
}

// ── Donos ("de quem é?") ─────────────────────────────────────────────────

/** Atribui o dono de um dispositivo ("" limpa). */
export function setPresenceOwner(id: string, owner: string): void {
  const list = readRaw()
  const e = list.find((x) => x.id.toLowerCase() === id.toLowerCase())
  if (!e) return
  const o = owner.trim()
  if (o) e.owner = o
  else delete e.owner
  writeRaw(list)
}

/**
 * Sugestão textual de dono pela correlação de local: o dispositivo é
 * visto de forma recorrente no mesmo local que o utilizador — provável
 * "alguém de lá". Devolve null quando não há nada suficientemente claro.
 */
export function suggestOwner(e: PresenceEntry): string | null {
  const top = Object.entries(e.places || {}).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < COMPANION_MIN_SEEN) return null
  const share = top[1] / Math.max(1, e.seen)
  if (share < 0.5) return null
  return `Visto ${top[1]}× em ${top[0]} — provavelmente alguém de lá`
}

// ── Companhas de caminho ("estiveram no caminho") ────────────────────────

/**
 * Dispositivos que ESTIVERAM NO CAMINHO do utilizador: vistos ≥3 vezes,
 * em ≥2 pontos do percurso separados ≥40 m. Ordenados por "quantas
 * vezes acompanhou" (pontos × vezes em movimento).
 */
export function findPathCompanions(devs?: PresenceEntry[]): PresenceEntry[] {
  const list = devs || readRaw()
  return list
    .filter((e) => (e.seen || 0) >= COMPANION_MIN_SEEN && (e.pathPoints || 0) >= COMPANION_MIN_POINTS)
    .sort((a, b) =>
      (b.pathPoints * 10 + (b.movingSeen || 0)) - (a.pathPoints * 10 + (a.movingSeen || 0)))
}

// ── Backup/restauro consciente (v3.37.0) ─────────────────────────────────

export interface PresenceMergeResult {
  /** JSON final do histórico após o merge (null = nada válido a restaurar) */
  json: string | null
  /** entradas válidas aceite do ficheiro de backup */
  accepted: number
  /** entradas LOCAIS que o backup não conhecia (mantidas — nunca se perdem) */
  kept: number
  /** entradas onde o backup trouxe uma versão mais rica que a local */
  updated: number
}

/**
 * Validação defensiva de uma entrada vinda de um ficheiro de backup
 * (ficheiros manipulados ou versões antigas não podem corromper o motor).
 */
function validPresenceEntry(e: unknown): e is PresenceEntry {
  if (!e || typeof e !== 'object') return false
  const x = e as Partial<PresenceEntry>
  return (
    typeof x.id === 'string' && x.id.length > 0 &&
    (x.kind === 'wifi' || x.kind === 'ble') &&
    typeof x.firstSeen === 'number' && Number.isFinite(x.firstSeen) &&
    typeof x.lastSeen === 'number' && Number.isFinite(x.lastSeen) &&
    typeof x.seen === 'number' && Number.isFinite(x.seen) && x.seen >= 0 &&
    !!x.places && typeof x.places === 'object'
  )
}

/**
 * Fusão de duas visões do MESMO dispositivo: preserva o MELHOR de cada
 * — dono (local tem prioridade), nome/meta preenchidos, primeira/última
 * vista reais, contagens máximas (nunca duplicadas) e sinal mais recente.
 */
function mergePresenceEntry(loc: PresenceEntry, inc: PresenceEntry): PresenceEntry {
  // base: a entrada com dono ganha; empate → a mais vista; depois a mais recente
  const prefer =
    loc.owner && !inc.owner ? loc :
    inc.owner && !loc.owner ? inc :
    (inc.seen > loc.seen ? inc : loc)
  const other = prefer === loc ? inc : loc
  const lastOf =
    (loc.lastSeen || 0) >= (inc.lastSeen || 0) ? loc : inc

  const places: Record<string, number> = { ...(prefer.places || {}) }
  for (const [p, n] of Object.entries(other.places || {})) {
    places[p] = Math.max(places[p] || 0, n)
  }

  const merged: PresenceEntry = {
    id: prefer.id,
    kind: prefer.kind,
    name: prefer.name || other.name || null,
    meta: prefer.meta || other.meta || null,
    firstSeen: Math.min(loc.firstSeen || inc.firstSeen, inc.firstSeen || loc.firstSeen),
    lastSeen: Math.max(loc.lastSeen || 0, inc.lastSeen || 0),
    seen: Math.max(loc.seen || 0, inc.seen || 0),
    bestRssi: (() => {
      const a = loc.bestRssi, b = inc.bestRssi
      if (a == null) return b
      if (b == null) return a
      return Math.max(a, b)
    })(),
    // sinal mais recente — conta para o radar/anel de proximidade
    lastRssi: lastOf.lastRssi ?? prefer.lastRssi ?? other.lastRssi ?? undefined,
    // dono: o conhecimento LOCAL tem prioridade quando os dois divergem
    owner: loc.owner || inc.owner,
    places,
    pathPoints: Math.max(loc.pathPoints || 0, inc.pathPoints || 0),
    movingSeen: Math.max(loc.movingSeen || 0, inc.movingSeen || 0),
    lastPos: lastOf.lastPos || prefer.lastPos || other.lastPos,
  }
  if (merged.bestRssi == null) delete (merged as Partial<PresenceEntry>).bestRssi
  if (merged.lastRssi == null) delete (merged as Partial<PresenceEntry>).lastRssi
  if (!merged.owner) delete (merged as Partial<PresenceEntry>).owner
  if (!merged.lastPos) delete (merged as Partial<PresenceEntry>).lastPos
  return merged
}

/**
 * Faz MERGE do histórico vindo de um ficheiro de backup com o histórico
 * local (v3.37.0) — em vez de overwrite cego:
 *  · entradas novas do backup → ADICIONADAS
 *  · entradas só locais       → MANTIDAS (nunca se perdem)
 *  · entradas nos dois        → fusão com o melhor de cada (donos, contagens,
 *    locais, pontos de caminho)
 * Escreve directamente no storage (passa pela retenção de 30 dias e pelo
 * tecto de 800 dispositivos). Entradas inválidas são ignoradas.
 */
export function mergePresenceBackup(incomingRaw: string | null | undefined): PresenceMergeResult {
  const res: PresenceMergeResult = { json: null, accepted: 0, kept: 0, updated: 0 }
  try {
    const arr = JSON.parse(incomingRaw || '')
    if (!Array.isArray(arr)) return res
    const incoming = (arr as unknown[]).filter(validPresenceEntry)
    if (incoming.length === 0) return res
    res.accepted = incoming.length

    const current = readRaw()
    const byId = new Map(current.map((e) => [e.id.toLowerCase(), e]))
    const localOnly = new Set(current.map((e) => e.id.toLowerCase()))

    for (const inc of incoming) {
      const k = inc.id.toLowerCase()
      const loc = byId.get(k)
      if (!loc) {
        byId.set(k, inc)
        continue
      }
      localOnly.delete(k)
      const merged = mergePresenceEntry(loc, inc)
      const enriched =
        (!!merged.owner && merged.owner !== loc.owner) ||
        merged.seen > loc.seen ||
        merged.pathPoints > loc.pathPoints
      if (enriched) res.updated++
      byId.set(k, merged)
    }
    res.kept = localOnly.size

    const mergedList = Array.from(byId.values())
    writeRaw(mergedList)
    res.json = JSON.stringify(readRaw())
    return res
  } catch {
    return res
  }
}

// ── Contexto actual ──────────────────────────────────────────────────────

/** Quem está à volta agora (últimos 10 min), com companheiros e donos.
 *  (v3.37.0 — secção de backup/restauro acima; contexto vivo abaixo.) */
export function presenceNowContext(devs?: PresenceEntry[]): PresenceContext {
  const list = devs || readRaw()
  const cutoff = Date.now() - NOW_WINDOW_MS
  const now = list.filter((e) => e.lastSeen >= cutoff)
  const companionIds = new Set(findPathCompanions(list).map((e) => e.id.toLowerCase()))
  return {
    total: now,
    companions: now.filter((e) => companionIds.has(e.id.toLowerCase())),
    owned: now.filter((e) => !!e.owner),
  }
}
