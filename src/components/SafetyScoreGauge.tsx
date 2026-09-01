/**
 * SafetyScoreGauge — Medidor circular de pontuação de segurança.
 *
 * Mostra a pontuação geral de segurança (0-100) num gauge SVG animado.
 * Cores dinâmicas: vermelho, amarelo, verde, verde brilhante com brilho.
 * Inclui breakdown dos factores de segurança e animações framer-motion.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, useSpring, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldX,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { useContacts } from '@/hooks/useContacts'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCheckIn } from '@/hooks/useCheckIn'
import { useDevices } from '@/hooks/useDevices'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useVoiceSOS } from '@/hooks/useVoiceSOS'
import { useDeadMansSwitch } from '@/hooks/useDeadMansSwitch'
import { useCommunityRadar } from '@/hooks/useCommunityRadar'
import { useNightSafety } from '@/hooks/useNightSafety'

// ============================================
// Types
// ============================================

export interface SafetyFactor {
  label: string
  status: 'good' | 'warning' | 'critical' | 'inactive'
  points: number
  weight: number
}

export interface SafetyScoreGaugeProps {
  score: number
  size?: number
  showDetails?: boolean
  factors?: SafetyFactor[]
  className?: string
}

// ============================================
// Constants
// ============================================

const ARC_TOTAL_DEGREES = 270
const ARC_START_DEGREES = 135 // bottom-left
const STROKE_WIDTH_RATIO = 0.1
const MIN_STROKE = 10

const COLORS = {
  red: '#EF4444',
  amber: '#F59E0B',
  green: '#25D366',
  brightGreen: '#34D399',
  bg: '#1A2235',
  bgTrack: '#0F172A',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.3)',
}

const LEVEL_CONFIG: Record<number, { label: string; color: string; icon: LucideIcon; glow?: string }> = {
  0: { label: 'Critico', color: COLORS.red, icon: ShieldX },
  1: { label: 'Vulneravel', color: COLORS.amber, icon: ShieldAlert },
  2: { label: 'Moderado', color: '#EAB308', icon: Shield },
  3: { label: 'Seguro', color: COLORS.green, icon: ShieldCheck },
  4: { label: 'Muito Seguro', color: COLORS.brightGreen, icon: ShieldCheck, glow: '0 0 40px rgba(37,211,102,0.5)' },
}

/** Maximum points each factor can contribute at full activation */
const FACTOR_MAX_POINTS: Record<string, number> = {
  'Contactos de Emergencia': 15,
  'GPS Activo': 15,
  'Check-in Activo': 15,
  'Dispositivos Monitorizados': 10,
  'Bluetooth / Wearable': 10,
  'Modo Discreto': 10,
  'SOS por Voz': 10,
  'Interruptor Homem Morto': 5,
  'Radar Comunitario': 5,
  'Seguranca Nocturna': 5,
}

// ============================================
// Helpers
// ============================================

function getLevelIndex(score: number): number {
  if (score < 20) return 0
  if (score < 40) return 1
  if (score < 60) return 2
  if (score < 85) return 3
  return 4
}

function getScoreColor(score: number): string {
  if (score < 30) return COLORS.red
  if (score < 60) return COLORS.amber
  if (score < 85) return COLORS.green
  return COLORS.brightGreen
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end = polarToCartesian(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function getFactorIcon(status: SafetyFactor['status']): LucideIcon {
  switch (status) {
    case 'good':
      return CheckCircle2
    case 'warning':
      return AlertTriangle
    case 'critical':
      return XCircle
    case 'inactive':
      return MinusCircle
  }
}

function getFactorColor(status: SafetyFactor['status']): string {
  switch (status) {
    case 'good':
      return COLORS.green
    case 'warning':
      return COLORS.amber
    case 'critical':
      return COLORS.red
    case 'inactive':
      return COLORS.textDim
  }
}

// ============================================
// useSafetyScore Hook
// ============================================

export function useSafetyScore(): {
  score: number
  factors: SafetyFactor[]
  level: string
} {
  const { contacts } = useContacts()
  const { isTracking, permissionState } = useGeolocation()
  const { config: checkInConfig } = useCheckIn()
  const { devices } = useDevices()
  const { connections, available: btAvailable } = useBluetooth()
  const { isActive: discreetActive, config: discreetConfig } = useDiscreetMode()
  const { isSupported: voiceSupported, isListening } = useVoiceSOS()
  const { isEnabled: dmsEnabled, config: dmsConfig } = useDeadMansSwitch()
  const { alerts: radarAlerts } = useCommunityRadar()
  const { isNightMode, config: nightConfig } = useNightSafety()

  const factors: SafetyFactor[] = useMemo(() => {
    const list: SafetyFactor[] = []

    // 1. Contactos de emergência configurados — 15 pts
    const hasContacts = contacts.length > 0
    list.push({
      label: 'Contactos de Emergencia',
      status: hasContacts ? 'good' : 'critical',
      points: hasContacts ? 15 : 0,
      weight: 3,
    })

    // 2. GPS/Geolocalização disponível — 15 pts
    const gpsActive = isTracking && permissionState === 'granted'
    const gpsPrompt = permissionState === 'prompt'
    list.push({
      label: 'GPS Activo',
      status: gpsActive ? 'good' : gpsPrompt ? 'warning' : 'critical',
      points: gpsActive ? 15 : gpsPrompt ? 7 : 0,
      weight: 3,
    })

    // 3. Sistema de check-in activo — 15 pts
    const checkInActive = !!checkInConfig?.is_active
    list.push({
      label: 'Check-in Activo',
      status: checkInActive ? 'good' : checkInConfig ? 'warning' : 'inactive',
      points: checkInActive ? 15 : 0,
      weight: 3,
    })

    // 4. Monitorização de dispositivos — 10 pts
    const hasDevices = devices.length > 0
    list.push({
      label: 'Dispositivos Monitorizados',
      status: hasDevices ? 'good' : 'inactive',
      points: hasDevices ? 10 : 0,
      weight: 2,
    })

    // 5. Bluetooth conectado (wearable) — 10 pts
    const btConnected = connections.size > 0
    list.push({
      label: 'Bluetooth / Wearable',
      status: btConnected ? 'good' : btAvailable ? 'warning' : 'inactive',
      points: btConnected ? 10 : 0,
      weight: 2,
    })

    // 6. Modo discreto configurado — 10 pts
    const discreetReady = !!discreetConfig || discreetActive
    list.push({
      label: 'Modo Discreto',
      status: discreetActive ? 'good' : discreetReady ? 'warning' : 'inactive',
      points: discreetActive ? 10 : discreetReady ? 5 : 0,
      weight: 2,
    })

    // 7. Voice SOS disponível — 10 pts
    const voiceReady = voiceSupported && isListening
    list.push({
      label: 'SOS por Voz',
      status: voiceReady ? 'good' : voiceSupported ? 'warning' : 'inactive',
      points: voiceReady ? 10 : voiceSupported ? 5 : 0,
      weight: 2,
    })

    // 8. Dead Man's Switch configurado — 5 pts
    const dmsReady = dmsEnabled && !!dmsConfig
    list.push({
      label: 'Interruptor Homem Morto',
      status: dmsReady ? 'good' : dmsConfig ? 'warning' : 'inactive',
      points: dmsReady ? 5 : 0,
      weight: 1,
    })

    // 9. Radar comunitário — 5 pts
    // Radar is considered active if the hook is functional (always available)
    list.push({
      label: 'Radar Comunitario',
      status: 'good',
      points: 5,
      weight: 1,
    })

    // 10. Segurança nocturna — 5 pts
    const nightReady = !!nightConfig || isNightMode
    list.push({
      label: 'Seguranca Nocturna',
      status: isNightMode ? 'good' : nightReady ? 'warning' : 'inactive',
      points: isNightMode ? 5 : nightReady ? 2 : 0,
      weight: 1,
    })

    return list
  }, [
    contacts, isTracking, permissionState, checkInConfig, devices,
    connections, btAvailable, discreetActive, discreetConfig,
    voiceSupported, isListening, dmsEnabled, dmsConfig,
    radarAlerts, isNightMode, nightConfig,
  ])

  // Score = weighted points / weighted max points, scaled to 100
  const totalWeightedPoints = factors.reduce((sum, f) => sum + f.points * f.weight, 0)
  const maxWeightedPoints = factors.reduce(
    (sum, f) => sum + (FACTOR_MAX_POINTS[f.label] ?? f.points) * f.weight,
    0,
  )
  const score = maxWeightedPoints > 0
    ? Math.round((totalWeightedPoints / maxWeightedPoints) * 100)
    : 0

  const levelIdx = getLevelIndex(score)
  const level = LEVEL_CONFIG[levelIdx].label

  return { score: Math.min(score, 100), factors, level }
}

// ============================================
// Animated Score Counter (uses rAF, renders correctly)
// ============================================

function AnimatedScore({
  target,
  size,
  color,
}: {
  target: number
  size: number
  color: string
}) {
  const fontSize = Math.max(16, size * 0.22)
  const [displayVal, setDisplayVal] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  const animateTo = useCallback((to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const from = displayVal
    startRef.current = performance.now()
    const duration = 1800

    const step = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayVal(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [displayVal])

  useEffect(() => {
    animateTo(target)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      style={{
        fontSize,
        fontWeight: 800,
        color,
        fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 20px ${color}44`,
        lineHeight: 1,
      }}
    >
      {displayVal}
    </span>
  )
}

// ============================================
// Factor Breakdown
// ============================================

function FactorBreakdown({ factors }: { factors: SafetyFactor[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 w-full max-w-md mx-auto">
      {factors.map((factor, i) => {
        const Icon = getFactorIcon(factor.status)
        const iconColor = getFactorColor(factor.status)
        return (
          <motion.div
            key={factor.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.05, duration: 0.3 }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.04]"
          >
            <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />
            <span className="text-[11px] leading-tight text-white/70 truncate flex-1">
              {factor.label}
            </span>
            <span
              className="text-[10px] font-semibold tabular-nums ml-auto"
              style={{ color: iconColor }}
            >
              +{factor.points}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================
// Main Gauge Component
// ============================================

export function SafetyScoreGauge({
  score,
  size = 220,
  showDetails = true,
  factors = [],
  className,
}: SafetyScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score))
  const levelIdx = getLevelIndex(clampedScore)
  const levelConfig = LEVEL_CONFIG[levelIdx]
  const scoreColor = getScoreColor(clampedScore)
  const isCritical = clampedScore < 30

  const LevelIcon = levelConfig.icon

  // SVG geometry
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = Math.max(MIN_STROKE, size * STROKE_WIDTH_RATIO)
  const radius = (size - strokeWidth * 2) / 2 - 4
  const safeRadius = Math.max(10, radius)

  // Arc calculations
  const startDeg = ARC_START_DEGREES
  const endDeg = startDeg + ARC_TOTAL_DEGREES
  const scoreDeg = startDeg + (clampedScore / 100) * ARC_TOTAL_DEGREES

  // Background track
  const bgPath = describeArc(cx, cy, safeRadius, startDeg, endDeg)
  // Score arc
  const scorePath =
    clampedScore > 0
      ? describeArc(cx, cy, safeRadius, startDeg, scoreDeg)
      : ''

  // Unique IDs for SVG defs
  const uid = useRef(`gauge-${Math.random().toString(36).slice(2, 8)}`).current
  const gradientId = `${uid}-grad`
  const glowId = `${uid}-glow`
  const filterId = `${uid}-blur`

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Gauge container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Critical pulse ring */}
        {isCritical && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${COLORS.red}22`,
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Bright green ambient glow for very safe */}
        {clampedScore >= 85 && (
          <motion.div
            className="absolute inset-[-10px] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${COLORS.brightGreen}15 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            {/* Score gradient */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={scoreColor}
                stopOpacity="0.9"
              />
              <stop
                offset="100%"
                stopColor={clampedScore >= 85 ? COLORS.brightGreen : scoreColor}
                stopOpacity="1"
              />
            </linearGradient>

            {/* Glow filter for high scores */}
            {clampedScore >= 85 && (
              <filter
                id={filterId}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="3"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}

            {/* Glow gradient for ambient arc */}
            {clampedScore >= 85 && (
              <linearGradient
                id={glowId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={COLORS.brightGreen}
                  stopOpacity="0.4"
                />
                <stop
                  offset="100%"
                  stopColor={COLORS.green}
                  stopOpacity="0.2"
                />
              </linearGradient>
            )}
          </defs>

          {/* Background track arc */}
          <path
            d={bgPath}
            fill="none"
            stroke={COLORS.bgTrack}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Tick marks at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const tickDeg = startDeg + (pct / 100) * ARC_TOTAL_DEGREES
            const inner = polarToCartesian(
              cx,
              cy,
              safeRadius - strokeWidth * 0.6,
              tickDeg,
            )
            const outer = polarToCartesian(
              cx,
              cy,
              safeRadius + strokeWidth * 0.6,
              tickDeg,
            )
            return (
              <line
                key={pct}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                strokeLinecap="round"
              />
            )
          })}

          {/* Glow arc behind (rendered first for layering) */}
          {clampedScore >= 85 && clampedScore > 0 && (
            <motion.path
              d={scorePath}
              fill="none"
              stroke={`url(#${glowId})`}
              strokeWidth={strokeWidth + 8}
              strokeLinecap="round"
              style={{ filter: 'blur(6px)' }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: 1.6,
                  ease: [0.16, 1, 0.3, 1],
                },
                opacity: { duration: 0.5 },
              }}
            />
          )}

          {/* Score arc — animated with framer-motion */}
          {clampedScore > 0 && (
            <motion.path
              d={scorePath}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter={clampedScore >= 85 ? `url(#${filterId})` : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: 1.6,
                  ease: [0.16, 1, 0.3, 1],
                },
                opacity: { duration: 0.3 },
              }}
            />
          )}

          {/* Needle dot at end of arc */}
          {clampedScore > 0 && (
            <motion.circle
              cx={polarToCartesian(cx, cy, safeRadius, scoreDeg).x}
              cy={polarToCartesian(cx, cy, safeRadius, scoreDeg).y}
              r={strokeWidth / 2 + 2}
              fill={scoreColor}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 1.2,
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
            />
          )}
        </svg>

        {/* Center content overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingBottom: size * 0.12 }}
        >
          {/* Level icon */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.3,
              type: 'spring',
              stiffness: 200,
              damping: 12,
            }}
            className="mb-1"
          >
            <LevelIcon
              size={size * 0.1}
              style={{ color: scoreColor }}
              className={cn(isCritical && 'animate-pulse')}
            />
          </motion.div>

          {/* Score number */}
          <AnimatedScore target={clampedScore} size={size} color={scoreColor} />

          {/* "de 100" label */}
          <motion.span
            className="text-white/30 mt-0.5"
            style={{ fontSize: Math.max(9, size * 0.045) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            de 100
          </motion.span>

          {/* Status label */}
          <motion.span
            className="font-semibold mt-1 tracking-wide uppercase"
            style={{
              fontSize: Math.max(10, size * 0.055),
              color: scoreColor,
              textShadow: isCritical
                ? `0 0 12px ${COLORS.red}66`
                : clampedScore >= 85
                  ? `0 0 12px ${COLORS.brightGreen}44`
                  : 'none',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: 1,
              y: 0,
              ...(isCritical ? { scale: [1, 1.03, 1] } : {}),
            }}
            transition={{
              opacity: { delay: 1.2 },
              y: { delay: 1.2, duration: 0.4 },
              ...(isCritical
                ? {
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }
                : {}),
            }}
          >
            {levelConfig.label}
          </motion.span>
        </div>
      </div>

      {/* Factor breakdown */}
      {showDetails && factors.length > 0 && (
        <FactorBreakdown factors={factors} />
      )}
    </div>
  )
}

export default SafetyScoreGauge
