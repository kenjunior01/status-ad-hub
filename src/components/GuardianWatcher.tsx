/**
 * GuardianWatcher — cérebro invisível do Modo Guardião (montado no App.tsx).
 *
 * Escuta TODOS os gatilhos e liga-os à cadeia de pânico existente:
 *  · shake.ts            → agitação forte ×3            (app aberta)
 *  · @capacitor/app      → com.statusads.connect://sos  (atalho / tile / sentinela
 *    nativa 24/7: Power ×4 e agitação com a app FECHADA — v3.8.0)
 *
 * A origem do gatilho vem no deep link (?t=power|shake); os disparos nativos
 * com a app viva também chegam por aqui (a MainActivity é singleTask →
 * onNewIntent → appUrlOpen).
 *
 * A notificação "Protecção activa" abre ://guardiao → só navega, sem contagem.
 *
 * Regras de segurança:
 *  · Só dispara com o Guardião ARMADO e utilizador autenticado
 *  · Nunca interfere no modo coacção (FakeDashboard) nem num pânico activo
 */

import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePanicMode } from '@/hooks/usePanicMode'
import { useAntiCoercion } from '@/hooks/useAntiCoercion'
import { startShakeListener } from '@/lib/shake'
import {
  requestPanicCountdown, setPanicExecutor, isGuardianArmed, loadGuardian,
  PanicSource,
} from '@/lib/guardian'
import { SOURCE_LABEL } from '@/lib/guardian'

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

  // 2. Deep link SOS — atalho do ícone, tile dos atalhos rápidos OU sentinela
  //    nativa 24/7 (Power ×4 / agitação com a app fechada)
  useEffect(() => {
    if (!user || isCoercionMode) return

    const handleUrl = (url: string | null | undefined) => {
      if (!url) return
      try {
        const u = url.toLowerCase()
        // Notificação "Protecção activa" → só abrir a app, sem contagem
        if (u.includes('://guardiao')) {
          navigate('/dashboard')
          return
        }
        if (u.includes('://sos') || u.endsWith('://sos/') || u.includes('#/sos')) {
          if (!isGuardianArmed()) {
            navigate('/dashboard')
            return
          }
          // Origem enviada pela sentinela nativa (contagens diferentes)
          let source: PanicSource = 'shortcut'
          if (u.includes('t=power')) source = 'power'
          else if (u.includes('t=shake')) source = 'shake'
          else if (u.includes('t=btdrop')) source = 'btdrop'
          requestPanicCountdown(source)
        }
      } catch {
        // URL mal formado — ignorar
      }
    }

    let handle: { remove: () => Promise<void> } | null = null
    CapApp.addListener('appUrlOpen', (data) => handleUrl(data.url))
      .then((h) => { handle = h })
      .catch(() => {})

    // Arranque a frio (app fechada, aberta pelo atalho/sentinela SOS)
    CapApp.getLaunchUrl().then((info) => handleUrl(info?.url)).catch(() => {})

    return () => { handle?.remove().catch(() => {}) }
  }, [user, isCoercionMode, navigate])

  return null
}
