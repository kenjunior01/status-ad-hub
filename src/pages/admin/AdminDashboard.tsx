import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Users, CreditCard, CalendarClock, ShieldAlert, TrendingUp, TrendingDown,
  DollarSign, UserPlus, Activity, Loader2, ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminStats, useAdminPayments, useAdminEvents } from '@/hooks/useAdmin'
import { formatMzn, formatDateTime, METHOD_LABELS } from '@/lib/payments'
import { ServerHealth } from '@/components/admin/ServerHealth'
import { cn } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = { free: '#6B7280', familia: '#D4AF37', premium: '#8C6D1F' }
const METHOD_COLORS: Record<string, string> = {
  mpesa: '#E60000', emola: '#F59E0B', mkesh: '#3B82F6', paypal: '#0070BA', manual: '#6B7280',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useAdminStats()
  const { data: payments = [] } = useAdminPayments()
  const { data: events = [] } = useAdminEvents()

  if (isLoading || !stats) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 text-[#D4AF37] animate-spin" /></div>
  }

  // Receita dos últimos 14 dias (MZN)
  const chart = buildRevenueChart(payments)
  const recentPayments = payments.slice(0, 6)
  const activeEvents = events.filter((e) => e.status === 'active')

  return (
    <div className="space-y-5">
      {/* Diagnóstico do servidor (aparece quando falta aplicar SQL) */}
      <ServerHealth />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Utilizadores" value={String(stats.totalUsers)} sub={`${stats.newUsers7d} novos (7d)`} trend={stats.newUsers7d > 0 ? 'up' : 'flat'} />
        <Kpi icon={CalendarClock} label="Assinaturas activas" value={String(stats.activeSubs)} sub={`${Math.round((stats.activeSubs / Math.max(1, stats.totalUsers)) * 100)}% da base`} />
        <Kpi icon={DollarSign} label="Receita mensal (MRR)" value={formatMzn(stats.mrrMzn)} sub={`${formatMzn(stats.revenue30dMzn)} nos últimos 30d`} gold />
        <Kpi icon={CreditCard} label="Pagamentos hoje" value={String(stats.paymentsToday)} sub={`${stats.pendingPayments} pendentes`} alert={stats.pendingPayments > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Gráfico receita */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-white">Receita confirmada — últimos 14 dias</h3>
              <p className="text-[10px] text-white/30 mt-0.5">Valores em MZN (PayPal convertido a ~260 MT/$)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#14120D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)' }}
                  formatter={(v: number) => [`${v} MT`, 'Receita']}
                />
                <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuições */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="font-display font-semibold text-sm text-white mb-4">Planos dos utilizadores</h3>
            <div className="space-y-3">
              {Object.entries(stats.planBreakdown).map(([plan, count]) => {
                const pct = Math.round((count / Math.max(1, stats.totalUsers)) * 100)
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white/50 capitalize">{plan}</span>
                      <span className="text-white/70 font-semibold">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLAN_COLORS[plan] ?? '#D4AF37' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="font-display font-semibold text-sm text-white mb-4">Métodos de pagamento</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.methodBreakdown).length === 0 && (
                <p className="text-[11px] text-white/25">Sem pagamentos confirmados ainda.</p>
              )}
              {Object.entries(stats.methodBreakdown).map(([m, count]) => (
                <div key={m} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLORS[m] ?? '#D4AF37' }} />
                  <span className="text-[11px] text-white/50 flex-1">{METHOD_LABELS[m as keyof typeof METHOD_LABELS] ?? m}</span>
                  <span className="text-[11px] text-white/70 font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emergências activas */}
      {activeEvents.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500/15 flex items-center justify-center animate-pulse">
                <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-300">{activeEvents.length} emergência(s) activa(s)</p>
                <p className="text-[11px] text-red-400/50">Requer atenção imediata</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/dashboard/admin/eventos')} className="bg-red-500 hover:bg-red-600 text-white rounded-lg gap-1.5">
              Ver eventos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Pagamentos recentes */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-white">Pagamentos recentes</h3>
          <button onClick={() => navigate('/dashboard/admin/pagamentos')} className="text-[11px] text-[#D4AF37] hover:underline">Ver todos</button>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentPayments.length === 0 && <p className="px-5 py-8 text-center text-xs text-white/25">Sem pagamentos ainda.</p>}
          {recentPayments.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: METHOD_COLORS[p.method] ?? '#6B7280' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{METHOD_LABELS[p.method] ?? p.method} · <span className="font-mono text-white/40">{p.reference}</span></p>
                <p className="text-[10px] text-white/25">{formatDateTime(p.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">{p.currency === 'USD' ? `$${Number(p.amount).toFixed(2)}` : formatMzn(Number(p.amount))}</p>
                <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0',
                  p.status === 'confirmed' ? 'text-emerald-400 border-emerald-500/20' :
                  p.status === 'pending' ? 'text-amber-400 border-amber-500/20' : 'text-red-400 border-red-500/20')}>
                  {p.status === 'confirmed' ? 'Confirmado' : p.status === 'pending' ? 'Pendente' : p.status === 'failed' ? 'Falhou' : p.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, gold, alert, trend }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border p-4',
        gold ? 'border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.08] to-white/[0.02]' : 'border-white/[0.06] bg-white/[0.02]',
        alert && 'border-amber-500/25',
      )}>
      <div className="flex items-center justify-between mb-2.5">
        <Icon className={cn('h-4 w-4', gold ? 'text-[#D4AF37]' : 'text-white/40')} />
        {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
      </div>
      <p className={cn('font-display font-bold text-xl leading-none', gold ? 'text-[#D4AF37]' : 'text-white')}>{value}</p>
      <p className="text-[11px] text-white/50 mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </motion.div>
  )
}

function buildRevenueChart(payments: any[]) {
  const days: { label: string; value: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toDateString()
    const label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
    const value = payments
      .filter((p) => p.status === 'confirmed' && new Date(p.created_at).toDateString() === key)
      .reduce((acc, p) => acc + (p.currency === 'MZN' ? Number(p.amount) : Number(p.amount) * 260), 0)
    days.push({ label, value })
  }
  return days
}
