import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, MotionConfig, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AnimatedGrid, AuroraBackground, ParticleField, FloatingOrbs,
  NoiseTexture, MagneticButton,
  RippleButton, SpotlightCard, GlowCard, MorphingBlob, ScrollProgress, BeamBorder,
} from '@/components/effects'
import {
  Shield, ShieldCheck, AlertTriangle, MapPin, Mic,
  BellOff, Crosshair, Wifi, Menu, X, ChevronRight, ChevronDown, Check,
  ArrowRight, Users, Lock, Radar, Sparkles, Download,
  Lightbulb, WifiOff, MessageCircle, Radio,
} from 'lucide-react'
import { SAFETY_TIPS } from '@/lib/safety-tips'

/* ?? Animation Presets ?? */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] },
  }),
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] },
  }),
}
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
}

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reducedMotion = useReducedMotion()
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={reducedMotion ? false : 'hidden'}
      animate={reducedMotion || inView ? 'visible' : 'hidden'}
      className={cn('relative', className)}
    >
      {children}
    </motion.section>
  )
}

/* ???????????????????????????????????????????????? */
/*  NAVBAR                                        */
/* ???????????????????????????????????????????????? */
function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Pre?os', href: '#precos' },
    { label: 'Emerg?ncia', href: '#emergencia' },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
      scrolled
        ? 'bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/20'
        : 'bg-transparent'
    )}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 transition-all group-hover:bg-brand/20 group-hover:border-brand/40 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <Shield className="h-4.5 w-4.5 text-brand transition-transform group-hover:scale-110" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">
            Status<span className="text-brand">Ads</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="px-4 py-2 text-sm text-white/50 transition-all hover:text-white rounded-lg hover:bg-white/5">
              {l.label}
            </a>
          ))}
          <div className="ml-4">
            <MagneticButton strength={0.15}>
              <Button asChild className="bg-brand text-white hover:bg-brand-dark hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.4)] transition-all duration-300 rounded-xl">
                <Link to="/ativar">Come?ar Agora <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/60 md:hidden hover:text-white transition"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="border-t border-white/[0.06] bg-background/95 backdrop-blur-2xl md:hidden overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-white/60 transition hover:text-white hover:bg-white/5 rounded-xl">
                  {l.label}
                </a>
              ))}
              <Button asChild className="mt-2 w-full bg-brand text-white hover:bg-brand-dark rounded-xl">
                <Link to="/ativar" onClick={() => setOpen(false)}>Come?ar Agora</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ???????????????????????????????????????????????? */
/*  HERO                                          */
/* ???????????????????????????????????????????????? */
function Hero() {
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-20">
      <AuroraBackground className="opacity-60" />
      <ParticleField count={35} className="opacity-50" />
      <NoiseTexture opacity={0.025} />
      <AnimatedGrid className="opacity-40" />

      {/* Decorative rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[600px] w-[600px]">
          <div className="absolute inset-0 rounded-full border border-white/[0.03] animate-slow-rotate" />
          <div className="absolute inset-8 rounded-full border border-brand/[0.06] animate-slow-rotate" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
          <div className="absolute inset-16 rounded-full border border-white/[0.02] animate-slow-rotate" style={{ animationDuration: '35s' }} />
        </div>
      </div>

      <MorphingBlob className="-left-32 top-1/4" color="rgba(212, 175, 55, 0.06)" size={400} />
      <MorphingBlob className="-right-32 bottom-1/4" color="rgba(212, 175, 55, 0.05)" size={350} />

      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Seguran?a pessoal, com controlo no teu dispositivo
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            A Sua Seguran?a.{' '}
            <span className="bg-gradient-to-r from-brand via-amber-300 to-brand bg-clip-text text-transparent bg-[length:200%_auto] animate-[text-shimmer_4s_linear_infinite]">
              Um Bot?o de Dist?ncia.
            </span>
          </h1>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="mx-auto mt-6 max-w-2xl text-base text-white/50 leading-relaxed sm:text-lg md:text-xl">
          Monitoriza??o por Bluetooth em tempo real para protec??o pessoal.
          Pareie qualquer dispositivo BLE e active a seguran?a com um ?nico toque.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MagneticButton strength={0.2}>
            <RippleButton className="h-13 px-8 text-base font-semibold" onClick={() => window.location.assign('/ativar')}>
              Activar Dispositivo <ArrowRight className="ml-2 h-4 w-4" />
            </RippleButton>
          </MagneticButton>
          <Button asChild variant="outline" size="lg" className="h-13 border-white/10 bg-white/[0.03] px-8 text-base text-white/80 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 hover:text-white rounded-xl transition-all duration-300">
            <a href="#como-funciona">Ver como funciona <ArrowRight className="ml-2 h-4 w-4" /></a>
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.8 }} className="mt-6">
          <button
            onClick={() => window.location.href = '/instalar'}
            className="inline-flex items-center gap-1.5 text-sm text-brand/80 hover:text-brand transition-colors"
          >
            <Download className="h-4 w-4" />
            PWA, App Nativa ou Camuflada? Escolha como instalar
          </button>
        </motion.div>

        <div className="mt-20 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { Icon: AlertTriangle, label: 'SOS com activa??o manual' },
            { Icon: MapPin, label: 'Localiza??o sujeita a permiss?o' },
            { Icon: WifiOff, label: 'Fila local para alertas offline' },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-medium text-white/55">
              <Icon className="h-4 w-4 shrink-0 text-brand" />
              {label}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ???????????????????????????????????????????????? */
/*  TRUST MARQUEE                                 */
/* ???????????????????????????????????????????????? */
function ReliabilityHighlights() {
  const points = [
    { title: 'Liga??o inst?vel', text: 'Um SOS pode ficar na fila local e tentar sincronizar quando a rede voltar.', Icon: WifiOff },
    { title: 'Alertas configur?veis', text: 'Prepara contactos e canais dispon?veis no teu dispositivo antes de precisares deles.', Icon: MessageCircle },
    { title: 'Pesquisa transparente', text: 'Ao procurar um destino, s? o texto pesquisado ? enviado ao OpenStreetMap ? n?o a tua posi??o actual.', Icon: MapPin },
  ]
  return (
    <Section className="border-y border-white/[0.04] bg-white/[0.01] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Transpar?ncia</span>
          <h2 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">Seguran?a sem promessas vagas</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            O que a aplica??o consegue fazer depende do dispositivo, das permiss?es, dos canais configurados e da liga??o dispon?vel.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {points.map(({ title, text, Icon }, i) => (
            <motion.div key={title} custom={i} variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-brand/[0.07] text-brand">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white/85">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  HOW IT WORKS                                 */
/* ???????????????????????????????????????????????? */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Prepare a aplica??o', desc: 'Adicione contactos de emerg?ncia e configure as permiss?es e os canais que pretende usar.', Icon: Users },
    { num: '02', title: 'Escolha o que activar', desc: 'Usa as fun??es dispon?veis no teu telefone, como GPS, Bluetooth e check-ins, conforme as permiss?es.', Icon: ShieldCheck },
    { num: '03', title: 'Accione o SOS', desc: 'A aplica??o tenta os canais configurados. Confirme a entrega e contacte os servi?os locais se precisar de ajuda.', Icon: AlertTriangle },
  ]
  return (
    <Section id="como-funciona" className="py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Processo Simples</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Como <span className="text-gradient-safe">Funciona</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            Configura a aplica??o com anteced?ncia e conhece os limites do teu dispositivo.
          </p>
        </motion.div>
        <div className="relative mt-20 grid grid-cols-1 gap-12 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-16 hidden h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent md:block" />
          {steps.map((step, i) => (
            <motion.div key={step.num} custom={i} variants={fadeUp} className="relative flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-brand/20 bg-brand/[0.06] backdrop-blur-sm transition-all duration-500 hover:border-brand/40 hover:bg-brand/10 hover:shadow-[0_0_40px_-10px_rgba(212,175,55,0.15)]">
                  <step.Icon className="h-8 w-8 text-brand" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-brand/30 text-[10px] font-bold text-brand font-mono">
                  {step.num}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-display font-semibold text-white">{step.title}</h3>
              <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-white/40">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  FEATURES GRID                                 */
/* ???????????????????????????????????????????????? */
function FeaturesGrid() {
  const features = [
    { title: 'Radares Wi-Fi e Bluetooth', desc: 'Consulta sinais e dispositivos pr?ximos compat?veis. O que ? detectado varia conforme o sistema operativo, o hardware e as permiss?es.', Icon: Radar },
    { title: 'Localiza??o e partilha', desc: 'Usa o GPS do telefone nas fun??es activadas. A precis?o depende do sinal e das permiss?es concedidas.', Icon: MapPin },
    { title: 'Registo de evid?ncias', desc: 'Guarda eventos e ficheiros associados ? seguran?a, de acordo com as permiss?es e o espa?o dispon?vel.', Icon: Mic },
    { title: 'Alertas discretos', desc: 'Configura contactos e op??es de alerta. A entrega depende da rede, do dispositivo e do canal escolhido.', Icon: BellOff },
    { title: 'Check-in e viagens', desc: 'Regista check-ins e acompanha sess?es de viagem para partilhar informa??o quando necess?rio.', Icon: Crosshair },
    { title: 'Modos de discri??o', desc: 'Escolhe uma apar?ncia alternativa para reduzir a exposi??o visual da aplica??o no dispositivo.', Icon: ShieldCheck },
  ]
  return (
    <Section id="funcionalidades" className="relative py-28 overflow-hidden">
      <ParticleField count={20} className="opacity-30" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Ferramentas de seguran?a</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Funcionalidades
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            Ao servi?o da sua seguran?a pessoal.
          </p>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp}>
              <SpotlightCard className="p-7 h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/[0.08] text-brand border border-brand/10">
                  <f.Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-display mt-5 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  EMERGENCY DEMO                                */
/* ???????????????????????????????????????????????? */
function EmergencyDemo() {
  const flow = [
    { step: 'Activar o SOS', detail: 'Acciona o alerta pela op??o configurada.', icon: AlertTriangle },
    { step: 'Obter localiza??o', detail: 'O telefone tenta obter a posi??o, se a permiss?o e o sinal permitirem.', icon: MapPin },
    { step: 'Contactar os teus contactos', detail: 'Os canais dispon?veis tentam enviar a informa??o preparada.', icon: Users },
    { step: 'Sem rede? Guardar para sincronizar', detail: 'O envio pode ficar pendente at? haver liga??o.', icon: WifiOff },
  ]
  return (
    <Section id="emergencia" className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0 bg-red-900/[0.04]" />
      <MorphingBlob className="-left-40 top-1/2 -translate-y-1/2" color="rgba(239, 68, 68, 0.04)" size={400} />
      <MorphingBlob className="-right-40 top-1/2 -translate-y-1/2" color="rgba(239, 68, 68, 0.03)" size={350} />
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center">
          <motion.div variants={scaleIn} custom={0} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.06]">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </motion.div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400/60">Protocolo de Emerg?ncia</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Cada Segundo <span className="text-red-400">Conta</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            O fluxo depende do telefone, das permiss?es, da rede e dos canais configurados. Testa a configura??o antes de precisares dela.
          </p>
        </motion.div>
        <div className="relative mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((item, i) => (
            <motion.div key={item.step} custom={i} variants={fadeUp}>
              <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.06)" className="p-6 text-center relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/[0.08] border border-red-500/15 mx-auto">
                  <item.icon className="h-5 w-5 text-red-400" strokeWidth={1.5} />
                </div>
                <p className="mt-4 text-sm font-medium text-white">{item.step}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/40">{item.detail}</p>
                {i < flow.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-red-500/20 lg:block" />
                )}
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  TRUST STATS                                   */
/* ???????????????????????????????????????????????? */
function TrustStats() {
  const stats = [
    { Icon: ShieldCheck, title: 'Protec??o ajust?vel', text: 'Activa apenas as fun??es que preparaste e compreendes.' },
    { Icon: Radio, title: 'Sinais dependem do dispositivo', text: 'BLE, Wi-Fi, GPS e bateria variam entre equipamentos.' },
    { Icon: Lock, title: 'Complemento, n?o substituto', text: 'N?o substitui servi?os locais de emerg?ncia nem uma rede dispon?vel.' },
  ]
  return (
    <Section className="py-20 border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ Icon, title, text }, i) => (
            <motion.div key={title} custom={i} variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <Icon className="mx-auto h-5 w-5 text-brand" />
              <p className="mt-3 text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/40">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  PRICING                                       */
/* ???????????????????????????????????????????????? */
function Pricing() {
  const plans = [
    { name: 'Gr?tis', price: '0 MT', period: '', usd: null as string | null, features: ['Bot?o SOS instant?neo', '2 contactos de emerg?ncia', 'Check-in programado', 'Hist?rico de 7 dias'], cta: 'Come?ar Gr?tis', popular: false },
    { name: 'Fam?lia', price: '249 MT', period: '/m?s', usd: '? $3.99 via PayPal', features: ['6 contactos de emerg?ncia', 'Radar Bluetooth (MAC + fabricante)', 'Rastreamento de viagens', 'Modo discreto (3 disfarces)', 'Alertas por SMS', 'Rota segura com GPS'], cta: 'Assinar Agora', popular: true },
    { name: 'Premium', price: '499 MT', period: '/m?s', usd: '? $7.99 via PayPal', features: ['Contactos ilimitados', 'Rastro Bluetooth com GPS (1 min)', '11 disfarces de camuflagem', 'Grava??o autom?tica de evid?ncias', '?culos e an?is inteligentes', 'Radar comunit?rio'], cta: 'Assinar Premium', popular: false },
  ]
  return (
    <Section id="precos" className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Planos</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Escolha o Plano Ideal
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">Proteja quem voc? ama ao pre?o certo ? pague com M-Pesa, e-Mola, mKesh ou PayPal.</p>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const card = (
              <GlowCard className={cn(
                'p-8 flex flex-col h-full',
                plan.popular && 'border-brand/30'
              )}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-amber-300 px-4 py-1 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    Mais Popular
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-white/40">{plan.period}</span>}
                </div>
                {plan.usd && <p className="mt-1 text-[11px] text-white/25">{plan.usd}</p>}
                <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10">
                        <Check className="h-2.5 w-2.5 text-brand" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {plan.popular ? (
                    <RippleButton className="w-full h-11">
                      <Link to="/planos">{plan.cta}</Link>
                    </RippleButton>
                  ) : (
                    <Button asChild variant="outline" className={cn('w-full h-11 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-all')}
                      >
                      <Link to="/planos">{plan.cta}</Link>
                    </Button>
                  )}
                </div>
              </GlowCard>
            )
            return (
              <motion.div key={plan.name} custom={i} variants={scaleIn}>
                {plan.popular ? <BeamBorder>{card}</BeamBorder> : card}
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  SAFETY TIPS PREVIEW                            */
/* ???????????????????????????????????????????????? */
function SafetyTipsPreview() {
  const essentials = SAFETY_TIPS.filter(t => t.essential).slice(0, 4)
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Conte?do gratuito</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">
            Dicas pr?ticas de seguran?a
          </h2>
          <p className="mt-4 text-white/40 max-w-2xl mx-auto text-sm sm:text-base">
            Preven??o ? a melhor protec??o. Come?a por estas 4 regras de ouro ? e desbloqueia
            as 45+ dicas completas dentro do app (casa, rua, chapas, online e mais).
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2">
          {essentials.map((tip, i) => (
            <motion.div
              key={tip.id}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-brand/25"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-sm font-bold text-brand">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-white">{tip.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/40">{tip.text}</p>
            </motion.div>
          ))}
        </div>
        <motion.div variants={fadeUp} custom={4} className="text-center mt-10">
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-brand/10 border border-brand/25 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
          >
            <Lightbulb className="h-4 w-4" />
            Criar conta e ver todas as {SAFETY_TIPS.length}+ dicas
          </a>
        </motion.div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  FAQ                                           */
/* ???????????????????????????????????????????????? */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const faqs = [
    {
      q: 'Como funciona o monitoramento BLE?',
      a: 'A aplica??o pode detectar sinais Bluetooth compat?veis conforme o sistema operativo, o hardware e as permiss?es. A detec??o n?o identifica necessariamente todos os dispositivos nem garante a localiza??o de uma pessoa ou objecto.',
    },
    {
      q: 'A an?lise de percurso d? uma rota por ruas?',
      a: 'N?o. A ferramenta actual calcula uma linha directa e assinala alertas comunit?rios pr?ximos. N?o calcula desvios nem substitui uma aplica??o de navega??o.',
    },
    {
      q: 'Preciso de internet para o sistema funcionar?',
      a: 'Algumas fun??es podem funcionar offline e os alertas pendentes podem ser guardados localmente. O envio s? acontece quando um canal e uma liga??o ficam dispon?veis; confirma sempre o estado do envio.',
    },
    {
      q: 'A aplica??o substitui os servi?os de emerg?ncia?',
      a: 'N?o. ? uma ferramenta complementar e n?o garante que um alerta seja recebido ou que haja assist?ncia. Contacta directamente os servi?os locais quando for necess?rio.',
    },
    {
      q: 'Posso testar antes de subscrever?',
      a: 'Sim. Pode criar uma conta gratuita e testar todas as funcionalidades. A vers?o gratuita suporta 1 dispositivo e 3 contactos de emerg?ncia.',
    },
  ]
  return (
    <Section id="perguntas-frequentes" className="py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">D?vidas Frequentes</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Perguntas Frequentes
          </h2>
        </motion.div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-colors hover:border-white/[0.1]"
              >
                <button
                  id={`faq-question-${i}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="text-sm font-medium text-white/80">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="h-4 w-4 text-brand/60" />
                  </motion.div>
                </button>
                <div id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-sm leading-relaxed text-white/40">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  FINAL CTA                                     */
/* ???????????????????????????????????????????????? */
function FinalCta() {
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={scaleIn} custom={0} className="relative overflow-hidden rounded-3xl border border-brand/20">
          <div className="absolute inset-0 bg-gradient-to-br from-brand to-amber-500" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <FloatingOrbs className="opacity-30" />
          <div className="relative z-10 p-10 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Prepare-se antes de precisar
            </h2>
            <p className="mx-auto mt-4 max-w-md text-amber-100/80">
              Conhece as op??es dispon?veis e configura a aplica??o antes de depender dela.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MagneticButton strength={0.15}>
                <RippleButton variant="outline" className="h-12 bg-white text-background font-semibold hover:bg-white/90 border-0 rounded-xl px-6" onClick={() => window.location.assign('/ativar')}>
                  Activar dispositivo <ArrowRight className="ml-2 h-4 w-4" />
                </RippleButton>
              </MagneticButton>
              <Button asChild variant="outline" className="h-12 rounded-xl border-white/20 bg-white/10 px-6 text-white hover:bg-white/15">
                <Link to="/planos">Consultar planos</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

/* ???????????????????????????????????????????????? */
/*  FOOTER                                        */
/* ???????????????????????????????????????????????? */
function Footer() {
  const columns = [
    { title: 'Produto', links: [{ label: 'Funcionalidades', href: '#funcionalidades' }, { label: 'Planos', href: '/planos' }, { label: 'Instalar', href: '/instalar' }] },
    { title: 'Acesso', links: [{ label: 'Activar dispositivo', href: '/ativar' }, { label: 'Entrar', href: '/login' }, { label: 'Perguntas frequentes', href: '#perguntas-frequentes' }] },
  ]
  return (
    <footer className="border-t border-white/[0.04] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20">
                <Shield className="h-4 w-4 text-brand" />
              </div>
              <span className="font-display text-base font-bold text-white">Status<span className="text-brand">Ads</span></span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/25">
              Seguran?a pessoal atrav?s de tecnologia BLE. Protegendo pessoas em Mo?ambique e no mundo.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-xs text-white/45 transition-colors hover:text-white/80">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/[0.04] pt-6 text-center text-xs text-white/25">
          StatusAds Connect ? Seguran?a pessoal ? Direitos reservados
        </div>
      </div>
    </footer>
  )
}

/* ???????????????????????????????????????????????? */
/*  PAGE                                          */
/* ???????????????????????????????????????????????? */
export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="dark min-h-screen bg-background text-white overflow-x-hidden">
        <ScrollProgress />
        <Navbar />
        <Hero />
        <ReliabilityHighlights />
        <HowItWorks />
        <FeaturesGrid />
        <EmergencyDemo />
        <TrustStats />
        <Pricing />
        <SafetyTipsPreview />
        <FAQ />
        <FinalCta />
        <Footer />
      </div>
    </MotionConfig>
  )
}
