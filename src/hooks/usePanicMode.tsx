/**
 * usePanicMode — Modo Pânico: Bloqueio total + gravação áudio + captura fotos.
 * 
 * Quando activado:
 * 1. Ecrã bloqueado com UI falsa (calculadora)
 * 2. Gravação áudio contínua (evidência)
 * 3. Fotos automáticas a cada 30s (câmera frontal)
 * 4. Emergência disparada automaticamente
 * 5. GPS em alta frequência
 * 6. Destruição rápida de dados sensíveis (botão)
 */

import { useState, useCallback, useRef, createContext, useContext, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmergency } from '@/hooks/useEmergency'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import * as api from '@/lib/api'
import { saveAudioEvidence } from '@/lib/api'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { setSilentPanic } from '@/lib/guardian'
import type { PanicModeState } from '@/lib/types'

/** Opções de activação — source identifica o gatilho (Guardião, botão, etc.) */
export interface PanicActivateOptions {
  /** Sem sirene/toast alto (roubo/sequestro) — default false */
  silent?: boolean
  /** Origem do disparo para o registo de eventos */
  source?: string
}

interface PanicModeContextValue {
  state: PanicModeState
  activate: (opts?: PanicActivateOptions) => void
  deactivate: (pin?: string) => boolean
  capturePhoto: () => Promise<void>
  clearPhotos: () => void
  emergencyPhotos: string[]
}

const initialState: PanicModeState = {
  isActive: false,
  activatedAt: null,
  photosCaptured: [],
  isRecording: false,
  recordingDuration: 0,
  emergencyAlertId: null,
  isScreenLocked: false,
}

/**
 * Flag de módulo: a cadeia Modo Pânico está activa? Lida por useEmergency
 * para NÃO iniciar a gravação automática de áudio do SOS (o Pânico já
 * grava por conta própria — dois MediaRecorders disputariam o microfone).
 */
let panicChainActive = false
export function isPanicChainActive(): boolean {
  return panicChainActive
}

const PanicModeContext = createContext<PanicModeContextValue>({
  state: initialState,
  activate: () => {},
  deactivate: () => false,
  capturePhoto: async () => {},
  clearPhotos: () => {},
  emergencyPhotos: [],
})

export function PanicModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { triggerEmergency } = useEmergency()
  const { queueEmergency } = useOfflineQueue()
  const audioRecorder = useAudioRecorder(600) // 10min max
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const photoCountRef = useRef(0)
  const MAX_PHOTOS = 20  // Prevent memory exhaustion

  const [state, setState] = useState<PanicModeState>(initialState)

  // Auto-capture photo timer during panic
  useEffect(() => {
    if (state.isActive) {
      // Capture first photo immediately
      capturePhoto()
      // Then every 30 seconds
      photoIntervalRef.current = setInterval(capturePhoto, 30_000)
    }
    return () => {
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current)
        photoIntervalRef.current = null
      }
    }
  }, [state.isActive])

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      videoStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    try {
      // Request front camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      })
      videoStreamRef.current = stream

      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      await video.play()

      // Wait a moment for camera to adjust
      await new Promise(r => setTimeout(r, 500))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Stop camera immediately
      stream.getTracks().forEach(t => t.stop())
      videoStreamRef.current = null

      // Security: prevent memory exhaustion with max photos
      photoCountRef.current++
      if (photoCountRef.current > MAX_PHOTOS) {
        // Remove oldest photo to free memory
        setState(prev => ({
          ...prev,
          photosCaptured: prev.photosCaptured.slice(1),
        }))
      }

      setState(prev => ({
        ...prev,
        photosCaptured: [...prev.photosCaptured, dataUrl],
      }))

      // Log event
      if (user) {
        api.logEvent(user.id, 'photo_evidence', 'Foto capturada durante modo pânico').catch(() => {})
      }
    } catch (e) {
      console.warn('[PanicMode] Camera access denied or unavailable')
    }
  }, [user])

  const activate = useCallback((opts?: PanicActivateOptions) => {
    if (state.isActive) return
    const silent = opts?.silent ?? false

    panicChainActive = true
    const now = new Date().toISOString()
    setState(prev => ({ ...prev, isActive: true, activatedAt: now, isScreenLocked: true }))

    // Guardião: informar a cadeia de emergência para não tocar a sirene
    setSilentPanic(silent)

    // Start audio recording
    audioRecorder.startRecording()

    // Trigger emergency with GPS
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        triggerEmergency({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        if (user) queueEmergency(-25.9692, 32.5732)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )

    // Log event
    if (user) {
      const via = opts?.source ? ` via ${opts.source}` : ''
      api.logEvent(user.id, 'panic_mode', `Pânico activado${via} — gravação iniciada${silent ? ' (silencioso)' : ''}`).catch(() => {})
    }

    if (silent) {
      // Roubo/sequestro: NADA de alertas visíveis ou sonoros no telemóvel
      toast('Protecção activa', {
        description: 'A gravar e a alertar os seus contactos em silêncio.',
        duration: 6000,
      })
    } else {
      toast.error('MODO PÂNICO ACTIVADO', {
        description: 'A gravar áudio e fotos. Emergência disparada.',
        duration: 10000,
      })
    }

    // Vibrate pattern (curto e único em modo silencioso)
    if (navigator.vibrate) {
      navigator.vibrate(silent ? [150] : [200, 100, 200, 100, 500])
    }

    // Security: High-frequency GPS tracking during panic (every 10s)
    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (user) {
            api.logEvent(user.id, 'location', `GPS pânico: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
              undefined, pos.coords.latitude, pos.coords.longitude,
            ).catch(() => {})
          }
        },
        () => {}, // Silent GPS failure during panic
        { enableHighAccuracy: true, timeout: 3000 }
      )
    }, 10_000)
  }, [state.isActive, user, triggerEmergency, queueEmergency, audioRecorder])

  // Compatibilidade: chamadas antigas sem objecto de opções
  // (activate() continua a funcionar; activate({silent:true}) para o Guardião)

  const deactivate = useCallback((pin?: string) => {
    // Check PIN if configured
    const savedPin = localStorage.getItem('panic-deactivation-pin')
    if (savedPin && pin !== savedPin) {
      toast.error('PIN incorrecto')
      return false
    }
    panicChainActive = false

    // Stop audio recording and save evidence
    if (audioRecorder.isRecording) {
      audioRecorder.stopRecording()
      if (user && audioRecorder.blob) {
        const reader = new FileReader()
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1]
          saveAudioEvidence(user.id, {
            duration_seconds: audioRecorder.duration,
            file_size_bytes: audioRecorder.blob.size,
            mime_type: audioRecorder.blob.type,
            audio_data_b64: b64,
          }).catch(() => {})
        }
        reader.readAsDataURL(audioRecorder.blob)
      }
    }

    // Stop GPS interval
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }

    // Stop video stream
    videoStreamRef.current?.getTracks().forEach(t => t.stop())
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current)
      photoIntervalRef.current = null
    }

    setState(prev => ({
      ...initialState,
      photosCaptured: [...prev.photosCaptured], // Keep photos for review
    }))

    if (user) {
      api.logEvent(user.id, 'panic_mode', 'Modo pânico desactivado').catch(() => {})
    }

    toast.success('Modo pânico desactivado')
    return true
  }, [user, audioRecorder])

  const clearPhotos = useCallback(() => {
    setState(prev => ({ ...prev, photosCaptured: [] }))
  }, [])

  return (
    <PanicModeContext.Provider value={{
      state,
      activate,
      deactivate,
      capturePhoto,
      clearPhotos,
      emergencyPhotos: state.photosCaptured,
    }}>
      {children}
    </PanicModeContext.Provider>
  )
}

export function usePanicMode() {
  return useContext(PanicModeContext)
}