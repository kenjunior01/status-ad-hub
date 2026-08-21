import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, Headphones, Watch, Plus, Settings2, Trash2, Battery, Wifi, WifiOff, Signal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SpotlightCard, BeamBorder, Shimmer, CounterAnimated } from '@/components/effects'

const deviceIconMap = { phone: Smartphone, airpods: Headphones, smartwatch: Watch }
const statusLabels: Record<string, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/20' },
  connected: { label: 'Conectado', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  low_battery: { label: 'Bateria Baixa', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
}

const initialDevices = [
  { id: '1', name: 'iPhone 15 Pro', type: 'phone' as const, mac: 'A4:B1:C2:D3:E4:F5', color: '#25D366', status: 'online' as const, battery: 92, lastSeen: 'ha 2 min' },
  { id: '2', name: 'AirPods Pro 2', type: 'airpods' as const, mac: 'F6:E5:D4:C3:B2:A1', color: '#3B82F6', status: 'connected' as const, battery: 85, lastSeen: 'ha 5 min' },
  { id: '3', name: 'Galaxy Watch 6', type: 'smartwatch' as const, mac: '1A:2B:3C:4D:5E:6F', color: '#F59E0B', status: 'low_battery' as const, battery: 15, lastSeen: 'ha 12 min' },
]

export default function Devices() {
  const { user } = useAuth()
  const [devices] = useState(initialDevices)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('phone')
  const [scanning, setScanning] = useState(false)

  const stats = [
    { label: 'Total', value: devices.length, icon: Signal, color: 'text-white' },
    { label: 'Online', value: devices.filter((d) => d.status !== 'low_battery').length, icon: Wifi, color: 'text-[#25D366]' },
    { label: 'Bateria Baixa', value: devices.filter((d) => d.status === 'low_battery').length, icon: WifiOff, color: 'text-amber-400' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dispositivos</h1>
          <p className="text-sm text-white/30 mt-1">Gerir dispositivos pareados</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white hover:shadow-[0_0_30px_-5px_rgba(37,211,102,0.3)] transition-all rounded-xl">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => {
          const IconComp = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <BeamBorder color={s.color === 'text-[#25D366]' ? '#25D366' : s.color === 'text-amber-400' ? '#F59E0B' : '#ffffff'}>
                <SpotlightCard className="p-5 flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] animate-glow-pulse', s.color)}><IconComp className="h-5 w-5" /></div>
                  <div><p className="text-2xl font-display font-bold"><CounterAnimated target={s.value} /></p><p className="text-[11px] text-white/30">{s.label}</p></div>
                </SpotlightCard>
              </BeamBorder>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <SpotlightCard className="p-6">
              <h3 className="font-display text-base font-semibold text-white mb-4">Adicionar Novo Dispositivo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5"><Label className="text-white/40 text-xs">Nome do Dispositivo</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: iPhone 16" className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-white/40 text-xs">Tipo</Label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 outline-none focus:border-[#25D366]/30">
                    {[{ v: 'phone', l: 'Telemovel' }, { v: 'airpods', l: 'Fones Bluetooth' }, { v: 'smartwatch', l: 'Relogio Inteligente' }].map(o => <option key={o.v} value={o.v} className="bg-[#0D1321]">{o.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 3000) }} disabled={scanning} className="gap-2 border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.04] rounded-xl">
                  {scanning ? <><Loader2 className="h-4 w-4 animate-spin" /> A procurar...</> : <><Signal className="h-4 w-4" /> Procurar Dispositivos</>}
                </Button>
                {scanning && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" /><span className="text-xs text-[#25D366]">Escaneando Bluetooth...</span></motion.div>}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white hover:bg-white/[0.04] rounded-xl">Cancelar</Button>
                <Button onClick={() => setShowAdd(false)} className="bg-[#25D366] hover:bg-[#1fb855] text-white rounded-xl">Parear</Button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((d, i) => {
          const IconComp = deviceIconMap[d.type]
          const st = statusLabels[d.status]
          const battColor = d.battery > 50 ? 'bg-[#25D366]' : d.battery > 20 ? 'bg-amber-400' : 'bg-red-500'
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <BeamBorder color={d.color}>
              <SpotlightCard className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl border border-white/[0.06]" style={{ backgroundColor: d.color + '10' }}><IconComp className="h-5 w-5" style={{ color: d.color }} strokeWidth={1.5} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm truncate">{d.name}</p>
                    <p className="text-[10px] text-white/20 font-mono mt-0.5">{d.mac}</p>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-medium whitespace-nowrap', st.className)}>{st.label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-white/30 flex items-center gap-1"><Battery className="h-3 w-3" />Bateria</span><span className="font-mono text-white/60">{d.battery}%</span></div>
                  <div className="w-full h-1 rounded-full bg-white/[0.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${d.battery}%` }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }} className={cn('h-full rounded-full', battColor)} /></div>
                </div>
                <p className="text-[10px] text-white/20">Ultima actividade: {d.lastSeen}</p>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-[11px] gap-1.5 border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] rounded-xl"><Settings2 className="h-3.5 w-3.5" />Configurar</Button>
                  <Button variant="outline" size="sm" className="text-[11px] gap-1.5 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] rounded-xl"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </SpotlightCard>
              </BeamBorder>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
