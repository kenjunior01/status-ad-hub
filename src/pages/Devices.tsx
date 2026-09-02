import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone, Headphones, Watch, Plus, Settings2, Trash2,
  Battery, Wifi, WifiOff, Signal, Loader2, Bluetooth,
  BluetoothSearching, BluetoothConnected, BluetoothOff,
  Radio, Check, AlertTriangle, RefreshCw, Shield, Glasses,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDevices } from '@/hooks/useDevices'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useEmergency } from '@/hooks/useEmergency'
import { isBluetoothAvailable, classifyDevice } from '@/lib/web-bluetooth'
import { SpotlightCard, BeamBorder, Shimmer, CounterAnimated } from '@/components/effects'

type DeviceType = 'phone' | 'airpods' | 'smartwatch' | 'other'

const deviceIconMap: Record<string, React.ElementType> = {
  phone: Smartphone, airpods: Headphones, smartwatch: Watch, smart_glasses: Glasses, other: Radio,
}
const statusLabels: Record<string, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20' },
  connected: { label: 'Conectado', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  low_battery: { label: 'Bateria Baixa', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  offline: { label: 'Offline', className: 'bg-white/[0.06] text-white/30 border border-white/[0.06]' },
}
const typeLabels: Record<string, string> = {
  phone: 'Telemovel', airpods: 'Fones Bluetooth', smartwatch: 'Relogio Inteligente', smart_glasses: 'Oculos Inteligentes', other: 'Outro',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `ha ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `ha ${hours}h`
  return `ha ${Math.floor(hours / 24)}d`
}

function RSSISparkline({ readings, deviceId }: { readings: number[]; deviceId: string }) {
  if (readings.length < 2) return null
  const min = Math.min(...readings) - 5
  const max = Math.max(...readings) + 5
  const range = max - min || 1
  const w = 120
  const h = 24
  const points = readings.map((r, i) => {
    const x = (i / (readings.length - 1)) * w
    const y = h - ((r - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const fillPoints = `0,${h} ${points} ${w},${h}`
  const latest = readings[readings.length - 1]
  const color = latest > -50 ? '#D4AF37' : latest > -70 ? '#F59E0B' : '#EF4444'
  const gradId = `rssi-grad-${deviceId.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Devices() {
  const { devices, loading, addDevice, updateDevice, deleteDevice, isAdding } = useDevices()
  const {
    available: bleAvailable,
    scanning: bleScanning,
    discoveredDevices,
    connections,
    rssiHistory,
    startScan,
    connectDevice,
    disconnectDevice,
    getSignalStrength,
  } = useBluetooth()
  const { logEvent } = useEmergency()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('phone')
  const [pairingId, setPairingId] = useState<string | null>(null)

  // Merge BLE connection state into Supabase devices
  const devicesWithBLE = useMemo(() => {
    return devices.map((d) => {
      // Match BLE connection by partial MAC or name
      let bleConn = null
      connections.forEach((conn) => {
        if (
          d.mac_address.toLowerCase().includes(conn.deviceId.slice(-8).toLowerCase()) ||
          d.name === conn.deviceName
        ) {
          bleConn = conn
        }
      })
      return {
        ...d,
        bleConnected: bleConn?.connected ?? false,
        bleBattery: bleConn?.batteryLevel ?? d.battery,
        bleDeviceId: bleConn?.deviceId ?? null,
      }
    })
  }, [devices, connections])

  const stats = useMemo(() => [
    { label: 'Total', value: devicesWithBLE.length, icon: Signal, color: 'text-white' },
    { label: 'Conectados', value: devicesWithBLE.filter((d) => d.bleConnected).length, icon: BluetoothConnected, color: 'text-[#D4AF37]' },
    { label: 'Bateria Baixa', value: devicesWithBLE.filter((d) => d.bleBattery <= 20).length, icon: Battery, color: 'text-amber-400' },
  ], [devicesWithBLE])

  /** Pair a discovered BLE device: save to Supabase + connect GATT */
  const handlePair = useCallback(async (bleDevice: typeof discoveredDevices[number]) => {
    if (!bleDevice.name && !newName.trim()) return
    const deviceName = bleDevice.name || newName.trim()
    const deviceType = classifyDevice(bleDevice.name, bleDevice.services)
    const colors = ['#D4AF37', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']
    const color = colors[Math.floor(Math.random() * colors.length)]
    // Use BLE device ID as MAC address (Web Bluetooth IDs are opaque session IDs,
    // but we store them for the session. Real MAC requires native API.)
    const macAddr = bleDevice.id.replace(/-/g, ':').toUpperCase()

    setPairingId(bleDevice.id)
    try {
      // Connect to GATT server first
      await connectDevice(bleDevice.id)
      // Save to Supabase
      addDevice({
        name: deviceName,
        type: deviceType,
        mac_address: macAddr,
        color,
      }, {
        onSuccess: () => {
          logEvent({ type: 'bluetooth', description: `Dispositivo pareado via BLE: ${deviceName}` })
          setNewName('')
          setNewType('phone')
          setShowAdd(false)
        },
      })
    } catch (err) {
      console.error('[Devices] Pairing failed:', err)
    } finally {
      setPairingId(null)
    }
  }, [newName, connectDevice, addDevice, logEvent])

  /** Manual add (no BLE — for testing or non-BLE devices) */
  const handleManualAdd = useCallback(() => {
    if (!newName.trim()) return
    const colors = ['#D4AF37', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']
    addDevice({
      name: newName.trim(),
      type: newType as DeviceType,
      mac_address: `MANUAL:${Date.now().toString(16).slice(-12)}`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }, {
      onSuccess: () => { setNewName(''); setNewType('phone'); setShowAdd(false) },
    })
  }, [newName, newType, addDevice])

  /** Toggle monitoring for a device */
  const toggleMonitor = useCallback((deviceId: string, currentMonitored: boolean) => {
    updateDevice({ id: deviceId, is_monitored: !currentMonitored })
  }, [updateDevice])

  /** Refresh a BLE device connection */
  const handleReconnect = useCallback(async (d: typeof devicesWithBLE[number]) => {
    if (d.bleDeviceId) {
      await connectDevice(d.bleDeviceId)
      logEvent({ type: 'bluetooth', description: `Reconectado: ${d.name}` })
    }
  }, [connectDevice, logEvent])

  /** Disconnect BLE for a device (keeps it in Supabase) */
  const handleBLEDisconnect = useCallback((d: typeof devicesWithBLE[number]) => {
    if (d.bleDeviceId) {
      disconnectDevice(d.bleDeviceId)
    }
  }, [disconnectDevice])

  const handleDelete = useCallback((id: string) => {
    deleteDevice(id)
  }, [deleteDevice])

  const handleBLEScan = useCallback(async () => {
    await startScan()
    setShowAdd(true)
  }, [startScan])

  return (
    <div className="min-h-screen bg-[#0C0B08] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dispositivos</h1>
          <p className="text-sm text-white/30 mt-1">Gerir dispositivos BLE pareados</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            'gap-1.5 px-3 py-1 text-[11px] rounded-lg border',
            bleAvailable ? 'border-[#D4AF37]/30 text-[#D4AF37]' : 'border-red-500/30 text-red-400'
          )}>
            {bleAvailable ? <BluetoothConnected className="h-3 w-3" /> : <BluetoothOff className="h-3 w-3" />}
            {bleAvailable ? 'BLE Activo' : 'BLE Indisponivel'}
          </Badge>
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-white hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.3)] transition-all rounded-xl">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3"><Shimmer className="h-20 w-full rounded-2xl" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => {
            const IconComp = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <BeamBorder color={s.color === 'text-[#D4AF37]' ? '#D4AF37' : s.color === 'text-amber-400' ? '#F59E0B' : '#ffffff'}>
                  <SpotlightCard className="p-5 flex items-center gap-4">
                    <div className={cn('p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] animate-glow-pulse', s.color)}><IconComp className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-display font-bold"><CounterAnimated target={s.value} /></p><p className="text-[11px] text-white/30">{s.label}</p></div>
                  </SpotlightCard>
                </BeamBorder>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* BLE Not Available Warning */}
      {!bleAvailable && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <SpotlightCard className="p-4 border border-amber-500/20 bg-amber-500/[0.03]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">Bluetooth indisponivel neste navegador</p>
                <p className="text-xs text-white/30 mt-1">
                  O Web Bluetooth API requer Chrome, Edge ou Opera em HTTPS. No iOS Safari ou Firefox, utilize a app nativa para funcionalidade BLE completa.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      )}

      {/* Add Device Panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-base font-semibold text-white">Adicionar Dispositivo</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white h-8 w-8 p-0 rounded-lg">
                  <span className="text-lg leading-none">&times;</span>
                </Button>
              </div>

              {/* BLE Scan Button */}
              {bleAvailable && (
                <div className="mb-5">
                  <Button
                    onClick={handleBLEScan}
                    disabled={bleScanning}
                    className={cn(
                      'w-full gap-3 py-6 rounded-xl text-sm font-medium transition-all',
                      bleScanning
                        ? 'bg-white/[0.04] border border-white/[0.08] text-white/50'
                        : 'bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                    )}
                    variant="outline"
                  >
                    {bleScanning ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> A procurar dispositivos BLE...</>
                    ) : (
                      <><BluetoothSearching className="h-5 w-5" /> Procurar Dispositivos Bluetooth</>
                    )}
                  </Button>

                  {/* Scanning animation */}
                  {bleScanning && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 mt-3">
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-[#D4AF37] animate-ping absolute" />
                        <div className="w-3 h-3 rounded-full bg-[#D4AF37] relative" />
                      </div>
                      <span className="text-xs text-[#D4AF37]">Aguardando selecao do dispositivo no dialogo do sistema...</span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Discovered BLE Devices */}
              {discoveredDevices.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5">
                    <Bluetooth className="h-3 w-3" /> {discoveredDevices.length} dispositivo(s) descoberto(s)
                  </p>
                  <div className="space-y-2">
                    {discoveredDevices.map((d) => {
                      const IconComp = deviceIconMap[d.deviceClass] || Radio
                      const alreadyPaired = devices.some((existing) =>
                        existing.mac_address.includes(d.id.replace(/-/g, ':').toUpperCase().slice(-12))
                      )
                      return (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                            alreadyPaired
                              ? 'border-white/[0.04] bg-white/[0.02] opacity-50'
                              : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]'
                          )}
                        >
                          <div className="p-2 rounded-lg bg-[#D4AF37]/10">
                            <IconComp className="h-4 w-4 text-[#D4AF37]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{d.name || 'Dispositivo desconhecido'}</p>
                            <p className="text-[10px] text-white/20 font-mono">{d.id.slice(0, 16)}...</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md border-white/[0.06] text-white/30">
                            {typeLabels[d.deviceClass] || 'Outro'}
                          </Badge>
                          {alreadyPaired ? (
                            <Badge className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/30">
                              <Check className="h-3 w-3 mr-1" /> Pareado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePair(d)}
                              disabled={pairingId === d.id}
                              className="gap-1.5 h-8 text-[11px] bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-lg"
                            >
                              {pairingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bluetooth className="h-3 w-3" />}
                              Parear
                            </Button>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {bleAvailable && <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/20">ou adicionar manualmente</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>}

              {/* Manual Add Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/40 text-xs">Nome do Dispositivo</Label>
                  <Input
                    value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: iPhone 16"
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/40 text-xs">Tipo</Label>
                  <select
                    value={newType} onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 outline-none focus:border-[#D4AF37]/30"
                  >
                    {Object.entries(typeLabels).map(([v, l]) => (
                      <option key={v} value={v} className="bg-[#0D1321]">{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white hover:bg-white/[0.04] rounded-xl">Cancelar</Button>
                <Button
                  onClick={handleManualAdd} disabled={isAdding || !newName.trim()}
                  className="bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-xl"
                >
                  {isAdding ? 'A guardar...' : 'Adicionar Manualmente'}
                </Button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3"><Shimmer className="h-56 w-full rounded-2xl" /></div>
          ))}
        </div>
      ) : devicesWithBLE.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="p-4 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/15 inline-block mb-5">
            <Shield className="h-12 w-12 text-[#D4AF37]/60" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-display font-semibold text-white mb-2">Pareie o seu primeiro dispositivo</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
            Ligue o Bluetooth e prima o botao acima para procurar dispositivos proximos. Fones, smartwatches e outros dispositivos Bluetooth sao suportados.
          </p>
          <div className="mt-8 max-w-sm mx-auto text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold shrink-0 mt-0.5">1</span>
              <p className="text-sm text-white/50">Active o Bluetooth no seu dispositivo</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold shrink-0 mt-0.5">2</span>
              <p className="text-sm text-white/50">Prima &ldquo;Procurar Dispositivos&rdquo;</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold shrink-0 mt-0.5">3</span>
              <p className="text-sm text-white/50">Seleccione e pareie o dispositivo (ex: oculos inteligentes, fones, smartwatch)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold shrink-0 mt-0.5">4</span>
              <p className="text-sm text-white/50">Active o monitoramento</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devicesWithBLE.map((d, i) => {
            const IconComp = deviceIconMap[d.type] || Radio
            const st = statusLabels[d.bleConnected ? 'connected' : d.status] || statusLabels.offline
            const batt = d.bleBattery ?? d.battery
            const battColor = batt > 50 ? 'bg-[#D4AF37]' : batt > 20 ? 'bg-amber-400' : 'bg-red-500'
            const lastSeen = timeAgo(d.last_seen)
            // RSSI data
            const rssiReadings = d.bleDeviceId ? (rssiHistory?.get(d.bleDeviceId) || []) : []
            const currentRSSI = d.bleDeviceId && d.bleConnected ? getSignalStrength(d.bleDeviceId) : null
            const rssiColor = currentRSSI === null ? 'bg-white/20' : currentRSSI > -50 ? 'bg-[#D4AF37]' : currentRSSI > -70 ? 'bg-amber-400' : 'bg-red-500'
            const rssiBarWidth = currentRSSI === null ? 0 : Math.max(0, Math.min(100, ((currentRSSI + 100) / 55) * 100))
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <BeamBorder color={d.bleConnected ? '#D4AF37' : d.color}>
                  <SpotlightCard className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-3 rounded-xl border transition-all duration-500',
                        d.bleConnected
                          ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 shadow-[0_0_20px_-5px_rgba(212,175,55,0.2)]'
                          : 'border-white/[0.06]'
                      )} style={!d.bleConnected ? { backgroundColor: d.color + '10' } : undefined}>
                        <IconComp className={cn('h-5 w-5', d.bleConnected ? 'text-[#D4AF37]' : '')} style={!d.bleConnected ? { color: d.color } : undefined} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display font-semibold text-sm truncate">{d.name}</p>
                          {d.bleConnected && (
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/20 font-mono mt-0.5">{d.mac_address}</p>
                      </div>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-medium whitespace-nowrap', st.className)}>{st.label}</span>
                    </div>

                    {/* Battery */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/30 flex items-center gap-1"><Battery className="h-3 w-3" />Bateria</span>
                        <span className={cn('font-mono', batt <= 20 ? 'text-red-400' : 'text-white/60')}>{batt}%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/[0.06]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${batt}%` }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }} className={cn('h-full rounded-full', battColor)} />
                      </div>
                    </div>

                    {/* RSSI Signal Strength — only for connected BLE devices */}
                    {d.bleConnected && d.bleDeviceId && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/30 flex items-center gap-1"><Signal className="h-3 w-3" />Sinal BLE</span>
                          <span className="font-mono text-white/60">{currentRSSI} dBm</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rssiBarWidth}%` }}
                            transition={{ delay: i * 0.1 + 0.4, duration: 0.8 }}
                            className={cn('h-full rounded-full', rssiColor)}
                          />
                        </div>
                        {rssiReadings.length >= 2 && (
                          <RSSISparkline readings={rssiReadings.slice(-10)} deviceId={d.bleDeviceId} />
                        )}
                      </div>
                    )}

                    {/* Monitoring Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/30">Monitorizacao activa</span>
                      <Switch
                        checked={d.is_monitored}
                        onCheckedChange={() => toggleMonitor(d.id, d.is_monitored)}
                        className="data-[state=checked]:bg-[#D4AF37]"
                      />
                    </div>

                    {/* Footer */}
                    <p className="text-[10px] text-white/20">Ultima actividade: {lastSeen}</p>
                    <div className="flex gap-2 pt-1">
                      {d.bleDeviceId ? (
                        d.bleConnected ? (
                          <Button
                            variant="outline" size="sm" onClick={() => handleBLEDisconnect(d)}
                            className="flex-1 text-[11px] gap-1.5 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] rounded-xl"
                          >
                            <BluetoothOff className="h-3.5 w-3.5" /> Desconectar
                          </Button>
                        ) : (
                          <Button
                            variant="outline" size="sm" onClick={() => handleReconnect(d)}
                            className="flex-1 text-[11px] gap-1.5 border-[#D4AF37]/20 text-[#D4AF37]/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/[0.06] rounded-xl"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Reconectar
                          </Button>
                        )
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1 text-[11px] gap-1.5 border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] rounded-xl">
                          <Settings2 className="h-3.5 w-3.5" /> Configurar
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm" onClick={() => handleDelete(d.id)}
                        className="text-[11px] gap-1.5 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] rounded-xl"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </SpotlightCard>
                </BeamBorder>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}