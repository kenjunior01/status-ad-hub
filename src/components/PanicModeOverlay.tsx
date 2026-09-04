/**
 * PanicModeOverlay — Ecrã de bloqueio durante modo pânico.
 * Mostra indicador de gravação, timer, e botão de desactivação com PIN.
 * O sistema continua activo em background: GPS, áudio, fotos.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { usePanicMode } from '@/hooks/usePanicMode'
import { readWitnessSnapshot } from '@/lib/guardian'
import { cn } from '@/lib/utils'
import { Lock, Mic, Camera, MapPin, ShieldAlert, Users } from 'lucide-react'

export function PanicModeOverlay() {
  const { state, deactivate, clearPhotos } = usePanicMode()
  const [pinInput, setPinInput] = useState('')
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recordingDot, setRecordingDot] = useState(true)
  const [witnessCount, setWitnessCount] = useState<number | null>(null)

  // Testemunhas registadas pela sentinela (congeladas no momento do disparo)
  useEffect(() => {
    if (!state.isActive) { setWitnessCount(null); return }
    readWitnessSnapshot()
      .then((snap) => setWitnessCount(snap ? snap.devices.length : null))
      .catch(() => setWitnessCount(null))
  }, [state.isActive])

  // Timer
  useEffect(() => {
    if (!state.isActive) { setElapsed(0); return }
    const start = Date.now() - (state.activatedAt ? new Date(state.activatedAt).getTime() : 0)
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(t)
  }, [state.isActive, state.activatedAt])

  // Blink recording dot
  useEffect(() => {
    if (!state.isRecording) return
    const t = setInterval(() => setRecordingDot(d => !d), 1000)
    return () => clearInterval(t)
  }, [state.isRecording])

  const handleDeactivate = useCallback(() => {
    if (deactivate(pinInput)) {
      setPinInput('')
      setShowDeactivate(false)
    }
  }, [deactivate, pinInput])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  if (!state.isActive) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9998] bg-background flex flex-col items-center justify-center"
    >
      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', recordingDot ? 'bg-red-500' : 'bg-red-500/30')} />
          <span className="text-red-400 text-sm font-medium">GRAVANDO</span>
        </div>
        <div className="text-white/40 text-sm font-mono">{formatTime(elapsed)}</div>
      </div>

      {/* Central shield icon with pulse */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="w-28 h-28 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
          <ShieldAlert className="w-14 h-14 text-red-400" />
        </div>
      </div>

      {/* Status indicators */}
      <div className="space-y-3 mb-12 text-center">
        <div className="text-white text-xl font-medium">MODO PÂNICO ACTIVO</div>
        <div className="text-white/50 text-sm">
          Emergência disparada. A gravar evidências.
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-3 gap-4 mb-8 px-8 w-full max-w-sm">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Mic className={cn('w-5 h-5 mx-auto mb-1', state.isRecording ? 'text-red-400' : 'text-white/20')} />
          <div className="text-white/60 text-xs">Áudio</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Camera className={cn('w-5 h-5 mx-auto mb-1', state.photosCaptured.length > 0 ? 'text-blue-400' : 'text-white/20')} />
          <div className="text-white/60 text-xs">{state.photosCaptured.length} Fotos</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-amber-300" />
          <div className="text-white/60 text-xs">GPS Activo</div>
        </div>
      </div>

      {/* Testemunhas registadas pela sentinela */}
      {witnessCount !== null && witnessCount > 0 && (
        <div className="flex items-center gap-2 mb-8 px-6 py-2.5 rounded-xl bg-sky-500/[0.08] border border-sky-400/20 max-w-sm">
          <Users className="w-4 h-4 text-sky-400 shrink-0" />
          <p className="text-[11px] text-sky-200/80 leading-snug">
            <b className="text-sky-300">{witnessCount} dispositivo{witnessCount === 1 ? '' : 's'}</b> perto de si registado{witnessCount === 1 ? '' : 's'} —
            pode ajudar a identificar testemunhas do incidente.
          </p>
        </div>
      )}

      {/* Deactivate button (subtle) */}
      <button
        onClick={() => setShowDeactivate(true)}
        className="text-white/10 text-xs hover:text-white/30 transition-colors"
      >
        Toque 3x para desactivar
      </button>

      {/* PIN deactivation modal */}
      {showDeactivate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/80 flex items-center justify-center p-6"
        >
          <div className="bg-card rounded-2xl p-6 w-72">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-white/60" />
              <span className="text-white font-medium">Desactivar Pânico</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleDeactivate()}
              className="w-full bg-gray-700 text-white text-center text-2xl tracking-[0.5em] rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
              placeholder="• • • •"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeactivate(false); setPinInput('') }}
                className="flex-1 py-2 rounded-xl text-gray-400 text-sm hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}