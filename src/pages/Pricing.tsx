import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Shield, Sparkles, Heart, Star, CreditCard, Smartphone, Globe, Lock, ArrowLeft, BadgeCheck, Watch, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { NoiseTexture, MorphingBlob, BeamBorder, GlowCard } from '@/components/effects'
import { CheckoutDialog } from '@/components/CheckoutDialog'
import { useAuth } from '@/hooks/useAuth'
import { usePlans, usePlanState, useDemoMode } from '@/hooks/useSubscription'
import { useBellvion } from '@/hooks/useBellvion'
import { formatMzn, type Plan } from '@/lib/payments'
import { cn } from '@/lib/utils'

const METHOD_ICONS = [Smartphone, Smartphone, Smartphone, Globe]

export default function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: plans = [] } = usePlans()
  const { state } = usePlanState()
  const { data: isDemo } = useDemoMode()
  const { hasDevice: hasBellvion, verifyByCode, verifying } = useBellvion()
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)

  function choose(plan: Plan) {
    if (plan.slug === 'free') {
      navigate('/dashboard')
      return
    }
    if (!user) {
      navigate('/login')
      return
    }
    // Plano Bellvion exige dispositivo da marca activado — sem ele, abre a verificação
    if (plan.slug === 'bellvion' && !hasBellvion) {
      setVerifyOpen(true)
      return
    }
    setCheckoutPlan(plan)
    setDialogOpen(true)
  }

  return (
    <div className="dark min-h-screen bg-background text-white relative overflow-x-hidden">
      <NoiseTexture opacity={0.02} />
      <MorphingBlob className="-left-40 top-0" color="rgba(212, 175, 55, 0.05)" size={420} />
      <MorphingBlob className="-right-40 bottom-1/4" color="rgba(212, 175, 55, 0.04)" size={380} />

      {/* Nav mínima */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-8 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold">Status<span className="text-brand">Ads</span></span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(user ? '/dashboard' : '/')} className="text-white/50 hover:text-white gap-1.5">
          <ArrowLeft className="h-4 w-4" /> {user ? 'Painel' : 'Voltar'}
        </Button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">
        {/* Hero */}
        <div className="text-center pt-14 pb-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-brand/10 border-brand/25 text-brand gap-1.5 mb-5">
              <Sparkles className="h-3 w-3" /> Planos e Preços
            </Badge>
            <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              Protecção que cabe
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5D576] via-brand to-brand-dark">no seu bolso</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/40 max-w-xl mx-auto">
              Pague com M-Pesa, e-Mola, mKesh ou PayPal. Sem contratos — cancele quando quiser, fica com o plano Grátis.
            </p>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-16 items-stretch">
          {plans.map((plan, i) => {
            const current = state?.plan.slug === plan.slug
            return (
              <motion.div
                key={plan.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn('relative', plan.popular && 'md:-mt-4 md:mb-4')}
              >
                {plan.slug === 'bellvion' ? (
                  <BeamBorder className="rounded-2xl h-full">
                    <PlanCard plan={plan} current={current} onChoose={choose} hasBellvion={hasBellvion} />
                  </BeamBorder>
                ) : plan.popular ? (
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

        {/* Compatibilidade BLE universal */}
        <div className="pb-16 -mt-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Watch className="h-4 w-4 text-brand" />
              <h3 className="font-display font-semibold text-sm">Funciona com o seu dispositivo — qualquer que seja</h3>
            </div>
            <p className="text-xs text-white/35 max-w-2xl">
              A app aceita qualquer dispositivo Bluetooth Low Energy: Mi Band, Galaxy Watch, AirPods, iTag, Tile, botões SOS genéricos…
              Quem usa um <span className="text-brand font-semibold">dispositivo BELLVION</span> desbloqueia o plano Bellvion (99 MT/mês) e funcionalidades exclusivas da marca.
            </p>
          </div>
        </div>

        {/* Métodos de pagamento */}
        <div className="pb-16">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2 justify-center sm:justify-start">
                  <CreditCard className="h-4.5 w-4.5 text-brand" /> Métodos de pagamento aceites
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
                  <Icon className="h-5 w-5 text-brand mb-2.5" />
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

      <BellvionVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        verifyByCode={verifyByCode}
        verifying={verifying}
        onVerified={() => {
          setVerifyOpen(false)
          const p = plans.find((x) => x.slug === 'bellvion')
          if (p && user) {
            setCheckoutPlan(p)
            setDialogOpen(true)
          }
        }}
      />
    </div>
  )
}

function PlanCard({ plan, current, onChoose, hasBellvion }: { plan: Plan; current: boolean; onChoose: (p: Plan) => void; hasBellvion?: boolean }) {
  const isBellvion = plan.slug === 'bellvion'
  return (
    <div className="flex flex-col h-full p-6 sm:p-7">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold text-lg text-white">{plan.name}</h3>
        {plan.popular && (
          <Badge className="bg-brand text-black text-[10px] font-bold gap-1 border-0">
            <Star className="h-3 w-3 fill-black" /> Mais Popular
          </Badge>
        )}
        {isBellvion && (
          <Badge className="bg-brand/15 text-brand text-[10px] font-bold gap-1 border border-brand/30">
            <Watch className="h-3 w-3" /> EXCLUSIVO
          </Badge>
        )}
        {current && (
          <Badge variant="outline" className="text-[10px] text-brand border-brand/40 bg-brand/5">Plano actual</Badge>
        )}
      </div>
      <p className="text-xs text-white/35 mb-5">{plan.description}</p>

      <div className="flex items-baseline gap-1.5 mb-1">
        {plan.price_mzn === 0 ? (
          <span className="font-display text-4xl font-bold text-white">Grátis</span>
        ) : (
          <>
            <span className="font-display text-4xl font-bold text-white">{plan.price_mzn}</span>
            <span className="text-sm text-brand font-semibold">MT/mês</span>
          </>
        )}
        {isBellvion && plan.price_mzn > 0 && (
          <span className="text-xs text-white/25 line-through ml-1">249</span>
        )}
      </div>
      {plan.price_usd > 0 && (
        <p className="text-[11px] text-white/25 mb-5">≈ ${plan.price_usd.toFixed(2)} USD via PayPal</p>
      )}
      {plan.price_mzn === 0 && <div className="mb-5" />}

      {isBellvion && (
        <div className={cn(
          'rounded-xl border px-3 py-2 mb-4 text-[11px] flex items-center gap-2',
          hasBellvion
            ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300'
            : 'border-white/[0.08] bg-white/[0.02] text-white/45'
        )}>
          {hasBellvion
            ? <><BadgeCheck className="h-3.5 w-3.5 shrink-0" /> Dispositivo BELLVION verificado — desconto desbloqueado</>
            : <><KeyRound className="h-3.5 w-3.5 shrink-0" /> Requer um dispositivo BELLVION activado (código da caixa)</>
          }
        </div>
      )}

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/60">
            <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onChoose(plan)}
        disabled={current}
        className={cn(
          'w-full h-11 rounded-xl font-semibold gap-2',
          plan.popular || isBellvion
            ? 'bg-brand hover:bg-brand-dark text-black'
            : plan.slug === 'free'
              ? 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
              : 'bg-brand/15 hover:bg-brand/25 text-brand border border-brand/25',
        )}
      >
        {current
          ? 'Plano actual'
          : plan.slug === 'free'
            ? 'Começar Grátis'
            : isBellvion && !hasBellvion
              ? 'Verificar dispositivo'
              : `Assinar ${plan.name}`}
      </Button>
    </div>
  )
}

function BellvionVerifyDialog({
  open, onOpenChange, verifyByCode, verifying, onVerified,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  verifyByCode: (code: string) => Promise<{ ok: boolean; error?: string }>
  verifying: boolean
  onVerified: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const res = await verifyByCode(code)
    if (res.ok) {
      setCode('')
      onVerified()
    } else {
      setError(res.error ?? 'Código inválido')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-card border border-brand/20 text-white max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Watch className="h-5 w-5 text-brand" /> Verificar dispositivo BELLVION
          </DialogTitle>
          <DialogDescription className="text-white/45 text-sm">
            Introduza o código de activação impresso na caixa do seu dispositivo BELLVION para desbloquear o plano com desconto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && code && !verifying && submit()}
              placeholder="Ex: BV-XXXX-XXXX"
              maxLength={24}
              autoFocus
              className="w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-center font-mono text-lg tracking-[0.2em] placeholder:text-white/20 placeholder:tracking-normal outline-none focus:border-brand/50"
            />
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>
          <Button
            onClick={submit}
            disabled={verifying || code.length < 6}
            className="w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-black font-semibold gap-2"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {verifying ? 'A verificar…' : 'Verificar código'}
          </Button>
          <p className="text-[11px] text-white/30 text-center">
            Ainda não tem um dispositivo BELLVION? Contacte a loja oficial para adquirir — Glasses, Watch, Buds ou Tracker.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
