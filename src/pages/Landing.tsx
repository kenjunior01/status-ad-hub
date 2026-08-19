import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Shield,
  MapPin,
  Mic,
  BellOff,
  Crosshair,
  Wifi,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  Headphones,
  Watch,
  AlertTriangle,
  Radio,
  Phone,
  Users,
  Building2,
  Globe,
  Lock,
  Mail,
  Check,
  ArrowRight,
  Zap,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated section wrapper with stagger                             */
/* ------------------------------------------------------------------ */
function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  1. NAVBAR                                                          */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Preços', href: '#precos' },
    { label: 'Login', href: '#login' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass shadow-lg' : 'bg-transparent'
      )}
    >
      <div className="container-safe">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="w-8 h-8 text-safe transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-safe/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Status<span className="text-gradient-safe">Ads</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Login
            </Button>
            <Button variant="safe" size="sm">
              Começar Agora
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-card mt-2 p-6 space-y-4"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-base text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-white/10">
              <Button variant="safe" className="w-full">
                Começar Agora
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  2. HERO SECTION                                                    */
/* ------------------------------------------------------------------ */

function Hero() {
  const stats = [
    { value: '2M+', label: 'Utilizadores' },
    { value: '99.9%', label: 'Uptime' },
    { value: '<3s', label: 'Tempo de Resposta' },
  ];

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero glow */}
      <div className="absolute inset-0 bg-hero-glow" />

      {/* Floating blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-safe/10 rounded-full blur-[128px] animate-float" />
      <div
        className="absolute bottom-1/4 -right-32 w-80 h-80 bg-safe/5 rounded-full blur-[100px] animate-float"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-safe/[0.03] rounded-full blur-[150px]"
      />

      {/* Floating small circles */}
      <motion.div
        className="absolute top-[20%] left-[15%] w-3 h-3 bg-safe/30 rounded-full"
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] right-[20%] w-2 h-2 bg-safe/20 rounded-full"
        animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      <motion.div
        className="absolute bottom-[35%] left-[25%] w-4 h-4 bg-emerald-400/15 rounded-full"
        animate={{ y: [0, -25, 0], opacity: [0.15, 0.35, 0.15] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
      <motion.div
        className="absolute bottom-[25%] right-[15%] w-2.5 h-2.5 bg-safe/25 rounded-full"
        animate={{ y: [0, -18, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
      />
      <motion.div
        className="absolute top-[60%] left-[70%] w-2 h-2 bg-emerald-300/20 rounded-full"
        animate={{ y: [0, -12, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Content */}
      <div className="relative z-10 container-safe text-center pt-24 pb-12">
        {/* Shield pulse animation */}
        <motion.div
          className="relative mx-auto w-24 h-24 mb-8 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full border-2 border-safe/30 animate-ping-slow" />
          <div
            className="absolute inset-0 rounded-full border border-safe/20 animate-ping-slow"
            style={{ animationDelay: '0.5s' }}
          />
          <div
            className="absolute inset-0 rounded-full border border-safe/10 animate-ping-slow"
            style={{ animationDelay: '1s' }}
          />
          {/* Shield icon */}
          <div className="relative w-16 h-16 rounded-full bg-safe/10 border border-safe/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-safe" />
            <div className="absolute inset-0 bg-safe/10 rounded-full blur-xl" />
          </div>
        </motion.div>

        {/* Badge */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass-card text-sm text-safe"
        >
          <Zap className="w-3.5 h-3.5" />
          Tecnologia Bluetooth Low Energy
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto"
        >
          A Sua Segurança.
          <br />
          <span className="text-gradient-safe">
            Um Botão de Distância.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          custom={2}
          initial="hidden"
          animate="visible"
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Transforme qualquer dispositivo Bluetooth — AirPods, óculos
          inteligentes ou smartwatch — num botão de pânico invisível.
          Rastreamento GPS, gravação automática e alerta instantâneo para
          quem você ama.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          custom={3}
          initial="hidden"
          animate="visible"
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="safe" size="xl">
            Criar Conta Grátis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button variant="outline" size="xl" className="border-white/20">
            <Eye className="w-5 h-5 mr-2" />
            Ver Demo
          </Button>
        </motion.div>

        {/* Floating stat cards */}
        <motion.div
          variants={fadeUp}
          custom={4}
          initial="hidden"
          animate="visible"
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card px-6 py-4 text-center animate-float"
            >
              <div className="text-2xl sm:text-3xl font-bold text-gradient-safe">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  3. TRUST BAR                                                       */
/* ------------------------------------------------------------------ */

function TrustBar() {
  const partners = [
    'Policia Federal',
    'GSMA',
    'Bluetooth SIG',
    'Anatel',
    'CERT.br',
    'SaferNet',
  ];

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <Section className="py-12 border-y border-white/5" id="trust">
      <div className="container-safe">
        <motion.p
          variants={fadeIn}
          custom={0}
          className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8"
        >
          Parceiros de confiança em segurança digital
        </motion.p>
        <motion.div
          ref={ref}
          variants={fadeIn}
          custom={1}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-14"
        >
          {partners.map((name) => (
            <span
              key={name}
              className="text-lg md:text-xl font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-300 select-none"
            >
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. HOW IT WORKS                                                    */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: Headphones,
      title: 'Pareie o Dispositivo',
      desc: 'Conecte o seu dispositivo BLE — AirPods, smartwatch, óculos inteligentes ou qualquer acessório Bluetooth compatível com o seu smartphone.',
    },
    {
      num: '02',
      icon: ShieldCheck,
      title: 'Active a Proteção',
      desc: 'Ative o modo de monitorização na aplicação. O sistema fica em standby, pronto para agir no momento em que precisar.',
    },
    {
      num: '03',
      icon: AlertTriangle,
      title: 'Um Botão Salva Vidas',
      desc: 'Em situação de perigo, pressione o botão do dispositivo. A sua localização é enviada instantaneamente para contactos de emergência e autoridades.',
    },
  ];

  return (
    <Section className="py-24 md:py-32" id="como-funciona">
      <div className="container-safe">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 rounded-full glass-card text-sm text-safe">
            Simples & Eficaz
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Como <span className="text-gradient-safe">Funciona</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Três passos. Um botão. Segurança total.
          </p>
        </motion.div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              className="relative glass-card p-8 text-center group hover:border-safe/30 transition-colors duration-300"
            >
              {/* Number badge */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-safe/10 border border-safe/20 text-safe font-bold text-sm mb-6 group-hover:bg-safe/20 transition-colors">
                {step.num}
              </div>

              {/* Icon */}
              <div className="mx-auto w-14 h-14 rounded-2xl bg-navy-800 border border-white/10 flex items-center justify-center mb-5 group-hover:border-safe/30 transition-colors">
                <step.icon className="w-7 h-7 text-safe" />
              </div>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.desc}
              </p>

              {/* Connector line (hidden on last item & mobile) */}
              {step.num !== '03' && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-safe/40 to-transparent" />
              )}
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  5. FEATURES GRID                                                   */
/* ------------------------------------------------------------------ */

function FeaturesGrid() {
  const features = [
    {
      icon: MapPin,
      title: 'Rastreamento em Tempo Real',
      desc: 'GPS de alta precisão com actualizações a cada segundo. Veja a localização exacta em tempo real no mapa interactivo.',
    },
    {
      icon: Mic,
      title: 'Gravação de Áudio Automática',
      desc: 'Ao activar o alerta, a gravação de áudio inicia automaticamente — prova crucial para investigações.',
    },
    {
      icon: BellOff,
      title: 'Alerta Silencioso',
      desc: 'Envie pedidos de socorro sem chamar atenção. Notificações discretas que não comprometem a sua segurança.',
    },
    {
      icon: Crosshair,
      title: 'Geofencing Inteligente',
      desc: 'Defina zonas seguras e receba alertas automáticos quando entrar ou sair dessas áreas.',
    },
    {
      icon: Wifi,
      title: 'Rede de Dispositivos',
      desc: 'Crowdsourced mesh network que amplifica o sinal BLE em áreas densas, garantindo cobertura mesmo sem internet.',
    },
    {
      icon: ShieldCheck,
      title: 'Partilha com Autoridades',
      desc: 'Integração directa com forças policiais e serviços de emergência. Relatórios automáticos com dados de localização.',
    },
  ];

  return (
    <Section className="py-24 md:py-32" id="funcionalidades">
      <div className="container-safe">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 rounded-full glass-card text-sm text-safe">
            Funcionalidades
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Proteção <span className="text-gradient-safe">Completa</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Cada funcionalidade foi projectada para oferecer segurança máxima com a menor fricção possível.
          </p>
        </motion.div>

        <StaggerContainer
          staggerDelay={0.08}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={scaleIn}
              className="glass-card p-6 lg:p-8 group hover:border-safe/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-safe/10 border border-safe/20 flex items-center justify-center mb-5 group-hover:bg-safe/20 group-hover:scale-110 transition-all duration-300">
                <f.icon className="w-6 h-6 text-safe" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  6. EMERGENCY DEMO SECTION                                          */
/* ------------------------------------------------------------------ */

function EmergencyDemo() {
  const flowSteps = [
    {
      icon: Smartphone,
      label: 'Botão Pressionado',
      time: '0s',
    },
    {
      icon: MapPin,
      label: 'GPS Capturado',
      time: '<1s',
    },
    {
      icon: Mic,
      label: 'Áudio a Gravar',
      time: '<1.5s',
    },
    {
      icon: Phone,
      label: 'Contactos & Polícia Notificados',
      time: '<3s',
    },
  ];

  return (
    <Section
      className="py-24 md:py-32 relative overflow-hidden"
      id="emergency"
    >
      {/* Red-tinted background */}
      <div className="absolute inset-0 bg-gradient-to-b from-danger/5 via-danger/10 to-transparent" />
      <div className="absolute inset-0 bg-danger-glow" />

      <div className="relative z-10 container-safe">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-danger/30 bg-danger/10 text-sm text-danger">
            <AlertTriangle className="w-3.5 h-3.5" />
            Emergência
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Em Caso de Emergência,{' '}
            <span className="text-gradient-danger">Cada Segundo Conta</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Veja como o sistema responde em menos de 3 segundos quando o
            botão de emergência é activado.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Mock phone screen */}
          <motion.div variants={fadeUp} custom={1} className="flex justify-center">
            <div className="relative w-64 sm:w-72">
              {/* Phone frame */}
              <div className="rounded-[2.5rem] border-2 border-danger/60 bg-navy-900 p-3 emergency-active">
                <div className="rounded-[2rem] bg-navy-950 overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 py-2 text-xs text-muted-foreground">
                    <span>21:47</span>
                    <div className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      <Radio className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Emergency content */}
                  <div className="px-6 pb-8 pt-4 text-center space-y-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="mx-auto w-16 h-16 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center"
                    >
                      <AlertTriangle className="w-8 h-8 text-danger" />
                    </motion.div>

                    <div>
                      <p className="text-danger font-bold text-lg">
                        ALERTA ACTIVADO
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Emergência em andamento
                      </p>
                    </div>

                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                        <MapPin className="w-4 h-4 text-danger flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Localização
                          </p>
                          <p className="text-sm font-mono">
                            -23.5505, -46.6333
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                        <Mic className="w-4 h-4 text-danger flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Áudio
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[...Array(12)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 bg-danger rounded-full"
                                  animate={{
                                    height: [
                                      '8px',
                                      `${Math.random() * 16 + 8}px`,
                                      '8px',
                                    ],
                                  }}
                                  transition={{
                                    duration: 0.5 + Math.random() * 0.3,
                                    repeat: Infinity,
                                    repeatType: 'reverse',
                                    delay: i * 0.05,
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-danger">
                              Gravando...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[10px] text-muted-foreground">
                        Contactos notificados: 3 de 3 ✓
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Polícia Militar: Notificada ✓
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow behind phone */}
              <div className="absolute inset-0 bg-danger/10 rounded-[3rem] blur-2xl -z-10" />
            </div>
          </motion.div>

          {/* Flow steps with connecting lines */}
          <motion.div variants={fadeUp} custom={2} className="space-y-0">
            {flowSteps.map((step, idx) => (
              <div key={step.label} className="relative">
                {/* Connector line */}
                {idx < flowSteps.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-px bg-gradient-to-b from-danger/40 to-danger/10" />
                )}

                <motion.div
                  variants={fadeUp}
                  custom={idx}
                  className="flex items-start gap-5 pb-8 last:pb-0"
                >
                  {/* Icon circle */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-danger" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-1">
                    <h4 className="font-semibold text-base">
                      {step.label}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Tempo de resposta: {step.time}
                    </p>
                  </div>

                  {/* Time badge */}
                  <div className="ml-auto flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-danger/10 border border-danger/20 text-xs font-mono text-danger">
                      {step.time}
                    </span>
                  </div>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  7. PRICING                                                         */
/* ------------------------------------------------------------------ */

function Pricing() {
  const plans = [
    {
      name: 'Pessoal',
      price: 'Grátis',
      period: '',
      description: 'Para quem quer protecção básica pessoal.',
      popular: false,
      features: [
        '1 dispositivo conectado',
        '3 contactos de emergência',
        '7 dias de histórico',
        'Rastreamento GPS em tempo real',
        'Alerta por notificação push',
      ],
      cta: 'Começar Grátis',
      icon: Users,
    },
    {
      name: 'Família',
      price: '$7.99',
      period: '/mês',
      description: 'Protecção completa para toda a família.',
      popular: true,
      features: [
        'Até 5 dispositivos',
        'Contactos ilimitados',
        '90 dias de histórico',
        'Geofencing inteligente',
        'Dashboard familiar',
        'Gravação de áudio automática',
        'Suporte por chat',
      ],
      cta: 'Começar Agora',
      icon: Users,
    },
    {
      name: 'Empresa',
      price: '$19.99',
      period: '/mês',
      description: 'Para organizações que precisam de segurança avançada.',
      popular: false,
      features: [
        'Dispositivos ilimitados',
        'Acesso à API completa',
        'Suporte prioritário 24/7',
        'Histórico ilimitado',
        'Relatórios avançados',
        'Integração com sistemas de segurança',
        'SLA garantido',
      ],
      cta: 'Falar com Vendas',
      icon: Building2,
    },
  ];

  return (
    <Section className="py-24 md:py-32" id="precos">
      <div className="container-safe">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 rounded-full glass-card text-sm text-safe">
            Preços
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Escolha o Plano{' '}
            <span className="text-gradient-safe">Ideal</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Comece grátis. Actualize quando precisar de mais protecção.
          </p>
        </motion.div>

        <StaggerContainer
          staggerDelay={0.12}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={scaleIn}
              className={cn(
                'relative glass-card p-8 flex flex-col',
                plan.popular &&
                  'border-safe/50 ring-1 ring-safe/20 scale-[1.02] md:scale-105'
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-safe text-xs font-semibold text-white">
                  Popular
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <plan.icon className="w-5 h-5 text-safe" />
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={cn(
                    'text-4xl font-bold',
                    plan.popular ? 'text-gradient-safe' : ''
                  )}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Features list */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Check className="w-4 h-4 text-safe flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={plan.popular ? 'safe' : 'outline'}
                className={cn(
                  'w-full',
                  !plan.popular && 'border-white/20 hover:border-safe/40'
                )}
                size="lg"
              >
                {plan.cta}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  8. FINAL CTA                                                       */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const [email, setEmail] = useState('');

  return (
    <Section className="py-24 md:py-32 relative overflow-hidden">
      {/* Green gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-safe/20 via-safe/10 to-emerald-500/5" />
      <div className="absolute inset-0 bg-hero-glow opacity-50" />\n
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-safe/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 container-safe text-center">
        <motion.div variants={fadeUp} custom={0}>
          <motion.div
            className="mx-auto w-16 h-16 rounded-full bg-safe/10 border border-safe/30 flex items-center justify-center mb-8"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Shield className="w-8 h-8 text-safe" />
          </motion.div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Proteja Quem Você{' '}
            <span className="text-gradient-safe">Ama</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Não espere que algo aconteça. A segurança pessoal começa com um
            único passo — e é grátis.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={1}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto"
        >
          <div className="relative flex-1 w-full">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="O seu melhor email"
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-navy-800/80 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-safe/50 focus:border-safe/50 transition-all"
            />
          </div>
          <Button variant="safe" size="lg" className="w-full sm:w-auto">
            Criar Conta
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        <motion.p
          variants={fadeIn}
          custom={2}
          className="mt-4 text-xs text-muted-foreground"
        >
          Sem cartão de crédito. Configuração em 30 segundos.
        </motion.p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  9. FOOTER                                                          */
/* ------------------------------------------------------------------ */

function Footer() {
  const columns = [
    {
      title: 'Produto',
      links: [
        'Funcionalidades',
        'Preços',
        'Como Funciona',
        'Integrações',
        'API',
      ],
    },
    {
      title: 'Empresa',
      links: ['Sobre Nós', 'Blog', 'Carreiras', 'Imprensa', 'Parceiros'],
    },
    {
      title: 'Legal',
      links: [
        'Termos de Uso',
        'Política de Privacidade',
        'Cookies',
        'LGPD',
      ],
    },
    {
      title: 'Suporte',
      links: [
        'Central de Ajuda',
        'Contacto',
        'Status do Sistema',
        'Comunidade',
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5 bg-navy-950/50">
      <div className="container-safe py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <Shield className="w-7 h-7 text-safe" />
              <span className="text-lg font-bold">
                Status<span className="text-gradient-safe">Ads</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Segurança pessoal através de tecnologia Bluetooth Low Energy.
              Proteja quem você ama com um simples toque.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-safe hover:border-safe/30 transition-all"
                aria-label="Globe"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-safe hover:border-safe/30 transition-all"
                aria-label="Lock"
              >
                <Lock className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StatusAds Connect — statusmonetize.com.
            Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Feito com <span className="text-safe">♥</span> para a sua segurança.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE                                                       */
/* ------------------------------------------------------------------ */

export default function Landing() {
  return (
    <div className="dark min-h-screen bg-navy-900 text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <FeaturesGrid />
      <EmergencyDemo />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
