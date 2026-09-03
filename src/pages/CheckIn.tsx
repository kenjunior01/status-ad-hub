import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, CheckCircle, XCircle, Clock, MapPin, MessageSquare,
  Loader2, Settings, Save, Flame, AlertTriangle, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCheckIn } from '@/hooks/useCheckIn'
import { SpotlightCard, BeamBorder, CounterAnimated, Shimmer } from '@/components/effects'

type IntervalOption = { minutes: number; label: string }

const intervalOptions: IntervalOption[] = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hora' },
  { minutes: 120, label: '2 horas' },
  { minutes: 240, label: '4 horas' },
  { minutes: 480, label: '8 horas' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `${time} - Hoje`
  if (isYesterday) return `${time} - Ontem`
  return `${d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' })} - ${time}`
}

/** Circular countdown timer using SVG */
function CountdownTimer({ seconds, totalSeconds, isOverdue }: { seconds: number; totalSeconds: number; isOverdue: boolean }) {
  const radius = 90
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const fraction = totalSeconds > 0 ? seconds / totalSeconds : 0
  const offset = circumference - fraction * circumference

  const color = isOverdue
    ? '#EF4444'
    : fraction > 0.6
      ? '#D4AF37'
      : fraction > 0.3
        ? '#F59E0B'
        : '#EF4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="rgba(255,255,255,0.04)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          initial={false}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isOverdue ? (
          <>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1"
            >
              CHECK-IN EM ATRASO
            </motion.div>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </>
        ) : (
          <>
            <Timer className="h-4 w-4 text-white/20 mb-1" />
            <span className="text-3xl font-display font-bold text-white tabular-nums">
              {formatTime(seconds)}
            </span>
            <span className="text-[10px] text-white/25 mt-0.5">
              {seconds > 0 ? 'proximo check-in' : 'aguardando...'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default function CheckIn() {
  const {
    config,
    configLoading,
    checkIns,
    historyLoading,
    secondsRemaining,
    isOverdue,
    totalCheckIns,
    missedCheckIns,
    streak,
    checkIn,
    isCheckingIn,
    saveConfig,
    isSavingConfig,
  } = useCheckIn()

  // Local config form state
  const [intervalMinutes, setIntervalMinutes] = useState(config?.interval_minutes ?? 30)
  const [isActive, setIsActive] = useState(config?.is_active ?? false)
  const [startTime, setStartTime] = useState(config?.start_time ?? '08:00')
  const [endTime, setEndTime] = useState(config?.end_time ?? '22:00')
  const [messageTemplate, setMessageTemplate] = useState(config?.message_template ?? '')

  // Sync form when config loads from DB
  const [initialized, setInitialized] = useState(false)
  useMemo(() => {
    if (config && !initialized) {
      setIntervalMinutes(config.interval_minutes)
      setIsActive(config.is_active)
      setStartTime(config.start_time ?? '08:00')
      setEndTime(config.end_time ?? '22:00')
      setMessageTemplate(config.message_template ?? '')
      setInitialized(true)
    }
  }, [config, initialized])

  const totalSeconds = config?.is_active ? config.interval_minutes * 60 : 0
  const recentCheckIns = checkIns.slice(0, 10)

  const stats = [
    { label: 'Total de Check-ins', value: totalCheckIns, icon: CheckCircle, color: 'text-brand' },
    { label: 'Check-ins Falhados', value: missedCheckIns, icon: XCircle, color: 'text-red-400' },
    { label: 'Sequencia Actual', value: streak, icon: Flame, color: 'text-amber-400' },
  ]

  const handleSaveConfig = () => {
    saveConfig({
      interval_minutes: intervalMinutes,
      is_active: isActive,
      start_time: startTime || null,
      end_time: endTime || null,
      message_template: messageTemplate || null,
    })
  }

  if (configLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          <Shimmer className="h-8 w-64 rounded-xl" />
          <div className="flex justify-center py-12">
            <Shimmer className="h-48 w-48 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <Shimmer key={i} className="h-24 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  // Empty state when no config
  if (!config) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-brand/10 border border-brand/20">
              <ShieldCheck className="h-5 w-5 text-brand" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Check-in de Seguranca</h1>
          </div>
          <p className="text-sm text-white/30 mb-10">
            Confirme regularmente que esta bem. Se falhar um check-in, os seus contactos serao notificados.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-lg mx-auto text-center py-16"
        >
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="h-28 w-28 rounded-full bg-brand/[0.06] border border-brand/10 flex items-center justify-center">
              <ShieldCheck className="h-12 w-12 text-brand/40" strokeWidth={1} />
            </div>
            <div className="absolute -inset-4 rounded-full bg-brand/[0.03] blur-2xl" />
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-3">
            Comece a usar o Check-in
          </h2>
          <p className="text-sm text-white/30 leading-relaxed mb-8 max-w-sm mx-auto">
            O check-in de seguranca permite-lhe confirmar periodicamente que esta bem.
            Configure o intervalo e, se falhar um check-in, os seus contactos de emergencia
            serao automaticamente notificados com a sua ultima localizacao.
          </p>
          <div className="space-y-3 text-left max-w-xs mx-auto mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-md bg-brand/10">
                <Timer className="h-3.5 w-3.5 text-brand" />
              </div>
              <p className="text-xs text-white/40">Escolha intervalos de 15 min a 8 horas</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-md bg-brand/10">
                <Clock className="h-3.5 w-3.5 text-brand" />
              </div>
              <p className="text-xs text-white/40">Defina horas activas (ex: 08:00 - 22:00)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-md bg-red-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              </div>
              <p className="text-xs text-white/40">Contactos sao alertados se falhar</p>
            </div>
          </div>
          <Button
            onClick={() => setIsActive(true)}
            className="bg-brand hover:bg-brand/90 text-white rounded-xl px-8 py-3 shadow-[0_0_25px_-5px_rgba(212,175,55,0.3)]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Agora
          </Button>
        </motion.div>

        {/* Config section shown when user clicks Configure */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ConfigSection
                intervalMinutes={intervalMinutes}
                setIntervalMinutes={setIntervalMinutes}
                isActive={isActive}
                setIsActive={setIsActive}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                messageTemplate={messageTemplate}
                setMessageTemplate={setMessageTemplate}
                isSavingConfig={isSavingConfig}
                onSave={handleSaveConfig}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-brand/10 border border-brand/20">
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Check-in de Seguranca</h1>
        </div>
        <p className="text-sm text-white/30">
          Confirme regularmente que esta bem. Se falhar um check-in, os seus contactos serao notificados.
        </p>
      </motion.div>

      {/* Timer + Quick Check-in */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col items-center mb-10"
      >
        <div className="mb-6">
          <CountdownTimer
            seconds={secondsRemaining}
            totalSeconds={totalSeconds}
            isOverdue={isOverdue}
          />
        </div>

        <Button
          onClick={() => checkIn()}
          disabled={isCheckingIn || !config?.is_active}
          className={cn(
            'rounded-2xl px-10 py-4 text-base font-semibold gap-3 transition-all duration-300',
            config?.is_active
              ? 'bg-brand hover:bg-brand/90 text-white shadow-[0_0_35px_-5px_rgba(212,175,55,0.4)]'
              : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/[0.06]'
          )}
        >
          {isCheckingIn ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
          {isCheckingIn ? 'A confirmar...' : 'Estou bem!'}
        </Button>
        {!config?.is_active && (
          <p className="text-xs text-white/20 mt-2">Active o check-in na configuracao abaixo</p>
        )}
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => {
          const IconComp = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <BeamBorder color={s.color === 'text-red-400' ? '#EF4444' : s.color === 'text-amber-400' ? '#F59E0B' : '#D4AF37'}>
                <SpotlightCard className="p-5 flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]', s.color)}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">
                      <CounterAnimated target={s.value} />
                    </p>
                    <p className="text-[11px] text-white/30">{s.label}</p>
                  </div>
                </SpotlightCard>
              </BeamBorder>
            </motion.div>
          )
        })}
      </div>

      {/* Configuration Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-10"
      >
        <ConfigSection
          intervalMinutes={intervalMinutes}
          setIntervalMinutes={setIntervalMinutes}
          isActive={isActive}
          setIsActive={setIsActive}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          messageTemplate={messageTemplate}
          setMessageTemplate={setMessageTemplate}
          isSavingConfig={isSavingConfig}
          onSave={handleSaveConfig}
        />
      </motion.div>

      {/* Recent Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <h2 className="font-display text-lg font-bold text-white mb-4">Check-ins Recentes</h2>
        {historyLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <Shimmer key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : recentCheckIns.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Nenhum check-in registado</p>
            <p className="text-xs text-white/15 mt-1">Os check-ins aparecerao aqui apos a primeira confirmacao</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.04]" />
            <div className="space-y-0">
              {recentCheckIns.map((ci, i) => {
                const isSuccess = ci.status === 'checked_in'
                return (
                  <motion.div
                    key={ci.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 120 }}
                    className="relative flex gap-4 pb-4 last:pb-0"
                  >
                    <div className={cn(
                      'relative z-10 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border',
                      isSuccess
                        ? 'bg-brand/10 border-brand/15'
                        : 'bg-red-500/10 border-red-500/15'
                    )}>
                      {isSuccess
                        ? <CheckCircle className="h-4 w-4 text-brand" strokeWidth={1.5} />
                        : <XCircle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="flex-1 pt-0.5">
                      <SpotlightCard className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                              isSuccess
                                ? 'bg-brand/10 text-brand border-brand/15'
                                : 'bg-red-500/10 text-red-400 border-red-500/15'
                            )}>
                              {isSuccess ? 'Confirmado' : 'Falhado'}
                            </span>
                            <span className="text-xs text-white/20 font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(ci.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {ci.latitude && ci.longitude && (
                            <span className="text-[10px] text-white/20 flex items-center gap-1 font-mono">
                              <MapPin className="h-3 w-3" />
                              {ci.latitude.toFixed(4)}, {ci.longitude.toFixed(4)}
                            </span>
                          )}
                          {ci.message && (
                            <span className="text-[10px] text-white/25 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {ci.message}
                            </span>
                          )}
                        </div>
                      </SpotlightCard>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/** Configuration sub-section */
function ConfigSection({
  intervalMinutes,
  setIntervalMinutes,
  isActive,
  setIsActive,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  messageTemplate,
  setMessageTemplate,
  isSavingConfig,
  onSave,
}: {
  intervalMinutes: number
  setIntervalMinutes: (v: number) => void
  isActive: boolean
  setIsActive: (v: boolean) => void
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  messageTemplate: string
  setMessageTemplate: (v: string) => void
  isSavingConfig: boolean
  onSave: () => void
}) {
  return (
    <BeamBorder color="#D4AF37">
      <SpotlightCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-4 w-4 text-white/40" />
          <h2 className="font-display text-base font-bold text-white">Configuracao do Check-in</h2>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/[0.04]">
          <div>
            <p className="text-sm text-white/70">Check-in automatico activo</p>
            <p className="text-[11px] text-white/25 mt-0.5">Sera alertado quando o tempo expirar</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
              isActive ? 'bg-brand' : 'bg-white/10'
            )}
          >
            <motion.span
              className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm')}
              animate={{ x: isActive ? 22 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Interval selector */}
        <div className="mb-6">
          <label className="text-xs text-white/40 mb-3 block">Intervalo entre check-ins</label>
          <div className="flex flex-wrap gap-2">
            {intervalOptions.map(opt => (
              <button
                key={opt.minutes}
                onClick={() => setIntervalMinutes(opt.minutes)}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border',
                  intervalMinutes === opt.minutes
                    ? 'bg-brand text-white border-brand/30 shadow-[0_0_20px_-5px_rgba(212,175,55,0.2)]'
                    : 'bg-white/[0.02] text-white/35 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active hours */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-white/40 mb-2 block">Hora de inicio</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Hora de fim</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>
        </div>

        {/* Message template */}
        <div className="mb-6">
          <label className="text-xs text-white/40 mb-2 block">Mensagem personalizada (opcional)</label>
          <textarea
            value={messageTemplate}
            onChange={e => setMessageTemplate(e.target.value)}
            placeholder="Ex: Estou bem, a caminho de casa..."
            rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/15 focus:outline-none focus:border-brand/40 transition-colors resize-none"
          />
        </div>

        {/* Save button */}
        <Button
          onClick={onSave}
          disabled={isSavingConfig}
          className="w-full bg-brand/10 hover:bg-brand/20 text-brand border border-brand/15 rounded-xl py-2.5 text-sm font-medium transition-all"
        >
          {isSavingConfig ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuracao
        </Button>
      </SpotlightCard>
    </BeamBorder>
  )
}
