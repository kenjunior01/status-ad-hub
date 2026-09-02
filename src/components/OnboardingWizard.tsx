import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, MapPin, Users, Bell, Smartphone,
  Check, ChevronRight, X, Bluetooth, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDevices } from '@/hooks/useDevices'
import { useContacts } from '@/hooks/useContacts'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import { SpotlightCard, BeamBorder, GlowCard } from '@/components/effects'
import { supabase } from '@/lib/supabase'

/**
 * OnboardingWizard
 *
 * Guided setup for new users. Shows critical steps needed to make
 * the safety system fully operational. Dismissible, only shows for
 * users with no devices AND no contacts configured.
 *
 * Steps:
 * 1. Welcome — explain the app
 * 2. GPS Permission — request location access
 * 3. Add Emergency Contact — at least 1 contact required
 * 4. Notifications — enable push + permission
 * 5. Pair Device (optional) — BLE setup
 * 6. Complete — ready to go
 */

interface Step {
  id: number
  icon: React.ElementType
  title: string
  description: string
  action: string
}

const steps: Step[] = [
  {
    id: 0,
    icon: Shield,
    title: 'Bem-vindo ao StatusAds Connect',
    description: 'A sua plataforma de seguranca pessoal. Configure os passos essenciais para activar a proteccao completa contra sequestro e emergencias.',
    action: 'Comecar Configuracao',
  },
  {
    id: 1,
    icon: MapPin,
    title: 'Permissao de Localizacao GPS',
    description: 'O GPS e essencial para rastrear a sua posicao durante uma emergencia e definir a sua zona de seguranca. Sem GPS, o sistema nao consegue activar o alarme automatico.',
    action: 'Activar GPS',
  },
  {
    id: 2,
    icon: Users,
    title: 'Adicionar Contacto de Emergencia',
    description: 'Quando uma emergencia e activada, o sistema envia SMS automaticamente com a sua localizacao GPS para todos os contactos configurados. Adicione pelo menos um contacto de confianca.',
    action: 'Adicionar Contacto',
  },
  {
    id: 3,
    icon: Bell,
    title: 'Activar Notificacoes',
    description: 'Receba alertas em tempo real mesmo com a app em fundo. As notificacoes push sao criticas para saber quando uma emergencia e activada nos seus outros dispositivos.',
    action: 'Activar Notificacoes',
  },
  {
    id: 4,
    icon: Bluetooth,
    title: 'Parear Dispositivo BLE (Opcional)',
    description: 'Parear o seu telefone com fones ou smartwatch permite detectar quando se afasta dos seus dispositivos, activando automaticamente o alerta de sequestro.',
    action: 'Parear Dispositivo',
  },
  {
    id: 5,
    icon: Check,
    title: 'Configuracao Concluida!',
    description: 'O seu sistema de seguranca esta pronto. Pode sempre voltar as Configuracoes para ajustar preferencias, adicionar mais contactos ou configurar integracoes.',
    action: 'Comecar a Usar',
  },
]

export function OnboardingWizard() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { devices } = useDevices()
  const { contacts } = useContacts()
  const { permissionState, requestPermission: requestGPS } = useGeolocation()
  const { permission: notifPermission, requestPermission: requestNotif, subscribePush, isPushSubscribed, isPushSupported } = useNotifications()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Determine if onboarding should show
  useEffect(() => {
    if (!user) return
    const dismissed = localStorage.getItem('statusads_onboarding_dismissed')
    const hasSetup = (devices.length > 0) || (contacts.length > 0)
    if (!dismissed && !hasSetup) {
      // Delay showing by 1.5s to let the page load
      const t = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [user, devices.length, contacts.length])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('statusads_onboarding_dismissed', 'true')
  }, [])

  const handleAction = useCallback(async () => {
    switch (currentStep) {
      case 0:
        // Just advance
        setCurrentStep(1)
        break

      case 1:
        // Request GPS permission
        if (permissionState === 'granted') {
          setCurrentStep(2)
        } else {
          const granted = await requestGPS()
          if (granted) {
            setCurrentStep(2)
          }
        }
        break

      case 2:
        // Navigate to contacts page
        navigate('/dashboard/contacts')
        // They'll come back — we detect contacts.length > 0
        break

      case 3:
        // Request notification permission + subscribe push
        if (notifPermission === 'granted' && isPushSubscribed) {
          setCurrentStep(4)
        } else {
          const granted = await requestNotif()
          if (granted && isPushSupported) {
            await subscribePush()
          }
          // Advance regardless (they can set up later)
          setTimeout(() => setCurrentStep(4), 500)
        }
        break

      case 4:
        // Navigate to devices (optional)
        navigate('/dashboard/devices')
        break

      case 5:
        // Complete
        setIsCompleting(true)
        // Mark profile as onboarded
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ onboarded: true } as any)
            .eq('user_id', user.id)
            .then(() => {})
        }
        localStorage.setItem('statusads_onboarding_dismissed', 'true')
        setTimeout(() => {
          setIsVisible(false)
          setIsCompleting(false)
        }, 800)
        break
    }
  }, [currentStep, permissionState, notifPermission, isPushSubscribed, isPushSupported, requestGPS, requestNotif, subscribePush, navigate, user])

  // Auto-advance past steps that are already done
  useEffect(() => {
    if (currentStep === 1 && permissionState === 'granted') {
      const t = setTimeout(() => setCurrentStep(2), 600)
      return () => clearTimeout(t)
    }
    if (currentStep === 2 && contacts.length > 0) {
      const t = setTimeout(() => setCurrentStep(3), 600)
      return () => clearTimeout(t)
    }
    if (currentStep === 3 && notifPermission === 'granted') {
      const t = setTimeout(() => setCurrentStep(4), 600)
      return () => clearTimeout(t)
    }
  }, [currentStep, permissionState, contacts.length, notifPermission])

  const step = steps[currentStep]
  if (!step) return null
  const StepIcon = step.icon
  const isLastStep = currentStep === steps.length - 1

  // Progress calculation
  const completedSteps = [
    true, // Welcome always done
    permissionState === 'granted',
    contacts.length > 0,
    notifPermission === 'granted',
    devices.length > 0,
    false, // Complete step
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0C0B08]/90 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute -top-12 right-0 p-2 rounded-xl text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-6">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-500',
                    i < currentStep
                      ? 'bg-[#D4AF37]'
                      : i === currentStep
                        ? 'bg-[#D4AF37]/40'
                        : 'bg-white/[0.06]'
                  )}
                />
              ))}
            </div>

            {/* Card */}
            {isLastStep ? (
              <BeamBorder color="#D4AF37">
                <SpotlightCard className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#D4AF37]/[0.08] border border-[#D4AF37]/20 flex items-center justify-center"
                  >
                    <Check className="h-10 w-10 text-[#D4AF37]" />
                  </motion.div>
                  <h2 className="text-xl font-display font-bold text-white mb-3">{step.title}</h2>
                  <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-sm mx-auto">{step.description}</p>
                  <Button
                    onClick={handleAction}
                    disabled={isCompleting}
                    className="bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-xl px-8 h-12 gap-2 text-sm font-semibold shadow-[0_0_30px_-5px_rgba(212,175,55,0.3)]"
                  >
                    {isCompleting ? 'A configurar...' : 'Comecar a Usar'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </SpotlightCard>
              </BeamBorder>
            ) : (
              <SpotlightCard className="p-8">
                <div className="flex items-start gap-5">
                  <div className={cn(
                    'p-3 rounded-2xl shrink-0 transition-colors',
                    completedSteps[currentStep]
                      ? 'bg-[#D4AF37]/[0.08] border border-[#D4AF37]/15'
                      : 'bg-white/[0.04] border border-white/[0.08]'
                  )}>
                    <StepIcon className={cn(
                      'h-6 w-6',
                      completedSteps[currentStep] ? 'text-[#D4AF37]' : 'text-white/40'
                    )} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-base font-display font-bold text-white">{step.title}</h2>
                      {completedSteps[currentStep] && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#D4AF37]/10 text-[10px] font-medium text-[#D4AF37]">
                          <Check className="h-2.5 w-2.5" /> Configurado
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-white/35 leading-relaxed mb-6">{step.description}</p>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleAction}
                        className={cn(
                          'rounded-xl gap-2 text-sm',
                          completedSteps[currentStep]
                            ? 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
                            : 'bg-[#D4AF37] hover:bg-[#B8962E] text-white'
                        )}
                      >
                        {completedSteps[currentStep] ? 'Continuar' : step.action}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      {!completedSteps[currentStep] && (
                        <button
                          onClick={dismiss}
                          className="text-xs text-white/20 hover:text-white/40 transition"
                        >
                          Configurar depois
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step indicators at bottom */}
                <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-white/[0.04]">
                  {steps.map((s, i) => (
                    <div
                      key={s.id}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-300',
                        i === currentStep
                          ? 'bg-[#D4AF37] w-6'
                          : completedSteps[i]
                            ? 'bg-[#D4AF37]/40'
                            : 'bg-white/[0.08]'
                      )}
                    />
                  ))}
                </div>
              </SpotlightCard>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
