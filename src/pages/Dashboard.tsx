import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Bell,
  Headphones,
  Watch,
  Smartphone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Volume2,
  X,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Fix Leaflet default icon issue ───────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Device {
  id: string;
  name: string;
  type: 'phone' | 'headphones' | 'watch';
  status: 'online' | 'low-battery' | 'connected';
  battery: number;
  lastSeen: string;
  lat: number;
  lng: number;
  color: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const DEVICES: Device[] = [
  {
    id: '1',
    name: 'Dispositivo Principal',
    type: 'phone',
    status: 'online',
    battery: 92,
    lastSeen: 'há 2 min',
    lat: -25.966,
    lng: 32.57,
    color: '#25D366',
  },
  {
    id: '2',
    name: 'AirPods Pro',
    type: 'headphones',
    status: 'connected',
    battery: 85,
    lastSeen: 'há 5 min',
    lat: -25.972,
    lng: 32.578,
    color: '#3B82F6',
  },
  {
    id: '3',
    name: 'Smartwatch',
    type: 'watch',
    status: 'low-battery',
    battery: 15,
    lastSeen: 'há 12 min',
    lat: -25.963,
    lng: 32.565,
    color: '#F59E0B',
  },
];

const TRAIL: [number, number][] = [
  [-25.966, 32.57],
  [-25.967, 32.572],
  [-25.968, 32.574],
  [-25.9695, 32.576],
  [-25.971, 32.577],
  [-25.972, 32.578],
];

const LOCATION_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  locations: Math.floor(Math.random() * 12) + (i >= 8 && i <= 20 ? 8 : 1),
}));

// ─── Device Icon Map ──────────────────────────────────────────────────────────
const DEVICE_ICONS: Record<Device['type'], typeof Smartphone> = {
  phone: Smartphone,
  headphones: Headphones,
  watch: Watch,
};

// ─── Battery Component ────────────────────────────────────────────────────────
function BatteryIndicator({ level }: { level: number }) {
  const Icon =
    level > 60 ? BatteryFull : level > 25 ? BatteryMedium : BatteryLow;
  const color =
    level > 60 ? 'text-[#25D366]' : level > 25 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
  return <Icon className={cn('h-4 w-4', color)} />;
}

// ─── Custom Marker (colored circle with pulse for active) ─────────────────────
function DeviceMarker({ device }: { device: Device }) {
  const isActive = device.status === 'online' || device.status === 'connected';

  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-device-marker',
        html: `<div style="position:relative;width:20px;height:20px;">${isActive ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${device.color}33;animation:marker-pulse 2s ease-in-out infinite;"></div>` : ''}<div style="width:20px;height:20px;border-radius:50%;background:${device.color};border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 12px ${device.color}88;"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    [device.color, isActive]
  );

  return (
    <Marker position={[device.lat, device.lng]} icon={icon}>
      <Popup>
        <div className="min-w-[200px] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            {(() => {
              const Comp = DEVICE_ICONS[device.type];
              return <Comp className="h-4 w-4" style={{ color: device.color }} />;
            })()}
            {device.name}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isActive ? (
              <Wifi className="h-3 w-3 text-[#25D366]" />
            ) : (
              <WifiOff className="h-3 w-3 text-[#F59E0B]" />
            )}
            {device.status === 'online'
              ? 'Online'
              : device.status === 'connected'
                ? 'Conectado'
                : 'Bateria Baixa'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Battery className="h-3 w-3" />
            {device.battery}%
          </div>
          <div className="text-xs text-gray-400">Visto {device.lastSeen}</div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Audio Waveform Animation ─────────────────────────────────────────────────
function AudioWaveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white/80"
          animate={{
            height: [8, Math.random() * 48 + 12, 8],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

// ─── Emergency Modal ──────────────────────────────────────────────────────────
function EmergencyModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [countdown, setCountdown] = useState(3);
  const [coords, setCoords] = useState({ lat: -25.9692, lng: 32.5732 });

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {}
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Pulsing red background */}
          <motion.div
            className="absolute inset-0 bg-red-600"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at center, transparent 0%, rgba(127,29,29,0.6) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <ShieldAlert className="h-24 w-24 text-white drop-shadow-lg" />
            </motion.div>

            <motion.h1
              className="text-4xl font-extrabold tracking-wider text-white md:text-6xl"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              EMERGÊNCIA ACTIVADA
            </motion.h1>

            <motion.p
              className="text-lg text-white/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              A confirmar em {countdown}s...
            </motion.p>

            <motion.div
              className="rounded-xl bg-black/30 px-4 py-2 font-mono text-sm text-white/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </motion.div>

            <AudioWaveform />

            <motion.div
              className="flex gap-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={onClose}
                className="rounded-xl border-2 border-white/40 bg-white/10 px-8 py-3 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={countdown > 0}
                className={cn(
                  'rounded-xl border-2 border-white bg-white px-8 py-3 text-lg font-bold text-red-600 transition',
                  countdown > 0
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-red-50'
                )}
              >
                Confirmar Emergência
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [isEmergency, setIsEmergency] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [notificationCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const handleEmergencyConfirm = useCallback(() => {
    setIsEmergency(true);
    setShowEmergencyModal(false);
  }, []);

  const handleEmergencyCancel = useCallback(() => {
    setShowEmergencyModal(false);
    setIsEmergency(false);
  }, []);

  return (
    <div className="dark relative h-screen w-screen overflow-hidden bg-[#0A0F1A]">
      {/* ═══ INLINE KEYFRAMES ═══ */}
      <style>{`
        @keyframes marker-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes emergency-bar-pulse {
          0%, 100% { box-shadow: 0 0 8px #EF4444, 0 0 20px #EF444488; }
          50% { box-shadow: 0 0 16px #EF4444, 0 0 40px #EF4444AA; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .leaflet-container {
          background: #0A0F1A !important;
          filter: brightness(0.7) contrast(1.2) saturate(0.3) hue-rotate(180deg) invert(1);
        }
        .custom-device-marker {
          background: transparent !important;
          border: none !important;
        }
        .glass {
          background: rgba(10, 15, 26, 0.75);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-hover:hover {
          background: rgba(10, 15, 26, 0.85);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>

      {/* ═══ EMERGENCY MODAL ═══ */}
      <EmergencyModal
        open={showEmergencyModal}
        onClose={handleEmergencyCancel}
        onConfirm={handleEmergencyConfirm}
      />

      {/* ═══ 1. TOP BAR ═══ */}
      <header className="glass fixed top-0 left-0 right-0 z-[1000] flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/15">
            <Shield className="h-5 w-5 text-[#25D366]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Status<span className="text-[#25D366]">Ads</span>
          </span>
        </div>

        {/* Search */}
        <div className="glass-hover hidden max-w-md flex-1 items-center gap-2 rounded-xl px-4 py-2 transition md:flex">
          <Search className="h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Pesquisar dispositivos, contactos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
          />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Emergency status indicator */}
          <div
            className={cn(
              'hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium lg:flex',
              isEmergency
                ? 'bg-red-500/15 text-red-400'
                : 'bg-[#25D366]/10 text-[#25D366]'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isEmergency ? 'bg-red-500' : 'bg-[#25D366]',
                !isEmergency && 'animate-pulse'
              )}
              style={
                isEmergency
                  ? {
                      animation: 'dot-pulse 1s ease-in-out infinite',
                    }
                  : undefined
              }
            />
            {isEmergency ? 'EMERGÊNCIA ACTIVA' : 'Todos os dispositivos activos'}
          </div>

          {/* Notification bell */}
          <button className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366]/40 to-[#25D366]/10 ring-2 ring-white/10 transition hover:ring-white/20"
            >
              <User className="h-4 w-4 text-white/80" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="glass absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl py-1 shadow-2xl"
                >
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="text-sm font-medium text-white">
                      {user?.email ?? 'Utilizador'}
                    </p>
                    <p className="text-xs text-white/40">Plano Premium</p>
                  </div>
                  <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </button>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Terminar Sessão
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ═══ 2. MAP ═══ */}
      <MapContainer
        center={[-25.9692, 32.5732]}
        zoom={13}
        className="h-screen w-screen"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Device markers */}
        {DEVICES.map((device) => (
          <DeviceMarker key={device.id} device={device} />
        ))}

        {/* Movement trail (dashed line) */}
        <Polyline
          positions={TRAIL}
          pathOptions={{
            color: '#25D366',
            weight: 2,
            opacity: 0.5,
            dashArray: '8, 12',
          }}
        />
      </MapContainer>

      {/* ═══ Mobile panel toggles ═══ */}
      <div className="fixed bottom-20 left-3 right-3 z-[900] flex gap-2 md:hidden">
        <Button
          variant="glass"
          size="sm"
          onClick={() => {
            setShowLeftPanel(!showLeftPanel);
            setShowRightPanel(false);
          }}
          className={cn('flex-1', showLeftPanel && 'border-[#25D366]/40')}
        >
          <Smartphone className="mr-1.5 h-3.5 w-3.5" /> Dispositivos
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={() => {
            setShowRightPanel(!showRightPanel);
            setShowLeftPanel(false);
          }}
          className={cn('flex-1', showRightPanel && 'border-[#25D366]/40')}
        >
          <Shield className="mr-1.5 h-3.5 w-3.5" /> Segurança
        </Button>
      </div>

      {/* ═══ 3. LEFT FLOATING PANEL — Devices ═══ */}
      <AnimatePresence>
        {(showLeftPanel || typeof window !== 'undefined') && (
          <motion.div
            key="left-panel"
            initial={{ x: -320, opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.1 }}
            className={cn(
              'glass fixed z-[800] w-[300px] rounded-2xl shadow-2xl',
              'bottom-20 left-4 max-h-[calc(100vh-10rem)] overflow-y-auto',
              'md:bottom-6 md:left-6',
              // On mobile, it's a bottom sheet
              'md:top-auto',
              'max-md:bottom-28 max-md:left-3 max-md:right-3 max-md:w-auto max-md:bottom-[5.5rem]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Dispositivos</h2>
                <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-bold text-[#25D366]">
                  3 activos
                </span>
              </div>
              <button
                className="text-white/30 transition hover:text-white/60 md:hidden"
                onClick={() => setShowLeftPanel(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Device list */}
            <div className="space-y-1 p-3">
              {DEVICES.map((device, i) => {
                const Icon = DEVICE_ICONS[device.type];
                const isActive =
                  device.status === 'online' || device.status === 'connected';

                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="glass-hover flex cursor-pointer items-center gap-3 rounded-xl p-3 transition"
                  >
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${device.color}15`,
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: device.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">
                        {device.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            isActive
                              ? 'bg-[#25D366]/15 text-[#25D366]'
                              : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isActive ? 'bg-[#25D366]' : 'bg-[#F59E0B]'
                            )}
                          />
                          {device.status === 'online'
                            ? 'Online'
                            : device.status === 'connected'
                              ? 'Conectado'
                              : 'Bateria Baixa'}
                        </span>
                      </div>
                    </div>

                    {/* Battery + time */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <BatteryIndicator level={device.battery} />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            device.battery > 60
                              ? 'text-[#25D366]'
                              : device.battery > 25
                                ? 'text-[#F59E0B]'
                                : 'text-[#EF4444]'
                          )}
                        >
                          {device.battery}%
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30">
                        {device.lastSeen}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Ver Todos link */}
            <div className="border-t border-white/5 px-5 py-3">
              <button className="text-xs font-medium text-[#25D366]/70 transition hover:text-[#25D366]">
                Ver Todos →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 4. RIGHT FLOATING PANEL — Security Status ═══ */}
      <AnimatePresence>
        {(showRightPanel || typeof window !== 'undefined') && (
          <motion.div
            key="right-panel"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.2 }}
            className={cn(
              'glass fixed z-[800] w-[320px] rounded-2xl shadow-2xl',
              'top-20 right-4 max-h-[calc(100vh-10rem)] overflow-y-auto',
              'md:top-20 md:right-6',
              // On mobile, bottom sheet
              'max-md:bottom-28 max-md:left-3 max-md:right-3 max-md:w-auto max-md:top-auto max-md:bottom-[5.5rem]'
            )}
          >
            {/* Close button for mobile */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 md:hidden">
              <h2 className="text-sm font-semibold text-white">
                Estado de Segurança
              </h2>
              <button
                className="text-white/30 transition hover:text-white/60"
                onClick={() => setShowRightPanel(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Header (desktop) */}
            <div className="hidden border-b border-white/5 px-5 py-4 md:block">
              <h2 className="text-sm font-semibold text-white">
                Estado de Segurança
              </h2>
            </div>

            <div className="space-y-4 p-5">
              {/* Large status badge */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-4',
                  isEmergency
                    ? 'bg-red-500/10 ring-1 ring-red-500/20'
                    : 'bg-[#25D366]/8 ring-1 ring-[#25D366]/15'
                )}
              >
                {isEmergency ? (
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-[#25D366]" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-xl font-extrabold tracking-wide',
                      isEmergency ? 'text-red-400' : 'text-[#25D366]'
                    )}
                  >
                    {isEmergency ? 'EM EMERGÊNCIA' : 'PROTEGIDO'}
                  </p>
                  <p className="text-xs text-white/40">
                    {isEmergency
                      ? 'Alertas enviados aos contactos'
                      : 'Todos os sistemas operacionais'}
                  </p>
                </div>
              </motion.div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="glass-hover rounded-xl p-3 transition">
                  <div className="flex items-center gap-1.5 text-white/40">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      Geofences
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-white">
                    2 <span className="text-xs font-normal text-[#25D366]">activos</span>
                  </p>
                </div>
                <div className="glass-hover rounded-xl p-3 transition">
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Zap className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      Contactos
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-white">
                    5 <span className="text-xs font-normal text-[#25D366]">prontos</span>
                  </p>
                </div>
              </div>

              {/* Mini chart — Localizações Hoje */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                  Localizações Hoje
                </p>
                <div className="rounded-xl bg-black/30 p-3">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart
                      data={LOCATION_DATA}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="locationGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#25D366"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#25D366"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={5}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(10,15,26,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="locations"
                        stroke="#25D366"
                        strokeWidth={2}
                        fill="url(#locationGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 5. BOTTOM BAR ═══ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.3 }}
        className="glass fixed bottom-0 left-0 right-0 z-[1000] flex items-center justify-center gap-3 px-4 py-3 md:gap-4"
      >
        {/* Safe Mode Toggle */}
        <button
          onClick={() => setSafeMode(!safeMode)}
          className={cn(
            'flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition md:flex-row md:gap-2 md:px-5 md:py-2.5',
            safeMode
              ? 'bg-[#25D366]/10 text-[#25D366]'
              : 'bg-white/5 text-white/40 hover:text-white/60'
          )}
        >
          <Shield className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] font-medium md:text-xs">
            Modo Seguro
          </span>
          {/* Toggle switch */}
          <div
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors md:h-6 md:w-10',
              safeMode ? 'bg-[#25D366]' : 'bg-white/20'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform md:h-5 md:w-5',
                safeMode ? 'translate-x-4 md:translate-x-[18px]' : 'translate-x-0.5'
              )}
            />
          </div>
        </button>

        {/* Share Location */}
        <button className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-4 py-2 text-white/60 transition hover:bg-white/10 hover:text-white md:flex-row md:gap-2 md:px-5 md:py-2.5">
          <Share2 className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] font-medium md:text-xs">
            Partilhar Localização
          </span>
        </button>

        {/* Test Alert */}
        <button className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-4 py-2 text-white/60 transition hover:bg-white/10 hover:text-white md:flex-row md:gap-2 md:px-5 md:py-2.5">
          <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] font-medium md:text-xs">
            Testar Alerta
          </span>
        </button>

        {/* EMERGENCY Button */}
        <motion.button
          onClick={() => setShowEmergencyModal(true)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative flex flex-col items-center gap-1 rounded-xl px-5 py-2.5 font-bold transition',
            'bg-[#EF4444] text-white md:flex-row md:gap-2 md:px-6 md:py-3',
            'hover:bg-red-600 active:bg-red-700'
          )}
          style={{
            animation: 'emergency-bar-pulse 2s ease-in-out infinite',
          }}
        >
          <ShieldAlert className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-[11px] font-bold tracking-wider md:text-sm">
            EMERGÊNCIA
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
