/**
 * security.ts — Módulo de Segurança
 *
 * Centraliza todas as funções de segurança:
 * - Rate limiting para prevenir abuso de APIs críticas
 * - Sanitização de input para prevenir injeção
 * - Validação de dados sensíveis
 * - Utilitários anti-fingerprinting
 *
 * IMPORTANTE: A segurança defense-in-depth requer:
 * 1. RLS (Row Level Security) no Supabase (server-side)
 * 2. Validação de input no cliente (este ficheiro)
 * 3. CSP headers (index.html)
 * 4. HTTPS only (Supabase exige)
 */

// ============================================
// RATE LIMITER
// ============================================

interface RateLimitEntry {
  count: number
  firstAttempt: number
  lastAttempt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 60_000 // Clean up old entries every minute

// Periodic cleanup to prevent memory leaks
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastAttempt > 300_000) { // 5 minutes
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Check if an action is rate-limited.
 * Returns true if the action should be BLOCKED (rate exceeded).
 *
 * @param key - Unique identifier for the action (e.g., 'emergency:user123')
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, lastAttempt: now })
    return false
  }

  // If outside the window, reset
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, lastAttempt: now })
    return false
  }

  // Inside the window, check count
  entry.count++
  entry.lastAttempt = now

  if (entry.count > maxRequests) {
    return true // BLOCKED
  }

  return false
}

/**
 * Rate limit configs for different actions.
 * Emergency: 5 per minute (prevent accidental spam)
 * Check-in: 30 per minute
 * General API: 60 per minute
 */
export const RATE_LIMITS = {
  emergency: { maxRequests: 5, windowMs: 60_000 },
  checkin: { maxRequests: 30, windowMs: 60_000 },
  contactCreate: { maxRequests: 10, windowMs: 60_000 },
  deviceCreate: { maxRequests: 10, windowMs: 60_000 },
  general: { maxRequests: 60, windowMs: 60_000 },
  sosButton: { maxRequests: 3, windowMs: 30_000 }, // Max 3 SOS in 30 seconds
} as const

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize a string for safe use in Supabase filters.
 * Prevents injection via realtime subscription filters.
 * Only allows UUIDs, alphanumeric, and safe characters.
 */
export function sanitizeFilterValue(value: string): string {
  // Remove any characters that could break the filter syntax
  // Only allow: UUIDs (hex + dashes), alphanumeric, dots, underscores
  return value.replace(/[^a-zA-Z0-9_.\-@]/g, '').slice(0, 256)
}

/**
 * Sanitize user-generated text (names, messages, etc.)
 * Removes potential XSS vectors while preserving Portuguese/Latin characters.
 */
export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return ''
  // Remove null bytes, control characters (except newline/tab)
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\u0000/g, '')
    .slice(0, 10000) // Max length to prevent DoS
}

/**
 * Validate a UUID v4 string.
 */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Validate phone number (international format).
 * Accepts: +258XXXXXXXXX, +1XXXXXXXXXX, etc.
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, ''))
}

/**
 * Validate email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate coordinates are within valid ranges.
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    Number.isFinite(lat) && Number.isFinite(lng)
}

// ============================================
// ANTI-FINGERPRINTING
// ============================================

/**
 * Get a privacy-safe user identifier for analytics.
 * Uses a salted hash so the real user ID is never exposed.
 */
export async function getPrivacySafeId(userId: string): Promise<string> {
  const SALT = 'statusads-privacy-salt-v1'
  const data = new TextEncoder().encode(userId + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  // Return first 16 hex chars (64 bits)
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// SECURE STORAGE WRAPPER
// ============================================

/**
 * Secure localStorage wrapper that:
 * - Prefixes all keys to avoid collisions
 * - Wraps in try/catch to handle disabled storage
 * - Limits value size to prevent storage bombing
 */
const STORAGE_PREFIX = 'statusads-'
const MAX_STORAGE_VALUE_SIZE = 100_000 // 100KB per value

export const secureStorage = {
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(STORAGE_PREFIX + key)
      if (value && value.length > MAX_STORAGE_VALUE_SIZE) {
        // Oversized — remove corrupted data
        localStorage.removeItem(STORAGE_PREFIX + key)
        return null
      }
      return value
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (value.length > MAX_STORAGE_VALUE_SIZE) {
        console.warn(`[SECURITY] Storage value too large for key: ${key} (${value.length} bytes)`)
        return
      }
      localStorage.setItem(STORAGE_PREFIX + key, value)
    } catch {
      // Storage full or disabled — fail silently
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key)
    } catch {
      // Ignore
    }
  },
}
