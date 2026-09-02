import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Smartphone, Wallet, Landmark, Globe, ArrowLeft, CheckCircle2, Loader2,
  ShieldCheck, Clock, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  startCheckout, formatMzn, isValidMzPhone, normalizeMzPhone,
  METHOD_LABELS, type Plan, type PaymentMethod, type Payment, type CheckoutResult,
} from '@/lib/payments'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  plan: Plan | null
  onSuccess?: (payment: Payment) => void
}

const METHODS: { id: PaymentMethod; label: string; desc: string; icon: typeof Smartphone; color: string }[] = [
  { id: 'mpesa', label: 'M-Pesa', desc: 'Vodacom · confirma no telefone', icon: Smartphone, color: '#E60000' },
  { id: 'emola', label: 'e-Mola', desc: 'Movitel · confirma no telefone', icon: Wallet, color: '#F59E0B' },
  { id: 'mkesh', label: 'mKesh', desc: 'Tmcel · confirma no telefone', icon: Landmark, color: '#3B82F6' },
  { id: 'paypal', label: 'PayPal', desc: 'Internacional · paga em USD', icon: Globe, color: '#0070BA' },
]

type Stage = 'method' | 'phone' | 'processing' | 'success'

export function CheckoutDialog({ open, onOpenChange, plan, onSuccess }: Props) {
  const [stage, setStage] = useState<Stage>('method')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStage('method'); setMethod(null); setPhone('')
      setResult(null); setPayment(null); setError(null); setSubmitting(false)
    }
  }, [open])

  const amount = useMemo(() => {
    if (!plan) return { value: 0, label: '' }
    if (method === 'paypal') return { value: plan.price_usd, label: `$${plan.price_usd.toFixed(2)} USD` }
    return { value: plan.price_mzn, label: formatMzn(plan.price_mzn) }
  }, [plan, method])

  async function submit() {
    if (!plan || !method) return
    if (method !== 'paypal' && !isValidMzPhone(phone)) {
      toast.error('Número inválido', { description: 'Use 9 dígitos, ex: 84xxxxxxx (Vodacom, Movitel ou Tmcel)' })
      return
    }
    setSubmitting(true); setError(null); setStage('processing')
    try {
      const r = await startCheckout({ plan, method, phone: normalizeMzPhone(phone) })
      setResult(r)
      setPayment(r.payment ?? null)
      if (r.mode === 'paypal' && r.approve_url) {
        window.location.href = r.approve_url
        return
      }
      if (r.mode === 'demo') {
        // No demo a confirmação chega automaticamente (~8s, simulada pela lib)
        setTimeout(() => {
          setPayment((p) => p ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() } : p)
          setStage('success')
          onSuccess?.({ ...payment, status: 'confirmed' } as Payment)
        }, 9500)
      } else {
        // Modo real: fica à espera da confirmação do provider (poll do pai)
        setStage('processing')
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar pagamento')
      setStage('phone')
    } finally {
      setSubmitting(false)
    }
  }

  if (!plan) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#14120D] border-white/10 text-white max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
              Assinar {plan.name}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              Pagamento mensal · cancele quando quiser
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
            <span className="text-xs text-white/50">Total por mês</span>
            <span className="font-display font-bold text-[#D4AF37] text-base">
              {method ? amount.label : formatMzn(plan.price_mzn)}
            </span>
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* ── Passo 1: método ── */}
        {stage === 'method' && (
          <div className="px-6 py-5 space-y-2.5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Escolha o método de pagamento</p>
            {METHODS.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); m.id === 'paypal' ? submit() : setStage('phone') }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-[#D4AF37]/[0.06] hover:border-[#D4AF37]/30 transition-all text-left group"
                >
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}1A`, border: `1px solid ${m.color}33` }}>
                    <Icon className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{m.label}</p>
                    <p className="text-[11px] text-white/35">{m.desc}</p>
                  </div>
                  {m.id === 'paypal' && (
                    <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">
                      {`$${plan.price_usd.toFixed(2)}`}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Passo 2: telefone ── */}
        {stage === 'phone' && method && (
          <div className="px-6 py-5 space-y-4">
            <button onClick={() => setStage('method')} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#D4AF37] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Trocar método
            </button>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-sm font-semibold text-white">{METHOD_LABELS[method]}</div>
              <div className="flex-1" />
              <div className="text-sm font-bold text-[#D4AF37]">{amount.label}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Número do telefone (o prompt chega aqui)</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 font-mono">+258</span>
                <Input
                  autoFocus
                  inputMode="tel"
                  placeholder="84xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className="bg-white/[0.05] border-white/[0.08] text-white font-mono placeholder:text-white/20 flex-1"
                />
              </div>
              <p className="text-[11px] text-white/25">82–87 (Vodacom, Movitel, Tmcel)</p>
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full h-11 bg-[#D4AF37] hover:bg-[#B8962E] text-black font-semibold rounded-xl gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Pagar {amount.label}
            </Button>
          </div>
        )}

        {/* ── Passo 3: a processar ── */}
        {stage === 'processing' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin" strokeWidth={1.5} />
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 blur-xl" />
            </div>
            <div className="space-y-1.5">
              <p className="font-display font-semibold text-white">A processar pagamento…</p>
              <p className="text-xs text-white/40 max-w-[280px]">
                {result?.mode === 'demo'
                  ? 'Modo demonstração: o prompt no telefone está a ser simulado. A confirmação chegará automaticamente.'
                  : `Confirme no seu telefone ${method ? METHOD_LABELS[method] : ''} o pagamento de ${amount.label}. Esta janela actualiza-se sozinha.`}
              </p>
            </div>
            {payment?.reference && (
              <Badge variant="outline" className="font-mono text-[10px] text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/5">
                {payment.reference}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-white/25 mt-1">
              <Clock className="h-3 w-3" /> O prompt expira em ~60 segundos
            </div>
          </div>
        )}

        {/* ── Passo 4: sucesso ── */}
        {stage === 'success' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="relative">
              <CheckCircle2 className="h-14 w-14 text-[#D4AF37]" strokeWidth={1.5} />
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/15 blur-2xl" />
            </div>
            <p className="font-display font-bold text-lg text-white">Pagamento confirmado!</p>
            <p className="text-xs text-white/40 max-w-[280px]">
              O seu plano {plan.name} está activo. Recebeu a confirmação por SMS — as funcionalidades premium já estão disponíveis.
            </p>
            {payment && (
              <div className="w-full mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] text-left">
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Referência</span>
                  <span className="font-mono text-[#D4AF37]">{payment.reference}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Método</span>
                  <span className="text-white/80">{method ? METHOD_LABELS[method] : '—'}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Valor</span>
                  <span className="text-white/80 font-semibold">{amount.label}</span>
                </div>
              </div>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-11 mt-2 bg-[#D4AF37] hover:bg-[#B8962E] text-black font-semibold rounded-xl"
            >
              Perfeito, continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
