// ============================================================
// app-lock.ts — Bloqueio de App (v3.23.0)
// PIN + Biometria (WebAuthn platform authenticator) + auto-lock
// ao sair da app. Tudo local ao dispositivo: o PIN nunca sai
// do telemóvel (guardado como SHA-256(salt + pin)).
//
// Web (PWA) e APK (WebView Capacitor) usam exactamente o mesmo
// fluxo — na APK, o WebAuthn platform = impressão digital /
// desbloqueio facial do próprio Android.
// ============================================================

export interface AppLockConfig {
  /** Bloqueio activo (só tem efeito se houver PIN definido) */
  enabled: boolean
  /** SHA-256(salt + pin) em hex */
  pinHash: string | null
  /** Salt aleatório por dispositivo (hex) */
  salt: string | null
  /** Comprimento do PIN (4-6) — para desenhar os pontos */
  pinLength: number
  /** Desbloqueio por biometria enrolada */
  biometric: boolean
  /** Credential id WebAuthn (base64url) */
  biometricCredentialId: string | null
  /** Bloquear quando a app vai para segundo plano */
  lockOnBackground: boolean
  /** Minutos em segundo plano antes de voltar a pedir PIN (0 = imediato) */
  autoLockMinutes: number
}

const KEY = 'aegis-app-lock'
const SESSION_KEY = 'aegis-app-lock-unlocked' // flag de sessão: já desbloqueou nesta sessão

const DEFAULTS: AppLockConfig = {
  enabled: false,
  pinHash: null,
  salt: null,
  pinLength: 4,
  biometric: false,
  biometricCredentialId: null,
  lockOnBackground: true,
  autoLockMinutes: 0,
}

/* ── Config ─────────────────────────────────────────────── */

export function getAppLockConfig(): AppLockConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppLockConfig>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveAppLockConfig(patch: Partial<AppLockConfig>): AppLockConfig {
  const next = { ...getAppLockConfig(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage indisponível — fica só em memória */
  }
  appLockEvents.emit('config')
  return next
}

/* ── Estado de sessão (grace window) ────────────────────── */

/**
 * TRUE quando o bloqueio deve aparecer já:
 * enabled + PIN definido + ainda não desbloqueou NESTA sessão.
 * sessionStorage → abrir a app de novo (nova sessão) = bloqueado.
 */
export function isLockActive(): boolean {
  const cfg = getAppLockConfig()
  if (!cfg.enabled || !cfg.pinHash) return false
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  } catch {
    return true // sem sessionStorage → conservador: bloqueia
  }
}

/**
 * Regista desbloqueio da sessão actual. O re-bloqueio durante a
 * sessão é decidido pelo auto-lock (lockOnBackground) ou por lockNow().
 */
export function markUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* sem sessionStorage — o overlay passa a aparecer a cada arranque */
  }
  appLockEvents.emit('unlock')
}

/** Força o bloqueio imediatamente ("Bloquear agora"). */
export function lockNow(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* noop */
  }
  appLockEvents.emit('lock')
}

/* ── PIN (hash local, nunca sai do dispositivo) ─────────── */

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isValidPin(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin)
}

/** Define/altera o PIN. Falha (false) se o PIN for inválido. */
export async function setPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false
  const salt = randomSalt()
  const pinHash = await sha256Hex(salt + pin)
  saveAppLockConfig({ pinHash, salt, pinLength: pin.length, enabled: true })
  return true
}

export async function verifyPin(pin: string): Promise<boolean> {
  const cfg = getAppLockConfig()
  if (!cfg.pinHash || !cfg.salt) return false
  const hash = await sha256Hex(cfg.salt + pin)
  // comparação em tempo constante simples (evita short-circuit óbvio)
  if (hash.length !== cfg.pinHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ cfg.pinHash.charCodeAt(i)
  return diff === 0
}

/** Remove o PIN (e desliga tudo o que depende dele). */
export function clearPin(): void {
  saveAppLockConfig({
    ...DEFAULTS,
    lockOnBackground: getAppLockConfig().lockOnBackground,
  })
  lockNow()
}

/* ── Biometria (WebAuthn platform authenticator) ────────── */

/**
 * TRUE se o dispositivo/browser suporta desbloqueio biométrico
 * de plataforma (Android fingerprint/face na APK; Touch/Face ID
 * ou Windows Hello na web).
 */
export async function biometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
    if (!window.isSecureContext) return false
    // platform authenticator presente?
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

function b64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function bufferToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Enrola a biometria do dispositivo para esta app.
 * Devolve o credential id, ou null se o utilizador cancelar/falhar.
 */
export async function enrollBiometric(): Promise<string | null> {
  try {
    if (!(await biometricAvailable())) return null
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Aegis StatusAds' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'aegis-local-unlock',
          displayName: 'Desbloqueio Aegis',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!cred) return null
    return bufferToB64url(cred.rawId)
  } catch {
    return null // utilizador cancelou, sem sensor, etc.
  }
}

/**
 * Desafio biométrico local. TRUE = desbloqueia.
 * Não valida a assinatura num servidor — o gesto verificado
 * pelo authenticator de plataforma é o próprio desbloqueio
 * (padrão "local-only" das apps nativas).
 */
export async function authenticateBiometric(credentialId: string): Promise<boolean> {
  try {
    if (!(await biometricAvailable())) return false
    const allow: ArrayBuffer[] = [b64urlToBuffer(credentialId)]
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: allow.map((id) => ({ type: 'public-key', id })),
        userVerification: 'required',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null
    return !!assertion
  } catch {
    return false // cancelado / falhou
  }
}

/* ── Auto-lock (segundo plano) ──────────────────────────── */

let hiddenAt = 0
let autoLockInstalled = false

/**
 * Instala (uma vez) o ouvinte de visibilidade:
 * app vai para fundo → marca instante; volta → se passou o
 * tempo configurado, bloqueia. Com autoLockMinutes = 0 bloqueia
 * logo ao esconder (app switcher já mostra o overlay por cima).
 */
export function installAppLockAutoLock(): () => void {
  if (autoLockInstalled) return () => undefined
  autoLockInstalled = true

  const onVisibility = () => {
    const cfg = getAppLockConfig()
    if (!cfg.enabled || !cfg.pinHash || !cfg.lockOnBackground) return
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      if (cfg.autoLockMinutes === 0) lockNow() // app switcher já mostra o ecrã de bloqueio
    } else {
      const away = Date.now() - hiddenAt
      hiddenAt = 0
      if (cfg.autoLockMinutes > 0 && away >= cfg.autoLockMinutes * 60_000) lockNow()
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    autoLockInstalled = false
  }
}

/* ── Eventos (overlay + settings reagem) ────────────────── */

type AppLockEventType = 'lock' | 'unlock' | 'config'
type AppLockHandler = (type: AppLockEventType) => void

const handlers = new Set<AppLockHandler>()

export const appLockEvents = {
  on(h: AppLockHandler): () => void {
    handlers.add(h)
    return () => handlers.delete(h)
  },
  emit(type: AppLockEventType): void {
    for (const h of handlers) {
      try {
        h(type)
      } catch {
        /* handler isolado não derruba os outros */
      }
    }
  },
}
