/**
 * SyncStatusCard — Sincronização Web ↔ APK (v3.35.0).
 *
 * Mostra a conta (a MESMA na web e na APK, com o provider — email/Google),
 * o que já está na nuvem, o que foi empurrado nesta corrida e o que fica
 * no aparelho por desenho de privacidade. Botão "Sincronizar tudo" executa
 * o motor full-sync: eventos pendentes, locais conhecidos e registo Wi-Fi.
 */

import { useEffect, useState, useCallback } from 'react'
import { CloudUpload, Loader2, Mail, ShieldCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runFullSync, getLastFullSyncAt, formatLastSync, type FullSyncResult } from '@/lib/full-sync'
import { getSecurityEvents } from '@/lib/security-events'
import { toast } from 'sonner'

const PROVIDER_LABEL: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  apple: 'Apple',
}

export function SyncStatusCard() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<FullSyncResult | null>(null)
  const [pendentes, setPendentes] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(() => formatLastSync(getLastFullSyncAt()))

  const refreshPending = useCallback(() => {
    setPendentes(getSecurityEvents().filter((e) => !e.synced).length)
  }, [])

  useEffect(() => {
    refreshPending()
    const t = setInterval(() => {
      refreshPending()
      setLastSync(formatLastSync(getLastFullSyncAt()))
    }, 30_000)
    return () => clearInterval(t)
  }, [refreshPending])

  const syncNow = async () => {
    setSyncing(true)
    try {
      const r = await runFullSync()
      setResult(r)
      refreshPending()
      setLastSync(formatLastSync(getLastFullSyncAt()))
      if (r.account == null) {
        toast.error('Sem sessão — entre na conta para sincronizar')
      } else if (r.erros.length > 0) {
        toast.warning('Sincronização com falhas', { description: r.erros.join(' · ') })
      } else {
        toast.success('Tudo na nuvem', {
          description: `${r.pushed.eventos} eventos · ${r.pushed.locais} locais · ${r.pushed.wifi} redes Wi-Fi`,
        })
      }
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <CloudUpload className="h-4.5 w-4.5 text-brand shrink-0" />
        <div className="flex-1 min-w-[180px]">
          <p className="font-display font-semibold text-sm text-white">Sincronização Web ↔ APK</p>
          <p className="text-[11px] text-white/35">
            Web e APK partilham a mesma conta e os mesmos dados
          </p>
        </div>
        {result?.account && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand/25 bg-brand/10 text-brand/90">
            {PROVIDER_LABEL[result.account.provider] || result.account.provider}
          </span>
        )}
      </div>

      {lastSync && (
        <p className="text-[10.5px] text-white/45 -mt-2">
          Última sincronização: <span className="text-brand/80 font-medium">{lastSync}</span>
        </p>
      )}

      {result?.account && (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-brand/10 text-brand">
            {result.account.provider === 'email'
              ? <Mail className="h-4 w-4" />
              : <ShieldCheck className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-white truncate">{result.account.email}</p>
            <p className="text-[10px] text-white/35">conta activa — login {PROVIDER_LABEL[result.account.provider] || result.account.provider}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Sincronizados', value: (getSecurityEvents().length || 0) - pendentes, sub: 'na nuvem', hint: 'diário de segurança' },
          { label: 'Pendentes', value: pendentes, sub: 'por enviar', hint: 'empurrados ao sincronizar' },
          { label: 'Contactos', value: result?.cloud.contactos ?? '—', sub: 'na nuvem', hint: 'os mesmos na web e APK' },
          { label: 'Dispositivos', value: result?.cloud.dispositivos ?? '—', sub: 'na nuvem', hint: 'os mesmos na web e APK' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">{s.label}</p>
            <p className="text-[17px] font-bold text-white mt-0.5">{s.value}</p>
            <p className="text-[9px] text-white/30">{s.sub}</p>
          </div>
        ))}
      </div>

      {result && (result.pushed.eventos > 0 || result.pushed.locais > 0 || result.pushed.wifi > 0) && (
        <p className="text-[10.5px] text-brand/80 leading-snug">
          Enviado agora: {result.pushed.eventos} eventos · {result.pushed.locais} locais · {result.pushed.wifi} redes Wi-Fi
          {result.local.ble > 0 && ` · registo BLE (${result.local.ble}) e presenças ficam no aparelho por privacidade`}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing} className="h-8 border-white/10 bg-white/[0.03] text-white/70 rounded-lg text-[11px]">
          {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Sincronizar tudo
        </Button>
        <p className="text-[9.5px] text-white/25 leading-snug flex-1">
          Eventos, locais conhecidos e registo Wi-Fi · BLE/presenças nunca saem do aparelho
        </p>
      </div>
    </div>
  )
}
