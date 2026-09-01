import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmergency } from '@/hooks/useEmergency'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

/**
 * SOSButton — Global floating emergency trigger
 *
 * Long-press (800ms) triggers emergency. Prevents accidental activation.
 * Shows countdown ring during hold, with haptic feedback at 50%.
 * Auto-hides on /emergency page or when active emergency exists.
 */

const HOLD_DURATION_MS = 800
const PULSE_RINGS = 3
// Security: minimum hold before trigger to prevent accidental activation
const MIN_TRIGGER_MS = 400
// Security: double-tap rapid trigger (3 taps within 500ms bypasses hold)
const DOUBLE_TAP_WINDOW_MS = 500
const DOUBLE_TAP_COUNT = 3

export function SOSButton() {
  const { triggerEmergency, isTriggering } = useEmergency()
  const { position, isTracking, permissionState } = useGeolocation()
  const { activeEmergency } = useEmergencyAlerts()
  const navigate = useNavigate()

  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  const holdStartRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const hasTriggeredRef = useRef(false)
  // Security: rapid-tap detection
  const tapTimesRef = useRef<number[]>([])

  // Hide on /emergency page or when active emergency exists
  useEffect(() => {
    const checkPath = () => {
      const isEmergencyPage = window.location.pathname === '/dashboard/emergency'
      setIsHidden(isEmergencyPage || (activeEmergency?.status === 'active'))
    }
    checkPath()
    window.addEventListener('popstate', checkPath)
    return () => window.removeEventListener('popstate', checkPath)
  }, [activeEmergency])

  const trigger = useCallback(async () => {
    if (hasTriggeredRef.current || isTriggering) return
    hasTriggeredRef.current = true

    if (!position && permissionState !== 'denied') {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 10_000,
          })
        })
        triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      } catch {
        toast.error('Nao foi possivel obter localizacao GPS.')
        hasTriggeredRef.current = false
        return
      }
    } else if (position) {
      triggerEmergency({ latitude: position.latitude, longitude: position.longitude })
    } else {
      toast.error('GPS nao disponivel. Aceda a pagina de Emergencia.')
      hasTriggeredRef.current = false
      return
    }

    navigate('/dashboard/emergency')
    setTimeout(() => { hasTriggeredRef.current = false }, 3_000)
  }, [position, permissionState, triggerEmergency, isTriggering, navigate])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (isTriggering || hasTriggeredRef.current) return

    // Security: check rapid-tap pattern (3 taps in 500ms = instant trigger)
    const now = Date.now()
    tapTimesRef.current.push(now)
    // Keep only recent taps within window
    tapTimesRef.current = tapTimesRef.current.filter(t => now - t < DOUBLE_TAP_WINDOW_MS)
    if (tapTimesRef.current.length >= DOUBLE_TAP_COUNT) {
      tapTimesRef.current = []
      // Instant trigger — bypass hold, but still check GPS
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      trigger()
      return
    }

    holdStartRef.current = Date.now()
    setIsHolding(true)
    setHoldProgress(0)

    const animate = () => {
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1)
      setHoldProgress(progress)
      if (progress >= 0.5 && progress < 0.55 && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setIsHolding(false)
        setHoldProgress(0)
        trigger()
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [isTriggering, trigger])

  const handlePointerUp = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setIsHolding(false)
    setHoldProgress(0)
    if (holdProgress >= 0.3) {
      setShowConfirm(true)
      setTimeout(() => setShowConfirm(false), 2_000)
    }
  }, [holdProgress])

  const handlePointerLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setIsHolding(false)
    setHoldProgress(0)
  }, [])

  if (isHidden || permissionState === 'denied' || permissionState === 'unavailable') return null

  const ringScale = 1 + holdProgress * 0.8
  const ringOpacity = 0.3 - holdProgress * 0.25

  // Build pulse ring elements
  const pulseRings = isHolding ? null : (
    <div className="absolute inset-0">
      {Array.from({ length: PULSE_RINGS }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full bg-red-500/20"
          animate={{
            scale: [1, 1.8 + i * 0.3],
            opacity: [0.2, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )

  // Build hold progress ring
  const progressRing = isHolding ? (
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-400"
      style={{
        clipPath: `polygon(0 0, 100% 0, 100% ${100 - holdProgress * 100}%, 0 ${100 - holdProgress * 100}%)`,
      }}
      animate={{ scale: ringScale, opacity: ringOpacity }}
      transition={{ duration: 0.1 }}
    />
  ) : null

  // GPS dot
  const gpsDot = isTracking ? (
    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0A0F1A] flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
    </div>
  ) : null

  // Spinner
  const spinner = isTriggering ? (
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-transparent border-t-white"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  ) : null

  return (
    <>
      <motion.div
        className="fixed z-50 bottom-24 lg:bottom-8 right-4 lg:right-8"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.5 }}
      >
        {pulseRings}
        {progressRing}

        <motion.button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'relative w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-2xl select-none touch-none cursor-pointer transition-colors duration-200',
            isHolding
              ? 'bg-red-600 shadow-red-500/40'
              : 'bg-red-500 shadow-red-500/20 hover:bg-red-600 hover:shadow-red-500/30'
          )}
          whileTap={{ scale: isHolding ? 0.92 : 0.95 }}
        >
          <span className={cn(
            'font-display font-black text-white text-sm lg:text-base tracking-wider transition-transform duration-150',
            isHolding && 'scale-110'
          )}>
            SOS
          </span>
          {spinner}
        </motion.button>

        <AnimatePresence>
          {showConfirm && !isHolding && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className="absolute -top-10 right-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#111827] border border-white/[0.08] text-[10px] text-white/50"
            >
              Prima e segure para activar
            </motion.div>
          )}
        </AnimatePresence>

        {gpsDot}
      </motion.div>

      {showConfirm && <div className="fixed inset-0 z-40" onClick={() => setShowConfirm(false)} />}
    </>
  )
}
