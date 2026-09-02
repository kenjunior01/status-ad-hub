import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Shield, Sparkles, Heart, Star, CreditCard, Smartphone, Globe, Lock, ArrowLeft, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NoiseTexture, MorphingBlob, BeamBorder, GlowCard } from '@/components/effects'
import { CheckoutDialog } from '@/components/CheckoutDialog'
import { useAuth } from '@/hooks/useAuth'
import { usePlans, usePlanState, useDemoMode } from '@/hooks/useSubscription'
import { formatMzn, type Plan } from '@/lib/payments'
import { cn } from '@/lib/utils'

const METHOD_ICONS = [Smartphone, Smartphone, Smartphone, Globe]

export default function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: plans = [] } = usePlans()
  const { state } = usePlanState()
  const { data: isDemo } = useDemoMode()
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function choose(plan: Plan) {
    if (plan.slug === 'free') {
      navigate('/dashboard')
      return
    }
    if (!user) {
      navigate('/login')
      return
    }
    setCheckoutPlan(plan)
    setDialogOpen(true)
  }

  return (
    <div className="dark min-h-screen bg-[#0C0B08] text-white relative overflow-x-hidden">
      <NoiseTexture opacity={0.02} />
      <MorphingBlob className="-left-40 top-0" color="rgba(212, 175, 55, 0.05)" size={420} />
      <MorphingBlob className="-right-40 bottom-1/4" color="rgba(212, 175, 55, 0.04)" size={380} />

      {/* Nav mínima */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-8 backdrop-blur-2xl bg-[#0C0B08]/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-sm font-bold">Status<span className="text-[#D4AF37]">Ads</span></span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(user ? '/dashboard' : '/')} className="text-white/50 hover:text-white gap-1.5">
          <ArrowLeft className="h-4 w-4" /> {user ? 'Painel' : 'Voltar'}
        </Button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">
        {/* Hero */}
        <div className="text-center pt-14 pb-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-[#D4AF37]/10 border-[#D4AF37]/25 text-[#D4AF37] gap-1.5 mb-5">
              <Sparkles className="h-3 w-3" /> Planos e Preços
            </Badge>
            <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              Protecção que cabe
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5D576] via-[#D4AF37] to-[#B8962E]">no seu bolso</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/40 max-w-xl mx-auto">
              Pague com M-Pesa, e-Mola, mKesh ou PayPal. Sem contratos — cancele quando quiser, fica com o plano Grátis.
            </p>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 pb-16 items-stretch">
          {plans.map((plan, i) => {
            const current = state?.plan.slug === plan.slug
            return (
              <motion.div
                key={plan.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn('relative', plan.popular && 'md:-mt-4 md:mb-4')}
              >
                {plan.popular ? (
                  <BeamBorder className="rounded-2xl h-full">
                    <PlanCard plan={plan} current={current} onChoose={choose} />
                  </BeamBorder>
                ) : (
                  <GlowCard className="rounded-2xl h-full border border-white/[0.07] bg-white/[0.02]">
                    <PlanCard plan={plan} current={current} onChoose={choose} />
                  </GlowCard>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Métodos de pagamento */}
        <div className="pb-16">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2 justify-center sm:justify-start">
                  <CreditCard className="h-4.5 w-4.5 text-[#D4AF37]" /> Métodos de pagamento aceites
                </h3>
                <p className="text-xs text-white/35 mt-1.5 max-w-md mx-auto sm:mx-0">
                  Os pagamentos por carteira móvel chegam como um prompt no seu telefone — confirme com o PIN e a assinatura activa na hora.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {[
                  { label: 'M-Pesa', color: '#E60000' },
                  { label: 'e-Mola', color: '#F59E0B' },
                  { label: 'mKesh', color: '#3B82F6' },
                  { label: 'PayPal', color: '#0070BA' },
                ].map((m) => (
                  <div key={m.label} className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                    <span className="text-xs font-semibold text-white/70">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Garantias */}
          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            {[
              { icon: Lock, title: 'Pagamento seguro', desc: 'Processado directamente pelo provider — nunca guardamos o seu PIN.' },
              { icon: BadgeCheck, title: 'Activação instantânea', desc: 'Assim que confirma, todas as funcionalidades ficam disponíveis.' },
              { icon: Heart, title: 'Cancele quando quiser', desc: 'Sem fidelidade. Ao cancelar mantém o acesso até ao fim do período.' },
            ].map((g) => {
              const Icon = g.icon
              return (
                <div key={g.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <Icon className="h-5 w-5 text-[#D4AF37] mb-2.5" />
                  <p className="text-sm font-semibold text-white">{g.title}</p>
                  <p className="text-[11px] text-white/35 mt-1 leading-relaxed">{g.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {isDemo && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-xl flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] text-amber-200">Modo demonstração — pagamentos simulados (executar migration 009 para activar pagamentos reais)</span>
        </div>
      )}

      <CheckoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={checkoutPlan}
      />
    </div>
  )
}

function PlanCard({ plan, current, onChoose }: { plan: Plan; current: boolean; onChoose: (p: Plan) => void }) {
  return (
    <div className="flex flex-col h-full p-6 sm:p-7">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold text-lg text-white">{plan.name}</h3>
        {plan.popular && (
          <Badge className="bg-[#D4AF37] text-black text-[10px] font-bold gap-1 border-0">
            <Star className="h-3 w-3 fill-black" /> Mais Popular
          </Badge>
        )}
        {current && (
          <Badge variant="outline" className="text-[10px] text-[#D4AF37] border-[#D4AF37]/40 bg-[#D4AF37]/5">Plano actual</Badge>
        )}
      </div>
      <p className="text-xs text-white/35 mb-5">{plan.description}</p>

      <div className="flex items-baseline gap-1.5 mb-1">
        {plan.price_mzn === 0 ? (
          <span className="font-display text-4xl font-bold text-white">Grátis</span>
        ) : (
          <>
            <span className="font-display text-4xl font-bold text-white">{plan.price_mzn}</span>
            <span className="text-sm text-[#D4AF37] font-semibold">MT/mês</span>
          </>
        )}
      </div>
      {plan.price_usd > 0 && (
        <p className="text-[11px] text-white/25 mb-5">≈ ${plan.price_usd.toFixed(2)} USD via PayPal</p>
      )}
      {plan.price_mzn === 0 && <div className="mb-5" />}

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/60">
            <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onChoose(plan)}
        disabled={current}
        className={cn(
          'w-full h-11 rounded-xl font-semibold gap-2',
          plan.popular
            ? 'bg-[#D4AF37] hover:bg-[#B8962E] text-black'
            : plan.slug === 'free'
              ? 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
              : 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/25',
        )}
      >
        {current ? 'Plano actual' : plan.slug === 'free' ? 'Começar Grátis' : `Assinar ${plan.name}`}
      </Button>
    </div>
  )
}
