import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useEmergency } from '@/hooks/useEmergency'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import * as api from '@/lib/api'
import { GlassesTapDetector, startGlassesHIDListener, DEFAULT_GLASSES_CONFIG } from '@/lib/smart-glasses'
import type { SmartGlassesConfig, TapPattern, GlassesTapEvent } from '@/lib/types'
import { toast } from 'sonner'

interface GlassesState {
  isHIDActive: boolean
  lastTapPattern: TapPattern | null
  lastTapTime: number | null
  tapCount: number
  isConfigured: boolean
  connectedGlassesDeviceId: string | null
}

export function useSmartGlasses() {
  const { user } = useAuth()
  const userId = user?.id
  const { connections, getSignalStrength } = useBluetooth()
  const { triggerEmergency, logEvent } = useEmergency()
  const { position } = useGeolocation()
  const { queueEmergency, queueEvent } = useOfflineQueue()
  const queryClient = useQueryClient()

  const detectorRef = useRef<GlassesTapDetector | null>(null)
  const cleanupHIDRef = useRef<(() => void) | null>(null)

  const [state, setState] = useState<GlassesState>({
    isHIDActive: false,
    lastTapPattern: null,
    lastTapTime: null,
    tapCount: 0,
    isConfigured: false,
    connectedGlassesDeviceId: null,
  })

  // Audio recorder — duration defaults to config or 120s
  const audioRecorder = useAudioRecorder(120)

  // Fetch glasses config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['glasses-config', userId],
    queryFn: () => api.getSmartGlassesConfig(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: (input: Partial<SmartGlassesConfig>) =>
      api.saveSmartGlassesConfig(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glasses-config'] })
      toast.success('Configuracao dos oculos guardada')
    },
    onError: () => toast.error('Erro ao guardar'),
  })

  // Fetch audio evidence history
  const { data: audioEvidenceList = [] } = useQuery({
    queryKey: ['audio-evidence', userId],
    queryFn: () => api.getAudioEvidence(userId!, 10),
    enabled: !!userId,
    staleTime: 60_000,
  })

  // Fetch tap history
  const { data: tapHistory = [] } = useQuery({
    queryKey: ['glasses-tap-history', userId, state.connectedGlassesDeviceId],
    queryFn: () => api.getGlassesTapHistory(userId!, state.connectedGlassesDeviceId!, 10),
    enabled: !!userId && !!state.connectedGlassesDeviceId,
    staleTime: 30_000,
  })

  // Detect connected glasses device from BLE connections
  const connectedGlassesDevice = Array.from(connections.values()).find(
    (conn) =>
      conn.connected &&
      (conn.deviceName.toLowerCase().includes('glass') ||
        conn.deviceName.toLowerCase().includes('sg-') ||
        conn.deviceName.toLowerCase().includes('sg15') ||
        conn.deviceName.toLowerCase().includes('sg16') ||
        conn.deviceName.toLowerCase().includes('oculos') ||
        conn.deviceName.toLowerCase().includes('eyewear'))
  )

  // Setup HID listener when glasses are connected and config has SOS enabled
  useEffect(() => {
    if (!connectedGlassesDevice || !config?.sos_enabled) {
      if (cleanupHIDRef.current) {
        cleanupHIDRef.current()
        cleanupHIDRef.current = null
      }
      if (detectorRef.current) {
        detectorRef.current.destroy()
        detectorRef.current = null
      }
      setState((prev) => ({ ...prev, isHIDActive: false, connectedGlassesDeviceId: connectedGlassesDevice?.deviceId ?? prev.connectedGlassesDeviceId }))
      return
    }

    const deviceId = connectedGlassesDevice.deviceId
    setState((prev) => ({ ...prev, connectedGlassesDeviceId: deviceId, isConfigured: true }))

    const detector = new GlassesTapDetector(async (result) => {
      setState((prev) => ({
        ...prev,
        lastTapPattern: result.pattern,
        lastTapTime: result.timestamp,
        tapCount: prev.tapCount + 1,
      }))

      // Log the tap event
      try {
        await api.logGlassesTapEvent(userId!, deviceId, result.pattern, 'none')
      } catch {
        /* offline */
      }

      // Check if this pattern matches the configured SOS pattern
      const configuredPattern = config?.sos_tap_pattern || 'double'
      if (result.pattern === configuredPattern) {
        await handleGlassesSOS(deviceId)
      }
    })

    // Configure the detector with user's settings
    detector.applyConfig(config)

    // Start HID listener
    const cleanup = startGlassesHIDListener(detector)
    cleanupHIDRef.current = cleanup
    detectorRef.current = detector

    setState((prev) => ({ ...prev, isHIDActive: true }))

    return () => {
      cleanup()
      detector.destroy()
      detectorRef.current = null
      cleanupHIDRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedGlassesDevice?.deviceId, config?.sos_enabled, config?.sos_tap_pattern])

  // Handle SOS triggered from glasses
  const handleGlassesSOS = useCallback(
    async (deviceId: string) => {
      const lat = position?.latitude ?? 0
      const lng = position?.longitude ?? 0

      if (!config?.stealth_mode) {
        toast.warning('SOS activado via oculos!', { duration: 5000 })
      }

      // Log event via API directly (glasses_sos type not in useEmergency union)
      try {
        await api.logEvent(userId!, 'glasses_sos', `SOS activado via oculos inteligentes (toque: ${config?.sos_tap_pattern || 'duplo'})`, deviceId, lat, lng)
      } catch { /* offline */ }

      // Update tap event to 'sos'
      try {
        await api.logGlassesTapEvent(userId!, deviceId, config?.sos_tap_pattern || 'double', 'sos')
      } catch {
        /* offline */
      }

      // Auto-record audio if configured
      if (config?.auto_record_audio) {
        audioRecorder.reset()
        audioRecorder.startRecording()
      }

      // Trigger emergency
      try {
        await triggerEmergency({ latitude: lat, longitude: lng })
      } catch {
        queueEmergency(lat, lng)
      }
    },
    [config, position, triggerEmergency, queueEmergency, audioRecorder, userId]
  )

  // Stop recording and save evidence
  const stopAndSaveEvidence = useCallback(
    async (emergencyAlertId?: string) => {
      if (!audioRecorder.isRecording) return
      audioRecorder.stopRecording()

      // Wait a tick for blob to be set
      await new Promise((r) => setTimeout(r, 500))

      const b64 = await audioRecorder.getBase64()
      if (!b64 || !userId) return

      try {
        await api.saveAudioEvidence(userId, {
          emergency_alert_id: emergencyAlertId,
          device_id: state.connectedGlassesDeviceId || undefined,
          audio_data_b64: b64,
          duration_seconds: audioRecorder.duration,
          file_size_bytes: audioRecorder.blob?.size || 0,
          mime_type: audioRecorder.blob?.type || 'audio/webm',
        })
        try {
          await api.logEvent(userId!, 'audio_evidence', `Gravacao de audio salva (${audioRecorder.duration}s)`, state.connectedGlassesDeviceId || undefined)
        } catch { /* ok */ }
        if (!config?.stealth_mode) {
          toast.success('Gravacao de audio salva como evidencia')
        }
      } catch {
        queueEvent({
          type: 'audio_evidence',
          description: `Audio evidence: ${audioRecorder.duration}s`,
          deviceId: state.connectedGlassesDeviceId || undefined,
        })
      }
    },
    [audioRecorder, userId, state.connectedGlassesDeviceId, config?.stealth_mode, queueEvent]
  )

  const saveConfig = useCallback(
    (input: Partial<SmartGlassesConfig>) => {
      saveConfigMutation.mutate(input)
    },
    [saveConfigMutation]
  )

  // Get signal strength for connected glasses
  const glassesSignal = state.connectedGlassesDeviceId ? getSignalStrength(state.connectedGlassesDeviceId) : null
  const glassesBattery = connectedGlassesDevice?.batteryLevel ?? null
  const glassesName = connectedGlassesDevice?.deviceName ?? null

  return {
    config: config ?? null,
    configLoading,
    state,
    audioRecorder,
    connectedGlassesDevice,
    glassesSignal,
    glassesBattery,
    glassesName,
    handleGlassesSOS,
    stopAndSaveEvidence,
    saveConfig,
    isSavingConfig: saveConfigMutation.isPending,
    tapHistory: tapHistory as GlassesTapEvent[],
    audioEvidenceList,
  }
}
