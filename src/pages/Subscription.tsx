import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard, Smartphone, Wallet, Landmark, Globe, CheckCircle2, XCircle,
  Clock, RefreshCw, Sparkles, ShieldCheck, Download, ChevronRight, Loader2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NoiseTexture, MorphingBlob } from '@/components/effects'
import { CheckoutDialog } from '@/components/CheckoutDialog'
import {
  usePlans, usePlanState, useMyPayments, useDemoMode, useCancelSubscription,
} from '@/hooks/useSubscription'
import { useBellvion } from '@/hooks/useBellvion'
import { capturePaypal, formatMzn, formatDate, formatDateTime, METHOD_LABELS, type Plan, type PlanSlug, type Payment } from '@/lib/payments'
import { cn } from '@/lib/utils'

const METHOD_ICONS: Record<string, typeof Smartphone> = {
  mpesa: Smartphone, emola: Wallet, mkesh: Landmark, paypal: Globe, manual: CreditCard,
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  pending: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  processing: { label: 'A processar', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  failed: { label: 'Falhou', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  cancelled: { label: 'Cancelado', cls: 'bg-white/[0.06] text-white/40 border-white/10' },
  refunded: { label: 'Reembolsado', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

export default function Subscription() {
  const [, setSearchParams] = useSearchParams()
  const { state, loading, reload } = usePlanState()
  const { data: payments = [] } = useMyPayments()
  const { data: plans = [] } = usePlans()
  const { data: isDemo } = useDemoMode()
  const cancelSub = useCancelSubscription()
  const { hasDevice: hasBellvion } = useBellvion()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null)
  const [processingPaypal, setProcessingPaypal] = useState<string | null>(null)

  // Retorno do PayPal (approve/cancel)
  const paypalParams = new URLSearchParams(window.location.search)
  const paypalFlag = paypalParams.get('paypal')
  const paypalRef = paypalParams.get('ref')

  async function handlePaypalReturn() {
    if (!paypalRef || !paypalFlag) return
    // O provider_ref do PayPal chega via webhook; tenta capturar com o token da URL
    const token = paypalParams.get('token')
    setProcessingPaypal(paypalRef)
    try {
      if (token) await capturePaypal(paypalRef, token)
    } finally {
      setProcessingPaypal(null)
      setSearchParams({}, { replace: true })
      reload()
    }
  }

  function openCheckout(slug: PlanSlug) {
    const plan = plans.find((p) => p.slug === slug)
    if (!plan) return
    setCheckoutPlan(plan)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    )
  }

  const plan = state?.plan
  const isActive = state?.status === 'active'
  const daysRemaining = state?.daysRemaining ?? 0
  const totalDays = 31
  const progress = isActive ? Math.min(100, Math.round((daysRemaining / totalDays) * 100)) : 0

  return (
    <div className="dark bg-background text-white relative min-h-screen">
      <NoiseTexture opacity={0.015} />
      <MorphingBlob className="-right-32 top-10" color="rgba(212, 175, 55, 0.04)" size={320} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Cabeçalho ── */}
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-brand" /> Assinatura e Pagamentos
          </h1>
          <p className="text-xs text-white/35 mt-1">Gere o seu plano, vê o histórico e renova quando quiseres.</p>
        </div>

        {/* ── Plano actual ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/[0.07] to-white/[0.02] p-6 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-brand" />
                <p className="font-display font-bold text-xl text-white">Plano {plan?.name}</p>
                <Badge className={cn('text-[10px] border', isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.06] text-white/40 border-white/10')}>
                  {isActive ? 'Activo' : state?.status === 'cancelled' ? 'Cancelado' : 'Grátis'}
                </Badge>
              </div>
              <p className="text-xs text-white/35 mt-1.5">
                {plan?.description}
              </p>
            </div>
            <div className="text-right">
              {plan?.slug === 'free' ? (
                <p className="font-display font-bold text-2xl text-white">Grátis</p>
              ) : (
                <>
                  <p className="font-display font-bold text-2xl text-brand">{plan?.price_mzn} MT</p>
                  <p className="text-[10px] text-white/25">por mês</p>
                </>
              )}
            </div>
          </div>

          {isActive && state?.subscription?.expires_at && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-white/40">Renova em {formatDate(state.subscription.expires_at)}</span>
                <span className="text-brand font-semibold">{daysRemaining} dias restantes</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 mt-5">
            {plan?.slug === 'free' ? (
              <>
                <Button onClick={() => openCheckout(hasBellvion ? 'bellvion' : 'familia')} className="bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl h-10 gap-2">
                  <Zap className="h-4 w-4" /> {hasBellvion ? 'Activar Bellvion · 99 MT' : 'Fazer Upgrade'}
                </Button>
                <Button variant="outline" onClick={() => openCheckout('premium')} className="border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 rounded-xl h-10">
                  Ver Premium
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => openCheckout(plan?.slug as PlanSlug)} className="bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl h-10 gap-2">
                  <RefreshCw className="h-4 w-4" /> Renovar agora
                </Button>
                <Button variant="outline" onClick={() => openCheckout('premium')} className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] rounded-xl h-10">
                  Mudar para Premium
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Cancelar ── */}
        {state?.subscription && state.status === 'active' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-white/70 font-medium">Cancelar assinatura</p>
              <p className="text-[11px] text-white/30 mt-0.5">Mantém o acesso até {formatDate(state.subscription.expires_at)} e depois volta ao plano Grátis.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelSub.isPending}
              onClick={() => {
                if (confirm('Cancelar a assinatura? Vais voltar ao plano Grátis no fim do período.')) {
                  cancelSub.mutate(state.subscription!.id, { onSuccess: reload })
                }
              }}
              className="text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
            >
              {cancelSub.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancelar assinatura'}
            </Button>
          </div>
        )}

        {/* ── Histórico de pagamentos ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <p className="font-display font-semibold text-sm text-white">Histórico de pagamentos</p>
            <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">{payments.length} transacções</Badge>
          </div>
          {payments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CreditCard className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-xs text-white/30">Ainda não fizeste pagamentos. O plano Grátis não exige pagamento.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {payments.slice(0, 15).map((p) => (
                <PaymentRow key={p.id} payment={p} processing={processingPaypal === p.reference} />
              ))}
            </div>
          )}
        </div>

        {/* ── Comparação rápida ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="font-display font-semibold text-sm text-white">Comparar planos</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {plans.filter((p) => p.slug !== 'free').map((p) => (
              <div key={p.slug} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={cn('h-4.5 w-4.5', p.popular ? 'text-brand' : 'text-white/25')} />
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-[11px] text-white/30">{p.max_contacts >= 99 ? 'Contactos ilimitados' : `${p.max_contacts} contactos`} · {p.max_devices} dispositivos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-brand">{formatMzn(p.price_mzn)}<span className="text-white/25 font-normal">/mês</span></p>
                  <Button size="sm" variant="ghost" onClick={() => openCheckout(p.slug)} className="text-brand hover:bg-brand/10 gap-1 rounded-lg">
                    Assinar <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isDemo && (
          <p className="text-center text-[10px] text-white/20 pb-4">
            Modo demonstração activo — executa a migration 009 no Supabase e configura as chaves dos providers para pagamentos reais.
          </p>
        )}
      </div>

      <CheckoutDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={checkoutPlan} onSuccess={reload} />
    </div>
  )
}

function PaymentRow({ payment, processing }: { payment: Payment; processing?: boolean }) {
  const Icon = METHOD_ICONS[payment.method] ?? CreditCard
  const st = STATUS_STYLE[payment.status] ?? STATUS_STYLE.pending
  return (
    <div className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-white/[0.015] transition-colors">
      <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-white">{METHOD_LABELS[payment.method] ?? payment.method}</p>
          {payment.plan_slug && (
            <span className="text-[10px] text-white/25 capitalize">{payment.plan_slug}</span>
          )}
        </div>
        <p className="text-[10px] text-white/25 font-mono">{payment.reference} · {formatDateTime(payment.created_at)}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-bold text-white">
          {payment.currency === 'USD' ? `$${Number(payment.amount).toFixed(2)}` : formatMzn(Number(payment.amount))}
        </p>
        <Badge variant="outline" className={cn('text-[9px] mt-0.5', st.cls)}>{st.label}</Badge>
      </div>
      {processing && <Loader2 className="h-4 w-4 text-brand animate-spin shrink-0" />}
    </div>
  )
}
