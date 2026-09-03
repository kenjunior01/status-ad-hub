import { useState } from 'react'
import { Search, ShieldCheck, ShieldOff, Crown, User, Phone, Loader2, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAdminUsers, useUpdateUserPlan, useUpdateUserRole, type AdminUser } from '@/hooks/useAdmin'
import { formatDate, type PlanSlug } from '@/lib/payments'
import { cn } from '@/lib/utils'

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-white/[0.06] text-white/50 border-white/10',
  familia: 'bg-brand/10 text-brand border-brand/25',
  premium: 'bg-gradient-to-r from-brand to-brand-dark text-black border-0 font-bold',
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<AdminUser | null>(null)
  const { data: users = [], isLoading } = useAdminUsers(search)
  const updatePlan = useUpdateUserPlan()
  const updateRole = useUpdateUserRole()

  return (
    <div className="space-y-4">
      {/* Pesquisa */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <Input
            placeholder="Pesquisar por nome, email ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-10 rounded-xl"
          />
        </div>
        <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{users.length} utilizadores</Badge>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-white/25">
                <th className="px-5 py-3 font-semibold">Utilizador</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Contacto</th>
                <th className="px-4 py-3 font-semibold">Plano</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Desde</th>
                <th className="px-4 py-3 font-semibold text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={5} className="px-5 py-12 text-center"><Loader2 className="h-6 w-6 text-brand animate-spin mx-auto" /></td></tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-xs text-white/25">Nenhum utilizador encontrado.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => setDetail(u)} className="flex items-center gap-3 text-left">
                      <div className={cn(
                        'h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        u.role === 'admin' ? 'bg-gradient-to-br from-brand to-[#8C6D1F] text-black' : 'bg-white/[0.06] text-white/50',
                      )}>
                        {u.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white flex items-center gap-1.5 truncate">
                          {u.full_name || 'Sem nome'}
                          {u.role === 'admin' && <Crown className="h-3 w-3 text-brand shrink-0" />}
                        </p>
                        <p className="text-[10px] text-white/25 truncate max-w-[180px]">{u.email ?? u.user_id.slice(0, 8)}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-[11px] text-white/40 font-mono">{u.phone ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-[10px] capitalize', PLAN_BADGE[u.plan] ?? PLAN_BADGE.free)}>
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-[11px] text-white/30">{formatDate(u.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Select value={u.plan} onValueChange={(v: PlanSlug) => updatePlan.mutate({ userId: u.user_id, plan: v })}>
                        <SelectTrigger className="h-7 w-[92px] text-[10px] bg-white/[0.04] border-white/[0.08] text-white/70 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="free" className="text-xs">Grátis</SelectItem>
                          <SelectItem value="familia" className="text-xs">Família</SelectItem>
                          <SelectItem value="premium" className="text-xs">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" variant="ghost"
                        disabled={updateRole.isPending}
                        onClick={() => updateRole.mutate({ userId: u.user_id, role: u.role === 'admin' ? 'user' : 'admin' })}
                        className={cn('h-7 w-7 p-0 rounded-lg', u.role === 'admin' ? 'text-brand hover:bg-brand/10' : 'text-white/25 hover:text-white/60')}
                        title={u.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                      >
                        {u.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-card border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold',
                detail?.role === 'admin' ? 'bg-gradient-to-br from-brand to-[#8C6D1F] text-black' : 'bg-white/[0.06] text-white/50')}>
                {detail?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              {detail?.full_name}
            </DialogTitle>
            <DialogDescription className="text-white/35 text-xs">Detalhes da conta</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 mt-2">
            <Row icon={User} label="Email" value={detail?.email ?? '—'} />
            <Row icon={Phone} label="Telefone" value={detail?.phone ?? '—'} />
            <Row icon={Users} label="Registado" value={detail ? formatDate(detail.created_at) : '—'} />
            <Row icon={Crown} label="Papel" value={detail?.role === 'admin' ? 'Administrador' : 'Utilizador'} />
            <Row icon={ShieldCheck} label="Plano" value={detail?.plan ?? 'free'} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <span className="flex items-center gap-2 text-[11px] text-white/35"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="text-[12px] text-white/80 font-medium">{value}</span>
    </div>
  )
}
