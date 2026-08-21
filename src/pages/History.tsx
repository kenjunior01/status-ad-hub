import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, AlertTriangle, Shield, Bluetooth, Clock, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SpotlightCard } from '@/components/effects'

type FilterPeriod = 'hoje' | '7dias' | '30dias' | 'tudo'
type EventItem = { id: string; type: 'location' | 'alert' | 'shield' | 'bluetooth'; timestamp: string; description: string; coordinates?: string }

const events: EventItem[] = [
  { id: '1', type: 'location', timestamp: '14:32 - Hoje', description: 'Localizacao actualizada - iPhone 15 Pro', coordinates: '-25.9660, 32.5700' },
  { id: '2', type: 'shield', timestamp: '13:15 - Hoje', description: 'Modo seguro activado automaticamente ao entrar na zona de trabalho' },
  { id: '3', type: 'bluetooth', timestamp: '12:48 - Hoje', description: 'AirPods Pro 2 conectados ao iPhone 15 Pro' },
  { id: '4', type: 'alert', timestamp: '11:30 - Hoje', description: 'Alerta de bateria baixa - Galaxy Watch 6 (15%)', coordinates: '-25.9630, 32.5650' },
  { id: '5', type: 'location', timestamp: '10:05 - Hoje', description: 'Localizacao partilhada com Maria Silva', coordinates: '-25.9680, 32.5745' },
  { id: '6', type: 'bluetooth', timestamp: '09:20 - Hoje', description: 'Galaxy Watch 6 desconectado - fora do alcance' },
  { id: '7', type: 'shield', timestamp: '08:00 - Hoje', description: 'Verificacao de seguranca diaria concluida com sucesso' },
  { id: '8', type: 'location', timestamp: '07:45 - Hoje', description: 'Primeira localizacao do dia - iPhone 15 Pro', coordinates: '-25.9710, 32.5690' },
]

const eventConfig = {
  location: { icon: MapPin, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10 border border-[#25D366]/15' },
  alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/15' },
  shield: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/15' },
  bluetooth: { icon: Bluetooth, color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/15' },
}

export default function History() {
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('hoje')
  const filters: { key: FilterPeriod; label: string }[] = [{ key: 'hoje', label: 'Hoje' }, { key: '7dias', label: '7 dias' }, { key: '30dias', label: '30 dias' }, { key: 'tudo', label: 'Tudo' }]
  const stats = [{ label: 'Eventos Hoje', value: '8', icon: Activity, color: 'text-white' }, { label: 'Alertas', value: '1', icon: AlertTriangle, color: 'text-red-400' }, { label: 'Localizacoes', value: '3', icon: MapPin, color: 'text-[#25D366]' }]

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Historico</h1>
        <p className="text-sm text-white/30 mt-1">Registo de actividades e eventos</p>
      </motion.div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} className={cn(
            'px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border',
            activeFilter === f.key ? 'bg-[#25D366] text-white border-[#25D366]/30 shadow-[0_0_20px_-5px_rgba(37,211,102,0.2)]' : 'bg-white/[0.02] text-white/35 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
          )}>{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => {
          const IconComp = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <SpotlightCard className="p-5 flex items-center gap-4">
                <div className={cn('p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]', s.color)}><IconComp className="h-5 w-5" /></div>
                <div><p className="text-2xl font-display font-bold">{s.value}</p><p className="text-[11px] text-white/30">{s.label}</p></div>
              </SpotlightCard>
            </motion.div>
          )
        })}
      </div>

      <div className="relative">
        <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/[0.04]" />
        <div className="space-y-0">
          {events.map((event, i) => {
            const config = eventConfig[event.type]
            const IconComp = config.icon
            return (
              <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 120 }} className="relative flex gap-4 pb-5 last:pb-0">
                <div className={cn('relative z-10 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border border-[#0A0F1A]', config.bg)}>
                  <IconComp className={cn('h-4 w-4', config.color)} strokeWidth={1.5} />
                </div>
                <div className="flex-1 pt-1">
                  <SpotlightCard className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-white/60 leading-relaxed">{event.description}</p>
                      <span className="text-[10px] text-white/20 whitespace-nowrap flex items-center gap-1 shrink-0 font-mono"><Clock className="h-3 w-3" />{event.timestamp}</span>
                    </div>
                    {event.coordinates && <p className="text-[10px] text-white/15 mt-2 font-mono flex items-center gap-1"><MapPin className="h-3 w-3" />{event.coordinates}</p>}
                  </SpotlightCard>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
