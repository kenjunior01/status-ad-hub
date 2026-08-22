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
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import {
  Smartphone, Headphones, Watch, Bell, Search, Shield, ShieldAlert,
  MapPin, Phone, Share2, X, Battery, Crosshair, Zap, Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useDevices } from '@/hooks/useDevices'
import { useDashboardStats, useDeviceLocations } from '@/hooks/useHistory'
import { useEmergency } from '@/hooks/useEmergency'
import { SpotlightCard, CounterAnimated, Shimmer, BeamBorder } from '@/components/effects'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Device } from '@/lib/types'

type DisplayDevice = {
  id: string; name: string; type: 'phone' | 'airpods' | 'smartwatch' | 'other'
  lat: number; lng: number; color: string; status: string
  battery: number; lastSeen: string
}

const deviceIconMap: Record<string, React.ElementType> = { phone: Smartphone, airpods: Headphones, smartwatch: Watch, other: Wifi }
const statusLabels: Record<string, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/20' },
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

  const [loading, setLoading] = useState(true)
  const [emergency, setEmergency] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [safeMode, setSafeMode] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  // Show shimmer until both the local delay and data hooks finish
  const dataReady = !devicesLoading && !statsLoading
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])
  const isReady = !loading && dataReady

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
  }, [coords, triggerEmergency])

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
          color: d.color || '#25D366',
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
  const alertCount = stats?.alerts_today ?? 0
  const safeZones = stats?.safe_zones ?? 0
  const totalDevices = stats?.total_devices ?? displayDevices.length

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0A0F1A]">
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
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 md:px-6 py-3 backdrop-blur-2xl bg-[#0A0F1A]/60 border-b border-white/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
            <Shield className="h-4 w-4 text-[#25D366]" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">StatusAD</span>
        </div>

        <div className="hidden sm:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <Input
              placeholder="Pesquisar dispositivos..."
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-xl focus-visible:ring-[#25D366]/20 focus-visible:border-[#25D366]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/[0.06] border border-[#25D366]/15">
            <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse shadow-[0_0_8px_rgba(37,211,102,0.5)]" />
            <span className="text-[11px] font-medium text-[#25D366]">{safeMode ? 'Seguro' : 'Inactivo'}</span>
          </div>

          <button className="relative p-2 rounded-xl hover:bg-white/[0.04] transition">
            <Bell className="h-[18px] w-[18px] text-white/40" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">{alertCount}</span>
            )}
          </button>

          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(37,211,102,0.2)]">
            {(user?.user_metadata as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </motion.header>

      {/* MAP */}
      <MapContainer center={[-25.9692, 32.5732]} zoom={13} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapController />
        {markers.map(d => <Marker key={d.id} position={[d.lat, d.lng]} icon={d.icon} />)}
        {markers.length >= 2 && (
          <Polyline positions={markers.map(m => [m.lat, m.lng] as [number, number])} pathOptions={{ color: '#25D366', weight: 2, dashArray: '8 6', opacity: 0.5 }} />
        )}
      </MapContainer>

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
            <span className="px-2 py-0.5 text-[10px] rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-medium">{activeDevices} activos</span>
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#25D366]/[0.08] border border-[#25D366]/20">
              <Shield className="h-3 w-3 text-[#25D366]" /><span className="text-[10px] font-bold text-[#25D366] tracking-wider">PROTEGIDO</span>
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
                <defs><linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#25D366" stopOpacity={0.3} /><stop offset="100%" stopColor="#25D366" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="hora" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0D1321', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, color: '#fff', backdropFilter: 'blur(12px)' }} labelStyle={{ color: 'rgba(255,255,255,0.5)' }} />
                <Area type="monotone" dataKey="localizacoes" stroke="#25D366" strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </motion.div>
      )}

      {/* BOTTOM BAR */}
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-2xl bg-[#0A0F1A]/70 border-t border-white/[0.04] md:bottom-0 lg:bottom-0"
      >
        {[
          { label: 'Modo Seguro', icon: Shield, active: safeMode, onClick: () => setSafeMode(!safeMode), activeClass: 'bg-[#25D366] text-white shadow-[0_0_20px_-5px_rgba(37,211,102,0.3)]' },
          { label: 'Partilhar', icon: Share2, active: false, onClick: () => {} },
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
                  ? btn.activeClass || 'bg-[#25D366] text-white'
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            )}
          >
            <btn.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{btn.label}</span>
          </Button>
        ))}
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
