import { useState } from 'react'
import { CalendarClock, Loader2, Plus, RefreshCw, Ban, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminSubscriptions, useExtendSubscription } from '@/hooks/useAdmin'
import { supabase } from '@/lib/supabase'
import { formatMzn, formatDate } from '@/lib/payments'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-white/[0.06] text-white/40 border-white/10',
  expired: 'bg-red-500/10 text-red-400 border-red-500/20',
  past_due: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Activa', trial: 'Teste', cancelled: 'Cancelada', expired: 'Expirada', past_due: 'Atrasada',
}

export default function AdminSubscriptions() {
  const { data: subs = [], isLoading } = useAdminSubscriptions()
  const extend = useExtendSubscription()
  const [busyId, setBusyId] = useState<string | null>(null)

  const active = subs.filter((s) => s.status === 'active')
  const expiring7d = active.filter((s) => s.expires_at && new Date(s.expires_at).getTime() - Date.now() < 7 * 86400000)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Assinaturas activas</p>
          <p className="font-display font-bold text-xl text-white mt-1">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Expiram em 7 dias</p>
          <p className="font-display font-bold text-xl text-amber-400 mt-1">{expiring7d.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total histórico</p>
          <p className="font-display font-bold text-xl text-white mt-1">{subs.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {isLoading && <div className="py-14 text-center"><Loader2 className="h-6 w-6 text-[#D4AF37] animate-spin mx-auto" /></div>}
          {!isLoading && subs.length === 0 && (
            <div className="py-14 text-center">
              <CalendarClock className="h-7 w-7 text-white/10 mx-auto mb-2.5" />
              <p className="text-xs text-white/25">Nenhuma assinatura registada. Executa a migration 009 e a activação é automática após confirmação de pagamento.</p>
            </div>
          )}
          {subs.map((s) => {
            const daysLeft = s.expires_at ? Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000) : null
            return (
              <div key={s.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.015] transition-colors flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-white">{s.user_name ?? 'Utilizador'}</p>
                    <Badge variant="outline" className={cn('text-[9px]', STATUS_BADGE[s.status])}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] text-[#D4AF37] border-[#D4AF37]/25 capitalize">{(s as any).plan_slug ?? (s as any).plans?.slug ?? '—'}</Badge>
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    {formatDate(s.starts_at)} → {formatDate(s.expires_at)}
                    {s.provider ? ` · via ${s.provider}` : ''} · {s.auto_renew ? 'renovação auto' : 'sem renovação'}
                  </p>
                </div>
                {daysLeft !== null && (
                  <span className={cn('text-[11px] font-semibold',
                    daysLeft <= 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-white/40')}>
                    {daysLeft <= 0 ? 'expirada' : `${daysLeft}d restantes`}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={busyId === s.id}
                    onClick={() => {
                      setBusyId(s.id)
                      extend.mutate({ id: s.id, days: 30 }, {
                        onSuccess: () => { toast.success('Assinatura estendida +30 dias'); setBusyId(null) },
                        onError: () => { toast.error('Erro ao estender'); setBusyId(null) },
                      })
                    }}
                    className="h-7 px-2 text-[10px] text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg gap-1">
                    {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 30d
                  </Button>
                  {s.status === 'active' && (
                    <Button size="sm" variant="ghost" disabled={busyId === s.id}
                      onClick={async () => {
                        setBusyId(s.id)
                        const { error } = await supabase.from('subscriptions')
                          .update({ status: 'cancelled', auto_renew: false }).eq('id', s.id)
                        if (error) toast.error('Erro ao cancelar')
                        else toast.success('Assinatura cancelada')
                        setBusyId(null)
                      }}
                      className="h-7 px-2 text-[10px] text-white/30 hover:bg-white/[0.06] rounded-lg gap-1">
                      <Ban className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  )}
                  {s.status !== 'active' && (
                    <Button size="sm" variant="ghost" disabled={busyId === s.id}
                      onClick={() => {
                        setBusyId(s.id)
                        extend.mutate({ id: s.id, days: 31 }, {
                          onSuccess: () => { toast.success('Assinatura reactivada'); setBusyId(null) },
                          onError: () => { toast.error('Erro'); setBusyId(null) },
                        })
                      }}
                      className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Reactivar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
