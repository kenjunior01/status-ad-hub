/**
 * BellvionDevices — Dispositivos BELLVION do utilizador.
 *
 * Mostra:
 *  - Os códigos de activação que o próprio utilizador já usou (RLS: activated_by = auth.uid())
 *  - O estado dos alertas (emergência activa, alertas recentes)
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Package, KeyRound, Eye, EyeOff, Copy, CheckCircle2, ShieldAlert,
  Glasses, Watch, Headphones, Smartphone, Radio, Loader2, BellRing, EyeOff as Camo,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { cn } from '@/lib/utils'

interface ActivationCodeRow {
  id: string
  code: string
  device_type: string
  product_id: string | null
  used: boolean
  activated_at: string | null
  created_at: string
}

const BELLVION_MODELS: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  glasses: { name: 'BELLVION Glasses', icon: Glasses, color: '#D4AF37' },
  smart_glasses: { name: 'BELLVION Glasses', icon: Glasses, color: '#D4AF37' },
  watch: { name: 'BELLVION Watch', icon: Watch, color: '#3B82F6' },
  smartwatch: { name: 'BELLVION Watch', icon: Watch, color: '#3B82F6' },
  earbuds: { name: 'BELLVION Buds', icon: Headphones, color: '#F59E0B' },
  airpods: { name: 'BELLVION Buds', icon: Headphones, color: '#F59E0B' },
  tracker: { name: 'BELLVION Tracker', icon: Smartphone, color: '#EF4444' },
  other: { name: 'Dispositivo BELLVION', icon: Radio, color: '#94A3B8' },
}

function model(type: string) {
  return BELLVION_MODELS[type] ?? BELLVION_MODELS.other
}

function maskCode(code: string) {
  if (code.length <= 4) return '••••'
  return `${code.slice(0, 3)}${'•'.repeat(Math.max(3, code.length - 5))}${code.slice(-2)}`
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BellvionDevices() {
  const { user } = useAuth()
  const { activeEmergency, history } = useEmergencyAlerts() as {
    activeEmergency?: { id: string; status: string; created_at: string } | null
    history?: Array<{ id: string; status: string; created_at: string; resolve_reason?: string | null }>
  }
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  const codesQuery = useQuery({
    queryKey: ['bellvion-activation-codes', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<ActivationCodeRow[]> => {
      const { data, error } = await supabase
        .from('device_activation_codes')
        .select('id, code, device_type, product_id, used, activated_at, created_at')
        .eq('activated_by', user!.id)
        .order('activated_at', { ascending: false })
      if (error) throw error
      return (data || []) as ActivationCodeRow[]
    },
  })

  const codes = codesQuery.data ?? []
  const recentAlerts = useMemo(() => (history ?? []).slice(0, 6), [history])
  const alertsToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return (history ?? []).filter(a => new Date(a.created_at) >= start).length
  }, [history])

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Código copiado')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const alertStatus = activeEmergency?.status === 'active'
    ? { label: 'Emergência ACTIVA', className: 'bg-red-500/15 text-red-300 border-red-500/30' }
    : { label: 'Sem emergência activa', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' }

  return (
    <div className="min-h-screen space-y-6 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <Package className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Dispositivos BELLVION</h1>
          <p className="text-white/40 text-sm mt-0.5">Os seus códigos de activação e o estado dos alertas</p>
        </div>
      </motion.div>

      {/* Estado dos alertas */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <BellRing className="w-4 h-4 text-[#D4AF37]" />
          <h2 className="text-sm font-semibold text-white">Estado dos Alertas</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={cn('rounded-xl border px-3 py-3 text-xs font-semibold', alertStatus.className)}>
            {alertStatus.label}
            {activeEmergency?.status === 'active' && (
              <div className="text-[11px] font-normal opacity-70 mt-1">Desde {fmtDate(activeEmergency.created_at)}</div>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <div className="text-xl font-bold text-white">{alertsToday}</div>
            <div className="text-[11px] text-white/40">Alertas hoje</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <div className="text-xl font-bold text-white">{history?.length ?? 0}</div>
            <div className="text-[11px] text-white/40">Alertas registados</div>
          </div>
        </div>

        {recentAlerts.length > 0 && (
          <ul className="mt-4 space-y-2">
            {recentAlerts.map(a => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert className={cn('w-4 h-4 shrink-0', a.status === 'active' ? 'text-red-400' : a.status === 'false_alarm' ? 'text-amber-400' : 'text-emerald-400')} />
                  <span className="text-xs text-white/70 truncate">
                    {a.status === 'active' ? 'Emergência activa' : a.status === 'false_alarm' ? 'Falso alarme' : 'Resolvida'}
                    {a.resolve_reason ? ` — ${a.resolve_reason}` : ''}
                  </span>
                </div>
                <span className="text-[11px] text-white/30 shrink-0">{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {/* Códigos de activação */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-[#D4AF37]" />
          <h2 className="text-sm font-semibold text-white">Códigos de Activação Usados</h2>
        </div>
        <p className="text-[11px] text-white/35 mb-4">
          Só aparecem os códigos que a sua conta activou. Nenhum outro utilizador consegue vê-los.
        </p>

        {codesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-white/40 text-sm py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> A carregar códigos…
          </div>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
            <Package className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/50">Ainda não activou nenhum dispositivo BELLVION.</p>
            <Link to="/ativar" className="inline-block mt-3 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-black">
              Activar dispositivo
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {codes.map(c => {
              const m = model(c.device_type)
              const Icon = m.icon
              const isOpen = !!revealed[c.id]
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${m.color}1A`, border: `1px solid ${m.color}33` }}>
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                    <div className="font-mono text-xs text-white/60 tracking-wider">{isOpen ? c.code : maskCode(c.code)}</div>
                    <div className="text-[11px] text-white/30 mt-0.5">Activado em {fmtDate(c.activated_at ?? c.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setRevealed(p => ({ ...p, [c.id]: !p[c.id] }))}
                      className="p-2 rounded-lg hover:bg-white/[0.06] text-white/50"
                      aria-label={isOpen ? 'Ocultar código' : 'Mostrar código'}
                    >
                      {isOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copy(c.code)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/50" aria-label="Copiar código">
                      <Copy className="w-4 h-4" />
                    </button>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400/70" aria-label="Código usado" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>

      {/* Link para ajuda de camuflagem */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex items-center justify-between gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Camo className="w-5 h-5 text-purple-400 shrink-0" />
          <p className="text-xs text-purple-200/70">
            Quer saber como a camuflagem funciona quando a app está instalada como PWA?
          </p>
        </div>
        <Link to="/dashboard/camuflagem-pwa" className="shrink-0 rounded-xl bg-purple-500 px-4 py-2 text-xs font-bold text-white">
          Ver guia
        </Link>
      </motion.div>
    </div>
  )
}
