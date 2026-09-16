/**
 * AppLockOverlay (v3.23.0) — Ecrã de bloqueio nativo da app.
 *
 * • PIN 4-6 dígitos (hash SHA-256 + salt, nunca sai do dispositivo)
 * • Biometria por WebAuthn platform (impressão digital / face —
 *   na APK usa o sensor do próprio Android; na web usa Touch/Face ID)
 * • Auto-lock ao ir para segundo plano (configurável nas Definições)
 * • Háptica em camadas + ink ripple no teclado
 * • Duress: o PIN anti-coerção desbloqueia em modo fantasma
 * • Botão de emergência sempre acessível (tel:112)
 *
 * z-[195]: fica ACIMA de todo o conteúdo (toasts, dock, páginas),
 * mas por BAIXO dos overlays de segurança (Guardião 200, Chamada
 * Falsa 210, Pânico 9998, Discreto 9999) — a emergência nunca
 * fica presa atrás do bloqueio.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Delete, Fingerprint, PhoneCall, ShieldCheck } from 'lucide-react'
import {
  appLockEvents,
  authenticateBiometric,
  biometricAvailable,
  getAppLockConfig,
  installAppLockAutoLock,
  isLockActive,
  markUnlocked,
  verifyPin,
} from '@/lib/app-lock'
import { spawnRipple } from '@/components/native/native-gestures'
import { haptic } from '@/lib/native'
import { useAntiCoercion } from '@/hooks/useAntiCoercion'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15_000

/** Assina o estado global do bloqueio (eventos + visibilidade). */
function useLockState(): boolean {
  const [locked, setLocked] = useState(() => isLockActive())
  useEffect(() => {
    const off = appLockEvents.on((type) => {
      if (type === 'lock' || type === 'unlock') setLocked(isLockActive())
    })
    const onVis = () => setLocked(isLockActive())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      off()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return locked
}

export function AppLockOverlay() {
  const locked = useLockState()
  const { isPanicPassword, activateCoercionMode } = useAntiCoercion()

  // auto-lock: ouve visibilitychange uma única vez, sempre montado
  useEffect(() => installAppLockAutoLock(), [])

  return (
    <AnimatePresence>
      {locked && (
        <LockScreen
          key="app-lock"
          isPanicPassword={isPanicPassword}
          onDuress={() => {
            markUnlocked()
            activateCoercionMode()
          }}
        />
      )}
    </AnimatePresence>
  )
}

function LockScreen({
  isPanicPassword,
  onDuress,
}: {
  isPanicPassword: (pin: string) => Promise<boolean>
  onDuress: () => void
}) {
  const cfg = getAppLockConfig()
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [bioOk, setBioOk] = useState(false)
  const shakeTimer = useRef<number | null>(null)

  const lockoutLeft = Math.max(0, lockoutUntil - now)
  const lockoutSecs = Math.ceil(lockoutLeft / 1000)

  // biometria disponível? + relógio do lockout
  useEffect(() => {
    let alive = true
    if (cfg.biometric && cfg.biometricCredentialId) {
      void biometricAvailable().then((ok) => alive && setBioOk(ok))
    }
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => {
      alive = false
      window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fail = useCallback(() => {
    setShaking(true)
    setPin('')
    setAttempts((a) => a + 1)
    if (attempts + 1 >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS)
    void haptic('heavy')
    if (shakeTimer.current) window.clearTimeout(shakeTimer.current)
    shakeTimer.current = window.setTimeout(() => setShaking(false), 500)
  }, [attempts])

  const success = useCallback(() => {
    void haptic('medium')
    markUnlocked()
  }, [])

  const submit = useCallback(
    async (candidate: string) => {
      if (checking) return
      setChecking(true)
      try {
        if (await verifyPin(candidate)) {
          success()
        } else if (await isPanicPassword(candidate)) {
          // PIN anti-coerção: desbloqueia em silêncio e entra em modo fantasma
          onDuress()
        } else {
          fail()
        }
      } finally {
        setChecking(false)
      }
    },
    [checking, fail, isPanicPassword, onDuress, success],
  )

  const press = useCallback(
    (digit: string) => {
      void haptic('light')
      setPin((p) => {
        if (p.length >= cfg.pinLength) return p
        const next = p + digit
        if (next.length === cfg.pinLength) {
          window.setTimeout(() => void submit(next), 120)
        }
        return next
      })
    },
    [cfg.pinLength, submit],
  )

  const erase = useCallback(() => {
    void haptic('light')
    setPin((p) => p.slice(0, -1))
  }, [])

  const tryBiometric = useCallback(async () => {
    if (!cfg.biometricCredentialId) return
    const ok = await authenticateBiometric(cfg.biometricCredentialId)
    if (ok) success()
    else fail()
  }, [cfg.biometricCredentialId, fail, success])

  // pede a biometria automaticamente ao aparecer (comportamento nativo)
  const bioPrompted = useRef(false)
  useEffect(() => {
    if (!bioOk || bioPrompted.current) return
    bioPrompted.current = true
    const t = window.setTimeout(() => void tryBiometric(), 450)
    return () => window.clearTimeout(t)
  }, [bioOk, tryBiometric])

  const disabled = checking || lockoutLeft > 0

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[195] bg-background flex flex-col items-center justify-center px-8 select-none"
      role="dialog"
      aria-label="App bloqueada"
    >
      {/* fundo com marca */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-brand/[0.07] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-brand/[0.04] blur-3xl" />
      </div>

      {/* cabeçalho */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="relative flex flex-col items-center gap-3 mb-8"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 border border-brand/25 shadow-[0_0_40px_-10px_rgba(212,175,55,0.4)]">
          <ShieldCheck className="h-8 w-8 text-brand" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white/90">Aegis bloqueada</h1>
          <p className="text-xs text-white/35 mt-1">
            {lockoutLeft > 0
              ? `Aguarda ${lockoutSecs}s…`
              : 'Introduz o PIN para continuar'}
          </p>
        </div>
      </motion.div>

      {/* pontos do PIN */}
      <motion.div
        animate={shaking ? { x: [0, -12, 12, -8, 8, -4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center gap-4 mb-8"
      >
        {Array.from({ length: cfg.pinLength }).map((_, i) => {
          const filled = i < pin.length
          return (
            <motion.div
              key={i}
              animate={filled ? { scale: [1.35, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={cn(
                'h-3.5 w-3.5 rounded-full border transition-colors duration-150',
                filled
                  ? 'bg-brand border-brand shadow-[0_0_12px_-2px_rgba(212,175,55,0.6)]'
                  : 'bg-transparent border-white/20',
              )}
            />
          )
        })}
      </motion.div>

      {/* teclado numérico */}
      <div className="relative grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
        {KEYS.map((k) => (
          <KeyCap key={k} disabled={disabled} onPress={() => press(k)}>
            {k}
          </KeyCap>
        ))}
        <KeyCap
          disabled={disabled || !bioOk}
          onPress={() => void tryBiometric()}
          ariaLabel="Desbloquear com biometria"
          muted={!bioOk}
        >
          <Fingerprint className={cn('h-6 w-6', bioOk ? 'text-brand' : 'text-white/20')} />
        </KeyCap>
        <KeyCap disabled={disabled} onPress={() => press('0')}>0</KeyCap>
        <KeyCap disabled={disabled || pin.length === 0} onPress={erase} ariaLabel="Apagar" muted={pin.length === 0}>
          <Delete className="h-5 w-5 text-white/60" />
        </KeyCap>
      </div>

      {/* tentativas / estado */}
      <div className="relative h-5 mt-5">
        {lockoutLeft > 0 ? (
          <p className="text-[11px] text-amber-400/90">
            Demasiadas tentativas — aguarda {lockoutSecs}s
          </p>
        ) : attempts > 0 ? (
          <p className="text-[11px] text-red-400/80">
            PIN incorrecto · {attempts} tentativa{attempts > 1 ? 's' : ''}
          </p>
        ) : null}
      </div>

      {/* emergência — sempre acessível mesmo bloqueado */}
      <a
        href="tel:112"
        className="relative mt-6 flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[0.07] px-5 py-2.5 text-xs font-medium text-red-300 active:scale-95 transition-transform"
        onClick={() => void haptic('heavy')}
      >
        <PhoneCall className="h-3.5 w-3.5" />
        Emergência 112
      </a>
    </motion.div>
  )
}

/** Tecla do teclado — ink ripple + resposta táctil, estilo nativo. */
function KeyCap({
  children,
  onPress,
  disabled,
  muted,
  ariaLabel,
}: {
  children: ReactNode
  onPress: () => void
  disabled?: boolean
  muted?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return
        spawnRipple(e.currentTarget, e.clientX, e.clientY, 'gold')
      }}
      onClick={() => {
        if (!disabled) onPress()
      }}
      className={cn(
        'relative overflow-hidden h-16 rounded-2xl border flex items-center justify-center',
        'text-xl font-medium tabular-nums select-none touch-manipulation',
        'transition-all duration-100 active:scale-[0.92]',
        muted
          ? 'border-white/[0.04] bg-white/[0.01]'
          : 'border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.06]',
        disabled && 'opacity-50',
      )}
    >
      {children}
    </button>
  )
}
