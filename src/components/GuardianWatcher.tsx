/**
 * GuardianWatcher — cérebro invisível do Modo Guardião (montado no App.tsx).
 *
 * Escuta TODOS os gatilhos e liga-os à cadeia de pânico existente:
 *  · shake.ts            → agitação forte ×3            (web + nativo)
 *  · @capacitor/app      → com.statusads.connect://sos  (atalho no ícone / tile QS)
 *  · plugin nativo Panic → botão Power ×4 (ecrã apagado, nativo só)
 *
 * Regras de segurança:
 *  · Só dispara com o Guardião ARMADO e utilizador autenticado
 *  · Nunca interfere no modo coacção (FakeDashboard) nem num pânico activo
 */

import { useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePanicMode } from '@/hooks/usePanicMode'
import { useAntiCoercion } from '@/hooks/useAntiCoercion'
import { startShakeListener } from '@/lib/shake'
import {
  requestPanicCountdown, setPanicExecutor, isGuardianArmed, loadGuardian,
} from '@/lib/guardian'
import { SOURCE_LABEL } from '@/lib/guardian'

/** Plugin nativo PanicPlugin.java (Power ×4) — implementado só no Android */
interface PanicPluginInterface {
  addListener(
    eventName: 'panic',
    listenerFunc: (data: { source: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle
}

export function GuardianWatcher() {
  const { user } = useAuth()
  const { activate, state: panicState } = usePanicMode()
  const { isCoercionMode } = useAntiCoercion()
  const navigate = useNavigate()

  // Registar o executor da cadeia de pânico (guardian.ts → usePanicMode)
  useEffect(() => {
    setPanicExecutor((source, silent) => {
      activate({ silent, source: SOURCE_LABEL[source] })
    })
    return () => setPanicExecutor(null)
  }, [activate])

  // 1. Agitação forte ×3 — activo só com Guardião armado
  useEffect(() => {
    if (!user || isCoercionMode) return

    let stop: (() => void) | null = null

    // Liga/desliga o listener conforme o estado do Guardião (evento guardian-change)
    const restartIfArmed = () => {
      stop?.()
      stop = null
      if (isGuardianArmed() && loadGuardian().shakeEnabled) {
        stop = startShakeListener(() => {
          if (panicState.isActive || isCoercionMode) return
          requestPanicCountdown('shake')
        })
      }
    }
    restartIfArmed()
    window.addEventListener('guardian-change', restartIfArmed)
    return () => {
      window.removeEventListener('guardian-change', restartIfArmed)
      stop?.()
    }
  }, [user, isCoercionMode, panicState.isActive])

  // 2. Deep link SOS (atalho do ícone / tile dos atalhos rápidos)
  useEffect(() => {
    if (!user || isCoercionMode) return

    const handleUrl = (url: string | null | undefined) => {
      if (!url) return
      try {
        const u = url.toLowerCase()
        if (u.includes('://sos') || u.endsWith('://sos/') || u.includes('#/sos')) {
          if (!isGuardianArmed()) {
            navigate('/dashboard')
            return
          }
          requestPanicCountdown('shortcut')
        }
      } catch {
        // URL mal formado — ignorar
      }
    }

    let handle: PluginListenerHandle | null = null
    CapApp.addListener('appUrlOpen', (data) => handleUrl(data.url))
      .then((h) => { handle = h })
      .catch(() => {})

    // Arranque a frio (app fechada, aberta pelo atalho SOS)
    CapApp.getLaunchUrl().then((info) => handleUrl(info?.url)).catch(() => {})

    return () => { handle?.remove().catch(() => {}) }
  }, [user, isCoercionMode, navigate])

  // 3. Plugin nativo: botão Power ×4 com o ecrã apagado (Android)
  useEffect(() => {
    if (!user || isCoercionMode) return
    if (Capacitor.getPlatform() !== 'android') return

    let handle: PluginListenerHandle | null = null
    try {
      const Panic = registerPlugin<PanicPluginInterface>('Panic')
      Panic.addListener('panic', () => {
        if (!isGuardianArmed()) return
        if (panicState.isActive || isCoercionMode) return
        requestPanicCountdown('power')
      }).then((h) => { handle = h }).catch(() => {})
    } catch {
      // plugin não disponível — sem Power ×4 (comportamento web)
    }
    return () => { handle?.remove().catch(() => {}) }
  }, [user, isCoercionMode, panicState.isActive])

  return null
}
