/**
 * useVoiceSOS — React hook para activação de emergência por voz.
 * Detecta frases-chave em Português e dispara o protocolo de emergência.
 * Integra com o sistema de SOS existente e grava activações.
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { createVoiceSOS, DEFAULT_PHRASES, DEFAULT_CONFIRMATION } from '@/lib/voice-sos'
import type { VoiceSOSController } from '@/lib/voice-sos'
import { useAuth } from '@/hooks/useAuth'
import { useEmergency } from '@/hooks/useEmergency'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Mic, MicOff, Volume2 } from 'lucide-react'

interface VoiceSOSContextValue {
  isListening: boolean
  isSupported: boolean
  lastDetected: string | null
  lastConfidence: number
  activationCount: number
  isConfirmationPending: boolean
  startListening: () => void
  stopListening: () => void
}

const VoiceSOSContext = createContext<VoiceSOSContextValue>({
  isListening: false,
  isSupported: false,
  lastDetected: null,
  lastConfidence: 0,
  activationCount: 0,
  isConfirmationPending: false,
  startListening: () => {},
  stopListening: () => {},
})

export function VoiceSOSProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { triggerEmergency } = useEmergency()
  const { queueEmergency } = useOfflineQueue()
  const controllerRef = useRef<VoiceSOSController | null>(null)

  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastDetected, setLastDetected] = useState<string | null>(null)
  const [lastConfidence, setLastConfidence] = useState(0)
  const [activationCount, setActivationCount] = useState(0)
  const [isConfirmationPending, setIsConfirmationPending] = useState(false)

  useEffect(() => {
    if (!user) return

    // Load user config from localStorage (or Supabase if available)
    const savedConfig = localStorage.getItem(`voice-sos-config-${user.id}`)
    let phrases = DEFAULT_PHRASES
    let confirmationPhrase = DEFAULT_CONFIRMATION
    let requireConfirmation = true
    let enabled = false

    if (savedConfig) {
      try {
        const cfg = JSON.parse(savedConfig)
        phrases = cfg.wake_phrases?.length > 0 ? cfg.wake_phrases : DEFAULT_PHRASES
        confirmationPhrase = cfg.confirmation_phrase || DEFAULT_CONFIRMATION
        requireConfirmation = cfg.require_confirmation ?? true
        enabled = cfg.enabled ?? false
      } catch {}
    }

    const controller = createVoiceSOS({
      wakePhrases: phrases,
      confirmationPhrase,
      requireConfirmation,
      language: 'pt-BR',
      continuous: true,
      cooldownMs: 30_000,
      onPhraseDetected: (phrase, confidence) => {
        setLastDetected(phrase)
        setLastConfidence(confidence)
        setIsConfirmationPending(true)
        toast('Voz detectada: "' + phrase + '" — diga "confirmar" para activar', {
          icon: <Mic className="h-4 w-4 text-amber-400" />,
          duration: 8000,
        })
      },
      onActivated: async (phrase, confidence) => {
        setIsConfirmationPending(false)
        setActivationCount(c => c + 1)
        setLastDetected(phrase)
        setLastConfidence(confidence)

        toast.success('Emergência activada por voz!', {
          icon: <Volume2 className="h-4 w-4 text-red-400" />,
          duration: 5000,
        })

        // Get GPS and trigger emergency
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            triggerEmergency({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            })
          },
          () => {
            // Fallback: queue offline
            if (user) {
              queueEmergency(-25.9692, 32.5732)
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
        )

        // Log activation
        if (user) {
          Promise.resolve(supabase.from('location_events').insert({
            user_id: user.id,
            type: 'voice_sos',
            description: `Emergência activada por voz: "${phrase}" (confiança: ${(confidence * 100).toFixed(0)}%)`,
            metadata: { phrase, confidence, activationCount },
          })).then(() => {}).catch(() => {})
        }
      },
      onStateChange: (listening) => {
        setIsListening(listening)
      },
      onError: (error) => {
        console.warn('[VoiceSOS] Error:', error)
      },
    })

    controllerRef.current = controller
    setIsSupported(controller.isSupported)

    // Auto-start if enabled
    if (enabled && controller.isSupported) {
      setTimeout(() => controller.start(), 1000)
    }

    return () => {
      controller.destroy()
      controllerRef.current = null
    }
  }, [user?.id])

  const startListening = useCallback(() => {
    controllerRef.current?.start()
  }, [])

  const stopListening = useCallback(() => {
    controllerRef.current?.stop()
    setIsConfirmationPending(false)
  }, [])

  return (
    <VoiceSOSContext.Provider value={{
      isListening, isSupported, lastDetected, lastConfidence,
      activationCount, isConfirmationPending,
      startListening, stopListening,
    }}>
      {children}
    </VoiceSOSContext.Provider>
  )
}

export function useVoiceSOS() {
  return useContext(VoiceSOSContext)
}
