import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassesSOSOverlayProps {
  isActive: boolean
  isStealth: boolean
  isRecording: boolean
  recordingDuration: number
  onStop: () => void
}

/**
 * GlassesSOSOverlay — Full-screen overlay during a glasses-triggered SOS.
 *
 * - Stealth mode ON: only a tiny blinking dot in top-left; auto-hides after 3s
 * - Stealth mode OFF: red border pulse + recording indicator + "SOS ACTIVO" text
 * - Small "Parar" button in bottom-right to stop recording and dismiss
 */

export function GlassesSOSOverlay({
  isActive,
  isStealth,
  isRecording,
  recordingDuration,
  onStop,
}: GlassesSOSOverlayProps) {
  const [stealthAutoHidden, setStealthAutoHidden] = useState(false)

  // Auto-hide stealth indicator after 3 seconds
  useEffect(() => {
    if (!isActive || !isStealth) {
      setStealthAutoHidden(false)
      return
    }
    const timer = setTimeout(() => setStealthAutoHidden(true), 3000)
    return () => clearTimeout(timer)
  }, [isActive, isStealth])

  // Reset auto-hide when recording duration changes (keep visible if actively recording)
  useEffect(() => {
    if (isActive && isStealth && isRecording) {
      setStealthAutoHidden(false)
    }
  }, [isActive, isStealth, isRecording, recordingDuration])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* ---- Stealth mode: tiny blinking dot ---- */}
          {isStealth && !stealthAutoHidden && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute top-4 left-4 pointer-events-auto"
            >
              <motion.div
                className="h-2 w-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}

          {/* ---- Full stealth auto-hidden: completely invisible ---- */}
          {isStealth && stealthAutoHidden && !isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
              className="absolute inset-0"
            />
          )}

          {/* ---- Non-stealth mode: visible overlay ---- */}
          {!isStealth && (
            <>
              {/* Red border pulse */}
              <motion.div
                className="absolute inset-0 rounded-none pointer-events-none"
                animate={{
                  boxShadow: [
                    'inset 0 0 0 0 rgba(239, 68, 68, 0)',
                    'inset 0 0 0 3px rgba(239, 68, 68, 0.6)',
                    'inset 0 0 0 0 rgba(239, 68, 68, 0)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Second pulse ring offset for depth */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  boxShadow: [
                    'inset 0 0 30px 0 rgba(239, 68, 68, 0)',
                    'inset 0 0 60px 0 rgba(239, 68, 68, 0.15)',
                    'inset 0 0 30px 0 rgba(239, 68, 68, 0)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
              />

              {/* Top-left: SOS status */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.2 }}
                className="absolute top-4 left-4 pointer-events-auto"
              >
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-red-500/20">
                  <motion.div
                    className="h-2.5 w-2.5 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-red-400 text-xs font-bold tracking-wider">SOS ACTIVO</span>
                </div>
              </motion.div>

              {/* Recording indicator */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-red-500/20">
                    <motion.div
                      className={cn(
                        'rounded-full',
                        isRecording ? 'bg-red-500 h-2.5 w-2.5' : 'bg-white/20 h-2 w-2'
                      )}
                      animate={isRecording ? { opacity: [1, 0.3, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-red-400 text-xs font-mono font-semibold">
                      {formatTime(recordingDuration)}
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* ---- Stop button (always visible when active, small bottom-right) ---- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: isStealth ? 0 : 0.5 }}
            className={cn(
              'absolute bottom-4 right-4 pointer-events-auto',
              isStealth && stealthAutoHidden && 'opacity-0'
            )}
          >
            <button
              onClick={onStop}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm text-white/40 text-[10px] font-medium hover:bg-white/[0.1] hover:text-white/60 transition-all active:scale-95"
            >
              Parar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
