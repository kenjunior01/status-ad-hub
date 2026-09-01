/**
 * useAntiCoercion — Sistema de Senha Anti-Coerção
 *
 * Permite ao utilizador configurar uma “senha de pânico” separada.
 * Quando essa senha é usada no login:
 *   1. O login SUPABASE falha (senha errada) → mostramos sucesso FAKE
 *   2. O dashboard exibe uma versão inofensiva (FakeDashboard)
 *   3. Um SOS silencioso é disparado em background
 *
 * A senha de pânico é armazenada localmente (localStorage) com hash SHA-256.
 * Nunca é enviada ao servidor — apenas comparada localmente.
 *
 * Fluxo:
 *   Login → email + password → supabase.auth.signInWithPassword
 *     → se falhar E password_hash == panic_hash → ACTIVAR modo coerção
 *     → mostrar toast de sucesso fake, navegar para dashboard
 *     → dashboard detecta isCoercionMode → renderiza FakeDashboard
 *     → SOS silencioso disparado em background
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import * as api from '@/lib/api'

// ============================================
// TYPES
// ============================================

interface AntiCoercionState {
  /** Whether the user is currently in coercion mode (fake dashboard shown) */
  isCoercionMode: boolean
  /** Whether the panic password is configured */
  isConfigured: boolean
  /** When coercion mode was activated (ISO string) */
  activatedAt: string | null
  /** Silent SOS dispatch status */
  sosDispatched: boolean
}

interface AntiCoercionContextType extends AntiCoercionState {
  /** Set a new panic password (hashes it before storing) */
  setPanicPassword: (plainPassword: string) => void
  /** Remove the panic password */
  removePanicPassword: () => void
  /** Check if a given password matches the panic password */
  isPanicPassword: (plainPassword: string) => boolean
  /** Activate coercion mode (called after detecting panic password) */
  activateCoercionMode: () => void
  /** Deactivate coercion mode (e.g., when user logs out) */
  deactivateCoercionMode: () => void
  /** Verify current panic password (for settings validation) */
  verifyPanicPassword: (plainPassword: string) => boolean
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'statusads-anti-coercion'
const COERCION_MODE_KEY = 'statusads-coercion-active'

// ============================================
// HELPERS
// ============================================

/** SHA-256 hash of a string → hex digest */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Get stored config from localStorage */
function getStoredConfig(): { panicHash: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { panicHash: null }
    const parsed = JSON.parse(raw)
    return { panicHash: parsed.panicHash ?? null }
  } catch {
    return { panicHash: null }
  }
}

/** Save config to localStorage */
function saveConfig(panicHash: string | null): void {
  try {
    if (panicHash) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ panicHash }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage unavailable
  }
}

// ============================================
// CONTEXT
// ============================================

const AntiCoercionContext = createContext<AntiCoercionContextType>({
  isCoercionMode: false,
  isConfigured: false,
  activatedAt: null,
  sosDispatched: false,
  setPanicPassword: () => {},
  removePanicPassword: () => {},
  isPanicPassword: () => false,
  activateCoercionMode: () => {},
  deactivateCoercionMode: () => {},
  verifyPanicPassword: () => false,
})

// ============================================
// PROVIDER
// ============================================

export function AntiCoercionProvider({ children }: { children: ReactNode }) {
  const { panicHash } = getStoredConfig()
  const [isConfigured] = useState(() => !!panicHash)
  const [storedHash, setStoredHash] = useState<string | null>(panicHash)
  const [isCoercionMode, setIsCoercionMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COERCION_MODE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [activatedAt, setActivatedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(COERCION_MODE_KEY + '-time')
    } catch {
      return null
    }
  })
  const [sosDispatched, setSosDispatched] = useState(false)

  // Set panic password (hashes and stores)
  const setPanicPassword = useCallback(async (plainPassword: string) => {
    const hash = await sha256(plainPassword)
    setStoredHash(hash)
    saveConfig(hash)
  }, [])

  // Remove panic password
  const removePanicPassword = useCallback(() => {
    setStoredHash(null)
    saveConfig(null)
  }, [])

  // Check if a password matches (async because of SHA-256)
  const isPanicPassword = useCallback(
    async (plainPassword: string): Promise<boolean> => {
      if (!storedHash) return false
      const hash = await sha256(plainPassword)
      return hash === storedHash
    },
    [storedHash],
  )

  // Verify panic password (sync version using current hash)
  const verifyPanicPassword = useCallback(
    async (plainPassword: string): Promise<boolean> => {
      if (!storedHash) return false
      const hash = await sha256(plainPassword)
      return hash === storedHash
    },
    [storedHash],
  )

  // Activate coercion mode + dispatch silent SOS
  const activateCoercionMode = useCallback(() => {
    const now = new Date().toISOString()
    setIsCoercionMode(true)
    setActivatedAt(now)
    try {
      localStorage.setItem(COERCION_MODE_KEY, 'true')
      localStorage.setItem(COERCION_MODE_KEY + '-time', now)
    } catch {
      // localStorage unavailable
    }

    // Dispatch silent SOS if not already done
    if (!sosDispatched) {
      setSosDispatched(true)
      triggerSilentCoercionSOS().catch(() => {
        // Swallow errors — coercer must never see any error
      })
    }
  }, [sosDispatched])

  // Deactivate coercion mode
  const deactivateCoercionMode = useCallback(() => {
    setIsCoercionMode(false)
    setActivatedAt(null)
    setSosDispatched(false)
    try {
      localStorage.removeItem(COERCION_MODE_KEY)
      localStorage.removeItem(COERCION_MODE_KEY + '-time')
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Auto-deactivate after 30 minutes (safety timeout)
  useEffect(() => {
    if (!isCoercionMode) return
    const timeout = setTimeout(() => {
      deactivateCoercionMode()
    }, 30 * 60 * 1000)
    return () => clearTimeout(timeout)
  }, [isCoercionMode, deactivateCoercionMode])

  return (
    <AntiCoercionContext.Provider
      value={{
        isCoercionMode,
        isConfigured,
        activatedAt,
        sosDispatched,
        setPanicPassword,
        removePanicPassword,
        isPanicPassword,
        activateCoercionMode,
        deactivateCoercionMode,
        verifyPanicPassword,
      }}
    >
      {children}
    </AntiCoercionContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export const useAntiCoercion = () => useContext(AntiCoercionContext)

// ============================================
// SILENT SOS TRIGGER (module-level)
// ============================================

/**
 * Triggers a completely silent SOS when coercion mode is activated.
 * No toasts, no alarms, no visual feedback.
 * Attempts GPS, then falls back to default coordinates (Maputo).
 */
async function triggerSilentCoercionSOS(): Promise<void> {
  try {
    // Attempt to get GPS position silently
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5_000,
        maximumAge: 30_000,
      })
    })

    const { latitude, longitude } = position.coords

    // Get user ID from current session
    const { supabase } = await import('@/lib/supabase')
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (!userId) return

    // Fire emergency via RPC (silent — no toasts, no alarm)
    await api.triggerEmergency(userId, latitude, longitude)

    // Log the coercion trigger event for post-incident timeline
    await api.logEvent(
      userId,
      'emergency',
      'SOS silencioso activado via SENHA ANTI-COERCAO',
      undefined,
      latitude,
      longitude,
    )
  } catch {
    // If GPS or API fails, try with default coordinates
    try {
      const { supabase } = await import('@/lib/supabase')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return

      await api.triggerEmergency(userId, -25.9692, 32.5732)
      await api.logEvent(
        userId,
        'emergency',
        'SOS anti-coercao activado (fallback sem GPS)',
        undefined,
        undefined,
        undefined,
      )
    } catch {
      // Absolute last resort — fail silently
    }
  }
}
