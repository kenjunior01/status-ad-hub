/**
 * useNightSafety — Modo de Segurança Nocturno.
 * 
 * Activa automaticamente funcionalidades aumentadas durante a noite:
 * - Voice SOS automático
 * - GPS de alta frequência
 * - Detecção de ameaças
 * - Diminuir brilho do ecrã
 * - Alertas silenciosos (apenas vibração)
 * - Dead Man's Switch automático
 * - Modo discreto automático
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVoiceSOS } from '@/hooks/useVoiceSOS'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useDeadMansSwitch } from '@/hooks/useDeadMansSwitch'
import type { NightSafetyConfig } from '@/lib/types'

interface NightSafetyContextValue {
  isNightMode: boolean
  config: NightSafetyConfig | null
  updateConfig: (cfg: Partial<NightSafetyConfig>) => void
  enable: () => void
  disable: () => void
}

const defaultNightConfig: NightSafetyConfig = {
  id: '', user_id: '', enabled: false,
  activate_at: '20:00', deactivate_at: '06:00',
  auto_voice_sos: true, high_frequency_gps: true,
  auto_threat_detection: true, dim_screen: true,
  silent_alerts: true, auto_dead_mans_switch: true,
  auto_discreet_mode: false, created_at: '', updated_at: '',
}

const NightSafetyContext = createContext<NightSafetyContextValue>({
  isNightMode: false, config: null, updateConfig: () => {}, enable: () => {}, disable: () => {},
})

export function NightSafetyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { startListening, stopListening } = useVoiceSOS()
  const { activate: activateDiscreet } = useDiscreetMode()
  const { enable: enableDMS } = useDeadMansSwitch()
  const [isNightMode, setIsNightMode] = useState(false)
  const [config, setConfig] = useState<NightSafetyConfig | null>(null)

  // Load config
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(`night-safety-${user.id}`)
    if (saved) {
      try { setConfig({ ...defaultNightConfig, ...JSON.parse(saved), user_id: user.id }) } catch {}
    } else {
      const fresh = { ...defaultNightConfig, user_id: user.id }
      setConfig(fresh)
      localStorage.setItem(`night-safety-${user.id}`, JSON.stringify(fresh))
    }
  }, [user?.id])

  // Check if current time is within night window
  useEffect(() => {
    if (!config?.enabled) { setIsNightMode(false); return }
    const check = () => {
      if (!config?.activate_at || !config?.deactivate_at) return
      const now = new Date()
      const [sh, sm] = config.activate_at.split(':').map(Number)
      const [eh, em] = config.deactivate_at.split(':').map(Number)
      const startMins = sh * 60 + sm
      const endMins = eh * 60 + em
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const inWindow = startMins < endMins
        ? nowMins >= startMins && nowMins <= endMins
        : nowMins >= startMins || nowMins <= endMins
      setIsNightMode(inWindow)
    }
    check()
    const t = setInterval(check, 60_000) // Check every minute
    return () => clearInterval(t)
  }, [config?.enabled, config?.activate_at, config?.deactivate_at])

  // Auto-activate features when night mode kicks in
  useEffect(() => {
    if (!isNightMode || !config) return

    if (config.auto_voice_sos) startListening()
    if (config.auto_dead_mans_switch) enableDMS(20) // 20 min timeout at night
    if (config.auto_discreet_mode) activateDiscreet()
    if (config.dim_screen) {
      // Reduce screen brightness via CSS filter
      document.documentElement.style.filter = 'brightness(0.7)'
    }

    return () => {
      if (config.auto_voice_sos) stopListening()
      document.documentElement.style.filter = ''
    }
  }, [isNightMode, config])

  const saveConfig = useCallback((cfg: Partial<NightSafetyConfig>) => {
    if (!user) return
    const current = config || { ...defaultNightConfig, user_id: user.id }
    const updated = { ...current, ...cfg, updated_at: new Date().toISOString() }
    setConfig(updated)
    localStorage.setItem(`night-safety-${user.id}`, JSON.stringify(updated))
  }, [user, config])

  const enable = useCallback(() => saveConfig({ enabled: true }), [saveConfig])
  const disable = useCallback(() => { saveConfig({ enabled: false }); setIsNightMode(false) }, [saveConfig])

  return (
    <NightSafetyContext.Provider value={{ isNightMode, config, updateConfig: saveConfig, enable, disable }}>
      {children}
    </NightSafetyContext.Provider>
  )
}

export function useNightSafety() { return useContext(NightSafetyContext) }
