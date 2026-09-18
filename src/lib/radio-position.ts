/**
 * radio-position.ts — MOTOR DE POSIÇÃO POR RÁDIO (v3.32.0).
 *
 * Localizar o aparelho SEM GPS, usando apenas as redes Wi-Fi e BLE que o
 * celular já vê passivamente (sem emparelhar, sem tocar, sem ligar-se a
 * nada — o mesmo princípio do radar de testemunhas).
 *
 * Como funciona (2 fases):
 *
 *  1. CALIBRAÇÃO — com GPS bom (≤30 m), cada ciclo do radar regista para
 *     cada router/dispositivo BLE uma observação {posição GPS, RSSI, t}.
 *     A posição da âncora = centróide ponderado pelo sinal (quem chega
 *     mais forte está mais perto). A âncora torna-se "navegável" quando
 *     tem ≥3 observações espalhadas por ≥40 m — aí o centróide converge
 *     para a região do emissor (alcance urbano de Wi-Fi ~50-100 m).
 *
 *  2. NAVEGAÇÃO — com ≥3 âncoras navegáveis visíveis, a posição do
 *     aparelho = centróide ponderado por 1/d² (multilateração
 *     aproximada), com d da distância REAL por RTT 802.11mc quando o
 *     hardware suporta, senão do modelo log-distância de RSSI.
 *     Funciona com o ecrã morto, no interior, onde o GPS falha.
 *
 *  3. MOVIMENTO — o histórico de fixes dá rumo (bearing), velocidade e
 *     predição textual ("A seguir para NE · 9 km/h · a aproximar-se de
 *     Casa (≈180 m)") cruzando com os locais conhecidos do net-intel.
 *
 * Privacidade: tudo é LOCAL (localStorage, chaves aegis-radio-*,
 * limpeza › Radares de Ambiente). Nada sobe para a nuvem.
 */

// ── Tipos ────────────────────────────────────────────────────────────────

/** Rede/dispositivo observado num scan (estrutura mínima, desacoplada). */
export interface RadioObs {
  /** BSSID (Wi-Fi) ou MAC (BLE) — identificador da âncora */
  id: string
  rssi: number
  kind: 'wifi' | 'ble'
  band?: string
  /** TX power anunciado (BLE, dBm) — afina o modelo de distância */
  tx?: number
  /** distância REAL por RTT (m) — só Wi-Fi 802.11mc */
  distM?: number
}

/** Âncora de rádio: emissor com posição estimada. */
export interface RadioAnchor {
  id: string
  kind: 'wifi' | 'ble'
  /** posição estimada do emissor (centróide das observações) */
  lat: number
  lng: number
  /** observações acumuladas (máx. 8, espalhadas no espaço) */
  n: number
  /** espalhamento máximo entre observações (m) */
  spreadM: number
  /** incerteza da posição (m) */
  uncM: number
  band?: string
  label?: string
  lastAt: number
  obs: Array<{ lat: number; lng: number; r: number; t: number; d?: number }>
}

export type RadioFixMode = 'gps' | 'radio' | 'hybrid'

export interface RadioFix {
  lat: number
  lng: number
  /** precisão estimada (m) */
  acc: number
  mode: RadioFixMode
  t: number
  /** âncoras usadas na estimativa de rádio */
  anchors: number
  /** rumo (graus, 0=N) desde o fix anterior */
  heading?: number
  /** velocidade (m/s) desde o fix anterior */
  speedMs?: number
}

export interface RadioPrediction {
  /** texto pronto para a UI */
  text: string
  /** rumo em graus (0=N) — para a seta */
  heading?: number
  speedKmh?: number
  place?: { label: string; distM: number; closing: boolean }
}

export interface RadioPositionState {
  /** último fix (GPS, rádio ou híbrido) */
  fix: RadioFix | null
  /** histórico de fixes (máx. 30) */
  fixes: RadioFix[]
  anchorsCount: number
  /** âncoras com posição navegável (≥3 obs espalhadas) */
  navAnchorsCount: number
  /** RTT 802.11mc disponível neste aparelho */
  rttSupported: boolean | null
  prediction: RadioPrediction | null
  lastAt: number
  lastError: string | null
}

// ── Persistência ─────────────────────────────────────────────────────────

const ANCHORS_KEY = 'aegis-radio-anchors'
const FIXES_KEY = 'aegis-radio-fixes'
const ANCHORS_MAX = 400
const FIXES_MAX = 30
/** observações por âncora (máx.) */
const OBS_MAX = 8
/** GPS aceitável para calibrar (m) */
const CAL_ACC_M = 30
/** espalhamento mínimo para âncora navegável (m) */
const NAV_SPREAD_M = 40
/** separação mínima entre observações guardadas (m) */
const OBS_SEPARATION_M = 25
/** separação mínima entre fixes para rumo/velocidade (m) */
const MOVE_MIN_M = 8

let state: RadioPositionState = readState()
const listeners = new Set<() => void>()

function readState(): RadioPositionState {
  let fixes: RadioFix[] = []
  let anchors: RadioAnchor[] = []
  try {
    const f = JSON.parse(localStorage.getItem(FIXES_KEY) || '[]')
    if (Array.isArray(f)) fixes = f.slice(-FIXES_MAX)
  } catch { /* segue */ }
  try {
    const a = JSON.parse(localStorage.getItem(ANCHORS_KEY) || '[]')
    if (Array.isArray(a)) anchors = a
  } catch { /* segue */ }
  return {
    fix: fixes.length > 0 ? fixes[fixes.length - 1] : null,
    fixes,
    anchorsCount: anchors.length,
    navAnchorsCount: anchors.filter(isNavigable).length,
    rttSupported: null,
    prediction: null,
    lastAt: 0,
    lastError: null,
  }
}

function persist(): void {
  try {
    localStorage.setItem(FIXES_KEY, JSON.stringify(state.fixes))
  } catch { /* quota */ }
}

function emit(): void {
  for (const l of listeners) {
    try { l() } catch { /* segue */ }
  }
}

function setState(patch: Partial<RadioPositionState>): void {
  state = { ...state, ...patch }
  persist()
  emit()
}

/** Subscribe estilo useSyncExternalStore (singleton). */
export function subscribeRadioPosition(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function getRadioPositionState(): RadioPositionState {
  return state
}

export function resetRadioPosition(): void {
  try {
    localStorage.removeItem(ANCHORS_KEY)
    localStorage.removeItem(FIXES_KEY)
  } catch { /* segue */ }
  state = { ...readState(), lastAt: Date.now() }
  emit()
}

// ── Geometria ────────────────────────────────────────────────────────────

const R_EARTH = 6_371_000

/** distância haversine (m) */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180
  const dp = p2 - p1, dl = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** rumo inicial (graus, 0=N, sentido horário) */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

/** etiqueta da rosa dos ventos */
export function compassLabel(deg?: number): string {
  if (deg == null) return '—'
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

/**
 * Modelo log-distância: RSSI → metros. P0 = RSSI a 1 m, n = expoente de
 * perda (3.0 interior). BLE com TX anunciado usa a fórmula clássica
 * (1 m ≈ tx-59). Clamp de sanidade 1-300 m.
 */
export function rssiToMeters(rssi: number, kind: 'wifi' | 'ble', band?: string, tx?: number): number {
  let d: number
  if (kind === 'ble' && tx != null && tx > -10 && tx < 10) {
    d = Math.pow(10, (tx - 59 - rssi) / (10 * 2))
  } else {
    // Wi-Fi a 1 m ≈ −40 dBm (2.4 GHz chega mais longe que 5/6 GHz)
    const p0 = band === '2.4 GHz' ? -42 : -40
    d = Math.pow(10, (p0 - rssi) / (10 * 3.0))
  }
  return Math.max(1, Math.min(300, d))
}

// ── Âncoras ──────────────────────────────────────────────────────────────

function isNavigable(a: RadioAnchor): boolean {
  return a.n >= 3 && a.spreadM >= NAV_SPREAD_M
}

function readAnchors(): RadioAnchor[] {
  return state.anchorsCount > 0
    ? (JSON.parse(localStorage.getItem(ANCHORS_KEY) || '[]') as RadioAnchor[])
    : []
}

function writeAnchors(anchors: RadioAnchor[]): void {
  // LRU por lastAt
  const trimmed = anchors.sort((x, y) => y.lastAt - x.lastAt).slice(0, ANCHORS_MAX)
  try { localStorage.setItem(ANCHORS_KEY, JSON.stringify(trimmed)) } catch { /* quota */ }
  state = {
    ...state,
    anchorsCount: trimmed.length,
    navAnchorsCount: trimmed.filter(isNavigable).length,
  }
}

/** recalcula centróide/spread/incerteza de uma âncora a partir das obs */
function recomputeAnchor(a: RadioAnchor): void {
  let wSum = 0, latSum = 0, lngSum = 0
  for (const o of a.obs) {
    // sinal mais forte = observação com menos ruído de posição
    const w = Math.max(1, o.r + 100) / Math.max(4, a.obs.length)
    wSum += w
    latSum += o.lat * w
    lngSum += o.lng * w
  }
  if (wSum <= 0) return
  a.lat = latSum / wSum
  a.lng = lngSum / wSum
  a.n = a.obs.length
  let spread = 0
  for (let i = 0; i < a.obs.length; i++) {
    for (let j = i + 1; j < a.obs.length; j++) {
      spread = Math.max(spread, haversineM(a.obs[i].lat, a.obs[i].lng, a.obs[j].lat, a.obs[j].lng))
    }
  }
  a.spreadM = Math.round(spread)
  // incerteza: spread médio ao centro / √n, nunca abaixo da precisão GPS média
  const accAvg = a.obs.reduce((s, o) => s + (o.d ?? 20), 0) / Math.max(1, a.obs.length)
  const geo = a.spreadM / 2 / Math.sqrt(Math.max(1, a.n))
  a.uncM = Math.max(12, Math.round(Math.max(geo, Math.min(40, accAvg * 0.4))))
}

// ── Ciclo principal ──────────────────────────────────────────────────────

/**
 * Actualiza o motor com um ciclo de scan. Chamado pela sentinela
 * (useRadarWatch) e pelo botão «Actualizar» do cartão.
 */
export function updateRadioPosition(
  nets: RadioObs[],
  ble: RadioObs[],
  pos: { lat: number; lng: number; acc?: number } | null,
): RadioPositionState {
  const now = Date.now()
  const t0 = state.lastAt
  state.lastError = null

  const all = [...nets, ...ble]
  const anchors = readAnchors()

  // 1. CALIBRAÇÃO — GPS bom
  if (pos && (pos.acc == null || pos.acc <= CAL_ACC_M)) {
    const byId = new Map(anchors.map((a) => [a.id, a]))
    for (const o of all) {
      if (!o.id) continue
      let a = byId.get(o.id)
      if (!a) {
        a = { id: o.id, kind: o.kind, lat: pos.lat, lng: pos.lng, n: 0, spreadM: 0, uncM: 24, band: o.band, lastAt: now, obs: [] }
        byId.set(o.id, a)
        anchors.push(a)
      }
      a.kind = o.kind
      if (o.band) a.band = o.band
      a.lastAt = now
      // guarda a obs se estiver suficientemente separada das anteriores
      const far = a.obs.every((x) => haversineM(x.lat, x.lng, pos.lat, pos.lng) >= OBS_SEPARATION_M)
      if (a.obs.length === 0 || far) {
        a.obs.push({ lat: pos.lat, lng: pos.lng, r: o.rssi, t: now, d: pos.acc })
        if (a.obs.length > OBS_MAX) a.obs.shift()
        recomputeAnchor(a)
      }
    }
    writeAnchors(anchors)
  }

  // 2. NAVEGAÇÃO — multilateração aproximada pelas âncoras navegáveis
  const visible = anchors.filter((a) => isNavigable(a) && all.some((o) => o.id === a.id))
  let radioFix: RadioFix | null = null
  if (visible.length >= 3) {
    let wSum = 0, latSum = 0, lngSum = 0, resSum = 0
    for (const a of visible) {
      const o = all.find((x) => x.id === a.id)!
      const d = o.distM ?? rssiToMeters(o.rssi, a.kind, a.band, o.tx)
      const w = 1 / (d * d)
      wSum += w
      latSum += a.lat * w
      lngSum += a.lng * w
      resSum += d
    }
    const lat = latSum / wSum
    const lng = lngSum / wSum
    // precisão: média das distâncias às âncoras + incerteza típica / √n
    const acc = Math.round(resSum / visible.length + Math.max(...visible.map((a) => a.uncM)) / Math.sqrt(visible.length))
    radioFix = { lat, lng, acc: Math.min(250, acc), mode: 'radio', t: now, anchors: visible.length }
  }

  // 3. FUSÃO — GPS manda quando existe; rádio quando não; híbrido corrobora
  let fix: RadioFix | null = null
  if (pos && radioFix) {
    fix = { ...radioFix, lat: pos.lat, lng: pos.lng, acc: Math.min(pos.acc ?? 30, radioFix.acc), mode: 'hybrid', t: now, anchors: radioFix.anchors }
  } else if (pos) {
    fix = { lat: pos.lat, lng: pos.lng, acc: Math.round(pos.acc ?? 25), mode: 'gps', t: now, anchors: visible.length }
  } else if (radioFix) {
    fix = radioFix
  }

  if (fix) {
    const prev = state.fixes[state.fixes.length - 1]
    if (prev) {
      const dist = haversineM(prev.lat, prev.lng, fix.lat, fix.lng)
      const dt = Math.max(1, (fix.t - prev.t) / 1000)
      if (dist >= MOVE_MIN_M) {
        fix.heading = Math.round(bearingDeg(prev.lat, prev.lng, fix.lat, fix.lng))
        fix.speedMs = Math.round((dist / dt) * 10) / 10
      } else {
        fix.heading = prev.heading
        fix.speedMs = 0 // parado
      }
    }
    // fix idêntico ao anterior (<8 m) não cria entrada nova — só actualiza
    const last = state.fixes[state.fixes.length - 1]
    if (last && haversineM(last.lat, last.lng, fix.lat, fix.lng) < MOVE_MIN_M && fix.t - last.t < 10 * 60_000) {
      state.fixes[state.fixes.length - 1] = { ...last, acc: fix.acc, mode: fix.mode, anchors: fix.anchors, heading: fix.heading, speedMs: fix.speedMs }
    } else {
      state.fixes = [...state.fixes, fix].slice(-FIXES_MAX)
    }
  }

  // 4. PREDIÇÃO — rumo + velocidade + local conhecido mais próximo
  const prediction = buildPrediction(state.fixes)

  setState({
    fix: state.fixes[state.fixes.length - 1] ?? null,
    fixes: state.fixes,
    prediction,
    rttSupported: state.rttSupported,
    lastError: state.lastError,
    lastAt: now,
  })
  void t0
  return state
}

/** Registra se o RTT 802.11mc está disponível (chamado 1x pelo ciclo). */
export function setRttSupported(v: boolean): void {
  if (state.rttSupported !== v) setState({ rttSupported: v })
}

/** Injeta distâncias RTT reais nas redes do scan (antes do update). */
export function applyRttDistances<T extends { id: string; distM?: number }>(nets: T[], ranged: Array<{ bssid: string; status: number; distMm?: number }>): T[] {
  const ok = new Map(ranged.filter((r) => r.status === 0 && r.distMm).map((r) => [r.bssid, r.distMm! / 1000]))
  return nets.map((n) => (ok.has(n.id) ? { ...n, distM: ok.get(n.id) } : n))
}

// ── Predição ─────────────────────────────────────────────────────────────

interface KnownPlaceLike { label?: string; lat?: number; lng?: number; sampleSsids?: string[] }

function readKnownPlaces(): KnownPlaceLike[] {
  try {
    const raw = JSON.parse(localStorage.getItem('statusads-intel-places') || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function buildPrediction(fixes: RadioFix[]): RadioPrediction | null {
  const cur = fixes[fixes.length - 1]
  if (!cur) return null
  const heading = cur.heading
  const speedMs = cur.speedMs

  // local conhecido mais próximo (com GPS registado pelo net-intel)
  let place: RadioPrediction['place'] | null = null
  const places = readKnownPlaces().filter((p) => p.lat != null && p.lng != null)
  if (places.length > 0) {
    let best: { label: string; distM: number } | null = null
    for (const p of places) {
      const d = haversineM(cur.lat, cur.lng, p.lat!, p.lng!)
      if (!best || d < best.distM) best = { label: p.label || p.sampleSsids?.[0] || 'Local', distM: d }
    }
    if (best) {
      // "a aproximar-se" = distância ao local está a cair nos últimos fixes
      let closing = true
      if (fixes.length >= 3) {
        const prev = fixes[fixes.length - 3]
        const dPrev = haversineM(prev.lat, prev.lng, cur.lat, cur.lng)
        closing = dPrev >= best.distM
      }
      place = { label: best.label, distM: Math.round(best.distM), closing }
    }
  }

  const parts: string[] = []
  if (heading != null && (speedMs ?? 0) > 0.5) {
    // extrapola 60 s à velocidade actual (cap 300 m)
    const ahead = Math.min(300, Math.round((speedMs ?? 0) * 60))
    parts.push(`A seguir para ${compassLabel(heading)} · ${Math.round((speedMs ?? 0) * 3.6)} km/h · ~${ahead} m à frente`)
  } else {
    parts.push('Parado ou em movimento lento')
  }
  if (place) {
    parts.push(`${place.closing ? 'A aproximar-se' : 'A afastar-se'} de ${place.label} (≈${place.distM} m)`)
  }
  return {
    text: parts.join(' · '),
    heading,
    speedKmh: speedMs != null ? Math.round(speedMs * 3.6) : undefined,
    place: place ?? undefined,
  }
}
