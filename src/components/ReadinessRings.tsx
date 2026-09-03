import { Shield, BluetoothConnected, MapPin, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ReadinessRings — anéis de progresso estilo Calorist (calorie ring).
 * Anel principal = prontidão de segurança (%); três mini-anéis coloridos
 * fixos (dispositivos / GPS / alertas) como os macros do Calorist.
 * As cores seguem a var da marca para o anel principal; os mini-anéis
 * usam a linguagem de cores fixa (azul/verde/âmbar) do design Calorist.
 */

function Ring({
  value, size, stroke, color, track, children, delay = 0,
}: {
  value: number // 0-100
  size: number
  stroke: number
  color: string
  track?: string
  children?: React.ReactNode
  delay?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'rgba(255,255,255,0.07)'} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: `stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export interface ReadinessRingsProps {
  /** Prontidão geral 0-100 */
  readiness: number
  /** Rótulo: Protegido / Parcial / Vulneravel */
  label: string
  /** Dispositivos activos / total */
  devicesActive: number
  devicesTotal: number
  /** GPS activo? */
  gpsOk: boolean
  /** Alertas activos */
  alerts: number
  className?: string
  compact?: boolean
}

export function ReadinessRings({
  readiness, label, devicesActive, devicesTotal, gpsOk, alerts, className, compact,
}: ReadinessRingsProps) {
  const devicePct = devicesTotal > 0 ? Math.round((devicesActive / devicesTotal) * 100) : 0
  const gpsPct = gpsOk ? 100 : 8
  const alertsPct = alerts === 0 ? 100 : 15 // sem alertas = tudo bem

  const brandColor = 'rgb(var(--brand-rgb))'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Ring value={readiness} size={44} stroke={4} color={brandColor}>
          <span className="text-[10px] font-bold text-white/85">{readiness}%</span>
        </Ring>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-white/85">{label}</p>
          <p className="text-[10px] text-white/35">Prontidão de segurança</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-5', className)}>
      {/* Anel principal — prontidão */}
      <div className="relative shrink-0">
        <Ring value={readiness} size={104} stroke={8} color={brandColor}>
          <div className="text-center leading-none">
            <div className="text-2xl font-bold text-white tracking-tight">{readiness}<span className="text-sm text-white/40">%</span></div>
            <div className="text-[10px] text-white/40 mt-1">{label}</div>
          </div>
        </Ring>
      </div>
      {/* Mini-anéis — linguagem de cores Calorist */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        <div className="text-center">
          <Ring value={devicePct} size={52} stroke={5} color="#60A5FA" delay={0.15}>
            <BluetoothConnected className="h-4 w-4 text-blue-300" />
          </Ring>
          <p className="text-[10px] font-medium text-white/55 mt-1.5">{devicesActive}/{devicesTotal || 0}</p>
          <p className="text-[9px] text-white/30">Dispositivos</p>
        </div>
        <div className="text-center">
          <Ring value={gpsPct} size={52} stroke={5} color="#34D399" delay={0.3}>
            <MapPin className={cn('h-4 w-4', gpsOk ? 'text-emerald-300' : 'text-white/25')} />
          </Ring>
          <p className="text-[10px] font-medium text-white/55 mt-1.5">{gpsOk ? 'Activo' : 'Off'}</p>
          <p className="text-[9px] text-white/30">GPS</p>
        </div>
        <div className="text-center">
          <Ring value={alertsPct} size={52} stroke={5} color={alerts === 0 ? '#FBBF24' : '#F87171'} delay={0.45}>
            <Bell className={cn('h-4 w-4', alerts === 0 ? 'text-amber-300' : 'text-red-300')} />
          </Ring>
          <p className="text-[10px] font-medium text-white/55 mt-1.5">{alerts}</p>
          <p className="text-[9px] text-white/30">Alertas</p>
        </div>
      </div>
    </div>
  )
}

/** Cartão "coach" estilo Calorist: borda esquerda colorida + ícone pastel */
export function CoachCard({
  icon: Icon, tone = 'ok', title, message, stat, onClick,
}: {
  icon: React.ElementType
  tone?: 'ok' | 'warn' | 'info'
  title: string
  message: string
  stat?: string
  onClick?: () => void
}) {
  const tones = {
    ok: { border: '#34D399', chip: 'bg-emerald-400/10', text: 'text-emerald-300', iconColor: 'text-emerald-400' },
    warn: { border: '#FBBF24', chip: 'bg-amber-400/10', text: 'text-amber-300', iconColor: 'text-amber-400' },
    info: { border: '#60A5FA', chip: 'bg-blue-400/10', text: 'text-blue-300', iconColor: 'text-blue-400' },
  }
  const t = tones[tone]
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cn(
        'relative flex gap-3 p-4 rounded-2xl bg-card border border-border overflow-hidden transition',
        onClick && 'cursor-pointer hover:bg-card/70 active:scale-[0.99]'
      )}
    >
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.border }} />
      <div className={cn('p-2 rounded-xl self-start shrink-0', t.chip)}>
        <Icon className={cn('h-4 w-4', t.iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/85">{title}</p>
        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{message}</p>
        {stat && <p className={cn('text-xs font-bold mt-1.5', t.text)}>{stat}</p>}
      </div>
    </div>
  )
}
