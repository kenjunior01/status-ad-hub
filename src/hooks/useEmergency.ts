import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useEmergencyAlarm } from '@/hooks/useEmergencyAlarm'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { showEmergencyOfflineWarning } from '@/hooks/useNetworkStatus'
import { useContacts } from '@/hooks/useContacts'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { isPanicChainActive } from '@/hooks/usePanicMode'
import * as api from '@/lib/api'
import { sendEmergencyPush } from '@/lib/web-push'
import { supabase } from '@/lib/supabase'
import { isSilentPanic, readWitnessSnapshot } from '@/lib/guardian'
import { dispatchSosSms, buildSosSmsMessage, buildAudioSmsMessage, cacheContactPhones, getCachedContactPhones, mergePhones } from '@/lib/sos-sms'
import { sendLocalSms } from '@/lib/sms'
import { sendSmtpEmail, buildSosEmailSubject, buildSosEmailBody, buildAudioEmailBody, cacheContactEmails, getCachedContactEmails, mergeEmails, getEmailConfig } from '@/lib/email'
import { saveEvidenceRecording, resolveEvidenceSource } from '@/lib/evidence'
import { toast } from 'sonner'

/**
 * Notify emergency contacts via the notify-contacts edge function.
 * Sends SMS to all contacts and Web Push to the user's other devices.
 * Called after trigger_emergency RPC succeeds — APENAS como fallback
 * quando o SMS local (SIM do telefone) não está disponível (web/PWA ou
 * permissão negada). O SMS local é o primário desde a v3.11.0.
 */
async function notifyContactsViaEdgeFunction(
  userId: string,
  alertId: string,
  latitude: number,
  longitude: number,
  contactPhones: string[]
): Promise<{ sent: number; failed: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-contacts', {
      body: {
        userId,
        alertId,
        latitude,
        longitude,
        contactPhones,
      },
    })

    if (error) {
      console.warn('[EMERGENCY] notify-contacts edge function error:', error)
      return { sent: 0, failed: contactPhones.length }
    }

    return (data as any) || { sent: 0, failed: 0 }
  } catch {
    // Edge function not deployed yet — DB trigger may handle it
    console.warn('[EMERGENCY] notify-contacts not available, relying on DB trigger')
    return { sent: 0, failed: 0 }
  }
}

/** Nome amigável de quem pede socorro (user_metadata ou prefixo do email). */
function userNameForSos(user: { user_metadata?: Record<string, any>; email?: string } | null): string | null {
  if (!user) return null
  const meta = user.user_metadata || {}
  const name = (meta.name || meta.full_name || meta.display_name) as string | undefined
  if (name && name.trim()) return name.trim()
  if (user.email) return user.email.split('@')[0]
  return null
}

export function useEmergency() {
  const { user } = useAuth()
  const userId = user?.id
  const { notifyEmergency } = useNotifications()
  const { triggerAlarm, silenceAlarm, isSounding } = useEmergencyAlarm({
    duration: 20_000,
    volume: 0.7,
    vibrate: true,
  })
  const { queueEmergency, pendingCount: offlinePending, isSyncing: offlineSyncing } = useOfflineQueue()
  const { contacts: contactsData } = useContacts()
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3

  // ── v3.11.0: SOS Auto-Envio — gravação automática de áudio ──────────────
  // No SOS simples (fora do Modo Pânico) grava 120 s de áudio ambiente e
  // guarda no cofre de evidências; se subir para a nuvem, envia um SMS
  // de follow-up com o link assinado (2h) para os contactos notificados.
  const audio = useAudioRecorder(120)
  const autoRecordUntilRef = useRef(0)
  const audioSavedRef = useRef(true)
  const lastPhonesRef = useRef<string[]>([])
  const lastEmailsRef = useRef<string[]>([])
  const sosAtRef = useRef<Date | null>(null)

  const startAutoRecord = () => {
    if (isPanicChainActive()) return // o Modo Pânico já grava por conta própria
    if (Date.now() < autoRecordUntilRef.current) return // já a gravar nesta janela
    autoRecordUntilRef.current = Date.now() + 130_000
    audioSavedRef.current = false
    audio.startRecording().then((ok) => {
      if (!ok) audioSavedRef.current = true // sem microfone — não insiste
    }).catch(() => {
      audioSavedRef.current = true
    })
  }

  // Quando a gravação termina (auto-stop aos 120 s ou desmontagem),
  // guardar no cofre, avisar os contactos com o link do áudio por SMS e
  // enviar por EMAIL o ficheiro em anexo (SMTP do Google — v3.12.0).
  useEffect(() => {
    const blob = audio.blob
    if (!blob || audioSavedRef.current) return
    audioSavedRef.current = true
    ;(async () => {
      try {
        const duration = audio.duration || 0
        const dataUrl = await audio.getBase64()
        if (!dataUrl) return
        const res = await saveEvidenceRecording(dataUrl, duration)
        if (res.storagePath) {
          const signedUrl = await resolveEvidenceSource({ storage_path: res.storagePath })
          const phones = lastPhonesRef.current
          if (signedUrl && phones.length > 0) {
            // Fire & forget — o link do áudio é o "enviar as gravações" prometido
            sendLocalSms(phones, buildAudioSmsMessage(signedUrl)).catch(() => {})
          }
        }
        // EMAIL com o áudio EM ANEXO aos contactos com email (v3.12.0)
        const emails = lastEmailsRef.current
        if (emails.length > 0) {
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
          sendSmtpEmail(
            emails,
            'StatusAds: evidência de áudio da emergência',
            buildAudioEmailBody(duration, sosAtRef.current || undefined),
            [{ filename: 'sos-evidencia-audio.webm', mime: 'audio/webm', base64 }]
          ).catch(() => {})
        }
      } catch { /* evidência fica no fallback local (syncLocalEvidence apanha depois) */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.blob])

  const triggerMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      api.triggerEmergency(userId!, latitude, longitude),
    onSuccess: async (result, vars) => {
      const { alertId, contactsNotified } = result

      // 0. Contactos a avisar: RPC → cache local (última lista conhecida)
      const phones = contactsNotified.length > 0 ? contactsNotified : getCachedContactPhones()
      if (contactsNotified.length > 0) cacheContactPhones(contactsNotified)
      lastPhonesRef.current = phones
      sosAtRef.current = new Date()

      // 0b. Emails dos contactos (alert_enabled) → cache p/ follow-up do áudio
      const contactEmails = (contactsData || [])
        .filter((c) => c.alert_enabled !== false && (c.email || '').includes('@'))
        .map((c) => c.email as string)
      if (contactEmails.length > 0) cacheContactEmails(contactEmails)
      const emails = getEmailConfig()?.enabled ? mergeEmails(contactEmails, getCachedContactEmails()) : []
      lastEmailsRef.current = emails

      // 1. Sound the emergency alarm (siren + vibration) — EXCEPTO em pânico silencioso
      //    (Guardião em modo roubo: nada de sirene que entregue a vítima)
      if (!isSilentPanic()) triggerAlarm()

      // 2. Show success toast
      toast.success(`Emergencia activada! ${phones.length} contacto(s) vao receber o alerta.`, {
        duration: 8_000,
        action: {
          label: isSounding ? 'Silenciar' : 'Ver',
          onClick: () => {
            if (isSounding) silenceAlarm()
          },
        },
      })

      // 3. Snapshot de testemunhas lido UMA vez (nuvem + SMS partilham)
      const snapPromise = readWitnessSnapshot().catch(() => null)

      // 4. SMS LOCAL (v3.11.0) — sai pelo SIM do telefone, sem API externa,
      //    funciona MESMO SEM INTERNET. GPS + testemunhas BT/WiFi + áudio.
      let localSms = { sent: 0, failed: 0 }
      try {
        const snap = await snapPromise
        localSms = await dispatchSosSms(phones, buildSosSmsMessage({
          name: userNameForSos(user),
          lat: vars.latitude,
          lng: vars.longitude,
          witness: snap,
          recording: true,
        }))
        if (localSms.sent > 0) {
          toast.success(`SMS de emergencia enviado para ${localSms.sent} contacto(s)`, { duration: 5_000 })
        }
      } catch { /* SMS é best-effort — a emergência continua */ }

      // 4c. EMAIL SOS (v3.12.0) — SMTP do Google, corpo detalhado (GPS +
      //     testemunhas completas). O áudio segue em anexo quando a
      //     gravação terminar (ver efeito do useAudioRecorder).
      if (emails.length > 0) {
        snapPromise.then((snap) => {
          sendSmtpEmail(
            emails,
            buildSosEmailSubject({ name: userNameForSos(user) }),
            buildSosEmailBody({
              name: userNameForSos(user),
              lat: vars.latitude,
              lng: vars.longitude,
              witness: snap,
              recording: true,
              at: sosAtRef.current || undefined,
            })
          ).catch(() => {})
        })
      }

      // 4b. Fallback: edge function (gateway Twilio) — só se o SMS local
      //     não chegou a ninguém (web/PWA, permissão negada, sem SIM)
      if (localSms.sent === 0 && userId && contactsNotified.length > 0) {
        notifyContactsViaEdgeFunction(userId, alertId, vars.latitude, vars.longitude, contactsNotified).then(
          (smsResult) => {
            if (smsResult.sent > 0) {
              toast.success(`SMS enviado para ${smsResult.sent} contacto(s)`, { duration: 5_000 })
            }
          }
        ).catch(() => {
          // SMS failure is logged but not shown to user during emergency
        })
      }

      // 5. Send Web Push to user's own other devices
      if (userId) {
        sendEmergencyPush(userId, alertId, vars.latitude, vars.longitude).catch(() => {
          // Push failure is non-critical
        })
      }

      // 6. Local notification (foreground)
      notifyEmergency(
        'EMERGENCIA — StatusAds Connect',
        `Emergencia activada! GPS: ${vars.latitude.toFixed(4)}, ${vars.longitude.toFixed(4)}`,
        { alertId, latitude: vars.latitude, longitude: vars.longitude }
      )

      // 7. Anexar snapshot de testemunhas (BLE + WiFi, endereços em hash) ao
      //    alerta na nuvem — "quem estava perto" fica guardado para a
      //    investigação mesmo que o telemóvel seja perdido/destruído
      snapPromise.then((snap) => {
        if (snap && Array.isArray(snap.devices) && snap.devices.length > 0) {
          api.saveWitnessSnapshot(alertId, snap).catch(() => {})
        }
      })

      // 8. Gravação automática de áudio (evidência + SMS com link quando subir)
      startAutoRecord()
    },
    onError: async (error, vars) => {
      // Security enhancement: auto-retry with exponential backoff
      retryCountRef.current++
      const isNetworkError = error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'))
      const isSupabaseUnavailable = error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('net::ERR_')
      )

      // Always sound alarm for immediate user feedback regardless of error type
      if (!isSilentPanic()) triggerAlarm()

      if (retryCountRef.current < MAX_RETRIES && (isNetworkError || isSupabaseUnavailable)) {
        // Auto-retry with exponential backoff (2s, 4s, 8s)
        const delay = Math.pow(2, retryCountRef.current) * 1000
        toast.warning(`Tentativa ${retryCountRef.current}/${MAX_RETRIES} em ${delay / 1000}s...`, { duration: delay - 500 })
        setTimeout(() => {
          triggerMutation.mutate(vars)
        }, delay)
        return
      }

      if ((isNetworkError || isSupabaseUnavailable) && userId) {
        // All retries exhausted — queue for offline sync
        await queueEmergency(vars.latitude, vars.longitude)
        showEmergencyOfflineWarning()

        // v3.11.0: OFFLINE é quando o SMS local mais importa — sem internet,
        // o SIM é o único canal que sai do aparelho. Usa os contactos em cache.
        try {
          const offlinePhones = mergePhones(
            (contactsData || [])
              .filter((c) => c.alert_enabled !== false && (c.phone || '').length >= 7)
              .map((c) => c.phone),
            getCachedContactPhones()
          )
          if (offlinePhones.length > 0) {
            lastPhonesRef.current = offlinePhones
            const snap = await readWitnessSnapshot().catch(() => null)
            await dispatchSosSms(offlinePhones, buildSosSmsMessage({
              name: userNameForSos(user),
              lat: vars.latitude,
              lng: vars.longitude,
              witness: snap,
              recording: true,
            }))
          }
        } catch { /* best-effort */ }

        // Gravação de áudio também no caminho offline (evidência local,
        // sincronizada depois pelo Cofre)
        startAutoRecord()

        // Local notification with enriched metadata
        notifyEmergency(
          'EMERGENCIA (OFFLINE) — StatusAds Connect',
          `Sem conexao apos ${MAX_RETRIES} tentativas. Emergencia guardada localmente. GPS: ${vars.latitude.toFixed(4)}, ${vars.longitude.toFixed(4)}`,
          { latitude: vars.latitude, longitude: vars.longitude, queued: true, retries: MAX_RETRIES, timestamp: new Date().toISOString() }
        )
      } else {
        toast.error('Erro ao activar emergencia. Tente novamente.')
      }

      // Reset retry counter after final attempt
      retryCountRef.current = 0
    },
    onSettled: () => {
      // Reset retry counter on success too
      retryCountRef.current = 0
    },
  })

  const logMutation = useMutation({
    mutationFn: (params: {
      type: 'location' | 'alert' | 'shield' | 'bluetooth' | 'emergency' | 'geofence' | 'checkin'
      description: string
      deviceId?: string
      latitude?: number
      longitude?: number
    }) => api.logEvent(userId!, params.type, params.description, params.deviceId, params.latitude, params.longitude),
  })

  return {
    triggerEmergency: triggerMutation.mutate,
    isTriggering: triggerMutation.isPending,
    logEvent: logMutation.mutate,
    triggerAlarm,
    silenceAlarm,
    isSounding,
    offlinePending,
    offlineSyncing,
  }
}
