import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Smartphone, Wallet, Landmark, Globe, ArrowLeft, CheckCircle2, Loader2,
  ShieldCheck, Clock, AlertTriangle, Copy, Radio, Info, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  startCheckout, submitManualPayment, formatMzn, isValidMzPhone, normalizeMzPhone,
  METHOD_LABELS, type Plan, type PaymentMethod, type Payment, type CheckoutResult,
} from '@/lib/payments'
import { useAppSettings } from '@/hooks/useAppSettings'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  plan: Plan | null
  onSuccess?: (payment: Payment) => void
}

// Canais de pagamento MANUAL (offline — sem nenhuma API)
const MANUAL_CHANNELS: { id: PaymentMethod; label: string; desc: string; icon: typeof Smartphone; color: string }[] = [
  { id: 'mpesa', label: 'M-Pesa', desc: 'Vodacom · pagas no teu telefone', icon: Smartphone, color: '#E60000' },
  { id: 'emola', label: 'e-Mola', desc: 'Movitel · pagas no teu telefone', icon: Wallet, color: '#F59E0B' },
  { id: 'mkesh', label: 'mKesh', desc: 'Tmcel · pagas no teu telefone', icon: Wallet, color: '#3B82F6' },
  { id: 'bank', label: 'Transferência Bancária', desc: 'Depósito ou transferência · qualquer banco', icon: Landmark, color: '#10B981' },
  { id: 'paypal', label: 'PayPal', desc: 'Internacional · pagas em USD', icon: Globe, color: '#0070BA' },
]

// Métodos automáticos (push USSD) — requerem API do operador configurada
const AUTO_METHODS: { id: PaymentMethod; label: string; desc: string; icon: typeof Smartphone; color: string }[] = [
  { id: 'mpesa', label: 'M-Pesa', desc: 'Vodacom · confirma no telefone', icon: Smartphone, color: '#E60000' },
  { id: 'emola', label: 'e-Mola', desc: 'Movitel · confirma no telefone', icon: Wallet, color: '#F59E0B' },
  { id: 'mkesh', label: 'mKesh', desc: 'Tmcel · confirma no telefone', icon: Landmark, color: '#3B82F6' },
  { id: 'paypal', label: 'PayPal', desc: 'Internacional · paga em USD', icon: Globe, color: '#0070BA' },
]

type Stage = 'method' | 'manual' | 'phone' | 'processing' | 'success' | 'manual_success'

function CopyBtn({ value, label }: { value: string; label: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value.replace(/\s/g, '')).then(
          () => toast.success(`${label} copiado`),
          () => toast.error('Erro ao copiar'),
        )
      }}
      className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-white/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
      title={`Copiar ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  )
}

export function CheckoutDialog({ open, onOpenChange, plan, onSuccess }: Props) {
  const [stage, setStage] = useState<Stage>('method')
  const [autoMode, setAutoMode] = useState(false)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [phone, setPhone] = useState('')
  const [payerName, setPayerName] = useState('')
  const [txnRef, setTxnRef] = useState('')
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { data: settings } = useAppSettings()

  useEffect(() => {
    if (open) {
      setStage('method'); setAutoMode(false); setMethod(null); setPhone('')
      setPayerName(''); setTxnRef(''); setResult(null); setPayment(null)
      setError(null); setSubmitting(false)
    }
  }, [open])

  const pn = settings?.payment_numbers
  const isUsd = method === 'paypal'
  const amount = useMemo(() => {
    if (!plan) return { value: 0, label: '' }
    return isUsd
      ? { value: plan.price_usd, label: `$${plan.price_usd.toFixed(2)} USD` }
      : { value: plan.price_mzn, label: formatMzn(plan.price_mzn) }
  }, [plan, isUsd])

  function reset() {
    setStage('method'); setMethod(null); setPhone(''); setPayerName('')
    setTxnRef(''); setError(null)
  }

  // ── Pagamento MANUAL (offline, zero API) ──
  async function submitManual() {
    if (!plan || !method) return
    if (txnRef.trim().length < 4) {
      toast.error('ID da transacção muito curto', { description: 'Copia o ID que recebeste por SMS ou no comprovativo.' })
      return
    }
    if (method !== 'paypal' && !isValidMzPhone(phone)) {
      toast.error('Número inválido', { description: 'Use 9 dígitos, ex: 84xxxxxxx (o número com que pagaste)' })
      return
    }
    if (method === 'paypal' && payerName.trim().length < 3) {
      toast.error('Indica o nome/e-mail do pagador', { description: 'Necessário para localizar o pagamento no PayPal.' })
      return
    }
    setSubmitting(true); setError(null)
    try {
      const p = await submitManualPayment({
        plan, method,
        txnRef: txnRef.trim(),
        phone: method === 'paypal' ? undefined : normalizeMzPhone(phone),
        payerName: payerName.trim() || undefined,
      })
      setPayment(p)
      setStage('manual_success')
      onSuccess?.(p)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao submeter pagamento')
      toast.error('Erro ao submeter', { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pagamento AUTOMÁTICO (push USSD via API) ──
  async function submitAuto() {
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
        setTimeout(() => {
          setPayment((p) => p ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() } : p)
          setStage('success')
          onSuccess?.({ ...payment, status: 'confirmed' } as Payment)
        }, 9500)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar pagamento')
      setStage('phone')
    } finally {
      setSubmitting(false)
    }
  }

  if (!plan) return null

  function manualDetailRows(): { label: string; value: string; copyable?: boolean }[] {
    switch (method) {
      case 'mpesa': return [{ label: 'Número M-Pesa', value: pn?.mpesa ?? '—', copyable: true }]
      case 'emola': return [{ label: 'Número e-Mola', value: pn?.emola ?? '—', copyable: true }]
      case 'mkesh': return [{ label: 'Número mKesh', value: pn?.mkesh ?? '—', copyable: true }]
      case 'bank': return [
        { label: 'Banco', value: pn?.bank_name ?? '—' },
        { label: 'Titular', value: pn?.bank_holder ?? '—' },
        { label: 'NIB / IBAN', value: pn?.bank_nib ?? '—', copyable: true },
      ]
      case 'paypal': return [{ label: 'E-mail PayPal', value: pn?.paypal_email ?? '—', copyable: true }]
      default: return []
    }
  }

  function manualInstructions(): string[] {
    const a = amount.label
    switch (method) {
      case 'mpesa': return [
        'Abre *150# no telefone ou o app M-Pesa',
        `Escolhe "Enviar Dinheiro" e envia ${a} para ${pn?.mpesa ?? '—'}`,
        'Copia o ID da transacção que chega por SMS (ex: CP1234567)',
        'Cola o ID abaixo e submete',
      ]
      case 'emola': return [
        'Abre *102# ou o app e-Mola',
        `Envia ${a} para ${pn?.emola ?? '—'}`,
        'Copia o ID da transacção do SMS de confirmação',
        'Cola o ID abaixo e submete',
      ]
      case 'mkesh': return [
        'Abre o app mKesh (Tmcel)',
        `Envia ${a} para ${pn?.mkesh ?? '—'}`,
        'Copia o ID da transacção do comprovativo',
        'Cola o ID abaixo e submete',
      ]
      case 'bank': return [
        `Transfere ${a} para a conta ${pn?.bank_name ?? '—'} — NIB ${pn?.bank_nib ?? '—'}`,
        `Titular: ${pn?.bank_holder ?? '—'}`,
        'Escreve o teu nome completo na descrição da transferência',
        'Submete o comprovativo/número da operação abaixo',
      ]
      case 'paypal': return [
        `Envia $${plan.price_usd.toFixed(2)} para ${pn?.paypal_email ?? '—'} (Friends & Family)`,
        'Anota o ID da transacção no PayPal',
        'Indica o teu nome/e-mail do PayPal abaixo',
      ]
      default: return []
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#14120D] border-white/10 text-white max-w-md p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
              Assinar {plan.name}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              {autoMode ? 'Pagamento automático · prompt no telefone' : 'Pagamento manual · sem API, funciona já'}
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
        {stage === 'method' && !autoMode && (
          <div className="px-6 py-5 space-y-2.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Pagamento Manual</p>
              <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 text-[9px]">100% SEM API</Badge>
            </div>
            <p className="text-[11px] text-white/35 -mt-1.5 mb-1">
              Pagas para o número oficial e submetes o ID da transacção — activação após validação.
            </p>
            {MANUAL_CHANNELS.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setStage('manual') }}
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
            <button
              onClick={() => { setAutoMode(true); reset() }}
              className="w-full flex items-center justify-center gap-1.5 pt-2 text-[11px] text-white/30 hover:text-[#D4AF37] transition-colors"
            >
              <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              Tens API do operador configurada? Usar pagamento automático
            </button>
          </div>
        )}

        {/* ── Passo 1 (modo automático) ── */}
        {stage === 'method' && autoMode && (
          <div className="px-6 py-5 space-y-2.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Pagamento Automático</p>
              <Badge variant="outline" className="text-[9px] text-amber-400/80 border-amber-500/25">REQUER API DO OPERADOR</Badge>
            </div>
            <p className="text-[11px] text-white/35 -mt-1.5 mb-1">
              O prompt chega ao teu telefone. Só funciona se o dono configurou as credenciais (PAYMENTS.md).
            </p>
            {AUTO_METHODS.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); m.id === 'paypal' ? submitAuto() : setStage('phone') }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-[#D4AF37]/[0.06] hover:border-[#D4AF37]/30 transition-all text-left group"
                >
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}1A`, border: `1px solid ${m.color}33` }}>
                    <Icon className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{m.label}</p>
                    <p className="text-[11px] text-white/35">{m.desc}</p>
                  </div>
                </button>
              )
            })}
            <button
              onClick={() => { setAutoMode(false); reset() }}
              className="w-full flex items-center justify-center gap-1.5 pt-2 text-[11px] text-white/30 hover:text-[#D4AF37] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar ao pagamento manual (sem API)
            </button>
          </div>
        )}

        {/* ── Passo 2 (manual): detalhes + submissão ── */}
        {stage === 'manual' && method && (
          <div className="px-6 py-5 space-y-4">
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#D4AF37] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Trocar método
            </button>

            {/* Dados de pagamento do dono */}
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-3.5 space-y-2">
              <p className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Dados para pagamento — {METHOD_LABELS[method]}
              </p>
              {manualDetailRows().map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[9px] text-white/30">{r.label}</p>
                    <p className="text-xs font-mono font-semibold text-white truncate">{r.value}</p>
                  </div>
                  {r.copyable && <CopyBtn value={r.value} label={r.label} />}
                </div>
              ))}
              <p className="text-[10px] text-white/40 leading-relaxed">
                Envia exactamente <span className="text-[#D4AF37] font-bold">{amount.label}</span> para os dados acima.
              </p>
            </div>

            {/* Instruções passo-a-passo */}
            <ol className="space-y-1.5">
              {manualInstructions().map((s, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-white/45 leading-relaxed">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-white/[0.06] border border-white/10 text-[8px] flex items-center justify-center text-white/50 mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>

            {/* Formulário de validação */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">ID da transacção *</label>
                <Input
                  autoFocus
                  placeholder={method === 'paypal' ? 'Ex: 8KK29404UD1234567' : 'Ex: CP1234567'}
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="bg-white/[0.05] border-white/[0.08] text-white font-mono placeholder:text-white/20"
                />
              </div>
              {method !== 'paypal' ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Telefone com que pagaste *</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 font-mono">+258</span>
                    <Input
                      inputMode="tel"
                      placeholder="84xxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white/[0.05] border-white/[0.08] text-white font-mono placeholder:text-white/20 flex-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Nome / e-mail do pagador (PayPal) *</label>
                  <Input
                    placeholder="Ex: joao@email.com"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <Button
              onClick={submitManual}
              disabled={submitting}
              className="w-full h-11 bg-[#D4AF37] hover:bg-[#B8962E] text-black font-semibold rounded-xl gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submeter para validação
            </Button>
            <p className="text-[10px] text-white/25 text-center leading-relaxed">
              Guarda o comprovativo. A validação é feita pelo administrador — o plano activa automaticamente após confirmação.
            </p>
          </div>
        )}

        {/* ── Passo 2 (automático): telefone ── */}
        {stage === 'phone' && method && (
          <div className="px-6 py-5 space-y-4">
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#D4AF37] transition-colors">
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
                  onKeyDown={(e) => e.key === 'Enter' && submitAuto()}
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
              onClick={submitAuto}
              disabled={submitting}
              className="w-full h-11 bg-[#D4AF37] hover:bg-[#B8962E] text-black font-semibold rounded-xl gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Pagar {amount.label}
            </Button>
          </div>
        )}

        {/* ── Passo 3 (automático): a processar ── */}
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

        {/* ── Sucesso (manual): aguarda validação ── */}
        {stage === 'manual_success' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                <Radio className="h-7 w-7 text-[#D4AF37] animate-pulse" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 blur-2xl" />
            </div>
            <p className="font-display font-bold text-lg text-white">Pagamento submetido!</p>
            <p className="text-xs text-white/40 max-w-[300px] leading-relaxed">
              Recebemos o teu comprovativo de {amount.label} via <span className="text-white/70">{method ? METHOD_LABELS[method] : ''}</span>.
              Assim que validarmos a recepção, o plano <span className="text-[#D4AF37]">{plan.name}</span> activa automaticamente — normalmente em minutos.
            </p>
            {payment && (
              <div className="w-full mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] text-left">
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Referência interna</span>
                  <span className="font-mono text-[#D4AF37]">{payment.reference}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">ID transacção</span>
                  <span className="font-mono text-white/80">{payment.provider_ref}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Método</span>
                  <span className="text-white/80">{method ? METHOD_LABELS[method] : '—'}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Valor</span>
                  <span className="text-white/80 font-semibold">{amount.label}</span>
                </div>
                <div className="flex justify-between px-3.5 py-2 text-xs">
                  <span className="text-white/35">Estado</span>
                  <span className="text-amber-400 font-semibold">A validar</span>
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

        {/* ── Sucesso (automático) ── */}
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
