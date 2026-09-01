/**
 * DuressPinLogin — Sistema de login sob coaccao (duress login)
 *
 * Mecanismo de seguranca critico: o utilizador toca no icone Shield 5 vezes
 * para activar o "modo duress". O proximo login bem-sucedido
 * dispara um SOS silencioso em background, sem qualquer indicacao
 * visual ou sonoro para o coactor.
 *
 * O coactor ve um login normal, com sucesso normal, sem suspeitar.
 *
 * Exporta:
 *  - DuressLoginOverlay: Componente de login com mecanismo duress
 *  - useDuressLogin: Hook para gerir o estado armado
 */

import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  MailWarning,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEmergency } from '@/hooks/useEmergency'
import { useAuth } from '@/hooks/useAuth'
import {
  AnimatedGrid,
  NoiseTexture,
  MorphingBlob,
  FloatingOrbs,
  RippleButton,
  MagneticButton,
} from '@/components/effects'
import { toast } from 'sonner'
import * as api from '@/lib/api'

// ============================================
// CONSTANTS
// ============================================

const DURESS_LOGIN_ARMED_KEY = 'duress-login-armed'
const TAPS_REQUIRED = 5
const TAP_WINDOW_MS = 2000 // 5 taps must happen within 2 seconds

// ============================================
// useDuressLogin HOOK
// ============================================

export function useDuressLogin() {
  const [isDuressArmed, setIsDuressArmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DURESS_LOGIN_ARMED_KEY) === 'true'
    } catch {
      return false
    }
  })

  const armDuress = useCallback(() => {
    setIsDuressArmed(true)
    try {
      localStorage.setItem(DURESS_LOGIN_ARMED_KEY, 'true')
    } catch {
      // localStorage unavailable — state still held in memory
    }
  }, [])

  const disarmDuress = useCallback(() => {
    setIsDuressArmed(false)
    try {
      localStorage.setItem(DURESS_LOGIN_ARMED_KEY, 'false')
    } catch {
      // localStorage unavailable
    }
  }, [])

  return { isDuressArmed, armDuress, disarmDuress } as const
}

// ============================================
// SILENT SOS TRIGGER
// ============================================

/**
 * Triggers a completely silent SOS emergency.
 * No toasts, no alarms, no visual feedback.
 * Uses direct API calls to avoid useEmergency's audible/visual side effects.
 */
async function triggerSilentSOS(userId: string): Promise<void> {
  try {
    // Attempt to get GPS position silently
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 30_000,
      })
    })

    const { latitude, longitude } = position.coords

    // Fire emergency via RPC (silent — no toasts, no alarm)
    await api.triggerEmergency(userId, latitude, longitude)

    // Log the duress trigger event for post-incident timeline
    await api.logEvent(
      userId,
      'emergency',
      'SOS silencioso activado via login sob coaccao',
      undefined,
      latitude,
      longitude
    )
  } catch (err) {
    // If GPS or API fails, still try to log and queue for offline
    try {
      await api.logEvent(
        userId,
        'emergency',
        'Tentativa de SOS silencioso via login sob coaccao (falha GPS/API)',
        undefined,
        undefined,
        undefined
      )
    } catch {
      // Absolute last resort — fail silently to not alert the coercer
    }
  }
}

// ============================================
// DuressLoginOverlay COMPONENT
// ============================================

interface DuressLoginOverlayProps {
  /** Called after successful login (duress or normal) */
  onLoginSuccess?: () => void
  /** Optional: override navigate target after login */
  redirectTo?: string
  /** Optional: suppress the left panel (mobile-fullscreen mode) */
  compact?: boolean
}

export function DuressLoginOverlay({
  onLoginSuccess,
  redirectTo,
  compact = false,
}: DuressLoginOverlayProps) {
  const { isDuressArmed, armDuress, disarmDuress } = useDuressLogin()
  const { triggerEmergency } = useEmergency()
  const { user } = useAuth()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Password reset modal
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // 5-tap mechanism state
  const tapTimesRef = useRef<number[]>([])
  const [tapFeedback, setTapFeedback] = useState(false)

  // Track whether silent SOS has been dispatched (prevent double-fire)
  const sosDispatchedRef = useRef(false)

  // Clean up duress armed state on unmount if it's been too long (10 minutes)
  useEffect(() => {
    if (!isDuressArmed) return
    const timeout = setTimeout(() => {
      disarmDuress()
    }, 10 * 60 * 1000) // 10 minutes
    return () => clearTimeout(timeout)
  }, [isDuressArmed, disarmDuress])

  // ---- 5-tap Shield handler ----
  const handleShieldTap = useCallback(() => {
    const now = Date.now()
    // Keep only taps within the window
    tapTimesRef.current = tapTimesRef.current.filter(
      (t) => now - t < TAP_WINDOW_MS
    )
    tapTimesRef.current.push(now)

    if (tapTimesRef.current.length >= TAPS_REQUIRED) {
      tapTimesRef.current = []
      if (!isDuressArmed) {
        armDuress()
        setTapFeedback(true)
        setTimeout(() => setTapFeedback(false), 300)
      } else {
        disarmDuress()
        setTapFeedback(true)
        setTimeout(() => setTapFeedback(false), 300)
      }
    }
  }, [isDuressArmed, armDuress, disarmDuress])

  // ---- Form submission ----
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      // Show normal login error — identical to normal login
      toast.error('Falha na autenticacao', { description: error.message })
      return
    }

    // Login successful — show the same success toast regardless of duress
    toast.success('Bem-vindo de volta!')

    // If duress is armed, silently dispatch SOS
    if (isDuressArmed && !sosDispatchedRef.current) {
      sosDispatchedRef.current = true
      disarmDuress()

      // Get the current user ID (may be available from auth state change)
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (userId) {
        // Fire silently in background — do NOT await (non-blocking)
        triggerSilentSOS(userId).catch(() => {
          // Swallow errors completely — the coercer must never see any error
        })
      }
    }

    onLoginSuccess?.()

    // Navigate to dashboard or custom redirect
    if (redirectTo) {
      window.location.href = redirectTo
    }
  }

  // ---- Password reset ----
  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error('Insira o seu email')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim())
    setResetLoading(false)
    if (error) {
      toast.error('Erro ao enviar email', { description: error.message })
      return
    }
    toast.success('Email enviado!', {
      description: 'Verifique a sua caixa de entrada.',
    })
    setResetMode(false)
  }

  // ---- Shared styles ----
  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-xl border ${
      hasError
        ? 'border-red-500/40 focus-visible:ring-red-500/30'
        : 'border-white/[0.08] focus-visible:ring-[#25D366]/30 focus-visible:border-[#25D366]/30'
    } bg-white/[0.03] pl-10 pr-4 text-white placeholder:text-white/20 text-sm outline-none focus-visible:ring-2 transition-all duration-200 backdrop-blur-sm`

  // ---- RENDER ----
  return (
    <div className="dark flex min-h-screen bg-[#0A0F1A]">
      {/* Duress armed indicator — tiny green dot, top-right corner */}
      <AnimatePresence>
        {isDuressArmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-3 right-3 z-50"
            aria-hidden="true"
          >
            <div className="w-2 h-2 rounded-full bg-[#25D366] shadow-[0_0_6px_rgba(37,211,102,0.6)] animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDE — Hero panel (hidden on mobile) */}
      {!compact && (
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
          <AnimatedGrid opacity={0.3} />
          <FloatingOrbs />
          <NoiseTexture opacity={0.02} />
          <MorphingBlob
            className="-left-20 top-1/3"
            color="rgba(37, 211, 102, 0.05)"
            size={350}
          />
          <MorphingBlob
            className="-bottom-20 right-1/3"
            color="rgba(59, 130, 246, 0.04)"
            size={300}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative z-10 flex flex-col items-center px-8 text-center"
          >
            {/* Tappable Shield logo — 5 taps to arm duress */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: 'easeInOut',
              }}
              className="mb-8 relative cursor-pointer select-none"
              onClick={handleShieldTap}
              onPointerDown={(e) => e.preventDefault()}
              role="button"
              tabIndex={-1}
              aria-hidden="true"
            >
              <div
                className={`flex h-28 w-28 items-center justify-center rounded-3xl border backdrop-blur-md shadow-[0_0_60px_-15px_rgba(37,211,102,0.15)] transition-all duration-200 ${
                  tapFeedback
                    ? 'border-[#25D366]/50 bg-[#25D366]/[0.12]'
                    : 'border-[#25D366]/20 bg-[#25D366]/[0.06]'
                }`}
              >
                <Shield
                  className={`h-14 w-14 text-[#25D366] transition-transform duration-150 ${
                    tapFeedback ? 'scale-110' : ''
                  }`}
                  strokeWidth={1}
                />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-[#25D366]/5 blur-2xl" />
            </motion.div>

            <h2 className="font-display text-3xl font-bold text-white">
              A Sua{' '}
              <span className="bg-gradient-to-r from-[#25D366] to-emerald-400 bg-clip-text text-transparent">
                Seguranca
              </span>{' '}
              Comeca Aqui
            </h2>
            <p className="mt-4 max-w-sm text-sm text-white/35 leading-relaxed">
              Entre na sua conta para aceder ao painel de monitorizacao, gerir
              dispositivos e configurar alertas.
            </p>
          </motion.div>
        </div>
      )}

      {/* RIGHT SIDE — Login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 relative">
        <NoiseTexture opacity={0.015} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile logo (also tappable for duress) */}
          <motion.div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                tapFeedback
                  ? 'bg-[#25D366]/20 border-[#25D366]/40'
                  : 'bg-[#25D366]/10 border-[#25D366]/20'
              }`}
              onClick={handleShieldTap}
              role="button"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Shield className="h-5 w-5 text-[#25D366]" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              Status<span className="text-[#25D366]">Ads</span>
            </span>
          </motion.div>

          {/* Login card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-2xl shadow-2xl shadow-black/20">
            <h1 className="font-display text-2xl font-bold text-white">
              Entrar na Conta
            </h1>
            <p className="mt-2 text-sm text-white/35">
              Insira as suas credenciais para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              {/* Email field */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="duress-email"
                  className="text-xs font-medium text-white/50"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <input
                    id="duress-email"
                    type="email"
                    placeholder="seu@email.com"
                    className={inputCls(false)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="duress-password"
                  className="text-xs font-medium text-white/50"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <input
                    id="duress-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={inputCls(false)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 transition hover:text-white/50"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs text-[#25D366]/70 transition hover:text-[#25D366]"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit button */}
              <MagneticButton strength={0.15}>
                <RippleButton
                  disabled={loading}
                  className={`h-11 w-full text-sm font-semibold ${
                    loading ? 'opacity-60' : ''
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Entrar <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </RippleButton>
              </MagneticButton>
            </form>

            {/* Social login section */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider">
                ou continue com
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm transition-all hover:bg-white/[0.06] hover:text-white/80 hover:border-white/15"
                onClick={() => toast.info('Login com Google em breve.')}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm transition-all hover:bg-white/[0.06] hover:text-white/80 hover:border-white/15"
                onClick={() => toast.info('Login com Apple em breve.')}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </button>
            </div>
          </div>

          {/* Register link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-sm text-white/30"
          >
            Nao tem conta?{' '}
            <a
              href="/register"
              className="font-medium text-[#25D366]/70 transition hover:text-[#25D366]"
            >
              Criar conta
            </a>
          </motion.p>

          {/* PASSWORD RESET MODAL */}
          <AnimatePresence>
            {resetMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={(e) =>
                  e.target === e.currentTarget && setResetMode(false)
                }
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.08] bg-[#0D1321] p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/15">
                      <MailWarning className="h-5 w-5 text-[#25D366]" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">
                        Redefinir Senha
                      </h3>
                      <p className="text-[11px] text-white/25 mt-0.5">
                        Enviaremos um link de recuperacao para o seu email.
                      </p>
                    </div>
                  </div>

                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-4 pr-4 text-white text-sm placeholder:text-white/20 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 focus-visible:border-[#25D366]/30 transition-all duration-200 mb-4"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setResetMode(false)}
                      className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="flex-1 h-11 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white text-sm font-semibold disabled:opacity-50 transition gap-2 flex items-center justify-center"
                    >
                      {resetLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Enviar Link'
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default DuressLoginOverlay
