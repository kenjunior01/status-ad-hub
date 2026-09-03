/**
 * FallDetection — Página de configuração da Deteção de Queda.
 *
 * O motor corre globalmente (montado no DashboardLayout): se o
 * utilizador activar, a monitorização continua activa navegue para
 * onde navegar. Esta página controla sensibilidade, countdown,
 * auto-SOS, vibração e oferece teste manual (simulação).
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PersonStanding, ShieldCheck, Info, Play, Siren, Vibrate, PhoneOutgoing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useFallDetection, type FallSensitivity } from '@/hooks/useFallDetection'
import { useEmergency } from '@/hooks/useEmergency'
import { useGeolocation } from '@/hooks/useGeolocation'
import { SpotlightCard } from '@/components/effects'
import { toast } from 'sonner'

const SENSITIVITY_OPTIONS: { value: FallSensitivity; label: string; hint: string }[] = [
  { value: 'low', label: 'Baixa', hint: 'Só quedas fortes e claras (menos falsos alarmes)' },
  { value: 'medium', label: 'Média', hint: 'Equilíbrio recomendado para o dia-a-dia' },
  { value: 'high', label: 'Alta', hint: 'Detecta até quedas suaves (mais sensível)' },
]

export default function FallDetection() {
  const {
    phase, isMonitoring, config, lastFallAt,
    start, stop, cancel, triggerSosNow, updateConfig, simulate,
  } = useFallDetection()
  const { triggerEmergency, isTriggering } = useEmergency()
  const { position } = useGeolocation()
  const [testing, setTesting] = useState(false)

  const handleToggleMonitoring = (on: boolean) => {
    if (on) {
      start()
      toast.success('Deteccao de queda activa', {
        description: 'O telemóvel monitoriza quedas em segundo plano enquanto o app estiver aberto.',
      })
    } else {
      stop()
      toast.info('Deteccao de queda desactivada')
    }
  }

  const handleSimulate = () => {
    setTesting(true)
    simulate()
    window.setTimeout(() => setTesting(false), 5000)
  }

  const handleManualSos = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => triggerEmergency({
        latitude: position?.latitude ?? -25.9692,
        longitude: position?.longitude ?? 32.5732,
      }),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const lastFallText = lastFallAt
    ? new Date(lastFallAt).toLocaleString('pt-PT')
    : 'Nunca detectada'

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PersonStanding className="w-6 h-6 text-brand" />
            Deteccao de Queda
          </h1>
          <p className="text-white/40 text-sm mt-1">
            SOS automático se o telemóvel detectar uma queda violenta e não responderes
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border',
            isMonitoring
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-white/5 text-white/30 border-white/10'
          )}
        >
          {phase === 'countdown' ? 'CONTAGEM' : isMonitoring ? 'ACTIVA' : 'INACTIVA'}
        </span>
      </div>

      {/* Estado / activação */}
      <SpotlightCard className="p-5 bg-card border border-white/[0.06] rounded-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                isMonitoring
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-white/[0.04] border border-white/[0.06]'
              )}
            >
              <PersonStanding className={cn('h-7 w-7', isMonitoring ? 'text-emerald-400' : 'text-white/30')} />
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">Monitorização de quedas</p>
              <p className="text-white/40 text-xs mt-0.5">
                {isMonitoring
                  ? 'A vigiar aceleração do telemóvel 24/7'
                  : 'Activar para protecção automática contra quedas'}
              </p>
            </div>
          </div>
          <Switch
            checked={isMonitoring}
            onCheckedChange={handleToggleMonitoring}
            disabled={phase === 'countdown'}
          />
        </div>

        {isMonitoring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-white/30">Última queda detectada</p>
                <p className="text-white/70 mt-1 font-medium">{lastFallText}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-white/30">Resposta</p>
                <p className="text-white/70 mt-1 font-medium">
                  {config.autoSos ? `SOS automático em ${config.countdownSeconds}s` : 'Só aviso sonoro'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </SpotlightCard>

      {/* Como funciona */}
      <SpotlightCard className="p-5 bg-card border border-white/[0.06] rounded-2xl">
        <h3 className="text-white font-semibold flex items-center gap-2 text-[15px]">
          <Info className="h-4 w-4 text-brand" /> Como funciona
        </h3>
        <ol className="mt-3 space-y-2.5 text-sm text-white/50">
          <li className="flex gap-2.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-brand/10 text-brand text-[11px] font-bold flex items-center justify-center">1</span>
            O acelerómetro do telemóvel detecta <strong className="text-white/70">queda livre</strong> (~0 g durante 250 ms).
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-brand/10 text-brand text-[11px] font-bold flex items-center justify-center">2</span>
            De seguida procura um <strong className="text-white/70">impacto forte</strong> contra o chão.
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-brand/10 text-brand text-[11px] font-bold flex items-center justify-center">3</span>
            Dispara um <strong className="text-white/70">alarme sonoro</strong> e conta {config.countdownSeconds}s para cancelares.
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-brand/10 text-brand text-[11px] font-bold flex items-center justify-center">4</span>
            Sem resposta? <strong className="text-white/70">SOS automático</strong> com a tua localização GPS.
          </li>
        </ol>
      </SpotlightCard>

      {/* Configuração */}
      <SpotlightCard className="p-5 bg-card border border-white/[0.06] rounded-2xl space-y-6">
        <h3 className="text-white font-semibold text-[15px]">Configuração</h3>

        {/* Sensibilidade */}
        <div>
          <p className="text-white/70 text-sm font-medium mb-2.5">Sensibilidade</p>
          <div className="grid grid-cols-3 gap-2">
            {SENSITIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig({ sensitivity: opt.value })}
                className={cn(
                  'rounded-xl border p-3 text-center transition-all',
                  config.sensitivity === opt.value
                    ? 'border-brand/50 bg-brand/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                )}
              >
                <p className={cn(
                  'text-sm font-semibold',
                  config.sensitivity === opt.value ? 'text-brand' : 'text-white/70'
                )}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">
            {SENSITIVITY_OPTIONS.find((o) => o.value === config.sensitivity)?.hint}
          </p>
        </div>

        {/* Countdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/70 text-sm font-medium">Tempo para cancelar</p>
            <span className="text-brand text-sm font-bold tabular-nums">{config.countdownSeconds}s</span>
          </div>
          <Slider
            value={[config.countdownSeconds]}
            min={5}
            max={30}
            step={1}
            onValueChange={([v]) => updateConfig({ countdownSeconds: v })}
            className="w-full"
          />
          <p className="text-white/30 text-xs mt-2">
            Quanto tempo tens para tocar em "Estou bem" antes do SOS automático.
          </p>
        </div>

        {/* Auto SOS */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">SOS automático</p>
            <p className="text-white/30 text-xs mt-0.5">Notificar contactos sem tocares em nada</p>
          </div>
          <Switch
            checked={config.autoSos}
            onCheckedChange={(v) => updateConfig({ autoSos: v })}
          />
        </div>

        {/* Vibração */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vibrate className="h-4 w-4 text-white/40" />
            <div>
              <p className="text-white/70 text-sm font-medium">Vibração de aviso</p>
              <p className="text-white/30 text-xs mt-0.5">Vibrar durante a contagem de cancelamento</p>
            </div>
          </div>
          <Switch
            checked={config.vibration}
            onCheckedChange={(v) => updateConfig({ vibration: v })}
          />
        </div>
      </SpotlightCard>

      {/* Teste */}
      <SpotlightCard className="p-5 bg-card border border-white/[0.06] rounded-2xl">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Testar sem cair
        </h3>
        <p className="text-white/40 text-xs mt-1 mb-4">
          Simula uma deteccão de queda para confirmares que o alarme e a contagem funcionam no teu telemóvel.
        </p>
        <Button
          onClick={handleSimulate}
          disabled={phase === 'countdown'}
          className="w-full h-12 bg-brand hover:bg-brand-dark text-black font-bold"
        >
          <Play className="h-4 w-4 mr-2" />
          {phase === 'countdown' ? 'Teste em curso…' : 'Simular queda agora'}
        </Button>
        {phase === 'countdown' && (
          <Button
            onClick={cancel}
            variant="outline"
            className="w-full h-11 mt-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          >
            Já testei — estou bem
          </Button>
        )}
      </SpotlightCard>

      {/* SOS manual */}
      <SpotlightCard className="p-5 bg-red-950/20 border border-red-500/10 rounded-2xl">
        <h3 className="text-white font-semibold text-[15px]">Precisas de ajuda agora?</h3>
        <p className="text-white/40 text-xs mt-1 mb-4">
          Activa a emergência imediatamente, sem esperares por uma queda.
        </p>
        <Button
          onClick={handleManualSos}
          disabled={isTriggering}
          className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold"
        >
          <Siren className="h-5 w-5 mr-2" />
          {isTriggering ? 'A activar…' : 'Activar SOS agora'}
        </Button>
      </SpotlightCard>

      {/* Nota de compatibilidade */}
      <div className="flex items-start gap-2.5 px-1 text-xs text-white/30 leading-relaxed">
        <PhoneOutgoing className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Requer acelerómetro (presente em todos os smartphones). No iPhone, o iOS pode pedir
          permissão de movimento na primeira activação. Em computadores sem sensores, usa o botão
          de simulação para testar. A monitorização fica activa enquanto o app estiver aberto —
          para protecção com o ecrã bloqueado, instala a app nativa (ver /instalar).
        </p>
      </div>
    </div>
  )
}
