// ============================================================
// useBellvion — Dispositivos BELLVION activos pelo utilizador.
//
// Fontes (fundidas):
//  • REAL: tabela device_activation_codes (RLS activated_by = uid)
//    + RPCs verify_activation_code / redeem_activation_code
//    (migrations 008 + 20260903082415)
//  • DEMO/LOCAL: quando a tabela/RPC ainda não existem no Supabase
//    live, guarda em localStorage (statusads-bellvion-devices) para
//    que todo o fluxo funcione de imediato.
// ============================================================
import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { isBellvionName } from '@/lib/web-bluetooth'

const LOCAL_KEY = 'statusads-bellvion-devices'

export interface BellvionDevice {
  id: string
  code: string
  device_type: string
  activated_at: string
  source: 'remote' | 'local'
}

const EMPTY: BellvionDevice[] = []

function getLocalDevices(): BellvionDevice[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as BellvionDevice[]) : []
  } catch {
    return []
  }
}

function addLocalDevice(d: Omit<BellvionDevice, 'id' | 'source'>) {
  const cur = getLocalDevices()
  if (cur.some((x) => x.code === d.code)) return
  cur.unshift({ ...d, id: `local-${d.code}`, source: 'local' })
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cur.slice(0, 20)))
}

/** Erros que indicam "migration ainda não aplicada" → modo demo */
function isMissingBackend(errorMsg?: string): boolean {
  if (!errorMsg) return false
  return /PGRST202|PGRST205|404|schema cache|does not exist|Could not find the function/i.test(errorMsg)
}

export function useBellvion() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [verifying, setVerifying] = useState(false)

  const devicesQuery = useQuery<BellvionDevice[]>({
    queryKey: ['bellvion-devices', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      // Locais sempre presentes (funciona mesmo sem migration)
      const local = getLocalDevices()
      try {
        const { data, error } = await supabase
          .from('device_activation_codes')
          .select('id, code, device_type, activated_at')
          .eq('activated_by', user!.id)
          .order('activated_at', { ascending: false })
        if (error) throw error
        const remote: BellvionDevice[] = (data ?? []).map((r: any) => ({
          id: r.id, code: r.code, device_type: r.device_type,
          activated_at: r.activated_at ?? new Date().toISOString(), source: 'remote',
        }))
        // Fusão sem duplicados (código é único)
        const seen = new Set(remote.map((r) => r.code))
        return [...remote, ...local.filter((l) => !seen.has(l.code))]
      } catch {
        return local
      }
    },
  })

  const devices = devicesQuery.data ?? EMPTY
  const hasDevice = devices.length > 0

  const reload = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['bellvion-devices'] })
  }, [qc])

  /**
   * Verifica um código de activação do cartão/caixa do dispositivo.
   * REAL: RPC verify_activation_code → redeem_activation_code
   * DEMO: aceita qualquer código ≥ 6 caracteres e guarda localmente
   */
  const verifyByCode = useCallback(async (rawCode: string): Promise<{ ok: boolean; deviceType?: string; demo?: boolean; error?: string }> => {
    const code = rawCode.trim().toUpperCase()
    if (code.length < 6) {
      return { ok: false, error: 'O código deve ter pelo menos 6 caracteres (está impresso na caixa do dispositivo).' }
    }
    setVerifying(true)
    try {
      // 1) Verificar no backend (se existir)
      const { data: rows, error } = await supabase.rpc('verify_activation_code', { p_code: code })
      const row = Array.isArray(rows) ? rows[0] : rows

      if (!error && row) {
        // Código válido e não usado → resgatar
        const { error: redeemError } = await supabase.rpc('redeem_activation_code', { p_code: code })
        if (redeemError) {
          return { ok: false, error: redeemError.message === 'Invalid or already used code'
            ? 'Este código já foi usado por outra conta.'
            : `Erro ao activar: ${redeemError.message}` }
        }
        addLocalDevice({ code, device_type: (row as any).device_type ?? 'other', activated_at: new Date().toISOString() })
        reload()
        return { ok: true, deviceType: (row as any).device_type, demo: false }
      }

      if (error && !isMissingBackend(error.message)) {
        // Backend existe mas rejeitou (código inválido/usado)
        return { ok: false, error: /used/i.test(error.message)
          ? 'Este código já foi usado.'
          : 'Código inválido — verifique na caixa do dispositivo BELLVION.' }
      }

      // 2) Migration ainda não aplicada → modo demo (aceita código demo)
      //    Códigos de demonstração: BELLVION-DEMO, BVL-DEMO2026, ou ≥6 chars
      if (isMissingBackend(error?.message)) {
        addLocalDevice({ code, device_type: 'other', activated_at: new Date().toISOString() })
        reload()
        return { ok: true, deviceType: 'other', demo: true }
      }

      return { ok: false, error: 'Código inválido — verifique na caixa do dispositivo BELLVION.' }
    } finally {
      setVerifying(false)
    }
  }, [reload])

  /** Marca um dispositivo BLE descoberto como oficial? (por nome) */
  const isOfficial = useCallback((name: string | null) => isBellvionName(name), [])

  return useMemo(() => ({
    devices,
    hasDevice,
    loading: devicesQuery.isLoading,
    verifying,
    verifyByCode,
    reload,
    isOfficial,
  }), [devices, hasDevice, devicesQuery.isLoading, verifying, verifyByCode, reload, isOfficial])
}
