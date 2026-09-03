/**
 * FeatureTour — Tutorial de boas-vindas (primeira entrada)
 *
 * Passeio interativo de 7 passos que ensina a USAR as funcionalidades
 * principais: SOS, Check-in, Camuflagem (activar + voltar com PIN),
 * Gravação de Evidências, Chamada Falsa, Deteccao de Queda e Dicas.
 *
 * - Mostra UMA vez na primeira entrada no dashboard (por utilizador,
 *   localStorage `statusads-tour-done-<userId>`).
 * - Pode ser revisto a qualquer momento: evento global
 *   `statusads:start-tour` (disparado pelo card "Tutorial do App"
 *   nas Acções Rápidas) ou botão no fim.
 * - Ignorável ("Saltar tutorial") a qualquer momento.
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Siren, ShieldCheck, Fingerprint, Mic, PhoneIncoming,
  PersonStanding, Lightbulb, ChevronLeft, ChevronRight, X, Check,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/native'

interface TourStep {
  id: string
  icon: React.ElementType
  badge: string
  title: string
  description: string
  howTo: string[]
  link?: { label: string; to: string }
  accent: string // classe de cor do ícone
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: GraduationCap,
    badge: 'TUTORIAL',
    title: 'Bem-vindo ao StatusAds Connect',
    description:
      'Esta é a sua app de protecção pessoal anti-sequestro. Em menos de 1 minuto, mostramos-lhe como usar as funcionalidades que podem salvar a sua vida — e a de quem você ama.',
    howTo: [
      'Toque em "Seguinte" para avançar no tutorial',
      'Pode saltar quando quiser — rever depois nas Acções Rápidas',
    ],
    accent: 'text-[#D4AF37]',
  },
  {
    id: 'sos',
    icon: Siren,
    badge: 'EMERGÊNCIA',
    title: 'Botão SOS — a sua linha directa',
    description:
      'O botão SOS (flutuante em qualquer ecrã) envia a sua localização GPS, SMS e notificações a todos os contactos de emergência, e dispara a sirene.',
    howTo: [
      'Mantenha pressionado 2 segundos para activar',
      'Ou toque 3 vezes seguidas para disparo instantâneo',
      'Funciona mesmo offline — sincroniza quando a rede volta',
    ],
    link: { label: 'Abrir Acções Rápidas', to: '/dashboard/accoes' },
    accent: 'text-red-400',
  },
  {
    id: 'checkin',
    icon: ShieldCheck,
    badge: 'PROVA DE VIDA',
    title: 'Check-in Seguro e Dead Man\'s Switch',
    description:
      'Vai para uma zona de risco? Marque um Check-in com prazo. Se não confirmar que está bem a tempo, o sistema assume que algo correu mal e alerta os seus contactos automaticamente.',
    howTo: [
      'Acções Rápidas → "Check-in Seguro" → defina a duração',
      'Dead Man\'s Switch: configure o intervalo em Segurança',
      'Não confirmar a tempo = SOS automático silencioso',
    ],
    link: { label: 'Configurar Check-in', to: '/dashboard/checkin' },
    accent: 'text-amber-300',
  },
  {
    id: 'disguise',
    icon: Fingerprint,
    badge: 'CAMUFLAGEM',
    title: 'Camuflagem — a app vira outra coisa',
    description:
      'Sob coacção, transforme a app numa calculadora, notas, câmbio e mais 9 disfarces. O SOS continua activo em background. Ninguém vê que é uma app de segurança.',
    howTo: [
      'Acções Rápidas → "Escolher Camuflagem" → Active',
      'A app muda de aspecto, título e ícone da aba',
      'Para voltar: long-press (2s) no canto superior esquerdo → digite o PIN',
      'Sob ameaça? Use o Duress PIN — abre "normal" mas dispara SOS silencioso',
    ],
    link: { label: 'Escolher Camuflagem', to: '/dashboard/camuflar' },
    accent: 'text-purple-300',
  },
  {
    id: 'record',
    icon: Mic,
    badge: 'PROVA',
    title: 'Gravação de Evidências',
    description:
      'Grave áudio em qualquer momento de ameaça — fica salvo no Cofre e sincroniza com o histórico da sua conta na nuvem, disponível mesmo que troque ou perca o telemóvel. Pode partilhar cada gravação por WhatsApp, SMS ou e-mail com quem confia.',
    howTo: [
      'Acções Rápidas → "Gravação Rápida" → toque para começar',
      'Toque de novo para parar — guarda sozinho no Cofre',
      'No Cofre: Partilhar envia o áudio; o botão Sincronizar sobe tudo à nuvem',
    ],
    link: { label: 'Abrir Cofre de Evidências', to: '/dashboard/evidencias' },
    accent: 'text-[#D4AF37]',
  },
  {
    id: 'escapes',
    icon: PhoneIncoming,
    badge: 'ESCAPATÓRIOS',
    title: 'Chamada Falsa e Deteccao de Queda',
    description:
      'Precisa de sair de uma situação desconfortável? Agende uma chamada realista para o seu telemóvel. E se sofrer uma queda violenta, a app detecta e dispara SOS sozinha.',
    howTo: [
      'Acções Rápidas → "Chamada Falsa" → escolha quem "liga" e quando',
      'Acções Rápidas → "Deteccao de Queda" → Active a monitorização',
      'Queda detectada sem resposta = SOS automático em 15s',
    ],
    link: { label: 'Configurar Chamada Falsa', to: '/dashboard/chamada-falsa' },
    accent: 'text-violet-300',
  },
  {
    id: 'tips',
    icon: Lightbulb,
    badge: 'CONHECIMENTO',
    title: '50 Dicas de Segurança + Protecção Activada',
    description:
      'Todas as semanas há dicas novas práticas para Moçambique — casa, rua, chapas, online. A "Dica de Hoje" aparece sempre no seu Painel. Está pronto: proteja-se e proteja quem está longe.',
    howTo: [
      'Sidebar → "Dicas de Segurança" para ver as 50 dicas',
      'Defina o PIN de coerção e contactos em Configurações',
      'Instale a app como PWA ou APK para protecção total',
    ],
    link: { label: 'Ver Dicas de Segurança', to: '/dashboard/dicas' },
    accent: 'text-lime-300',
  },
]

const TOUR_FLAG = 'statusads-tour-done'

export function FeatureTour() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [finished, setFinished] = useState(false)

  const storageKey = user ? `${TOUR_FLAG}-${user.id}` : null
  const step = TOUR_STEPS[stepIndex]
  const isLast = stepIndex === TOUR_STEPS.length - 1

  const close = useCallback(
    (markDone = true) => {
      setIsOpen(false)
      if (markDone && storageKey) localStorage.setItem(storageKey, '1')
      void haptic('light')
    },
    [storageKey]
  )

  // Mostra automaticamente na primeira entrada no dashboard
  useEffect(() => {
    if (!storageKey) return
    const seen = localStorage.getItem(storageKey)
    if (!seen) {
      const t = setTimeout(() => setIsOpen(true), 900) // deixa o dashboard pintar
      return () => clearTimeout(t)
    }
  }, [storageKey])

  // Replay manual via evento global (card Tutorial do App)
  useEffect(() => {
    const handler = () => {
      setFinished(false)
      setStepIndex(0)
      setIsOpen(true)
    }
    window.addEventListener('statusads:start-tour', handler)
    return () => window.removeEventListener('statusads:start-tour', handler)
  }, [])

  const next = () => {
    void haptic('light')
    if (isLast) {
      setFinished(true)
      close(true)
    } else {
      setStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1))
    }
  }

  const prev = () => {
    void haptic('light')
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  const goLink = (to: string) => {
    close(true)
    navigate(to)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Tutorial de funcionalidades"
        >
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-lg rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#171410] to-[#0C0B08] p-6 sm:p-8 shadow-2xl shadow-[#D4AF37]/10"
          >
            {/* Fechar / saltar */}
            <button
              onClick={() => close(true)}
              className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              aria-label="Saltar tutorial"
            >
              <X className="h-3.5 w-3.5" /> Saltar
            </button>

            {/* Ícone */}
            <div
              className={cn(
                'mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg',
                step.accent
              )}
            >
              <step.icon className="h-8 w-8" strokeWidth={1.6} />
            </div>

            {/* Badge + título */}
            <div className="text-center">
              <span className="inline-block rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-0.5 text-[10px] font-bold tracking-widest text-[#D4AF37]">
                {step.badge}
              </span>
              <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{step.description}</p>
            </div>

            {/* Como usar */}
            <ul className="mt-5 space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              {step.howTo.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            {/* Link de acção */}
            {step.link && (
              <button
                onClick={() => goLink(step.link!.to)}
                className="mt-4 w-full rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 py-2.5 text-sm font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20"
              >
                {step.link.label} →
              </button>
            )}

            {/* Navegação */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={prev}
                disabled={stepIndex === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>

              {/* Progresso */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setStepIndex(i)}
                    aria-label={`Passo ${i + 1}`}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === stepIndex ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                    )}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="flex items-center gap-1 rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
              >
                {isLast ? 'Concluir' : 'Seguinte'} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Dispara o tutorial de qualquer parte da app (ex.: card nas Acções Rápidas) */
export function startFeatureTour(): void {
  window.dispatchEvent(new CustomEvent('statusads:start-tour'))
}
