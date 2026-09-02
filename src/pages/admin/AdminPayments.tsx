import { useState } from 'react'
import { Search, CheckCircle2, XCircle, RotateCcw, Loader2, Download, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminPayments, useUpdatePaymentStatus } from '@/hooks/useAdmin'
import { formatMzn, formatDateTime, METHOD_LABELS, type Payment } from '@/lib/payments'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-white/[0.06] text-white/40 border-white/10',
  refunded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado', pending: 'Pendente', processing: 'A processar',
  failed: 'Falhou', cancelled: 'Cancelado', refunded: 'Reembolsado',
}

export default function AdminPayments() {
  const [status, setStatus] = useState<string>('all')
  const [method, setMethod] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { data: payments = [], isLoading } = useAdminPayments({
    status: status === 'all' ? undefined : status,
    method: method === 'all' ? undefined : method,
  })
  const updateStatus = useUpdatePaymentStatus()

  const filtered = payments.filter((p) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return p.reference.toLowerCase().includes(s) || (p.phone ?? '').includes(s)
  })

  const confirmed = payments.filter((p) => p.status === 'confirmed')
  const totalMzn = confirmed.reduce((a, p) => a + (p.currency === 'MZN' ? Number(p.amount) : 0), 0)
  const pending = payments.filter((p) => p.status === 'pending').length

  function exportCsv() {
    const header = 'referencia,data,metodo,valor,moeda,telefone,plano,estado\n'
    const rows = filtered.map((p) => [
      p.reference,
      new Date(p.created_at).toISOString(),
      p.method,
      p.amount,
      p.currency,
      p.phone ?? '',
      p.plan_slug ?? '',
      p.status,
    ].join(',')).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statusads-pagamentos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado')
  }

  return (
    <div className="space-y-4">
      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.05] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total confirmado</p>
          <p className="font-display font-bold text-xl text-[#D4AF37] mt-1">{formatMzn(totalMzn)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Transacções</p>
          <p className="font-display font-bold text-xl text-white mt-1">{payments.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Pendentes</p>
          <p className="font-display font-bold text-xl text-amber-400 mt-1">{pending}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <Input
            placeholder="Referência ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-9 rounded-xl"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[130px] h-9 text-xs bg-white/[0.04] border-white/[0.08] text-white/70 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#14120D] border-white/10 text-white">
            <SelectItem value="all" className="text-xs">Todos estados</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[110px] h-9 text-xs bg-white/[0.04] border-white/[0.08] text-white/70 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#14120D] border-white/10 text-white">
            <SelectItem value="all" className="text-xs">Todos métodos</SelectItem>
            {Object.entries(METHOD_LABELS).filter(([k]) => k !== 'manual').map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportCsv} className="h-9 border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] rounded-xl gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {isLoading && <div className="py-14 text-center"><Loader2 className="h-6 w-6 text-[#D4AF37] animate-spin mx-auto" /></div>}
          {!isLoading && filtered.length === 0 && (
            <div className="py-14 text-center">
              <Wallet className="h-7 w-7 text-white/10 mx-auto mb-2.5" />
              <p className="text-xs text-white/25">Nenhum pagamento encontrado.</p>
            </div>
          )}
          {filtered.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              busy={updateStatus.isPending}
              onConfirm={() => updateStatus.mutate({ id: p.id, status: 'confirmed' })}
              onFail={() => updateStatus.mutate({ id: p.id, status: 'failed' })}
              onRefund={() => updateStatus.mutate({ id: p.id, status: 'refunded' })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PaymentRow({ payment: p, busy, onConfirm, onFail, onRefund }: {
  payment: Payment
  busy: boolean
  onConfirm: () => void
  onFail: () => void
  onRefund: () => void
}) {
  return (
    <div className="px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.015] transition-colors flex-wrap">
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-white font-mono">{p.reference}</p>
          <Badge variant="outline" className={cn('text-[9px]', STATUS_BADGE[p.status])}>
            {STATUS_LABEL[p.status] ?? p.status}
          </Badge>
          {p.note === 'demo' && <Badge variant="outline" className="text-[8px] text-amber-400/70 border-amber-500/20">demo</Badge>}
        </div>
        <p className="text-[10px] text-white/25 mt-0.5">
          {METHOD_LABELS[p.method] ?? p.method}
          {p.phone ? ` · ${p.phone}` : ''} · {formatDateTime(p.created_at)}
          {p.plan_slug ? ` · plano ${p.plan_slug}` : ''}
        </p>
      </div>
      <p className="text-[13px] font-bold text-white">
        {p.currency === 'USD' ? `$${Number(p.amount).toFixed(2)}` : formatMzn(Number(p.amount))}
      </p>
      <div className="flex items-center gap-1">
        {p.status !== 'confirmed' && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onConfirm}
            className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
          </Button>
        )}
        {p.status !== 'failed' && p.status !== 'confirmed' && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onFail}
            className="h-7 px-2 text-[10px] text-red-400 hover:bg-red-500/10 rounded-lg gap-1">
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        )}
        {p.status === 'confirmed' && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRefund}
            className="h-7 px-2 text-[10px] text-white/40 hover:bg-white/[0.06] rounded-lg gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Reembolsar
          </Button>
        )}
      </div>
    </div>
  )
}
