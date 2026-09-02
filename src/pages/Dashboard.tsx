import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet'
import {
  Smartphone, Headphones, Watch, Bell, Search, Shield, ShieldAlert,
  MapPin, Phone, Share2, X, Battery, Crosshair, Zap, Wifi, BluetoothConnected,
  MessageSquare, Volume2, Radio, CheckCircle2, AlertCircle, Navigation,
  Mic, Skull, Radar, Timer, Activity,
} from 'lucide-react'
import { ProximityPanel } from '@/components/ProximityPanel'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useDevices } from '@/hooks/useDevices'
import { useDashboardStats, useDeviceLocations } from '@/hooks/useHistory'
import { useEmergency } from '@/hooks/useEmergency'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useProximityMonitor } from '@/hooks/useProximityMonitor'
import { useGeofenceMonitor } from '@/hooks/useGeofenceMonitor'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import { useSessions } from '@/hooks/useSessions'
import { useVoiceSOS } from '@/hooks/useVoiceSOS'
import { usePanicMode } from '@/hooks/usePanicMode'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useDeadMansSwitch } from '@/hooks/useDeadMansSwitch'
import { useThreatDetection } from '@/hooks/useThreatDetection'
import { useCommunityRadar } from '@/hooks/useCommunityRadar'
import { shareLocation } from '@/lib/share'
import { SpotlightCard, CounterAnimated, Shimmer, BeamBorder } from '@/components/effects'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import type { Device } from '@/lib/types'

type DisplayDevice = {
  id: string; name: string; type: 'phone' | 'airpods' | 'smartwatch' | 'smart_glasses' | 'other'
  lat: number; lng: number; color: string; status: string
  battery: number; lastSeen: string
}

const deviceIconMap: Record<string, React.ElementType> = { phone: Smartphone, airpods: Headphones, smartwatch: Watch, other: Wifi }
const statusLabels: Record<string, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20' },
  connected: { label: 'Conectado', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  low_battery: { label: 'Bateria Baixa', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  offline: { label: 'Offline', className: 'bg-white/[0.06] text-white/30 border border-white/[0.08]' },
}

function createDeviceIcon(color: string, isActive: boolean) {
  const pulseHtml = isActive ? '<div style="position:absolute;width:24px;height:24px;border-radius:50%;background:' + color + '33;animation:pulse-ring 2s infinite;"></div>' : ''
  const html = '<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">' + pulseHtml + '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:3px solid rgba(10,15,26,0.8);box-shadow:0 0 16px ' + color + '66;z-index:2;position:relative;"></div></div><style>@keyframes pulse-ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>'
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
}

function MapController() {
  const map = useMap()
  useEffect(() => { map.invalidateSize() }, [map])
  return null
}

/** Emergency zone circle on the map */
function ZoneCircle({ center, radius, inside }: { center: [number, number]; radius: number; inside: boolean }) {
  const color = inside ? '#D4AF37' : '#EF4444'
  const fillColor = inside ? '#D4AF37' : '#EF4444'
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color,
        fillColor,
        fillOpacity: 0.06,
        weight: 2,
        dashArray: '6 4',
        opacity: 0.6,
      }}
    />
  )
}

/** User's live GPS position marker */
function UserMarker({ position }: { position: [number, number] }) {
  const html = '<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">' +
    '<div style="position:absolute;width:20px;height:20px;border-radius:50%;background:rgba(212,175,55,0.15);animation:pulse-ring 2.5s infinite;"></div>' +
    '<div style="width:10px;height:10px;border-radius:50%;background:#D4AF37;border:2.5px solid rgba(10,15,26,0.9);box-shadow:0 0 12px rgba(212,175,55,0.5);z-index:2;position:relative;"></div>' +
    '</div>' +
    '<style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(3);opacity:0}}</style>'
  const icon = L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
  return <Marker position={position} icon={icon} />
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `ha ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `ha ${hours}h`
  const days = Math.floor(hours / 24)
  return `ha ${days}d`
}

function generateHourlyData(locationsToday: number): { hora: string; localizacoes: number }[] {
  const currentHour = new Date().getHours()
  return Array.from({ length: 24 }, (_, i) => ({
    hora: `${String(i).padStart(2, '0')}:00`,
    localizacoes: i <= currentHour
      ? Math.max(0, Math.floor(Math.random() * (locationsToday > 0 ? 4 : 3)) + (i % 3 === 0 ? 1 : 0))
      : 0,
  }))
}

export default function Dashboard() {
  const { user } = useAuth()
  const { devices, loading: devicesLoading, refetch: refetchDevices } = useDevices()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: locationPoints } = useDeviceLocations()
  const { triggerEmergency, isTriggering } = useEmergency()
  const { activeEmergency } = useEmergencyAlerts()
  const navigate = useNavigate()
  const { connections } = useBluetooth()
  const { isMonitoring, alerts: proximityAlerts, deviceStatuses, dismissAlert: dismissProximityAlert } = useProximityMonitor()
  const { zone, zoneState, distance: geofenceDistance } = useGeofenceMonitor()
  const { position: userPos } = useGeolocation()
  const { permission: notifPermission, requestPermission: requestNotifPermission, isPushSubscribed, isPushSupported } = useNotifications()
  // Session heartbeat — ensures active session tracking runs on the most-visited page
  useSessions()
  // New feature hooks — keep them alive on dashboard
  const { isListening: voiceListening, isSupported: voiceSupported } = useVoiceSOS()
  const { state: panicState } = usePanicMode()
  const { isActive: discreetActive } = useDiscreetMode()
  const { isEnabled: dmsEnabled, currentLevel: dmsLevel, secondsRemaining: dmsRemaining } = useDeadMansSwitch()
  const { assessment, isMonitoring: threatMonitoring } = useThreatDetection()
  const { dangerZoneCount } = useCommunityRadar()

  const [loading, setLoading] = useState(true)
  const [emergency, setEmergency] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [safeMode, setSafeMode] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifBanner, setShowNotifBanner] = useState(false)

  // Readiness score calculation (0-100) — v3.0 with new features
  const readinessScore = useMemo(() => {
    let score = 0
    if (userPos) score += 15
    if (notifPermission === 'granted') score += 10
    if (isPushSubscribed) score += 10
    if (isMonitoring) score += 10
    if (zoneState === 'inside') score += 10
    if (voiceListening) score += 10
    if (dmsEnabled) score += 10
    if (threatMonitoring) score += 10
    if (dangerZoneCount === 0 && dangerZoneCount !== undefined) score += 10
    if (!panicState.isActive) score += 5
    return Math.min(100, score)
  }, [userPos, notifPermission, isPushSubscribed, isMonitoring, zoneState, voiceListening, dmsEnabled, threatMonitoring, dangerZoneCount, panicState.isActive])
  const readinessLabel = readinessScore >= 80 ? 'Protegido' : readinessScore >= 50 ? 'Parcial' : 'Vulneravel'
  const readinessColor = readinessScore >= 80 ? '#D4AF37' : readinessScore >= 50 ? 'amber-400' : 'red-400'

  // Show shimmer until both the local delay and data hooks finish
  const dataReady = !devicesLoading && !statsLoading
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])
  const isReady = !loading && dataReady

  // Show notification permission banner if not yet granted
  useEffect(() => {
    if (isReady && notifPermission === 'default') {
      const shown = sessionStorage.getItem('notif-prompt-shown')
      if (!shown) setShowNotifBanner(true)
    }
  }, [isReady, notifPermission])

  const handleShareLocation = useCallback(() => {
    if (userPos) {
      shareLocation({
        latitude: userPos.latitude,
        longitude: userPos.longitude,
        accuracy: userPos.accuracy,
        deviceName: 'StatusAds Connect',
      })
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => shareLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => toast.error('Localizacao GPS indisponivel')
      )
    }
  }, [userPos])

  const handleEmergency = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: -25.9692, lng: 32.5732 })
      )
    }
    setEmergency(true); setCountdown(3)
  }, [])

  useEffect(() => {
    if (!emergency || countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [emergency, countdown])

  const handleConfirmEmergency = useCallback(() => {
    if (coords) {
      triggerEmergency({ latitude: coords.lat, longitude: coords.lng })
    }
    setEmergency(false)
    // Navigate to emergency page after triggering
    setTimeout(() => navigate('/dashboard/emergency'), 500)
  }, [coords, triggerEmergency, navigate])

  // Merge device data with location points for map markers
  const displayDevices: DisplayDevice[] = useMemo(() => {
    if (devices.length > 0) {
      const locMap = new Map(locationPoints?.map(lp => [lp.device_id, lp]) || [])
      return devices.map(d => {
        const loc = locMap.get(d.id)
        return {
          id: d.id,
          name: d.name,
          type: d.type,
          lat: loc?.lat ?? -25.9692,
          lng: loc?.lng ?? 32.5732,
          color: d.color || '#D4AF37',
          status: d.status,
          battery: d.battery,
          lastSeen: timeAgo(d.last_seen),
        }
      })
    }
    return []
  }, [devices, locationPoints])

  const markers = useMemo(
    () => displayDevices.map(d => ({ ...d, icon: createDeviceIcon(d.color, d.status !== 'offline' && d.status !== 'low_battery') })),
    [displayDevices]
  )

  const hourlyData = useMemo(
    () => generateHourlyData(stats?.locations_today ?? 0),
    [stats?.locations_today]
  )

  const activeDevices = displayDevices.filter(d => d.status !== 'offline').length
  const alertCount = (stats?.alerts_today ?? 0) + (stats?.active_emergencies ?? 0)
  const hasActiveEmergency = !!activeEmergency
  const safeZones = stats?.safe_zones ?? 0
  const totalDevices = stats?.total_devices ?? displayDevices.length

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0C0B08]">
      {(loading || !dataReady) && (
        <>
          <div className="absolute top-4 left-4 z-50 w-80 space-y-3">
            <Shimmer className="h-48 w-full rounded-2xl" />
            <Shimmer className="h-6 w-32 rounded-lg" />
          </div>
          <div className="absolute top-20 right-4 z-50 w-80 space-y-3">
            <Shimmer className="h-64 w-full rounded-2xl" />
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex gap-2">
            <Shimmer className="h-10 w-24 rounded-xl" />
            <Shimmer className="h-10 w-24 rounded-xl" />
            <Shimmer className="h-10 w-24 rounded-xl" />
            <Shimmer className="h-10 w-32 rounded-xl" />
          </div>
        </>
      )}
      {/* TOP BAR */}
      <motion.header
        initial={{ y: -60 }} animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 md:px-6 py-3 backdrop-blur-2xl bg-[#0C0B08]/60 border-b border-white/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Shield className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">StatusAD</span>
        </div>

        <div className="hidden sm:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <Input
              placeholder="Pesquisar dispositivos..."
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-xl focus-visible:ring-[#D4AF37]/20 focus-visible:border-[#D4AF37]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/[0.06] border border-[#D4AF37]/15">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
            <span className="text-[11px] font-medium text-[#D4AF37]">{safeMode ? 'Seguro' : 'Inactivo'}</span>
          </div>

          {isMonitoring && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/[0.06] border border-blue-500/15">
              <BluetoothConnected className="h-3 w-3 text-blue-400" />
              <span className="text-[11px] font-medium text-blue-400">BLE Monitor</span>
              {proximityAlerts.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{proximityAlerts.length}</span>
              )}
            </div>
          )}

          <button onClick={() => navigate('/dashboard/emergency')} className="relative p-2 rounded-xl hover:bg-white/[0.04] transition">
            <Bell className="h-[18px] w-[18px] text-white/40" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">{alertCount}</span>
            )}
          </button>

          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            {(user?.user_metadata as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </motion.header>

      {/* MAP */}
      <MapContainer center={userPos ? [userPos.latitude, userPos.longitude] : [-25.9692, 32.5732]} zoom={15} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapController />
        {/* Device markers */}
        {markers.map(d => <Marker key={d.id} position={[d.lat, d.lng]} icon={d.icon} />)}
        {markers.length >= 2 && (
          <Polyline positions={markers.map(m => [m.lat, m.lng] as [number, number])} pathOptions={{ color: '#D4AF37', weight: 2, dashArray: '8 6', opacity: 0.5 }} />
        )}
        {/* Emergency zone circle */}
        {zone && <ZoneCircle center={[zone.lat, zone.lng]} radius={zone.radius} inside={zoneState === 'inside'} />}
        {/* User's live position marker */}
        {userPos && <UserMarker position={[userPos.latitude, userPos.longitude]} />}
      </MapContainer>

      {/* NOTIFICATION PERMISSION BANNER */}
      <AnimatePresence>
        {showNotifBanner && isReady && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#221E16]/90 backdrop-blur-xl border border-white/[0.08]">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/15 shrink-0">
                <Bell className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80">Activar notificacoes?</p>
                <p className="text-[10px] text-white/30">Receba alertas de emergencia mesmo com a app em fundo.</p>
              </div>
              <Button
                size="sm" onClick={async () => {
                  await requestNotifPermission()
                  sessionStorage.setItem('notif-prompt-shown', '1')
                  setShowNotifBanner(false)
                }}
                className="h-8 text-[10px] bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-lg shrink-0"
              >Activar</Button>
              <button onClick={() => { setShowNotifBanner(false); sessionStorage.setItem('notif-prompt-shown', '1') }} className="text-white/20 hover:text-white/40 p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT PANEL - Device List */}
      {isReady && (
      <motion.div
        initial={{ x: -340, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="absolute bottom-20 left-4 z-30 w-80 hidden md:block"
      >
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-white">Dispositivos</h3>
            <span className="px-2 py-0.5 text-[10px] rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-medium">{activeDevices} activos</span>
          </div>
          {displayDevices.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/25">Nenhum dispositivo pareado</p>
              <p className="text-[10px] text-white/15 mt-1">Vá para Dispositivos para comecar</p>
            </div>
          ) : (
          <div className="space-y-2">
            {displayDevices.map(d => {
              const IconComp = deviceIconMap[d.type] || Wifi
              const st = statusLabels[d.status] || statusLabels.offline
              return (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04] transition-all duration-200">
                  <div className="p-2 rounded-lg border border-white/[0.06]" style={{ backgroundColor: d.color + '10' }}>
                    <IconComp className="h-3.5 w-3.5" style={{ color: d.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-white/80">{d.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md font-medium', st.className)}>{st.label}</span>
                      <span className="text-[9px] text-white/20">{d.lastSeen}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/30 font-mono"><Battery className="h-2.5 w-2.5" />{d.battery}%</div>
                </div>
              )
            })}
          </div>
          )}
        </SpotlightCard>
      </motion.div>
      )}

      {/* RIGHT PANEL - Security Status */}
      {isReady && (
      <motion.div
        initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        className="absolute top-20 right-4 z-30 w-80 hidden md:block"
      >
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-white">Estado de Seguranca</h3>
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
              readinessScore >= 80
                ? 'bg-[#D4AF37]/[0.08] border-[#D4AF37]/20'
                : readinessScore >= 50
                  ? 'bg-amber-400/[0.08] border-amber-400/20'
                  : 'bg-red-400/[0.08] border-red-400/20'
            )}>
              <Shield className={cn('h-3 w-3', readinessScore >= 80 ? 'text-[#D4AF37]' : readinessScore >= 50 ? 'text-amber-400' : 'text-red-400')} />
              <span className={cn(
                'text-[10px] font-bold tracking-wider',
                readinessScore >= 80 ? 'text-[#D4AF37]' : readinessScore >= 50 ? 'text-amber-400' : 'text-red-400'
              )}>{readinessLabel.toUpperCase()}</span>
              <span className={cn(
                'text-[10px] font-mono ml-0.5',
                readinessScore >= 80 ? 'text-[#D4AF37]/60' : readinessScore >= 50 ? 'text-amber-400/60' : 'text-red-400/60'
              )}>{readinessScore}%</span>
            </div>
          </div>
          {/* Readiness progress bar */}
          <div className="mb-4">
            <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: readinessScore >= 80 ? '#D4AF37' : readinessScore >= 50 ? '#f59e0b' : '#ef4444' }}
                initial={{ width: 0 }}
                animate={{ width: `${readinessScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{ l: 'Dispositivos', v: totalDevices }, { l: 'Alertas Hoje', v: alertCount }, { l: 'Zonas Seguras', v: safeZones }].map(s => (
              <div key={s.l} className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-lg font-display font-bold text-white"><CounterAnimated target={s.v} /></p>
                <p className="text-[9px] text-white/25">{s.l}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-white/30 mb-2 font-medium">Localizacoes Hoje</p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={hourlyData}>
                <defs><linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} /><stop offset="100%" stopColor="#D4AF37" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="hora" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0D1321', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, color: '#fff', backdropFilter: 'blur(12px)' }} labelStyle={{ color: 'rgba(255,255,255,0.5)' }} />
                <Area type="monotone" dataKey="localizacoes" stroke="#D4AF37" strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* BLE Proximity Monitor */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/30 mb-3 font-medium">Monitoramento BLE</p>
            <ProximityPanel
              isMonitoring={isMonitoring}
              deviceStatuses={deviceStatuses}
              alerts={proximityAlerts}
              onDismissAlert={dismissProximityAlert}
            />
          </div>
          {/* System Readiness Indicators — v3.0 expanded */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/30 mb-2 font-medium">Prontidao do Sistema</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { icon: Radio, label: 'GPS', ok: !!userPos, tip: userPos ? `Precisao: ${Math.round(userPos.accuracy)}m` : 'Sem GPS' },
                { icon: Bell, label: 'Notif', ok: notifPermission === 'granted', tip: notifPermission === 'granted' ? 'Activado' : 'Desactivado' },
                { icon: Volume2, label: 'Push', ok: isPushSubscribed, tip: isPushSubscribed ? 'Inscrito' : isPushSupported ? 'Nao inscrito' : 'Nao disp.' },
                { icon: BluetoothConnected, label: 'BLE', ok: isMonitoring, tip: isMonitoring ? `${deviceStatuses.length} disp.` : 'Nao activo' },
                { icon: Navigation, label: 'Zona', ok: zoneState === 'inside', tip: zone ? (zoneState === 'inside' ? 'Dentro' : zoneState === 'outside' ? 'FORA!' : 'Definir') : 'Nao definida' },
                { icon: Mic, label: 'Voz', ok: voiceListening, tip: voiceListening ? 'A ouvir...' : voiceSupported ? 'Disponivel' : 'Nao suportado' },
                { icon: Timer, label: 'DMS', ok: dmsEnabled, tip: dmsEnabled ? (dmsLevel === 'idle' ? 'Activo' : `Nivel: ${dmsLevel}`) : 'Desactivado' },
                { icon: Activity, label: 'Ameacas', ok: threatMonitoring, tip: threatMonitoring ? `Score: ${assessment.score}` : 'Nao activo' },
                { icon: Radar, label: 'Radar', ok: dangerZoneCount === 0, tip: dangerZoneCount > 0 ? `${dangerZoneCount} alerta(s)` : 'Area limpa' },
                { icon: Skull, label: 'Panico', ok: !panicState.isActive, tip: panicState.isActive ? 'ACTIVO!' : 'Inactivo' },
              ].map(item => (
                <div
                  key={item.label}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors',
                    item.ok
                      ? 'bg-[#D4AF37]/[0.04] border-[#D4AF37]/10'
                      : 'bg-white/[0.02] border-white/[0.04]'
                  )}
                  title={item.tip}
                >
                  {item.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                    : <AlertCircle className={cn('h-3.5 w-3.5', item.label === 'Zona' && zoneState === 'outside' || item.label === 'Panico' && panicState.isActive ? 'text-red-400' : 'text-white/20')} />
                  }
                  <span className={cn('text-[9px] font-medium', item.ok ? 'text-[#D4AF37]/80' : item.label === 'Zona' && zoneState === 'outside' || item.label === 'Panico' && panicState.isActive ? 'text-red-400' : 'text-white/20')}>{item.label}</span>
                </div>
              ))}
            </div>
            {/* Geofence distance */}
            {zone && geofenceDistance !== null && (
              <div className={cn(
                'mt-3 flex items-center justify-between px-3 py-2 rounded-xl border',
                zoneState === 'inside'
                  ? 'bg-[#D4AF37]/[0.04] border-[#D4AF37]/10'
                  : 'bg-red-500/[0.04] border-red-500/10'
              )}>
                <div className="flex items-center gap-2">
                  <MapPin className={cn('h-3.5 w-3.5', zoneState === 'inside' ? 'text-[#D4AF37]' : 'text-red-400')} />
                  <span className="text-[10px] text-white/50">Distancia ao centro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-mono font-bold',
                    zoneState === 'inside' ? 'text-[#D4AF37]' : 'text-red-400'
                  )}>{Math.round(geofenceDistance)}m</span>
                  <span className="text-[9px] text-white/20">/ {zone.radius}m</span>
                </div>
              </div>
            )}
          </div>
        </SpotlightCard>
      </motion.div>
      )}

      {/* BOTTOM BAR */}
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-2xl bg-[#0C0B08]/70 border-t border-white/[0.04] md:bottom-0 lg:bottom-0"
      >
        {[
          { label: safeMode ? 'Seguro' : 'Inactivo', icon: Shield, active: safeMode, onClick: () => setSafeMode(!safeMode), activeClass: 'bg-[#D4AF37] text-white shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)]' },
          { label: 'Partilhar', icon: Share2, active: false, onClick: handleShareLocation },
          { label: 'Testar', icon: Zap, active: false, onClick: () => refetchDevices() },
          { label: 'EMERGENCIA', icon: ShieldAlert, active: false, onClick: handleEmergency, danger: true },
        ].map((btn) => (
          <Button
            key={btn.label} size="sm" onClick={btn.onClick}
            className={cn(
              'text-[11px] gap-1.5 h-10 rounded-xl transition-all duration-300',
              btn.danger
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]'
                : btn.active
                  ? btn.activeClass || 'bg-[#D4AF37] text-white'
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            )}
          >
            <btn.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{btn.label}</span>
          </Button>
        ))}
        {/* Geofence status pill */}
        {zone && zoneState !== 'unknown' && (
          <div className={cn(
            'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium border',
            zoneState === 'inside'
              ? 'bg-[#D4AF37]/[0.08] border-[#D4AF37]/20 text-[#D4AF37]'
              : 'bg-red-500/[0.08] border-red-500/20 text-red-400'
          )}>
            <MapPin className="h-3 w-3" />
            {zoneState === 'inside' ? 'Na Zona' : 'Fora!'}
          </div>
        )}
      </motion.div>

      {/* EMERGENCY MODAL */}
      <AnimatePresence>
        {emergency && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.2)]">
                  <ShieldAlert className="h-12 w-12 text-red-400" />
                </div>
                <div className="absolute inset-0 rounded-3xl bg-red-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
              </div>

              <div>
                <h1 className="font-display text-3xl font-bold text-white tracking-wide">EMERGENCIA ACTIVADA</h1>
                {coords && <p className="text-sm text-white/40 mt-2 font-mono">GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
              </div>

              <motion.div
                key={countdown}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-display font-black text-white tabular-nums"
              >{countdown}</motion.div>

              <p className="text-white/50 text-sm max-w-xs">
                O alerta sera enviado aos seus contactos em <span className="text-white font-bold">{countdown} segundos</span>.
              </p>

              <div className="flex gap-4 mt-4">
                <Button variant="outline" size="lg" onClick={() => setEmergency(false)} className="border-white/20 text-white hover:bg-white/10 bg-transparent rounded-xl">Cancelar</Button>
                <Button size="lg" disabled={countdown > 0 || isTriggering} onClick={handleConfirmEmergency} className="bg-white text-red-700 font-bold hover:bg-white/90 rounded-xl disabled:opacity-30">
                  {isTriggering ? 'A enviar...' : 'Confirmar Emergencia'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
