import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Circle, useMap, Polyline } from 'react-leaflet'
import {
  ShieldAlert, ShieldCheck, XCircle, Phone, Share2, Copy, Check,
  Clock, Users, MapPin, AlertTriangle, ChevronDown, ChevronUp,
  Navigation, RefreshCw, Volume2, VolumeX, Radio, WifiOff, CloudOff,
  Battery, BatteryCharging, BatteryWarning, MessageCircle, Crosshair,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useEmergencyAlarm } from '@/hooks/useEmergencyAlarm'
import { useAuth } from '@/hooks/useAuth'
import { getEmergencyShareUrl } from '@/lib/api'
import { SpotlightCard, Shimmer, BeamBorder } from '@/components/effects'
import { useNetworkStatus, formatOfflineDuration } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

// ============================================
// Map helpers
// ============================================

function MapController({ center, followUser, userPosition }: { center: [number, number]; followUser: boolean; userPosition: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (followUser && userPosition) {
      map.setView(userPosition, 16, { animate: true })
    } else {
      map.setView(center, 16, { animate: true })
    }
  }, [map, center, followUser, userPosition])
  return null
}

// ============================================
// Live GPS trail component
// ============================================

function GpsTrail({ positions }: { positions: [number, number][] }) {
  if (positions.length < 2) return null
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: '#25D366',
        weight: 3,
        opacity: 0.6,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  )
}

function EmergencyMarker({ position }: { position: [number, number] }) {
  const html = '<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">' +
    '<div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(239,68,68,0.2);animation:pulse-ring 1.5s infinite;"></div>' +
    '<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(239,68,68,0.08);animation:pulse-ring 1.5s infinite 0.3s;"></div>' +
    '<div style="width:12px;height:12px;border-radius:50%;background:#EF4444;border:3px solid rgba(10,15,26,0.9);box-shadow:0 0 20px rgba(239,68,68,0.6);z-index:2;position:relative;"></div>' +
    '</div>' +
    '<style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(3);opacity:0}}</style>'
  const icon = L.divIcon({ html, className: '', iconSize: [24, 24], iconAnchor: [12, 12] })
  return <Marker position={position} icon={icon} />
}

function UserPositionMarker({ position }: { position: [number, number] }) {
  const html = '<div style="position:relative;width:16px;height:16px;display:flex;align-items:center;justify-content:center;">' +
    '<div style="position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(37,211,102,0.15);animation:pulse-ring 2.5s infinite;"></div>' +
    '<div style="width:8px;height:8px;border-radius:50%;background:#25D366;border:2px solid rgba(10,15,26,0.9);box-shadow:0 0 10px rgba(37,211,102,0.4);z-index:2;position:relative;"></div>' +
    '</div>' +
    '<style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(3);opacity:0}}</style>'
  const icon = L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] })
  return <Marker position={position} icon={icon} />
}

// ============================================
// Time display
// ============================================

function RelativeTime({ dateStr }: { dateStr: string }) {
  const [text, setText] = useState('')
  useEffect(() => {
    const update = () => {
      try {
        setText(formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pt }))
      } catch { setText(dateStr) }
    }
    update()
    const interval = setInterval(update, 10_000)
    return () => clearInterval(interval)
  }, [dateStr])
  return <span>{text}</span>
}

// ============================================
// Status badge component
// ============================================

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active: { label: 'ACTIVA', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: ShieldAlert },
  resolved: { label: 'RESOLVIDA', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10 border-[#25D366]/20', icon: ShieldCheck },
  false_alarm: { label: 'FALSO ALARME', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.active
  const Icon = config.icon
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold', config.bg, config.color)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  )
}

// ============================================
// Resolve dialog
// ============================================

function ResolveDialog({
  open,
  onClose,
  onResolve,
  onFalseAlarm,
  isResolving,
}: {
  open: boolean
  onClose: () => void
  onResolve: (reason: string) => void
  onFalseAlarm: () => void
  isResolving: boolean
}) {
  const [reason, setReason] = useState('')
  const [mode, setMode] = useState<'resolve' | 'false'>('resolve')

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md mx-4 mb-4 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#111827] rounded-2xl border border-white/[0.06] p-6 shadow-2xl">
          <h3 className="text-base font-display font-bold text-white mb-1">
            {mode === 'resolve' ? 'Resolver Emergencia' : 'Marcar como Falso Alarme'}
          </h3>
          <p className="text-xs text-white/40 mb-5">
            {mode === 'resolve'
              ? 'Confirme que a situacao esta sob controlo. Adicione uma nota opcional.'
              : 'Registe que esta emergencia foi um falso alarme. Nenhum contacto sera notificado.'}
          </p>

          {mode === 'resolve' && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={'Nota opcional (ex: Contactado pela policia, Encontrei o dispositivo)...'}
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-[#25D366]/30 focus:border-[#25D366]/30 mb-4"
            />
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1 text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl">
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setMode('false') }}
              className={cn(
                'text-xs rounded-xl border',
                mode === 'false' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-white/[0.06] text-white/30 hover:text-white/50'
              )}
            >
              Falso Alarme
            </Button>
            <Button
              onClick={() => onResolve(reason)}
              disabled={isResolving}
              className="flex-1 bg-[#25D366] hover:bg-[#1fb855] text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {isResolving ? 'A processar...' : 'Confirmar Resolucao'}
            </Button>
          </div>

          {mode === 'false' && (
            <Button
              onClick={onFalseAlarm}
              disabled={isResolving}
              variant="outline"
              className="w-full mt-3 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 rounded-xl disabled:opacity-50"
            >
              {isResolving ? 'A processar...' : 'Confirmar Falso Alarme'}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// Main Emergency Page
// ============================================

export default function Emergency() {
  const { user } = useAuth()
  const { position: userPos, isTracking } = useGeolocation()
  const { triggerAlarm, silenceAlarm, isSounding } = useEmergencyAlarm({ duration: 20_000 })
  const {
    activeEmergency,
    isLoading,
    history,
    resolveEmergency,
    markFalseAlarm,
    refetchActive,
  } = useEmergencyAlerts()

  const [showResolve, setShowResolve] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(false)
  const [followUser, setFollowUser] = useState(false)
  const network = useNetworkStatus(false)
  const queue = useOfflineQueue()
  const trailRef = useRef<[number, number][]>([])
  const lastTrailPosRef = useRef<string>('')

  // Battery level
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [batteryCharging, setBatteryCharging] = useState(false)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(Math.round(bat.level * 100))
        setBatteryCharging(bat.charging)
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)))
        bat.addEventListener('chargingchange', () => setBatteryCharging(bat.charging))
      }).catch(() => {})
    }
  }, [])

  // GPS last update
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string | null>(null)
  useEffect(() => {
    if (userPos) setLastGpsUpdate(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }, [userPos])

  // Record GPS trail during active emergency
  const hasActive = activeEmergency?.status === 'active'
  useEffect(() => {
    if (!hasActive || !userPos) {
      if (!hasActive) trailRef.current = []
      lastTrailPosRef.current = ''
      return
    }
    const key = `${userPos.latitude.toFixed(5)},${userPos.longitude.toFixed(5)}`
    if (key !== lastTrailPosRef.current) {
      lastTrailPosRef.current = key
      trailRef.current.push([userPos.latitude, userPos.longitude])
      // Keep only last 100 positions
      if (trailRef.current.length > 100) trailRef.current = trailRef.current.slice(-100)
    }
  }, [hasActive, userPos])

  // Auto-follow user during active emergency
  useEffect(() => {
    if (hasActive) setFollowUser(true)
  }, [hasActive])

  const toggleFollow = useCallback(() => setFollowUser(f => !f), [])

  const elapsed = hasActive
    ? Math.floor((Date.now() - new Date(activeEmergency.created_at).getTime()) / 1000)
    : 0

  // Elapsed timer
  const [elapsedDisplay, setElapsedDisplay] = useState(0)
  useEffect(() => {
    if (!hasActive) { setElapsedDisplay(0); return }
    setElapsedDisplay(elapsed)
    const interval = setInterval(() => {
      setElapsedDisplay((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [hasActive, activeEmergency?.created_at])

  const formatElapsed = (s: number) => {
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Handle resolve
  const handleResolve = async (reason: string) => {
    if (!activeEmergency) return
    setIsResolving(true)
    await resolveEmergency(activeEmergency.id, reason || undefined)
    setIsResolving(false)
    setShowResolve(false)
  }

  const handleFalseAlarm = async () => {
    if (!activeEmergency) return
    setIsResolving(true)
    await markFalseAlarm(activeEmergency.id)
    setIsResolving(false)
    setShowResolve(false)
  }

  // Share link
  const shareUrl = activeEmergency?.share_token ? getEmergencyShareUrl(activeEmergency.share_token) : ''
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copiado! Envie para a policia ou familia.')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Erro ao copiar link')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Emergencia StatusAds Connect',
          text: `Emergencia activada! Acompanhe em tempo real: ${shareUrl}`,
          url: shareUrl,
        })
      } catch {}
    } else {
      handleCopyLink()
    }
  }

  // Map center: emergency location or user position or fallback
  const mapCenter: [number, number] = useMemo(() => {
    if (activeEmergency) return [activeEmergency.latitude, activeEmergency.longitude]
    if (userPos) return [userPos.latitude, userPos.longitude]
    return [-25.9692, 32.5732]
  }, [activeEmergency, userPos])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 space-y-4">
        <Shimmer className="h-48 w-full rounded-2xl" />
        <Shimmer className="h-64 w-full rounded-2xl" />
        <Shimmer className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] pb-24 lg:pb-6">
      {/* Active Emergency Banner */}
      {hasActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-red-950/80 to-red-900/40 border-b border-red-500/20"
        >
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-red-500/[0.03] animate-pulse" />
          <div className="relative px-4 md:px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
                    <ShieldAlert className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-red-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <h1 className="text-lg font-display font-bold text-white tracking-tight">Emergencia Activa</h1>
                  <p className="text-xs text-red-300/60 mt-0.5">
                    Activada <RelativeTime dateStr={activeEmergency.created_at} />
                  </p>
                </div>
              </div>

              {/* Elapsed timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 border border-red-500/15">
                  <Clock className="h-3.5 w-3.5 text-red-400/60" />
                  <span className="text-2xl font-mono font-bold text-white tabular-nums tracking-wider">
                    {formatElapsed(elapsedDisplay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Offline / Queue indicator */}
            {(!network.isOnline || queue.pendingCount > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {!network.isOnline && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <WifiOff className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-amber-400">
                      Offline{network.offlineDuration ? ` ha ${formatOfflineDuration(network.offlineDuration)}` : ''}
                    </span>
                  </div>
                )}
                {queue.pendingCount > 0 && (
                  <button
                    onClick={() => queue.syncQueue()}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors',
                      queue.emergencyPending > 0
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-blue-500/10 border-blue-500/20'
                    )}
                  >
                    {queue.isSyncing
                      ? <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                      : queue.emergencyPending > 0
                        ? <CloudOff className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                        : <CloudOff className="h-3.5 w-3.5 text-blue-400" />
                    }
                    <span className={cn(
                      'text-[11px] font-medium',
                      queue.emergencyPending > 0 ? 'text-red-400' : 'text-blue-400'
                    )}>
                      {queue.emergencyPending > 0
                        ? `${queue.emergencyPending} emergencia(s) na fila`
                        : `${queue.eventPending} evento(s) na fila`
                      }
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-2 mt-3">
              {batteryLevel !== null && (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border',
                  batteryCharging
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : batteryLevel <= 20
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-white/[0.04] border-white/[0.06]'
                )}>
                  {batteryCharging
                    ? <BatteryCharging className="h-3.5 w-3.5 text-blue-400" />
                    : batteryLevel <= 20
                      ? <BatteryWarning className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                      : <Battery className="h-3.5 w-3.5 text-white/50" />
                  }
                  <span className={cn(
                    'text-[11px] font-mono font-medium',
                    batteryCharging ? 'text-blue-400' : batteryLevel <= 20 ? 'text-red-400' : 'text-white/50'
                  )}>{batteryLevel}%</span>
                </div>
              )}
              {lastGpsUpdate && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <Crosshair className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-[11px] font-mono text-white/40">GPS {lastGpsUpdate}</span>
                </div>
              )}
              {userPos?.accuracy != null && (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border',
                  userPos.accuracy < 20 ? 'bg-[#25D366]/10 border-[#25D366]/20' : userPos.accuracy < 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'
                )}>
                  <Radio className={cn(
                    'h-3.5 w-3.5',
                    userPos.accuracy < 20 ? 'text-[#25D366]' : userPos.accuracy < 50 ? 'text-amber-400' : 'text-red-400'
                  )} />
                  <span className={cn(
                    'text-[11px] font-mono font-medium',
                    userPos.accuracy < 20 ? 'text-[#25D366]' : userPos.accuracy < 50 ? 'text-amber-400' : 'text-red-400'
                  )}>Precisao {Math.round(userPos.accuracy)}m</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                onClick={() => setShowResolve(true)}
                className="bg-[#25D366] hover:bg-[#1fb855] text-white font-semibold rounded-xl gap-2 text-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Resolver Emergencia
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-xl gap-2 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" /> Partilhar Localizacao
              </Button>
              <Button
                onClick={() => refetchActive()}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={isSounding ? silenceAlarm : triggerAlarm}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-xl transition-all',
                  isSounding
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] animate-pulse'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                )}
              >
                {isSounding ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </Button>
              <Button
                onClick={() => {
                  const coords = userPos
                    ? `${userPos.latitude.toFixed(5)}, ${userPos.longitude.toFixed(5)}`
                    : activeEmergency
                      ? `${activeEmergency.latitude.toFixed(5)}, ${activeEmergency.longitude.toFixed(5)}`
                      : ''
                  if (coords) {
                    navigator.clipboard.writeText(coords).then(
                      () => toast.success('Coordenadas copiadas'),
                      () => toast.error('Erro ao copiar')
                    )
                  }
                }}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                title="Copiar coordenadas"
              >
                <MapPin className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* No active emergency */}
        {!hasActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#25D366]/[0.06] border border-[#25D366]/15 mb-5">
              <ShieldCheck className="h-10 w-10 text-[#25D366]/60" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Sem Emergencias Activas</h2>
            <p className="text-sm text-white/30 max-w-sm">
              Nenhuma emergencia activa neste momento. O sistema continua a monitorizar os seus dispositivos e zona de seguranca.
            </p>
            <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-[#25D366]/[0.06] border border-[#25D366]/15">
              <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span className="text-xs font-medium text-[#25D366]">Monitorizacao activa</span>
            </div>
          </motion.div>
        )}

        {/* Emergency details card (shown when active or resolved recently) */}
        {activeEmergency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SpotlightCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={activeEmergency.status} />
                  <span className="text-[10px] text-white/20 font-mono">
                    ID: {activeEmergency.id.slice(0, 8)}
                  </span>
                </div>
                {activeEmergency.status !== 'active' && activeEmergency.resolved_at && (
                  <span className="text-[10px] text-white/25">
                    Resolvida <RelativeTime dateStr={activeEmergency.resolved_at} />
                  </span>
                )}
              </div>

              {/* Location info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <MapPin className="h-4 w-4 text-red-400/70" />
                  <div>
                    <p className="text-[10px] text-white/25">Localizacao</p>
                    <p className="text-xs font-mono text-white/70">{activeEmergency.latitude.toFixed(5)}, {activeEmergency.longitude.toFixed(5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Users className="h-4 w-4 text-blue-400/70" />
                  <div>
                    <p className="text-[10px] text-white/25">Contactos Notificados</p>
                    <p className="text-xs font-semibold text-white/80">{activeEmergency.contacts_notified?.length || 0} contactos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Clock className="h-4 w-4 text-amber-400/70" />
                  <div>
                    <p className="text-[10px] text-white/25">Hora da Activacao</p>
                    <p className="text-xs text-white/70">{new Date(activeEmergency.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

              {/* Share link (always visible for active, for resolved too) */}
              {shareUrl && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Share2 className="h-4 w-4 text-white/25 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/25 mb-0.5">Link de partilha (policia/familia)</p>
                    <p className="text-[11px] font-mono text-white/40 truncate">{shareUrl}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyLink}
                    className="shrink-0 h-8 px-3 rounded-lg text-[10px] gap-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  >
                    {copied ? <Check className="h-3 w-3 text-[#25D366]" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              )}

              {/* Contacted phones list */}
              {activeEmergency.contacts_notified?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-white/25 mb-2">Numeros contactados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeEmergency.contacts_notified.map((phone, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-white/40">
                        <Phone className="h-2.5 w-2.5" />{phone}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolve reason */}
              {activeEmergency.resolve_reason && (
                <div className="mt-3 p-3 rounded-xl bg-[#25D366]/[0.04] border border-[#25D366]/10">
                  <p className="text-[10px] text-[#25D366]/50 mb-0.5">Motivo da resolucao</p>
                  <p className="text-xs text-[#25D366]/80">{activeEmergency.resolve_reason}</p>
                </div>
              )}
            </SpotlightCard>
          </motion.div>
        )}

        {/* Emergency Map */}
        {(activeEmergency || userPos) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl overflow-hidden border border-white/[0.04] relative"
          >
            <div className="h-[300px] md:h-[400px]">
              <MapContainer center={mapCenter} zoom={16} className="h-full w-full" zoomControl={false} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <MapController center={mapCenter} followUser={followUser} userPosition={userPos ? [userPos.latitude, userPos.longitude] : null} />
                {activeEmergency && <EmergencyMarker position={[activeEmergency.latitude, activeEmergency.longitude]} />}
                {userPos && <UserPositionMarker position={[userPos.latitude, userPos.longitude]} />}
                {/* GPS trail during active emergency */}
                {hasActive && trailRef.current.length >= 2 && <GpsTrail positions={trailRef.current} />}
              </MapContainer>
              {/* Map overlay controls */}
              <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                {/* Live GPS indicator */}
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-medium border backdrop-blur-md',
                  isTracking
                    ? 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]'
                    : 'bg-white/[0.04] border-white/[0.06] text-white/30'
                )}>
                  <Radio className="h-3 w-3" />
                  {isTracking ? `GPS ${userPos ? Math.round(userPos.accuracy) + 'm' : 'Activo'}` : 'GPS Inactivo'}
                </div>
                {/* Follow user toggle */}
                <button
                  onClick={toggleFollow}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-medium border backdrop-blur-md transition-all',
                    followUser
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-white/[0.04] border-white/[0.06] text-white/30 hover:text-white/50'
                  )}>
                  <Navigation className="h-3 w-3" />
                  {followUser ? 'Centrar' : 'Seguir'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Emergency History */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-semibold text-white">Historico de Emergencias</h3>
              <span className="text-[10px] text-white/25">{history.length} registos</span>
            </div>

            <div className="space-y-2">
              {history.slice(0, expandedHistory ? history.length : 5).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:bg-white/[0.02]',
                    item.status === 'active'
                      ? 'bg-red-500/[0.04] border-red-500/10'
                      : item.status === 'resolved'
                        ? 'bg-white/[0.01] border-white/[0.04]'
                        : 'bg-white/[0.01] border-white/[0.04]'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    item.status === 'active' ? 'bg-red-500/10' : item.status === 'resolved' ? 'bg-[#25D366]/10' : 'bg-amber-500/10'
                  )}>
                    {item.status === 'active' && <ShieldAlert className="h-4 w-4 text-red-400" />}
                    {item.status === 'resolved' && <ShieldCheck className="h-4 w-4 text-[#25D366]" />}
                    {item.status === 'false_alarm' && <XCircle className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-white/70 truncate">
                        {item.status === 'active' ? 'Emergencia activa' : item.status === 'resolved' ? 'Emergencia resolvida' : 'Falso alarme'}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-white/25 font-mono">
                        <MapPin className="inline h-2.5 w-2.5 mr-0.5" />
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </span>
                      <span className="text-[10px] text-white/20">
                        <Users className="inline h-2.5 w-2.5 mr-0.5" />
                        {item.contacts_notified?.length || 0} contactos
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-white/25"><RelativeTime dateStr={item.created_at} /></p>
                    {item.resolved_at && (
                      <p className="text-[9px] text-white/15 mt-0.5">
                        Resolvida <RelativeTime dateStr={item.resolved_at} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {history.length > 5 && (
              <Button
                variant="ghost"
                onClick={() => setExpandedHistory(!expandedHistory)}
                className="w-full mt-2 text-white/30 hover:text-white/50 hover:bg-white/[0.02] rounded-xl gap-1 text-xs"
              >
                {expandedHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expandedHistory ? 'Mostrar menos' : `Ver todos (${history.length})`}
              </Button>
            )}
          </motion.div>
        )}

        {/* Empty history */}
        {!isLoading && history.length === 0 && !activeEmergency && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <AlertTriangle className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/25">Nenhum historico de emergencias</p>
            <p className="text-xs text-white/15 mt-1">As emergencias activadas aparecerao aqui.</p>
          </motion.div>
        )}
      </div>

      {/* Resolve Dialog */}
      <AnimatePresence>
        {showResolve && (
          <ResolveDialog
            open={showResolve}
            onClose={() => setShowResolve(false)}
            onResolve={handleResolve}
            onFalseAlarm={handleFalseAlarm}
            isResolving={isResolving}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
