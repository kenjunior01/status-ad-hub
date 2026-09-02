import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AnimatedGrid, AuroraBackground, ParticleField, FloatingOrbs,
  NoiseTexture, MagneticButton, CounterAnimated, Marquee,
  RippleButton, TextReveal, SpotlightCard, GlowCard, MorphingBlob, ScrollProgress, BeamBorder,
} from '@/components/effects'
import {
  Shield, Headphones, ShieldCheck, AlertTriangle, MapPin, Mic,
  BellOff, Crosshair, Wifi, Menu, X, ChevronRight, ChevronDown, Check,
  ArrowRight, Play, Users, Activity, Zap, Lock, Eye, Globe,
  Fingerprint, Smartphone, Radar, Sparkles, Download, Lightbulb,
} from 'lucide-react'
import { SAFETY_TIPS } from '@/lib/safety-tips'

/* ── Animation Presets ── */
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
  return (
    <motion.section id={id} ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={cn('relative', className)}>
      {children}
    </motion.section>
  )
}

/* ════════════════════════════════════════════════ */
/*  NAVBAR                                        */
/* ════════════════════════════════════════════════ */
function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Preços', href: '#precos' },
    { label: 'Emergência', href: '#emergencia' },
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
        ? 'bg-[#0C0B08]/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/20'
        : 'bg-transparent'
    )}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all group-hover:bg-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <Shield className="h-4.5 w-4.5 text-[#D4AF37] transition-transform group-hover:scale-110" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">
            Status<span className="text-[#D4AF37]">Ads</span>
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
              <Button asChild className="bg-[#D4AF37] text-white hover:bg-[#B8962E] hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.4)] transition-all duration-300 rounded-xl">
                <Link to="/ativar">Começar Agora <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white/60 md:hidden hover:text-white transition" aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="border-t border-white/[0.06] bg-[#0C0B08]/95 backdrop-blur-2xl md:hidden overflow-hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-white/60 transition hover:text-white hover:bg-white/5 rounded-xl">
                {l.label}
              </a>
            ))}
            <Button asChild className="mt-2 w-full bg-[#D4AF37] text-white hover:bg-[#B8962E] rounded-xl">
              <Link to="/ativar" onClick={() => setOpen(false)}>Começar Agora</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  )
}

/* ════════════════════════════════════════════════ */
/*  HERO                                          */
/* ════════════════════════════════════════════════ */
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
          <div className="absolute inset-8 rounded-full border border-[#D4AF37]/[0.06] animate-slow-rotate" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
          <div className="absolute inset-16 rounded-full border border-white/[0.02] animate-slow-rotate" style={{ animationDuration: '35s' }} />
        </div>
      </div>

      <MorphingBlob className="-left-32 top-1/4" color="rgba(212, 175, 55, 0.06)" size={400} />
      <MorphingBlob className="-right-32 bottom-1/4" color="rgba(212, 175, 55, 0.05)" size={350} />

      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-4 py-1.5 text-xs font-medium text-[#D4AF37] backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Protecção Pessoal Inteligente via BLE
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            A Sua Segurança.{' '}
            <span className="bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37] bg-clip-text text-transparent bg-[length:200%_auto] animate-[text-shimmer_4s_linear_infinite]">
              Um Botão de Distância.
            </span>
          </h1>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="mx-auto mt-6 max-w-2xl text-base text-white/50 leading-relaxed sm:text-lg md:text-xl">
          Monitorização por Bluetooth em tempo real para protecção pessoal.
          Pareie qualquer dispositivo BLE e active a segurança com um único toque.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MagneticButton strength={0.2}>
            <RippleButton className="h-13 px-8 text-base font-semibold" onClick={() => window.location.href = '/ativar'}>
              Activar Dispositivo <ArrowRight className="ml-2 h-4 w-4" />
            </RippleButton>
          </MagneticButton>
          <MagneticButton strength={0.15}>
            <Button variant="outline" size="lg" onClick={() => window.location.href = '/login'} className="h-13 border-white/10 bg-white/[0.03] px-8 text-base text-white/80 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 hover:text-white rounded-xl transition-all duration-300">
              <Play className="mr-2 h-4 w-4" /> Ver Demo
            </Button>
          </MagneticButton>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.8 }} className="mt-6">
          <button
            onClick={() => window.location.href = '/instalar'}
            className="inline-flex items-center gap-1.5 text-sm text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors"
          >
            <Download className="h-4 w-4" />
            PWA, App Nativa ou Camuflada? Escolha como instalar
          </button>
        </motion.div>

        <div className="mt-20 grid grid-cols-3 gap-4 sm:gap-8">
          {[
            { value: 24, suffix: '/7', label: 'Protecção Contínua' },
            { value: 3, suffix: '', label: 'Canais de Alerta: SMS · Push · Sirene' },
            { value: 0, suffix: '100%', label: 'Offline-First', isText: true },
          ].map((s, i) => (
            <motion.div key={s.label} custom={i} variants={scaleIn} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="group">
              <div className="mx-auto w-full max-w-[200px] rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition-all duration-500 group-hover:border-[#D4AF37]/20 group-hover:bg-[#D4AF37]/[0.03] group-hover:shadow-[0_0_40px_-10px_rgba(212,175,55,0.1)]">
                <p className="text-3xl font-display font-extrabold text-[#D4AF37]">
                  {s.isText ? s.suffix : <CounterAnimated target={s.value} suffix={s.suffix} decimals={(s as any).decimals || 0} />}
                </p>
                <p className="mt-1.5 text-xs text-white/40 font-medium">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ════════════════════════════════════════════════ */
/*  TRUST MARQUEE                                 */
/* ════════════════════════════════════════════════ */
function TrustMarquee() {
  const partners = ['Policia Federal', 'GSMA', 'Bluetooth SIG', 'Anatel', 'CERT.br', 'SaferNet', 'Google Cloud', 'AWS Security', 'Cloudflare']
  const items = [...partners, ...partners]
  return (
    <Section className="border-y border-white/[0.04] bg-white/[0.01] py-8">
      <motion.p variants={fadeUp} custom={0} className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
        Parceiros de Confiança
      </motion.p>
      <Marquee speed={30} className="mask-edges">
        {items.map((name, i) => (
          <span key={`${name}-${i}`} className="mx-8 text-sm font-semibold text-white/20 whitespace-nowrap transition hover:text-white/40">
            {name}
          </span>
        ))}
      </Marquee>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  HOW IT WORKS                                 */
/* ════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Pareie o Dispositivo', desc: 'Conecte qualquer dispositivo BLE — fones, pulseira ou tracker — ao seu smartphone em segundos.', Icon: Headphones },
    { num: '02', title: 'Active a Protecção', desc: 'Com um toque, active o modo de segurança que monitora a distância e o sinal do dispositivo pareado.', Icon: ShieldCheck },
    { num: '03', title: 'Um Botão Salva Vidas', desc: 'Se o sinal for perdido ou o botão de emergência pressionado, contactos e autoridades são notificados.', Icon: AlertTriangle },
  ]
  return (
    <Section id="como-funciona" className="py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Processo Simples</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Como <span className="text-gradient-safe">Funciona</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            Três passos simples entre você e a tranquilidade.
          </p>
        </motion.div>
        <div className="relative mt-20 grid grid-cols-1 gap-12 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-16 hidden h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent md:block" />
          {steps.map((step, i) => (
            <motion.div key={step.num} custom={i} variants={fadeUp} className="relative flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] backdrop-blur-sm transition-all duration-500 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 hover:shadow-[0_0_40px_-10px_rgba(212,175,55,0.15)]">
                  <step.Icon className="h-8 w-8 text-[#D4AF37]" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#0C0B08] border border-[#D4AF37]/30 text-[10px] font-bold text-[#D4AF37] font-mono">
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

/* ════════════════════════════════════════════════ */
/*  FEATURES GRID                                 */
/* ════════════════════════════════════════════════ */
function FeaturesGrid() {
  const features = [
    { title: 'Rastreamento Tempo Real', desc: 'Veja a localização exacta do seu dispositivo BLE a cada segundo no mapa interactivo.', Icon: MapPin },
    { title: 'Gravação de Áudio', desc: 'Grava automaticamente o ambiente quando o alerta é activado, para uso como prova forense.', Icon: Mic },
    { title: 'Alerta Silencioso', desc: 'Notifique contactos de emergência sem que o agressor perceba — zero som, zero vibração.', Icon: BellOff },
    { title: 'Geofencing Inteligente', desc: 'Crie zonas seguras e receba alertas instantâneos ao entrar ou sair dessas áreas.', Icon: Crosshair },
    { title: 'Rede de Dispositivos', desc: 'Aproveite outros dispositivos próximos para ampliar o alcance do sinal BLE.', Icon: Wifi },
    { title: 'Partilha com Autoridades', desc: 'Envie dados de localização e áudio directamente para a Polícia com um toque.', Icon: ShieldCheck },
  ]
  return (
    <Section id="funcionalidades" className="relative py-28 overflow-hidden">
      <ParticleField count={20} className="opacity-30" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Tecnologia Avançada</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Funcionalidades
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            Ao serviço da sua segurança pessoal.
          </p>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp}>
              <SpotlightCard className="p-7 h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/[0.08] text-[#D4AF37] border border-[#D4AF37]/10">
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

/* ════════════════════════════════════════════════ */
/*  SOCIAL PROOF / TESTIMONIALS                  */
/* ════════════════════════════════════════════════ */
function SocialProof() {
  const testimonials = [
    { name: 'Ana Costa', role: 'Empresária, Maputo', text: 'O StatusAds deu-me a tranquilidade que precisava. Agora sei que a minha família está sempre protegida.' },
    { name: 'Carlos Mondlane', role: 'Motorista, Beira', text: 'Já usei o botão de emergência duas vezes. A resposta foi imediata. Recomendo a todos.' },
    { name: 'Fernanda Nhaca', role: 'Estudante, Nampula', text: 'A interface é incrível e fácil de usar. Sinto-me muito mais segura a andar na cidade.' },
    { name: 'Roberto Silva', role: 'Pai de família, Matola', text: 'O geofencing avisa-me quando os meus filhos chegam à escola e quando saem. Perfeito.' },
  ]
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Depoimentos</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">Quem Confia em Nós</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} custom={i} variants={fadeUp}>
              <SpotlightCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/20 border border-[#D4AF37]/20 flex items-center justify-center text-sm font-bold text-[#D4AF37]">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.role}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-white/50 italic">“{t.text}”</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  EMERGENCY DEMO                                */
/* ════════════════════════════════════════════════ */
function EmergencyDemo() {
  const flow = [
    { step: 'Botão Pressionado', icon: AlertTriangle, time: '0s' },
    { step: 'GPS Capturado', icon: MapPin, time: '0.5s' },
    { step: 'Áudio Gravado', icon: Mic, time: '1.5s' },
    { step: 'Contactos Notificados', icon: Users, time: '2.5s' },
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
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400/60">Protocolo de Emergência</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Cada Segundo <span className="text-red-400">Conta</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">
            O sistema actua em menos de 3 segundos — do alerta à notificação completa.
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
                <span className="mt-1 inline-block text-[10px] font-mono text-red-400/50">{item.time}</span>
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

/* ════════════════════════════════════════════════ */
/*  TRUST STATS                                   */
/* ════════════════════════════════════════════════ */
function TrustStats() {
  const stats = [
    { value: 11, suffix: '', label: 'Modos de Camuflagem', prefix: '', decimals: 0 },
    { value: 3, suffix: '', label: 'Canais de Alerta', prefix: '', decimals: 0 },
    { value: 100, suffix: '%', label: 'Offline-First', prefix: '', decimals: 0 },
  ]
  return (
    <Section className="py-20 border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} custom={i} variants={fadeUp} className="text-center">
              <p className="font-display text-4xl font-extrabold text-[#D4AF37] sm:text-5xl">
                {s.prefix}<CounterAnimated target={s.value} suffix={s.suffix} decimals={s.decimals} />
              </p>
              <p className="mt-2 text-sm text-white/40 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  PRICING                                       */
/* ════════════════════════════════════════════════ */
function Pricing() {
  const plans = [
    { name: 'Grátis', price: '0 MT', period: '', usd: null as string | null, features: ['Botão SOS instantâneo', '2 contactos de emergência', 'Check-in programado', 'Histórico de 7 dias'], cta: 'Começar Grátis', popular: false },
    { name: 'Família', price: '249 MT', period: '/mês', usd: '≈ $3.99 via PayPal', features: ['6 contactos de emergência', 'Rastreamento de viagens', 'Modo discreto (3 disfarces)', 'Alertas por SMS', 'Rota segura com GPS', '3 dispositivos BLE'], cta: 'Assinar Agora', popular: true },
    { name: 'Premium', price: '499 MT', period: '/mês', usd: '≈ $7.99 via PayPal', features: ['Contactos ilimitados', '11 disfarces de camuflagem', 'Gravação automática de evidências', 'Óculos e anéis inteligentes', 'Radar comunitário', 'Resposta 24/7'], cta: 'Assinar Premium', popular: false },
  ]
  return (
    <Section id="precos" className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Planos</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Escolha o Plano Ideal
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">Proteja quem você ama ao preço certo — pague com M-Pesa, e-Mola, mKesh ou PayPal.</p>
        </motion.div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const card = (
              <GlowCard className={cn(
                'p-8 flex flex-col h-full',
                plan.popular && 'border-[#D4AF37]/30'
              )}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#D4AF37] to-amber-300 px-4 py-1 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(212,175,55,0.3)]">
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
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10">
                        <Check className="h-2.5 w-2.5 text-[#D4AF37]" />
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

/* ════════════════════════════════════════════════ */
/*  SAFETY TIPS PREVIEW                            */
/* ════════════════════════════════════════════════ */
function SafetyTipsPreview() {
  const essentials = SAFETY_TIPS.filter(t => t.essential).slice(0, 4)
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Conteúdo gratuito</span>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">
            Dicas de Segurança que Salvam Vidas
          </h2>
          <p className="mt-4 text-white/40 max-w-2xl mx-auto text-sm sm:text-base">
            Prevenção é a melhor protecção. Começa por estas 4 regras de ouro — e desbloqueia
            as 45+ dicas completas dentro do app (casa, rua, chapas, online e mais).
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2">
          {essentials.map((tip, i) => (
            <motion.div
              key={tip.id}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-[#D4AF37]/25"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-sm font-bold text-[#D4AF37]">
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-6 py-3 text-sm font-semibold text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20"
          >
            <Lightbulb className="h-4 w-4" />
            Criar conta e ver todas as {SAFETY_TIPS.length}+ dicas
          </a>
        </motion.div>
      </div>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  FAQ                                           */
/* ════════════════════════════════════════════════ */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const faqs = [
    {
      q: 'Como funciona o monitoramento BLE?',
      a: 'Pareie o seu smartphone com dispositivos Bluetooth próximos (fones, smartwatch). Se um dispositivo se desconectar inesperadamente, o sistema inicia um timer de 60 segundos e activa automaticamente a emergência com a sua localização GPS.',
    },
    {
      q: 'Os meus dados estão seguros?',
      a: 'Todos os dados são encriptados em trânsito e em repouso. Utilizamos Supabase com Row-Level Security. As suas localizações GPS só são partilhadas durante emergências activas.',
    },
    {
      q: 'Preciso de internet para o sistema funcionar?',
      a: 'O sistema funciona offline. Se perder conexão durante uma emergência, o pedido é guardado localmente e enviado automaticamente quando a conexão é restabelecida.',
    },
    {
      q: 'Posso testar antes de subscrever?',
      a: 'Sim. Pode criar uma conta gratuita e testar todas as funcionalidades. A versão gratuita suporta 1 dispositivo e 3 contactos de emergência.',
    },
  ]
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/70">Dúvidas Frequentes</span>
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
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm font-medium text-white/80">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="h-4 w-4 text-[#D4AF37]/60" />
                  </motion.div>
                </button>
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
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  FINAL CTA                                     */
/* ════════════════════════════════════════════════ */
function FinalCta() {
  const [email, setEmail] = useState('')
  return (
    <Section className="py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={scaleIn} custom={0} className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-amber-500" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <FloatingOrbs className="opacity-30" />
          <div className="relative z-10 p-10 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Proteja Quem Você Ama
            </h2>
            <p className="mx-auto mt-4 max-w-md text-amber-100/80">
              Crie a sua conta gratuita em menos de 30 segundos e comece a monitorizar agora.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full max-w-xs border-white/20 bg-white/15 text-white placeholder:text-white/50 focus-visible:ring-white/30 rounded-xl backdrop-blur-sm"
              />
              <MagneticButton strength={0.15}>
                <RippleButton variant="outline" className="h-12 bg-white text-[#0C0B08] font-semibold hover:bg-white/90 border-0 rounded-xl px-6" onClick={() => window.location.href = '/ativar'}>
                  Activar Dispositivo <ArrowRight className="ml-2 h-4 w-4" />
                </RippleButton>
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

/* ════════════════════════════════════════════════ */
/*  FOOTER                                        */
/* ════════════════════════════════════════════════ */
function Footer() {
  const columns = [
    { title: 'Produto', links: ['Funcionalidades', 'Preços', 'Integrações', 'API', 'Changelog'] },
    { title: 'Empresa', links: ['Sobre Nós', 'Blog', 'Carreiras', 'Imprensa', 'Parceiros'] },
    { title: 'Legal', links: ['Termos de Uso', 'Privacidade', 'Cookies', 'LGPD', 'SLA'] },
    { title: 'Suporte', links: ['Central de Ajuda', 'Contacto', 'Status', 'Comunidade', 'FAQ'] },
  ]
  return (
    <footer className="border-t border-white/[0.04] bg-[#0C0B08]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                <Shield className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <span className="font-display text-base font-bold text-white">Status<span className="text-[#D4AF37]">Ads</span></span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/25">
              Segurança pessoal através de tecnologia BLE. Protegendo pessoas em Moçambique e no mundo.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}><span className="text-xs text-white/20">{link}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/[0.04] pt-6 text-center text-xs text-white/25">
          StatusAds Connect v3.2.0 · Direitos reservados
        </div>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════ */
/*  PAGE                                          */
/* ════════════════════════════════════════════════ */
export default function Landing() {
  return (
    <div className="dark min-h-screen bg-[#0C0B08] text-white overflow-x-hidden">
      <ScrollProgress />
      <Navbar />
      <Hero />
      <TrustMarquee />
      <HowItWorks />
      <FeaturesGrid />
      <SocialProof />
      <EmergencyDemo />
      <TrustStats />
      <Pricing />
      <SafetyTipsPreview />
      <FAQ />
      <FinalCta />
      <Footer />
    </div>
  )
}
