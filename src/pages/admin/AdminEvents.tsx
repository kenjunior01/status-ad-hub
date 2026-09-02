import { Loader2, ShieldAlert, CheckCircle2, Circle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminEvents, useResolveEvent } from '@/hooks/useAdmin'
import { formatDateTime } from '@/lib/payments'
import { cn } from '@/lib/utils'

export default function AdminEvents() {
  const { data: events = [], isLoading } = useAdminEvents()
  const resolve = useResolveEvent()

  const active = events.filter((e) => e.status === 'active')
  const history = events.filter((e) => e.status !== 'active')

  return (
    <div className="space-y-4">
      {/* Activas */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-red-500/15 flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
          <p className="font-display font-semibold text-sm text-red-300">Emergências activas</p>
          <Badge variant="outline" className="ml-auto text-[10px] text-red-400 border-red-500/25">{active.length}</Badge>
        </div>
        <div className="divide-y divide-red-500/10">
          {isLoading && <div className="py-10 text-center"><Loader2 className="h-5 w-5 text-red-400 animate-spin mx-auto" /></div>}
          {!isLoading && active.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-white/25">Nenhuma emergência activa. Tudo tranquilo.</p>
          )}
          {active.map((e) => (
            <div key={e.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="flex-1 min-w-[180px]">
                <p className="text-[13px] font-semibold text-white">{e.user_name ?? 'Utilizador'}</p>
                <p className="text-[10px] text-white/30">{e.trigger ?? 'SOS'} · {formatDateTime(e.created_at)}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: e.id, status: 'resolved' })}
                  className="h-7 px-2.5 text-[10px] bg-red-500 hover:bg-red-600 text-white rounded-lg gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                </Button>
                <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: e.id, status: 'false_alarm' })}
                  className="h-7 px-2.5 text-[10px] text-white/40 hover:bg-white/[0.06] rounded-lg gap-1">
                  Falso alarme
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.05]">
          <p className="font-display font-semibold text-sm text-white">Histórico de eventos</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {history.length === 0 && !isLoading && (
            <p className="px-5 py-8 text-center text-xs text-white/25">Sem histórico ainda.</p>
          )}
          {history.map((e) => (
            <div key={e.id} className="px-5 py-3 flex items-center gap-3">
              <Circle className={cn('h-2.5 w-2.5 shrink-0', e.status === 'resolved' ? 'fill-emerald-500 text-emerald-500' : 'fill-white/20 text-white/20')} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white">{e.user_name ?? 'Utilizador'} <span className="text-white/25 font-normal">· {e.trigger ?? 'SOS'}</span></p>
                <p className="text-[10px] text-white/20 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {formatDateTime(e.created_at)}</p>
              </div>
              <Badge variant="outline" className={cn('text-[9px]',
                e.status === 'resolved' ? 'text-emerald-400 border-emerald-500/20' : 'text-white/30 border-white/10')}>
                {e.status === 'resolved' ? 'Resolvido' : e.status === 'false_alarm' ? 'Falso alarme' : e.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
