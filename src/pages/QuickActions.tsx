/**
 * QuickActions — Painel de Acções Rápidas de Segurança.
 * 
 * Acesso instantâneo a TODAS as funcionalidades de segurança:
 * - SOS de emergência
 * - Modo Pânico (bloqueio + gravação)
 * - Modo Discreto (camuflagem)
 * - SOS por Voz
 * - Dead Man's Switch
 * - Detecção de Ameaças
 * - Radar Comunitário
 * - Rota Segura
 * - Óculos Inteligentes
 * - Check-in Rápido
 * 
 * Tudo num único ecrã com acesso imediato.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Mic, Eye, EyeOff, Skull, Radar, Navigation,
  Route, Glasses, ShieldCheck, Timer, Shield, AlertTriangle,
  Camera, Radio, Volume2, Lock, Fingerprint, Users, MapPin,
  Zap, ChevronRight, Activity, Moon, Map, Phone, Share2, Clock,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useEmergency } from '@/hooks/useEmergency'
import { usePanicMode } from '@/hooks/usePanicMode'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useVoiceSOS } from '@/hooks/useVoiceSOS'
import { useDeadMansSwitch } from '@/hooks/useDeadMansSwitch'
import { useThreatDetection } from '@/hooks/useThreatDetection'
import { useCommunityRadar } from '@/hooks/useCommunityRadar'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useTripTracking } from '@/hooks/useTripTracking'
import { toast } from 'sonner'
import { SpotlightCard, GlowCard, BeamBorder } from '@/components/effects'
import { QuickDisguiseSelector } from '@/components/DisguisePicker'
import { SafetyScoreGauge, useSafetyScore } from '@/components/SafetyScoreGauge'
import { EmergencyQuickDial } from '@/components/EmergencyQuickDial'
import { LocationShareLink } from '@/components/LocationShareLink'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  action: () => void
  isActive?: boolean
  activeLabel?: string
  danger?: boolean
  badge?: string
}

export default function QuickActions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { triggerEmergency, isTriggering } = useEmergency()
  const { state: panicState, activate: activatePanic } = usePanicMode()
  const { isActive: isDiscreet, activate: activateDiscreet } = useDiscreetMode()
  const { isListening: voiceListening, startListening, stopListening, isSupported: voiceSupported, isConfirmationPending } = useVoiceSOS()
  const { isEnabled: dmsEnabled, secondsRemaining: dmsRemaining, currentLevel: dmsLevel, enable: dmsEnable, acknowledge: dmsAck, disable: dmsDisable } = useDeadMansSwitch()
  const { assessment, isMonitoring: threatMonitoring, startMonitoring: startThreat, stopMonitoring: stopThreat } = useThreatDetection()
  const { dangerZoneCount } = useCommunityRadar()
  const { position } = useGeolocation()
  const { connections } = useBluetooth()
  const { isTracking } = useTripTracking()
  const { score: safetyScore, factors: safetyFactors, level: safetyLevel } = useSafetyScore()

  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [showPanicConfirm, setShowPanicConfirm] = useState(false)

  // Format DMS timer
  const formatDMSTimer = useCallback((secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  // Emergency SOS
  const handleEmergency = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => triggerEmergency({ latitude: -25.9692, longitude: 32.5732 }),
      { enableHighAccuracy: true, timeout: 5000 }
    )
    setShowEmergencyConfirm(false)
  }, [triggerEmergency])

  // Quick actions list
  const actions: QuickAction[] = [
    // CRITICAL ACTIONS
    {
      id: 'emergency-sos',
      title: 'SOS de Emergência',
      description: 'Alertar todos os contactos + SMS + GPS',
      icon: ShieldAlert,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      action: () => setShowEmergencyConfirm(true),
      danger: true,
      badge: 'CRÍTICO',
    },
    {
      id: 'panic-mode',
      title: 'Modo Pânico',
      description: 'Bloqueio + gravação áudio + fotos + SOS',
      icon: Skull,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      action: () => setShowPanicConfirm(true),
      isActive: panicState.isActive,
      activeLabel: panicState.isActive ? `GRAVANDO ${panicState.photosCaptured.length} fotos` : undefined,
      danger: true,
    },
    {
      id: 'discreet-mode',
      title: 'Modo Discreto',
      description: 'Camuflar app como calculadora/clima',
      icon: isDiscreet ? EyeOff : Eye,
      color: isDiscreet ? 'text-purple-400' : 'text-purple-300',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      action: () => isDiscreet ? toast.info('Modo activo. Long-press no canto superior esquerdo.') : activateDiscreet(),
      isActive: isDiscreet,
      activeLabel: 'APP CAMUFLADA',
      badge: 'STEALTH',
    },

    // VOICE & DETECTION
    {
      id: 'voice-sos',
      title: 'SOS por Voz',
      description: voiceSupported
        ? (voiceListening
          ? (isConfirmationPending ? 'Diga "confirmar" para activar' : 'A ouvir... diga "socorro" ou "ajuda"')
          : 'Activar detecção de voz mãos-livres')
        : 'Não suportado neste navegador',
      icon: Mic,
      color: voiceListening ? 'text-amber-300' : 'text-blue-300',
      bgColor: voiceListening ? 'bg-amber-400/10' : 'bg-blue-500/10',
      borderColor: voiceListening ? 'border-amber-400/20' : 'border-blue-500/20',
      action: voiceListening ? stopListening : startListening,
      isActive: voiceListening,
      activeLabel: voiceListening ? 'A OUVIR' : undefined,
      badge: voiceSupported ? 'MÃOS-LIVRES' : 'N/A',
    },
    {
      id: 'threat-detection',
      title: 'Detecção de Ameaças',
      description: threatMonitoring
        ? `Score: ${assessment.score}/100 — ${assessment.level}`
        : 'Monitorizar sensores para padrões anómalos',
      icon: Activity,
      color: assessment.level === 'critical' ? 'text-red-400' : assessment.level === 'high' ? 'text-amber-400' : assessment.level === 'elevated' ? 'text-yellow-400' : 'text-cyan-300',
      bgColor: assessment.level === 'critical' ? 'bg-red-500/10' : 'bg-cyan-500/10',
      borderColor: assessment.level === 'critical' ? 'border-red-500/20' : 'border-cyan-500/20',
      action: threatMonitoring ? stopThreat : startThreat,
      isActive: threatMonitoring,
      activeLabel: threatMonitoring ? `${assessment.score}%` : undefined,
    },

    // AUTOMATION
    {
      id: 'dead-mans-switch',
      title: 'Dead Man\'s Switch',
      description: dmsEnabled
        ? (dmsLevel === 'idle'
          ? `Timer: ${formatDMSTimer(dmsRemaining)} — activo`
          : dmsLevel === 'warning'
            ? `AVISO! Responda em ${formatDMSTimer(dmsRemaining)}`
            : `ESCALONADO! Nível: ${dmsLevel}`)
        : 'Emergência automática se não responder',
      icon: Timer,
      color: dmsLevel === 'emergency' ? 'text-red-400' : dmsLevel === 'warning' ? 'text-amber-400' : dmsEnabled ? 'text-orange-300' : 'text-orange-200',
      bgColor: dmsEnabled ? 'bg-orange-500/10' : 'bg-orange-500/5',
      borderColor: dmsEnabled ? 'border-orange-500/20' : 'border-orange-500/10',
      action: dmsEnabled ? dmsDisable : () => dmsEnable(30),
      isActive: dmsEnabled,
      activeLabel: dmsEnabled ? (dmsLevel === 'idle' ? 'ACTIVO' : dmsLevel.toUpperCase()) : undefined,
      badge: 'AUTOMÁTICO',
    },

    // INTELLIGENCE
    {
      id: 'community-radar',
      title: 'Radar Comunitário',
      description: dangerZoneCount > 0
        ? `${dangerZoneCount} alerta(s) de segurança na área`
        : 'Ver alertas de segurança de outros utilizadores',
      icon: Radar,
      color: dangerZoneCount > 0 ? 'text-amber-400' : 'text-teal-300',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/20',
      action: () => navigate('/dashboard/radar'),
      badge: dangerZoneCount > 0 ? `${dangerZoneCount} NOVO(S)` : undefined,
    },
    {
      id: 'safe-route',
      title: 'Rota Segura',
      description: 'Calcular rota mais segura até ao destino',
      icon: Navigation,
      color: 'text-amber-200',
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/20',
      action: () => navigate('/dashboard/rota'),
    },

    // WEARABLE
    {
      id: 'smart-glasses',
      title: 'Óculos Inteligentes',
      description: Object.keys(connections).length > 0
        ? `${Object.keys(connections).length} dispositivo(s) conectado(s)`
        : 'Configurar SG15/SG16 para segurança',
      icon: Glasses,
      color: 'text-pink-300',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
      action: () => navigate('/dashboard/oculos'),
    },

    // VERIFICATION
    {
      id: 'checkin',
      title: 'Check-in Seguro',
      description: 'Verificação de segurança com prova de vida',
      icon: ShieldCheck,
      color: 'text-amber-200',
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/20',
      action: () => navigate('/dashboard/checkin'),
    },
    // DISGUISE CONFIGURATION — redirect to visual picker
    {
      id: 'disguise-config',
      title: 'Escolher Camuflagem',
      description: 'Seleccionar entre 11 disfarces com preview ao vivo',
      icon: Fingerprint,
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      action: () => navigate('/dashboard/camuflar'),
      badge: '11 DISFARCES',
    },
    // NIGHT SAFETY
    {
      id: 'night-safety',
      title: 'Modo Nocturno',
      description: 'Segurança aumentada automaticamente à noite',
      icon: Moon,
      color: 'text-indigo-300',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      action: () => toast.info('Configure nas Configurações o horário de activação'),
      badge: 'AUTO',
    },
    // TRIP TRACKING
    {
      id: 'trip-tracking',
      title: 'Rastrear Viagem',
      description: 'Partilhar localização em tempo real durante viagens',
      icon: Map,
      color: 'text-cyan-300',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      action: () => navigate('/dashboard/viagens'),
      badge: isTracking ? 'ACTIVO' : undefined,
      isActive: isTracking,
    },
    // INCIDENT TIMELINE
    {
      id: 'incident-timeline',
      title: 'Timeline de Incidentes',
      description: 'Reconstrução completa de emergências passadas',
      icon: Clock,
      color: 'text-amber-300',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      action: () => navigate('/dashboard/timeline'),
    },
  ]

  // System status indicators
  const systemStatus = [
    { label: 'GPS', active: !!position, icon: MapPin },
    { label: 'BLE', active: Object.keys(connections).length > 0, icon: Radio },
    { label: 'Ameaças', active: threatMonitoring, icon: AlertTriangle },
    { label: 'Voz', active: voiceListening, icon: Volume2 },
    { label: 'Pânico', active: panicState.isActive, icon: Lock },
    { label: 'Comunidade', active: dangerZoneCount > 0, icon: Users },
  ]

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#D4AF37]" />
            Acções Rápidas
          </h1>
          <p className="text-white/40 text-sm mt-1">Acesso instantâneo a todas as funcionalidades de segurança</p>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {systemStatus.map(s => (
          <div
            key={s.label}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
              s.active
                ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                : 'bg-white/[0.03] text-white/20 border border-white/[0.05]'
            )}
          >
            <s.icon className="w-3 h-3" />
            <span>{s.label}</span>
            {s.active && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />}
          </div>
        ))}
      </div>

            {/* Safety Score Gauge + Quick Emergency Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BeamBorder color={safetyScore >= 80 ? '#D4AF37' : safetyScore >= 50 ? '#F59E0B' : '#EF4444'}>
          <SpotlightCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Pontuacao de Seguranca</h2>
            </div>
            <SafetyScoreGauge score={safetyScore} factors={safetyFactors} size={180} showDetails={true} />
          </SpotlightCard>
        </BeamBorder>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#D4AF37]" />
            <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Discagem Rapida</h2>
          </div>
          <EmergencyQuickDial compact={false} maxContacts={5} />
        </div>
      </div>

      {/* Location Share Link */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4 w-4 text-[#D4AF37]" />
          <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Partilha de Localizacao</h2>
        </div>
        <LocationShareLink />
      </div>

      {/* Quick Disguise Selector Selector — inline */}
      <div>
        <h2 className='text-white/60 text-sm font-medium mb-2 uppercase tracking-wider'>Camuflagem Rápida</h2>
        <QuickDisguiseSelector />
      </div>

      {/* Critical Actions — Emergency & Panic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowEmergencyConfirm(true)}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/5 border border-red-500/30 p-5 text-left"
        >
          <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SOS</div>
          <ShieldAlert className="w-10 h-10 text-red-400 mb-3" />
          <div className="text-white font-semibold text-lg">Emergência SOS</div>
          <div className="text-white/40 text-sm mt-1">Alerta imediato a todos os contactos, SMS, GPS, sirene</div>
          {isTriggering && (
            <div className="mt-2 flex items-center gap-2 text-red-300 text-sm">
              <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
              A activar...
            </div>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowPanicConfirm(true)}
          disabled={panicState.isActive}
          className={cn(
            'relative overflow-hidden rounded-2xl border p-5 text-left transition-colors',
            panicState.isActive
              ? 'bg-red-500/20 border-red-500/40'
              : 'bg-gradient-to-br from-orange-500/15 to-orange-600/5 border-orange-500/25'
          )}
        >
          {panicState.isActive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              ACTIVO
            </div>
          )}
          <Skull className={cn('w-10 h-10 mb-3', panicState.isActive ? 'text-red-400' : 'text-orange-400')} />
          <div className="text-white font-semibold text-lg">Modo Pânico</div>
          <div className="text-white/40 text-sm mt-1">
            {panicState.isActive
              ? `A gravar: ${panicState.photosCaptured.length} foto(s), áudio activo`
              : 'Bloqueio de ecrã + gravação áudio + fotos automáticas'}
          </div>
        </motion.button>
      </div>

      {/* All Quick Actions Grid */}
      <div>
        <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">Todas as Acções</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.filter(a => !['emergency-sos', 'panic-mode'].includes(a.id)).map(action => (
            <SpotlightCard key={action.id} spotlightColor={action.color.replace('text-', '')} className="rounded-2xl">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={action.action}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left transition-all hover:brightness-110',
                  action.bgColor, action.borderColor
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-xl', action.bgColor)}>
                      <action.icon className={cn('w-5 h-5', action.color)} />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{action.title}</div>
                      <div className="text-white/40 text-xs mt-0.5 max-w-[180px]">{action.description}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {action.badge && (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                        action.isActive ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/10 text-white/40'
                      )}>
                        {action.badge}
                      </span>
                    )}
                    {action.isActive && action.activeLabel && (
                      <span className="text-[10px] text-[#D4AF37] font-medium">{action.activeLabel}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </div>
              </motion.button>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Emergency Confirmation Modal */}
      <AnimatePresence>
        {showEmergencyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
            onClick={() => setShowEmergencyConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#221E16] rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h3 className="text-white text-center text-lg font-semibold mb-2">Confirmar Emergência?</h3>
              <p className="text-white/50 text-center text-sm mb-6">
                Isto vai alertar todos os seus contactos de emergência via SMS e notificação push com a sua localização GPS actual.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmergencyConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEmergency}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  {isTriggering && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  ACTIVAR SOS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panic Confirmation Modal */}
      <AnimatePresence>
        {showPanicConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
            onClick={() => setShowPanicConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#221E16] rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Skull className="w-8 h-8 text-orange-400" />
                </div>
              </div>
              <h3 className="text-white text-center text-lg font-semibold mb-2">Activar Modo Pânico?</h3>
              <p className="text-white/50 text-center text-sm mb-6">
                O ecrã será bloqueado, gravação de áudio e fotos automáticas iniciarão, e uma emergência será disparada com a sua localização GPS.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPanicConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { activatePanic(); setShowPanicConfirm(false) }}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition"
                >
                  ACTIVAR PÂNICO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}