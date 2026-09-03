/**
 * useGuardian — ligação React ao estado do Modo Guardião (guardian.ts).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  GuardianConfig, loadGuardian, armGuardian, disarmGuardian, updateGuardian,
} from '@/lib/guardian'

export function useGuardian() {
  const [config, setConfig] = useState<GuardianConfig>(() => loadGuardian())

  useEffect(() => {
    const handler = (e: Event) => setConfig({ ...(e as CustomEvent<GuardianConfig>).detail })
    window.addEventListener('guardian-change', handler)
    // Sincronizar entre janelas/abas (PWA + dashboard)
    const storage = () => setConfig(loadGuardian())
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('guardian-change', handler)
      window.removeEventListener('storage', storage)
    }
  }, [])

  const arm = useCallback(
    (opts?: Partial<Pick<GuardianConfig, 'autoRecord' | 'silent' | 'shakeEnabled'>>) =>
      setConfig(armGuardian(opts)),
    []
  )
  const disarm = useCallback(() => setConfig(disarmGuardian()), [])
  const update = useCallback(
    (patch: Partial<Omit<GuardianConfig, 'armed' | 'armedAt'>>) => setConfig(updateGuardian(patch)),
    []
  )

  return { config, arm, disarm, update, armed: config.armed }
}
