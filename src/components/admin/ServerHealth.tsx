import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ServerCog, CheckCircle2, XCircle, Loader2, FileWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ServerHealth — diagnóstico do servidor Supabase para o dono da plataforma.
 * Verifica se o schema consolidado (APLICAR-TUDO.sql) está aplicado e
 * indica exactamente o que falta — sem exigir acesso ao SQL Editor para
 * perceber o estado.
 */

type CheckState = 'pending' | 'ok' | 'fail' | 'checking'

interface Check {
  id: string
  label: string
  hint: string
  state: CheckState
}

const INITIAL: Check[] = [
  { id: 'plans', label: 'Planos e preços (tabela plans)', hint: 'Sem isto a app corre em modo demo com dados locais.', state: 'pending' },
  { id: 'role', label: 'Coluna de administração (profiles.role)', hint: 'Necessária para o painel admin real e para o código de activação.', state: 'pending' },
  { id: 'rpc_stats', label: 'Estatísticas do servidor (get_dashboard_stats)', hint: 'RPC que alimenta o painel com números reais.', state: 'pending' },
  { id: 'bucket', label: 'Nuvem de gravações (bucket evidence-audio)', hint: 'Guarda os áudios do Cofre como ficheiros privados.', state: 'pending' },
  { id: 'bellvion', label: 'Códigos de dispositivo BELLVION', hint: 'Verificação de hardware para o plano de 99 MT.', state: 'pending' },
  { id: 'promos', label: 'Promoções e segurança (migration 014)', hint: 'Códigos promocionais no checkout, gerador de códigos e auditoria.', state: 'pending' },
]

export function ServerHealth() {
  const [checks, setChecks] = useState<Check[]>(INITIAL)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    let alive = true
    const set = (id: string, state: CheckState) =>
      alive && setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, state } : c)))

    ;(async () => {
      // 1) plans
      set('plans', 'checking')
      const { error: plansErr } = await supabase.from('plans').select('id').limit(1)
      set('plans', plansErr ? 'fail' : 'ok')

      // 2) profiles.role
      set('role', 'checking')
      const { error: roleErr } = await supabase.from('profiles').select('role').limit(1)
      set('role', roleErr ? 'fail' : 'ok')

      // 3) RPC get_dashboard_stats
      set('rpc_stats', 'checking')
      const { error: rpcErr } = await supabase.rpc('get_dashboard_stats')
      set('rpc_stats', rpcErr ? 'fail' : 'ok')

      // 4) bucket evidence-audio
      set('bucket', 'checking')
      const { error: bucketErr } = await supabase.storage.from('evidence-audio').list('', { limit: 1 })
      set('bucket', bucketErr ? 'fail' : 'ok')

      // 5) device_activation_codes
      set('bellvion', 'checking')
      const { error: codesErr } = await supabase.from('device_activation_codes').select('code').limit(1)
      set('bellvion', codesErr ? 'fail' : 'ok')

      // 6) promo_codes (migration 014)
      set('promos', 'checking')
      const { error: promoErr } = await supabase.from('promo_codes').select('id').limit(1)
      set('promos', promoErr ? 'fail' : 'ok')

      if (alive) setRunning(false)
    })()

    return () => { alive = false }
  }, [])

  const fails = checks.filter((c) => c.state === 'fail').length

  if (!running && fails === 0) return null // tudo OK → não incomoda

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
          <ServerCog className="h-4.5 w-4.5 text-[#D4AF37]" />
        </div>
        <div>
          <p className="font-display font-bold text-sm">Saúde do Servidor</p>
          <p className="text-[11px] text-white/40">
            {running ? 'A verificar o Supabase…' : `${fails} componente(s) por activar — aplique o SQL consolidado no SQL Editor`}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <div key={c.id} className={cn(
            'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
            c.state === 'ok' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
          )}>
            {c.state === 'checking' || c.state === 'pending' ? (
              <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0 mt-0.5" />
            ) : c.state === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className={cn('text-[12px] font-medium', c.state === 'ok' ? 'text-emerald-300/90' : 'text-white/70')}>{c.label}</p>
              {c.state === 'fail' && (
                <p className="text-[10px] text-white/35 leading-relaxed mt-0.5">{c.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {fails > 0 && !running && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-3">
          <FileWarning className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Abrir o <span className="font-semibold">Supabase Dashboard → SQL Editor</span>, colar o ficheiro{' '}
            <span className="font-mono text-[#D4AF37]">supabase/APLICAR-TUDO.sql</span> (inclui a migration 013 com o
            código de administrador e o bucket de gravações) e executar uma única vez. A app sai do modo demo
            automaticamente.
          </p>
        </div>
      )}
    </div>
  )
}
