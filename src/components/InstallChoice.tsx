import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone, Shield, EyeOff, Check, X, Download,
  Bluetooth, RefreshCw, Calculator, CloudSun, NotebookPen, Clock,
  BookUser, Settings, Music, Banknote, Flashlight, MessageSquare,
  Images, ChevronRight, Apple, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/usePWA'
import { SpotlightCard } from '@/components/effects'
import { cn } from '@/lib/utils'
import type { DiscreetModeType } from '@/lib/types'

/**
 * InstallChoice — Escolha de instalação
 *
 * Deixa o utilizador decidir COMO instalar:
 *  1. PWA — instalação instantânea (Android/Desktop/Chrome)
 *  2. App Nativa (Capacitor) — BLE 24/7 em segundo plano (anti-rapto real)
 *  3. Camuflada — instala como PWA mas escolhe o disfarce da app
 */

type Mode = 'menu' | 'pwa' | 'native' | 'camo'

const DISGUISES: Array<{ type: DiscreetModeType; label: string; icon: React.ElementType; hint: string }> = [
  { type: 'calculator', label: 'Calculadora', icon: Calculator, hint: 'Clássico invisível' },
  { type: 'weather', label: 'Meteorologia', icon: CloudSun, hint: 'Inocente e útil' },
  { type: 'notes', label: 'Notas', icon: NotebookPen, hint: 'Discreto no trabalho' },
  { type: 'clock', label: 'Relógio', icon: Clock, hint: 'Minimalista' },
  { type: 'contacts', label: 'Contactos', icon: BookUser, hint: 'Agenda normal' },
  { type: 'settings_app', label: 'Definições', icon: Settings, hint: 'Invisível ao olhar' },
  { type: 'music_player', label: 'Música', icon: Music, hint: 'Popular entre jovens' },
  { type: 'currency', label: 'Câmbio', icon: Banknote, hint: 'Credível para negócios' },
  { type: 'flashlight', label: 'Lanterna', icon: Flashlight, hint: 'Utilitária pura' },
  { type: 'sms_chat', label: 'Mensagens', icon: MessageSquare, hint: 'Parece o SMS nativo' },
  { type: 'photo_gallery', label: 'Galeria', icon: Images, hint: 'Fotos e nada mais' },
]

export function InstallChoice({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const { isInstallable, installApp } = usePWA()
  const [mode, setMode] = useState<Mode>('menu')
  const [disguise, setDisguise] = useState<DiscreetModeType | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document)

  const savePendingDisguise = (type: DiscreetModeType) => {
    try {
      localStorage.setItem('statusads-pending-disguise', type)
    } catch { /* storage indisponível */ }
  }

  const doInstall = async (type: DiscreetModeType | null) => {
    if (type) savePendingDisguise(type)
    setInstalling(true)
    try {
      if (isInstallable) {
        await installApp()
        setInstalled(true)
      }
    } finally {
      setInstalling(false)
    }
  }

  const Card = ({
    icon: Icon, badge, title, desc, features, onClick, cta, accent = false,
  }: {
    icon: React.ElementType; badge: string; title: string; desc: string
    features: string[]; onClick: () => void; cta: string; accent?: boolean
  }) => (
    <SpotlightCard
      className={cn(
        'relative p-6 flex flex-col gap-4 cursor-pointer transition-all duration-300 rounded-2xl border',
        accent
          ? 'border-brand/40 bg-brand/[0.04] hover:bg-brand/[0.08]'
          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
      )}
    >
      <div onClick={onClick}>
        <div className="flex items-start justify-between">
          <div className={cn(
            'p-3 rounded-2xl border',
            accent ? 'bg-brand/10 border-brand/25' : 'bg-white/[0.04] border-white/[0.08]'
          )}>
            <Icon className={cn('h-6 w-6', accent ? 'text-brand' : 'text-white/70')} strokeWidth={1.5} />
          </div>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border',
            accent ? 'text-brand border-brand/30 bg-brand/10' : 'text-white/40 border-white/10 bg-white/[0.03]'
          )}>
            {badge}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/40 leading-relaxed">{desc}</p>
        <ul className="mt-4 space-y-2">
          {features.map(f => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-white/60">
              <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" strokeWidth={2} />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <Button
        onClick={onClick}
        className={cn(
          'w-full mt-auto rounded-xl gap-2 font-semibold',
          accent
            ? 'bg-brand hover:bg-brand-dark text-black'
            : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10'
        )}
      >
        {cta} <ChevronRight className="h-4 w-4" />
      </Button>
    </SpotlightCard>
  )

  return (
    <div className={cn(
      'min-h-screen bg-background text-white overflow-y-auto',
      embedded && 'fixed inset-0 z-[80] bg-background/95 backdrop-blur-xl'
    )}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {mode !== 'menu' ? (
            <button
              onClick={() => setMode('menu')}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          ) : <span />}
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] transition">
              <X className="h-5 w-5 text-white/40" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== MENU PRINCIPAL ===== */}
          {mode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 border border-brand/25">
                  <Download className="h-8 w-8 text-brand" strokeWidth={1.5} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Como queres instalar?
                </h1>
                <p className="mt-3 text-white/40 max-w-xl mx-auto">
                  Escolhe o formato de instalação. Podes mudar ou instalar mais do que um em qualquer altura.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Card
                  icon={Smartphone}
                  badge="Instantâneo"
                  title="PWA"
                  desc="Instala directamente do navegador, sem loja de aplicações."
                  features={[
                    'Instalação em 10 segundos',
                    'Actualizações automáticas',
                    'Sem armazenamento extra',
                    'Android, Windows, macOS, Linux',
                  ]}
                  onClick={() => setMode('pwa')}
                  cta="Instalar PWA"
                  accent
                />
                <Card
                  icon={Bluetooth}
                  badge="Máxima protecção"
                  title="App Nativa"
                  desc="Android/iOS via Capacitor. Obrigatória para anti-rapto 24/7."
                  features={[
                    'BLE monitoriza com ecrã bloqueado',
                    'Sirene e SMS mesmo em fundo',
                    'Detecção de remoção do dispositivo',
                    'Recomendada para smart ring / óculos',
                  ]}
                  onClick={() => setMode('native')}
                  cta="Ver instruções"
                />
                <Card
                  icon={EyeOff}
                  badge="Discreta"
                  title="Camuflada"
                  desc="A app instala-se disfarçada de outra aplicação à tua escolha."
                  features={[
                    '11 disfarces: calculadora, clima, SMS…',
                    'Ícone e nome não revelam a app',
                    'SOS activo dentro do disfarce',
                    'Ideal em situações de risco',
                  ]}
                  onClick={() => setMode('camo')}
                  cta="Escolher disfarce"
                />
              </div>

              <p className="mt-8 text-center text-xs text-white/25">
                Conselho de segurança: em telemóveis Android, a App Nativa oferece a detecção de
                remoção forçada mais fiável; a PWA é ideal para começar agora mesmo.
              </p>
            </motion.div>
          )}

          {/* ===== PWA ===== */}
          {mode === 'pwa' && (
            <motion.div
              key="pwa"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="max-w-lg mx-auto"
            >
              <div className="text-center mb-8">
                <Smartphone className="h-12 w-12 text-brand mx-auto mb-4" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold">Instalar como PWA</h2>
              </div>

              {installed ? (
                <SpotlightCard className="p-8 text-center border-brand/30 bg-brand/[0.04] rounded-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 border border-brand/30">
                    <Check className="h-7 w-7 text-brand" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold">Instalação iniciada!</h3>
                  <p className="mt-2 text-sm text-white/40">
                    Confirma a janela do navegador para adicionar à tua área de trabalho.
                  </p>
                </SpotlightCard>
              ) : isIOS ? (
                <SpotlightCard className="p-6 border-white/10 bg-white/[0.02] rounded-2xl">
                  <h3 className="font-bold flex items-center gap-2">
                    <Apple className="h-5 w-5" /> iPhone / iPad — instalação manual
                  </h3>
                  <ol className="mt-4 space-y-3 text-sm text-white/60">
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">1</span> Toca no botão <strong>Partilhar</strong> (quadrado com seta) no Safari</li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">2</span> Escolhe <strong>“Adicionar ao Ecrã Principal”</strong></li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">3</span> Toca em <strong>Adicionar</strong> — pronto, a app aparece como ícone</li>
                  </ol>
                </SpotlightCard>
              ) : isInstallable ? (
                <SpotlightCard className="p-8 text-center border-brand/30 bg-brand/[0.04] rounded-2xl">
                  <p className="text-sm text-white/50 mb-6">
                    O teu navegador suporta instalação directa. Clica abaixo e confirma.
                  </p>
                  <Button
                    onClick={() => doInstall(null)}
                    disabled={installing}
                    size="lg"
                    className="w-full bg-brand hover:bg-brand-dark text-black font-bold rounded-xl h-12"
                  >
                    {installing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {installing ? 'A instalar…' : 'Instalar Agora'}
                  </Button>
                </SpotlightCard>
              ) : (
                <SpotlightCard className="p-6 border-white/10 bg-white/[0.02] rounded-2xl">
                  <h3 className="font-bold">Instalação manual</h3>
                  <ol className="mt-4 space-y-3 text-sm text-white/60">
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">1</span> Abre o menu do navegador (⋮ no Chrome)</li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">2</span> Toca em <strong>“Instalar aplicação”</strong> ou <strong>“Adicionar ao ecrã principal”</strong></li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs font-bold">3</span> Confirma — o ícone aparece na tua área de trabalho</li>
                  </ol>
                </SpotlightCard>
              )}
            </motion.div>
          )}

          {/* ===== NATIVA ===== */}
          {mode === 'native' && (
            <motion.div
              key="native"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="max-w-lg mx-auto"
            >
              <div className="text-center mb-8">
                <Bluetooth className="h-12 w-12 text-brand mx-auto mb-4" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold">App Nativa (Android / iOS)</h2>
                <p className="mt-2 text-sm text-white/40">
                  A protecção anti-rapto completa exige a app nativa: o navegador suspende o
                  Bluetooth quando o ecrã bloqueia — a nativa não.
                </p>
              </div>

              <SpotlightCard className="p-6 border-white/10 bg-white/[0.02] rounded-2xl space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand" /> APK v3.2.0 já compilada e assinada
                </h3>
                <p className="text-sm text-white/50">
                  A versão Android nativa está pronta: <code className="text-brand">StatusAdsConnect-v3.2.0.apk</code>{' '}
                  (6.7 MB, assinada, Android 7.0+). Instala activando "Fontes desconhecidas".
                  Para recompilar com actualizações, o guia{' '}
                  <code className="text-brand">BUILD-NATIVA.md</code> tem os comandos verificados:
                </p>
                <div className="rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-[12px] leading-relaxed">
                  <div><span className="text-white/30">$</span> npm run build && npx cap sync</div>
                  <div><span className="text-white/30">$</span> cd android && ./gradlew assembleRelease</div>
                </div>
                <ul className="space-y-2 text-[13px] text-white/60">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand shrink-0 mt-0.5" /> GPS nativo, haptics e status bar dourada via plugins Capacitor</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand shrink-0 mt-0.5" /> Permissões incluídas: localização, câmara, microfone, sensores de queda, notificações</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand shrink-0 mt-0.5" /> Suporta build camuflado (nome e ícone à escolha no momento de compilar)</li>
                </ul>
              </SpotlightCard>
            </motion.div>
          )}

          {/* ===== CAMUFLAGEM ===== */}
          {mode === 'camo' && (
            <motion.div
              key="camo"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <EyeOff className="h-12 w-12 text-brand mx-auto mb-4" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold">Escolhe o disfarce</h2>
                <p className="mt-2 text-sm text-white/40">
                  O ícone e o ecrã inicial mostrarão a app disfarçada. O SOS continua activo dentro do disfarce.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {DISGUISES.map(d => (
                  <button
                    key={d.type}
                    onClick={() => setDisguise(d.type)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition-all',
                      disguise === d.type
                        ? 'border-brand/60 bg-brand/[0.08]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    )}
                  >
                    <d.icon className={cn(
                      'h-6 w-6 mb-2',
                      disguise === d.type ? 'text-brand' : 'text-white/50'
                    )} strokeWidth={1.5} />
                    <div className="text-sm font-semibold">{d.label}</div>
                    <div className="text-[11px] text-white/30">{d.hint}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => doInstall(disguise)}
                  disabled={!disguise || installing}
                  size="lg"
                  className="w-full bg-brand hover:bg-brand-dark text-black font-bold rounded-xl h-12 disabled:opacity-40"
                >
                  {installing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <EyeOff className="h-5 w-5" />}
                  {!disguise ? 'Escolhe um disfarce primeiro' : installing ? 'A instalar…' : 'Instalar Camuflado'}
                </Button>
                {disguise && (
                  <p className="mt-3 text-center text-xs text-white/30">
                    Disfarce guardado. Depois do primeiro login, a app aplica-o automaticamente no
                    modo discreto. Dica: em Android podes renomear o atalho para o nome do disfarce.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default InstallChoice
