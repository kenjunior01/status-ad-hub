import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bluetooth, Hand, Shield, Mic, Circle, CircleDot, Minus,
  Wifi, WifiOff, Battery, Signal, Loader2, ChevronDown,
  ChevronUp, Download, Play, Square, Eye, EyeOff,
  Radio, Clock, AlertTriangle, Volume2, Check, Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useSmartGlasses } from '@/hooks/useSmartGlasses'
import { SpotlightCard, BeamBorder, Shimmer, NoiseTexture, FloatingOrbs } from '@/components/effects'
import type { TapPattern } from '@/lib/types'

// ============================================
// Tap pattern visual options
// ============================================

const TAP_PATTERNS: {
  value: TapPattern
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'double',
    label: 'Duplo Toque',
    description: 'Dois toques rapidos na haste do oculo. Rapido e discreto.',
    icon: (
      <div className="flex items-center gap-1.5">
        <Circle className="h-3 w-3 fill-current" />
        <Circle className="h-3 w-3 fill-current" />
      </div>
    ),
  },
  {
    value: 'triple',
    label: 'Triplo Toque',
    description: 'Tres toques rapidos na haste. Menos propenso a activacoes acidentais.',
    icon: (
      <div className="flex items-center gap-1">
        <Circle className="h-2.5 w-2.5 fill-current" />
        <Circle className="h-2.5 w-2.5 fill-current" />
        <Circle className="h-2.5 w-2.5 fill-current" />
      </div>
    ),
  },
  {
    value: 'long_press',
    label: 'Pressao Longa',
    description: 'Premir e segurar a haste por 600ms. Nenhum risco de activacao acidental.',
    icon: (
      <div className="flex items-center">
        <Minus className="h-3 w-6 rounded-full fill-current" />
      </div>
    ),
  },
]

// ============================================
// How-it-works steps (shown when no glasses connected)
// ============================================

const STEPS = [
  {
    icon: Bluetooth,
    title: 'Pareie os Oculos',
    description: 'Vá à pagina de Dispositivos e pareie os seus oculos inteligentes via BLE.',
  },
  {
    icon: Hand,
    title: 'Configure o Toque SOS',
    description: 'Escolha o padrao de toque (duplo, triplo ou pressao longa) para activar o SOS.',
  },
  {
    icon: Shield,
    title: 'Active o Monitoramento',
    description: 'Ligue o SOS via oculos. O sistema ficara a escutar toques em segundo plano.',
  },
  {
    icon: Mic,
    title: 'Gravacao Automatica',
    description: 'Quando o SOS for activado, a gravacao de audio comeca automaticamente como evidencia.',
  },
]

// ============================================
// Animation variants
// ============================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
}

// ============================================
// Page Component
// ============================================

export default function SmartGlasses() {
  const navigate = useNavigate()
  const {
    config,
    configLoading,
    state: glassesState,
    audioRecorder,
    connectedGlassesDevice,
    glassesSignal,
    glassesBattery,
    glassesName,
    stopAndSaveEvidence,
    saveConfig,
    isSavingConfig,
    tapHistory,
    audioEvidenceList,
  } = useSmartGlasses()

  const [localConfig, setLocalConfig] = useState({
    sos_enabled: config?.sos_enabled ?? true,
    sos_tap_pattern: (config?.sos_tap_pattern ?? 'double') as TapPattern,
    auto_record_audio: config?.auto_record_audio ?? true,
    removal_alert_enabled: config?.removal_alert_enabled ?? true,
    stealth_mode: config?.stealth_mode ?? true,
    share_audio_evidence: config?.share_audio_evidence ?? false,
    max_record_duration: config?.max_record_duration ?? 120,
    removal_grace_seconds: config?.removal_grace_seconds ?? 30,
  })

  const [tapHistoryOpen, setTapHistoryOpen] = useState(false)

  // Sync local config when remote config loads
  useMemo(() => {
    if (config) {
      setLocalConfig({
        sos_enabled: config.sos_enabled,
        sos_tap_pattern: config.sos_tap_pattern,
        auto_record_audio: config.auto_record_audio,
        removal_alert_enabled: config.removal_alert_enabled,
        stealth_mode: config.stealth_mode,
        share_audio_evidence: config.share_audio_evidence,
        max_record_duration: config.max_record_duration,
        removal_grace_seconds: config.removal_grace_seconds,
      })
    }
  }, [config])

  const isConnected = !!connectedGlassesDevice
  const signalLabel = glassesSignal != null
    ? glassesSignal > -50
      ? 'Excelente'
      : glassesSignal > -65
        ? 'Bom'
        : 'Fraco'
    : null
  const signalColor = glassesSignal != null
    ? glassesSignal > -50
      ? 'text-[#D4AF37]'
      : glassesSignal > -65
        ? 'text-amber-400'
        : 'text-red-400'
    : null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const patternLabel = (p: TapPattern) => {
    switch (p) {
      case 'double': return 'Duplo'
      case 'triple': return 'Triplo'
      case 'long_press': return 'Longa'
    }
  }

  const handleSave = () => {
    saveConfig(localConfig)
  }

  // ---- Loading skeleton ----
  if (configLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <Shimmer className="h-4 w-96 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          <Shimmer className="h-48 rounded-2xl" />
          <Shimmer className="h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      <NoiseTexture opacity={0.015} />
      <FloatingOrbs />

      <div className="relative z-10 space-y-8 pb-16">
        {/* ---- Header ---- */}
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <Settings2 className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Oculos Inteligentes
            </h1>
          </div>
          <p className="text-white/50 text-sm lg:text-base max-w-2xl">
            Proteccao de seguranca oculta via BLE — active SOS discretamente com um toque.
          </p>
        </motion.div>

        {/* ---- Connection Status Banner ---- */}
        <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.1 }}>
          <SpotlightCard className={cn(
            'p-5 transition-all duration-500',
            isConnected && 'border-[#D4AF37]/20'
          )}>
            {isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/10">
                      <Bluetooth className="h-6 w-6 text-[#D4AF37]" />
                    </div>
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#D4AF37] border-2 border-[#0D1321]"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{glassesName || 'Oculos'}</span>
                      <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px]">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                        Conectado
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      {glassesBattery != null && (
                        <span className="flex items-center gap-1">
                          <Battery className={cn('h-3 w-3', glassesBattery < 20 ? 'text-red-400' : 'text-white/40')} />
                          {glassesBattery}%
                        </span>
                      )}
                      {signalLabel && (
                        <span className={cn('flex items-center gap-1', signalColor)}>
                          <Signal className="h-3 w-3" />
                          {signalLabel}
                        </span>
                      )}
                      {glassesState.isHIDActive && (
                        <span className="flex items-center gap-1 text-[#D4AF37]">
                          <Radio className="h-3 w-3" />
                          HID Activo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sm:ml-auto">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium px-2.5 py-0.5',
                      glassesState.tapCount > 0
                        ? 'border-[#D4AF37]/30 text-[#D4AF37]'
                        : 'border-white/10 text-white/30'
                    )}
                  >
                    {glassesState.tapCount} toque{glassesState.tapCount !== 1 ? 's' : ''} detectado{glassesState.tapCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <WifiOff className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Nenhum oculo conectado</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      Ligue os seus oculos e parea nas Dispositivos
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="sm:ml-auto border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  onClick={() => navigate('/dashboard/devices')}
                >
                  Ir para Dispositivos
                </Button>
              </div>
            )}
          </SpotlightCard>
        </motion.div>

        {/* ---- How It Works (only when no glasses connected) ---- */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {STEPS.map((step, i) => (
                  <motion.div key={i} {...fadeInUp}>
                    <SpotlightCard className="p-5 h-full">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <Badge className="h-7 w-7 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </Badge>
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                            <step.icon className="h-4.5 w-4.5 text-white/50" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm">{step.title}</h3>
                          <p className="text-white/40 text-xs mt-1 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Glasses Connected Panel ---- */}
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* ---- SOS Status Card ---- */}
              <motion.div {...fadeInUp}>
                <SpotlightCard className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        className="relative"
                        animate={localConfig.sos_enabled ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Shield className={cn(
                          'h-10 w-10 transition-colors duration-500',
                          localConfig.sos_enabled ? 'text-[#D4AF37]' : 'text-white/20'
                        )} />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            'text-xs font-bold px-3 py-1',
                            localConfig.sos_enabled
                              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          )}>
                            {localConfig.sos_enabled ? 'SOS ACTIVO' : 'SOS DESACTIVADO'}
                          </Badge>
                        </div>
                        <p className="text-white/40 text-xs mt-1.5">
                          {localConfig.sos_enabled
                            ? 'O sistema esta a escutar toques nos seus oculos em segundo plano.'
                            : 'Active o toggle para comecar a monitorizar toques SOS.'}
                        </p>
                      </div>
                    </div>
                    <div className="sm:ml-auto">
                      <Switch
                        checked={localConfig.sos_enabled}
                        onCheckedChange={(checked) => setLocalConfig((c) => ({ ...c, sos_enabled: checked }))}
                      />
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>

              {/* ---- Tap Pattern Selection ---- */}
              <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Hand className="h-4 w-4 text-white/40" />
                  Padrao de Toque SOS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TAP_PATTERNS.map((pat) => {
                    const isActive = localConfig.sos_tap_pattern === pat.value
                    return (
                      <motion.button
                        key={pat.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setLocalConfig((c) => ({ ...c, sos_tap_pattern: pat.value }))}
                        className={cn(
                          'relative text-left rounded-2xl border p-4 transition-all duration-300',
                          isActive
                            ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5 shadow-lg shadow-[#D4AF37]/5'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="tap-pattern-active"
                            className="absolute inset-0 rounded-2xl border-2 border-[#D4AF37]/50"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                              {pat.icon}
                            </div>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]"
                              >
                                <Check className="h-3 w-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <p className={cn(
                            'text-sm font-semibold mb-1',
                            isActive ? 'text-white' : 'text-white/60'
                          )}>
                            {pat.label}
                          </p>
                          <p className="text-[11px] text-white/35 leading-relaxed">
                            {pat.description}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>

              {/* ---- Config Options ---- */}
              <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.15 }}>
                <SpotlightCard className="p-6">
                  <h3 className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-white/40" />
                    Configuracoes Avancadas
                  </h3>

                  <div className="space-y-5">
                    {/* Auto record audio */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Mic className="h-4 w-4 text-white/50" />
                        </div>
                        <div>
                          <Label className="text-white text-sm">Gravacao automatica de audio</Label>
                          <p className="text-white/30 text-[11px] mt-0.5">
                            Iniciar gravacao automaticamente ao activar SOS
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localConfig.auto_record_audio}
                        onCheckedChange={(checked) => setLocalConfig((c) => ({ ...c, auto_record_audio: checked }))}
                      />
                    </div>

                    {/* Removal alert */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                          <AlertTriangle className="h-4 w-4 text-white/50" />
                        </div>
                        <div>
                          <Label className="text-white text-sm">Alerta de remocao</Label>
                          <p className="text-white/30 text-[11px] mt-0.5">
                            Alertar se os oculos forem removidos forcadamente (desconexao BLE)
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localConfig.removal_alert_enabled}
                        onCheckedChange={(checked) => setLocalConfig((c) => ({ ...c, removal_alert_enabled: checked }))}
                      />
                    </div>

                    {/* Stealth mode */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                          {localConfig.stealth_mode ? (
                            <EyeOff className="h-4 w-4 text-[#D4AF37]" />
                          ) : (
                            <Eye className="h-4 w-4 text-white/50" />
                          )}
                        </div>
                        <div>
                          <Label className="text-white text-sm">Modo Stealth</Label>
                          <p className="text-white/30 text-[11px] mt-0.5">
                            Sem feedback visual ao activar SOS — critico para uso encoberto
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localConfig.stealth_mode}
                        onCheckedChange={(checked) => setLocalConfig((c) => ({ ...c, stealth_mode: checked }))}
                      />
                    </div>

                    {/* Share audio with contacts */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Volume2 className="h-4 w-4 text-white/50" />
                        </div>
                        <div>
                          <Label className="text-white text-sm">Partilhar audio com contactos</Label>
                          <p className="text-white/30 text-[11px] mt-0.5">
                            Enviar evidencia de audio aos contactos de emergencia
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localConfig.share_audio_evidence}
                        onCheckedChange={(checked) => setLocalConfig((c) => ({ ...c, share_audio_evidence: checked }))}
                      />
                    </div>

                    <div className="border-t border-white/[0.06] pt-5 space-y-5">
                      {/* Max record duration slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-white text-sm flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-white/40" />
                            Tempo maximo de gravacao
                          </Label>
                          <span className="text-[#D4AF37] text-xs font-mono font-semibold">
                            {localConfig.max_record_duration}s
                          </span>
                        </div>
                        <Slider
                          value={[localConfig.max_record_duration]}
                          onValueChange={([v]) => setLocalConfig((c) => ({ ...c, max_record_duration: v }))}
                          min={30}
                          max={300}
                          step={10}
                          className="[&_[role=slider]]:bg-[#D4AF37] [&_[role=slider]]:border-[#D4AF37] [&>span>span]:bg-[#D4AF37]"
                        />
                        <div className="flex justify-between text-[10px] text-white/20">
                          <span>30s</span>
                          <span>300s</span>
                        </div>
                      </div>

                      {/* Removal grace period input */}
                      <div className="space-y-2">
                        <Label className="text-white text-sm flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-white/40" />
                          Periodo de graca (remocao)
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={10}
                            max={120}
                            value={localConfig.removal_grace_seconds}
                            onChange={(e) => {
                              const v = Math.min(120, Math.max(10, Number(e.target.value) || 10))
                              setLocalConfig((c) => ({ ...c, removal_grace_seconds: v }))
                            }}
                            className="w-24 h-9 bg-white/[0.04] border-white/10 text-white text-sm text-center"
                          />
                          <span className="text-white/30 text-xs">segundos (10–120s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={isSavingConfig}
                        className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                      >
                        {isSavingConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            A guardar...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Guardar Configuracao
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>

              {/* ---- Audio Evidence Section ---- */}
              <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.2 }}>
                <SpotlightCard className="p-6">
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-white/40" />
                    Evidencia Audio
                  </h3>

                  {/* Recording indicator */}
                  {audioRecorder.isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="h-3 w-3 rounded-full bg-red-500"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <div className="flex-1">
                          <p className="text-red-400 font-bold text-xs tracking-wider">A GRAVAR...</p>
                          <p className="text-white/30 text-[11px] mt-0.5 font-mono">
                            {formatTime(audioRecorder.duration)} / {formatTime(localConfig.max_record_duration)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => stopAndSaveEvidence()}
                          className="text-xs"
                        >
                          <Square className="h-3 w-3 mr-1.5" />
                          Parar Gravacao e Guardar
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Recent audio evidence list */}
                  {audioEvidenceList.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/30 text-xs mb-2">Gravacoes recentes</p>
                      {audioEvidenceList.map((evidence) => (
                        <motion.div
                          key={evidence.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] group hover:border-white/[0.12] transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                            <Volume2 className="h-4 w-4 text-white/30 group-hover:text-white/50 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/70 text-xs font-medium">
                              {evidence.duration_seconds}s de audio
                              {evidence.emergency_alert_id && (
                                <span className="ml-1.5 text-red-400/70">(SOS)</span>
                              )}
                            </p>
                            <p className="text-white/25 text-[10px] mt-0.5">
                              {new Date(evidence.created_at).toLocaleString('pt-PT')}
                              {evidence.file_size_bytes > 0 && (
                                <span className="ml-2">
                                  {(evidence.file_size_bytes / 1024).toFixed(1)} KB
                                </span>
                              )}
                            </p>
                          </div>
                          {evidence.audio_url && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white/30 hover:text-white/60"
                                onClick={() => {
                                  const a = new Audio(evidence.audio_url!)
                                  a.play()
                                }}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {audioEvidenceList.length === 0 && !audioRecorder.isRecording && (
                    <p className="text-white/20 text-xs text-center py-6">
                      Nenhuma gravacao de audio ainda. As gravacoes aparecem aqui apos um SOS.
                    </p>
                  )}
                </SpotlightCard>
              </motion.div>

              {/* ---- Tap History (collapsible) ---- */}
              <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.25 }}>
                <BeamBorder>
                  <div className="p-5">
                    <button
                      onClick={() => setTapHistoryOpen(!tapHistoryOpen)}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                        <CircleDot className="h-4 w-4 text-white/40" />
                        Historico de Toques
                        {tapHistory.length > 0 && (
                          <Badge className="bg-white/[0.06] text-white/40 border border-white/[0.08] text-[10px] ml-1">
                            {tapHistory.length}
                          </Badge>
                        )}
                      </h3>
                      <motion.div
                        animate={{ rotate: tapHistoryOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-white/30" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {tapHistoryOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-2">
                            {tapHistory.length > 0 ? (
                              tapHistory.map((evt, i) => (
                                <motion.div
                                  key={evt.id || i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                                >
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                                    <CircleDot className="h-3.5 w-3.5 text-white/30" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge className={cn(
                                        'text-[10px] px-1.5 py-0',
                                        evt.action_triggered === 'sos'
                                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                          : 'bg-white/[0.06] text-white/40 border border-white/[0.08]'
                                      )}>
                                        {patternLabel(evt.pattern)}
                                      </Badge>
                                      {evt.action_triggered === 'sos' && (
                                        <Badge className="bg-red-500/10 text-red-400 border border-red-500/15 text-[9px]">
                                          SOS
                                        </Badge>
                                      )}
                                      {evt.action_triggered === 'checkin' && (
                                        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[9px]">
                                          Check-in
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-white/25 text-[10px] mt-0.5">
                                      {new Date(evt.timestamp).toLocaleString('pt-PT')}
                                    </p>
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-white/20 text-xs text-center py-6">
                                Nenhum toque registado ainda.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </BeamBorder>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
