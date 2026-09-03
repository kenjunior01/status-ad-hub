/**
 * _shared/security.ts — Helpers de segurança para todas as edge functions.
 *
 * Fornece:
 *  - CORS com allowlist de origens (em vez de Access-Control-Allow-Origin: *)
 *  - Autenticação por JWT de utilizador (via Supabase Auth)
 *  - Autenticação por service_role (chamadas servidor↔servidor / pg_net)
 *  - Rate limiting em memória (por instância; primeira linha de defesa)
 *  - Validação de tipos/limites de input
 *
 * NOTA: em produção recomenda-se também activar o rate limiting nativo do
 * Supabase (Dashboard → Auth → Rate Limits) e WAF/CDN à frente do projecto.
 */

// ── CORS com allowlist ────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://statusmonetize.com',
  'https://www.statusmonetize.com',
  'https://statusads-connect.lovable.app',
  'https://preview--statusads-connect.lovable.app',
  'http://localhost:8080',
  'http://localhost:8090',
  'http://localhost:8091',
  'http://localhost:8092',
  'http://localhost:8093',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://localhost',        // Capacitor Android WebView
  'capacitor://localhost',    // Capacitor iOS WebView
]

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function handlePreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response('ok', { status: 204, headers: corsHeaders(req) })
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

// ── Autenticação ──────────────────────────────────────────────────────────────

export function getBearerToken(req: Request): string {
  const header = req.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

/** Verdadeiro se a chamada usa a service_role key (servidor↔servidor, pg_net). */
export function isServiceRole(req: Request): boolean {
  const token = getBearerToken(req)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey || !token) return false
  return token === serviceKey
}

/**
 * Valida o JWT do utilizador e devolve o user id (ou null).
 * Usa o endpoint de auth do Supabase — nunca confia no payload não verificado.
 */
export async function authenticateUser(req: Request): Promise<string | null> {
  const token = getBearerToken(req)
  if (!token) return null
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(anonKey ? { 'apikey': anonKey } : {}),
      },
    })
    if (!res.ok) return null
    const user = await res.json()
    return user?.id ?? null
  } catch {
    return null
  }
}

// ── Rate limiting (in-memory, por instância) ─────────────────────────────────

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    // limpeza oportunista para não crescer sem limite
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    }
    return { ok: true, retryAfter: 0 }
  }
  bucket.count++
  if (bucket.count > max) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

// ── Validação de input ────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function clampCoordinates(lat: unknown, lng: unknown): { ok: boolean; lat: number; lng: number } {
  const latN = Number(lat)
  const lngN = Number(lng)
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return { ok: false, lat: 0, lng: 0 }
  if (Math.abs(latN) > 90 || Math.abs(lngN) > 180) return { ok: false, lat: latN, lng: lngN }
  return { ok: true, lat: latN, lng: lngN }
}

/** Limita o comprimento de strings (defesa em profundidade contra payloads gigantes). */
export function safeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, maxLen)
}
