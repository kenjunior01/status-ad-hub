// ============================================================
// free-apis.ts — APIs 100% GRATUITAS e SEM chave de registo.
// Todas funcionam de imediato, sem credenciais nem cartão:
//
//  • OpenStreetMap Nominatim — geocodificação inversa (morada)
//  • ipapi.co / ipwho.is / GeoJS — geolocalização por IP (HTTPS)
//  • Open-Meteo — meteorologia actual (útil em modo viagem)
//  • Battery Status API — nível/charge do dispositivo
//  • Network Information API — tipo/velocidade de conexão
//  • Wake Lock API — manter ecrã ligado (emergência/viagem)
//  • wa.me — alertas WhatsApp por deep-link (sem API)
// ============================================================

// ── 1. GEOCODIFICAÇÃO INVERSA (OpenStreetMap Nominatim) ─────
// Grátis, sem chave. Polite policy: max 1 req/s → cache embutido.
export interface GeoAddress {
  display: string
  road?: string
  suburb?: string
  city?: string
  state?: string
  country?: string
}

const geoCache = new Map<string, GeoAddress | null>()

export async function reverseGeocode(
  lat: number,
  lng: number,
  timeoutMs = 3500,
): Promise<GeoAddress | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (geoCache.has(key)) return geoCache.get(key)!
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt`
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    clearTimeout(t)
    if (!res.ok) { geoCache.set(key, null); return null }
    const data = await res.json()
    const a = data?.address ?? {}
    const out: GeoAddress = {
      display: data?.display_name ?? '',
      road: a.road ?? a.pedestrian ?? a.footway,
      suburb: a.suburb ?? a.neighbourhood ?? a.quarter,
      city: a.city ?? a.town ?? a.village ?? a.municipality,
      state: a.state ?? a.province,
      country: a.country,
    }
    geoCache.set(key, out)
    return out
  } catch {
    geoCache.set(key, null)
    return null
  }
}

// Morada curta: "Av. Julius Nyerere, Maputo"
export function shortAddress(a: GeoAddress | null | undefined): string {
  if (!a) return ''
  return [a.road, a.city].filter(Boolean).join(', ') || a.display
}

// ── 2. GEOLOCALIZAÇÃO POR IP (HTTPS, sem chave, com fallback) ──
export interface IpInfo {
  ip: string
  city?: string
  region?: string
  country?: string
  isp?: string
  lat?: number
  lon?: number
  timezone?: string
}

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function getIpInfo(): Promise<IpInfo | null> {
  // 1) ipapi.co (HTTPS, sem chave)
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/')
    if (res.ok) {
      const d = await res.json()
      if (d?.ip) {
        return {
          ip: d.ip, city: d.city, region: d.region,
          country: d.country_name, isp: d.org,
          lat: d.latitude, lon: d.longitude, timezone: d.timezone,
        }
      }
    }
  } catch { /* next */ }
  // 2) ipwho.is (HTTPS, sem chave)
  try {
    const res = await fetchWithTimeout('https://ipwho.is/')
    if (res.ok) {
      const d = await res.json()
      if (d?.ip && d?.success !== false) {
        return {
          ip: d.ip, city: d.city, region: d.region,
          country: d.country, isp: d.connection?.isp,
          lat: d.latitude, lon: d.longitude, timezone: d.timezone?.id,
        }
      }
    }
  } catch { /* next */ }
  // 3) GeoJS (HTTPS, sem chave, open source)
  try {
    const res = await fetchWithTimeout('https://get.geojs.io/v1/ip/geo.json')
    if (res.ok) {
      const d = await res.json()
      if (d?.ip) {
        return {
          ip: d.ip, city: d.city, region: d.region,
          country: d.country, isp: d.organization_name,
          lat: d.latitude ? parseFloat(d.latitude) : undefined,
          lon: d.longitude ? parseFloat(d.longitude) : undefined,
          timezone: d.timezone,
        }
      }
    }
  } catch { /* done */ }
  return null
}

// ── 3. METEOROLOGIA (Open-Meteo — grátis, sem chave) ────────
export interface WeatherInfo {
  temperature: number
  windspeed: number
  weathercode: number
  isDay: boolean
}

export async function getWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true`,
    )
    if (!res.ok) return null
    const d = await res.json()
    const cw = d?.current_weather
    if (!cw) return null
    return {
      temperature: cw.temperature,
      windspeed: cw.windspeed,
      weathercode: cw.weathercode,
      isDay: cw.is_day === 1,
    }
  } catch {
    return null
  }
}

export function weatherLabel(code: number): string {
  if (code === 0) return 'Céu limpo'
  if (code <= 2) return 'Pouco nublado'
  if (code === 3) return 'Nublado'
  if (code === 45 || code === 48) return 'Nevoeiro'
  if (code >= 51 && code <= 57) return 'Chuvisco'
  if (code >= 61 && code <= 67) return 'Chuva'
  if (code >= 71 && code <= 77) return 'Neve'
  if (code >= 80 && code <= 82) return 'Aguaceiros'
  if (code === 85 || code === 86) return 'Aguaceiros com neve'
  if (code >= 95) return 'Trovoada'
  return '—'
}

// ── 4. BATTERY STATUS API (built-in, sem rede) ──────────────
export interface BatteryInfo {
  supported: boolean
  level?: number       // 0–1
  charging?: boolean
  dischargingTime?: number // segundos
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  const nav = navigator as any
  if (!nav.getBattery) return { supported: false }
  try {
    const b = await nav.getBattery()
    return {
      supported: true,
      level: b.level,
      charging: b.charging,
      dischargingTime: b.dischargingTime,
    }
  } catch {
    return { supported: false }
  }
}

// ── 5. NETWORK INFORMATION API (built-in) ───────────────────
export interface ConnectionInfo {
  supported: boolean
  effectiveType?: string  // 'slow-2g' | '2g' | '3g' | '4g'
  downlinkMbps?: number
  rttMs?: number
  saveData?: boolean
}

export function getConnectionInfo(): ConnectionInfo {
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection
  if (!conn) return { supported: false }
  return {
    supported: true,
    effectiveType: conn.effectiveType,
    downlinkMbps: conn.downlink,
    rttMs: conn.rtt,
    saveData: conn.saveData,
  }
}

// ── 6. WAKE LOCK API (built-in) — ecrã ligado em SOS/viagem ──
let wakeLock: any = null

export async function requestWakeLock(): Promise<() => void> {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
      wakeLock.addEventListener?.('release', () => { wakeLock = null })
      return () => { try { wakeLock?.release?.() } catch { /* já solto */ } }
    }
  } catch { /* sem permissão */ }
  return () => {}
}

// ── 7. LINKS ÚTEIS (sem API) ────────────────────────────────
export function osmLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

// WhatsApp deep-link — alerta sem qualquer API paga
export function whatsAppLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.startsWith('258') ? digits : `258${digits.replace(/^0+/, '')}`
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}
