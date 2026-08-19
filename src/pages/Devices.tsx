import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Headphones,
  Watch,
  Smartphone,
  Bluetooth,
  BluetoothSearching,
  Loader2,
  Settings,
  Trash2,
  Battery,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────
type DeviceType = 'phone' | 'headphones' | 'watch';
type DeviceStatus = 'connected' | 'offline' | 'low-battery';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  mac: string;
  status: DeviceStatus;
  battery: number;
  lastSeen: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_DEVICES: Device[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    type: 'phone',
    mac: 'A4:B1:C2:D3:E4:F5',
    status: 'connected',
    battery: 78,
    lastSeen: 'há 2 min',
  },
  {
    id: '2',
    name: 'AirPods Pro 2',
    type: 'headphones',
    mac: 'F6:E5:D4:C3:B2:A1',
    status: 'connected',
    battery: 92,
    lastSeen: 'há 5 min',
  },
  {
    id: '3',
    name: 'Galaxy Watch 6',
    type: 'watch',
    mac: '1A:2B:3C:4D:5E:6F',
    status: 'low-battery',
    battery: 12,
    lastSeen: 'há 1h',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEVICE_ICONS: Record<DeviceType, typeof Smartphone> = {
  phone: Smartphone,
  headphones: Headphones,
  watch: Watch,
};

const STATUS_CONFIG: Record<DeviceStatus, { label: string; color: string; bg: string }> = {
  connected: {
    label: 'Conectado',
    color: 'text-[#25D366]',
    bg: 'bg-[#25D366]/15',
  },
  offline: {
    label: 'Offline',
    color: 'text-gray-400',
    bg: 'bg-gray-500/15',
  },
  'low-battery': {
    label: 'Bateria Baixa',
    color: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/15',
  },
};

function batteryColor(level: number): string {
  if (level > 60) return 'bg-[#25D366]';
  if (level > 25) return 'bg-[#F59E0B]';
  return 'bg-[#EF4444]';
}

// ─── Stagger Animation ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Devices() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('airpods');

  const totalDevices = devices.length;
  const onlineCount = devices.filter(
    (d) => d.status === 'connected'
  ).length;
  const lowBatteryCount = devices.filter(
    (d) => d.status === 'low-battery'
  ).length;

  const handleScan = () => {
    setScanning(true);
    setScanResults([]);
    setTimeout(() => {
      setScanResults([
        'AirPods de João',
        'Mi Band 8',
        'Pixel Buds Pro',
      ]);
      setScanning(false);
    }, 3000);
  };

  const handlePair = (name: string) => {
    const typeMap: Record<string, DeviceType> = {
      airpods: 'headphones',
      smartwatch: 'watch',
      smartglasses: 'watch',
      outro: 'phone',
    };
    const newDevice: Device = {
      id: String(Date.now()),
      name: newDeviceName || name,
      type: typeMap[newDeviceType] || 'phone',
      mac: `${Math.random().toString(16).slice(2, 4).toUpperCase()}:${Math.random()
        .toString(16)
        .slice(2, 4)
        .toUpperCase()}:${Math.random()
        .toString(16)
        .slice(2, 4)
        .toUpperCase()}:${Math.random()
        .toString(16)
        .slice(2, 4)
        .toUpperCase()}:${Math.random()
        .toString(16)
        .slice(2, 4)
        .toUpperCase()}:${Math.random()
        .toString(16)
        .slice(2, 4)
        .toUpperCase()}`,
      status: 'connected',
      battery: Math.floor(Math.random() * 80) + 20,
      lastSeen: 'agora mesmo',
    };
    setDevices((prev) => [...prev, newDevice]);
    setShowAddModal(false);
    setNewDeviceName('');
    setScanResults([]);
  };

  const handleRemove = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="dark min-h-screen bg-[#0A0F1A] text-white">
      {/* ═══ INLINE STYLES ═══ */}
      <style>{`
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

      {/* ═══ HEADER ═══ */}
      <header className="glass fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Dispositivos</h1>
        </div>
        <Button
          variant="safe"
          size="sm"
          onClick={() => {
            setShowAddModal(true);
            setScanning(false);
            setScanResults([]);
            setNewDeviceName('');
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar Dispositivo
        </Button>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-12 md:px-6">
        {/* ─── Stats Bar ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-8 grid grid-cols-3 gap-3"
        >
          {[
            {
              label: 'Total',
              value: totalDevices,
              icon: Bluetooth,
              color: 'text-blue-400',
              bg: 'bg-blue-400/10',
            },
            {
              label: 'Online',
              value: onlineCount,
              icon: Wifi,
              color: 'text-[#25D366]',
              bg: 'bg-[#25D366]/10',
            },
            {
              label: 'Bateria Baixa',
              value: lowBatteryCount,
              icon: Battery,
              color: 'text-[#F59E0B]',
              bg: 'bg-[#F59E0B]/10',
            },
          ].map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="glass border-white/[0.06]">
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      stat.bg
                    )}
                  >
                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                  <span className={cn('text-2xl font-bold', stat.color)}>
                    {stat.value}
                  </span>
                  <span className="text-xs text-white/40">{stat.label}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Device List ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {devices.map((device) => {
            const IconComp = DEVICE_ICONS[device.type];
            const statusCfg = STATUS_CONFIG[device.status];
            return (
              <motion.div key={device.id} variants={item}>
                <Card className="glass glass-hover border-white/[0.06] transition-colors">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
                        <IconComp className="h-6 w-6 text-[#25D366]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {device.name}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                              statusCfg.color,
                              statusCfg.bg
                            )}
                          >
                            {device.status === 'connected' ? (
                              <Wifi className="mr-1 h-2.5 w-2.5" />
                            ) : device.status === 'offline' ? (
                              <WifiOff className="mr-1 h-2.5 w-2.5" />
                            ) : (
                              <Battery className="mr-1 h-2.5 w-2.5" />
                            )}
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-white/30">
                          {device.mac}
                        </p>
                      </div>
                    </div>

                    {/* Right: battery + actions */}
                    <div className="flex flex-col items-end gap-3 sm:items-end">
                      {/* Battery bar */}
                      <div className="flex w-full items-center gap-2 sm:w-40">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              batteryColor(device.battery)
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${device.battery}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-white/50">
                          {device.battery}%
                        </span>
                      </div>

                      <p className="text-[11px] text-white/30">
                        Visto {device.lastSeen}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-white/60 hover:text-white hover:bg-white/5"
                        >
                          <Settings className="mr-1.5 h-3.5 w-3.5" />
                          Configurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRemove(device.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {devices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-20 flex flex-col items-center gap-3 text-center"
          >
            <Bluetooth className="h-12 w-12 text-white/10" />
            <p className="text-sm text-white/30">
              Nenhum dispositivo pareado
            </p>
            <Button
              variant="safe"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Dispositivo
            </Button>
          </motion.div>
        )}
      </main>

      {/* ═══ ADD DEVICE MODAL ═══ */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Drawer / Modal */}
            <motion.div
              className="glass relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              <CardHeader className="border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Adicionar Dispositivo</CardTitle>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-6">
                {/* Device name */}
                <div className="space-y-2">
                  <Label className="text-sm text-white/60">
                    Nome do Dispositivo
                  </Label>
                  <Input
                    placeholder="Ex: Os meus AirPods"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-[#25D366]/40"
                  />
                </div>

                {/* Device type */}
                <div className="space-y-2">
                  <Label className="text-sm text-white/60">
                    Tipo de Dispositivo
                  </Label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40"
                  >
                    <option value="airpods" className="bg-[#0A0F1A]">
                      AirPods
                    </option>
                    <option value="smartwatch" className="bg-[#0A0F1A]">
                      Smartwatch
                    </option>
                    <option value="smartglasses" className="bg-[#0A0F1A]">
                      Smart Glasses
                    </option>
                    <option value="outro" className="bg-[#0A0F1A]">
                      Outro
                    </option>
                  </select>
                </div>

                {/* Scan area */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  {!scanning && scanResults.length === 0 && (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <BluetoothSearching className="h-10 w-10 text-white/15" />
                      <p className="text-sm text-white/40">
                        Prima o botão abaixo para procurar dispositivos BLE
                        próximos
                      </p>
                      <Button
                        variant="safe"
                        size="sm"
                        onClick={handleScan}
                      >
                        <BluetoothSearching className="mr-1.5 h-4 w-4" />
                        Iniciar Procura
                      </Button>
                    </div>
                  )}

                  {scanning && (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      >
                        <Loader2 className="h-10 w-10 text-[#25D366]" />
                      </motion.div>
                      <p className="text-sm text-[#25D366]/80">
                        A procurar dispositivos...
                      </p>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-[#25D366]/40"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.3,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!scanning && scanResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[#25D366]">
                        {scanResults.length} dispositivos encontrados
                      </p>
                      <div className="flex flex-col gap-2">
                        {scanResults.map((name, i) => (
                          <motion.div
                            key={name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Bluetooth className="h-4 w-4 text-[#25D366]" />
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {name}
                                </p>
                                <p className="font-mono text-[10px] text-white/25">
                                  XX:XX:XX:XX:XX:{String(10 + i).padStart(2, '0')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="safe"
                              size="sm"
                              onClick={() => handlePair(name)}
                              className="h-7 text-xs"
                            >
                              Parear
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                      <button
                        onClick={handleScan}
                        className="mt-2 text-xs text-white/30 transition hover:text-white/50"
                      >
                        Procurar novamente
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
