import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, AlertTriangle, Shield, Bluetooth, Clock, Activity, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistory } from '@/hooks/useHistory'
import { SpotlightCard, BeamBorder, CounterAnimated, Shimmer } from '@/components/effects'
import type { HistoryPeriod } from '@/lib/types'

type FilterPeriod = HistoryPeriod

const filters: { key: FilterPeriod; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'tudo', label: 'Tudo' },
]

const eventConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  location: { icon: MapPin, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10 border border-[#25D366]/15' },
  alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/15' },
  shield: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/15' },
  bluetooth: { icon: Bluetooth, color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/15' },
  emergency: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/15' },
  geofence: { icon: MapPin, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/15' },
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `${time} - Hoje`
  if (isYesterday) return `${time} - Ontem`
  return `${d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' })} - ${time}`
}

export default function History() {
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('hoje')
  const [shimmerLoading, setShimmerLoading] = useState(true)
  const { data: events, isLoading } = useHistory(activeFilter)

  useEffect(() => {
    setShimmerLoading(true)
    const t = setTimeout(() => setShimmerLoading(false), 400)
    return () => clearTimeout(t)
  }, [activeFilter])

  const filteredEvents = events || []
  const stats = useMemo(() => [
    { label: 'Eventos', value: filteredEvents.length, icon: Activity, color: 'text-white' },
    { label: 'Alertas', value: filteredEvents.filter(e => e.type === 'alert' || e.type === 'emergency').length, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Localizacoes', value: filteredEvents.filter(e => e.type === 'location').length, icon: MapPin, color: 'text-[#25D366]' },
  ], [filteredEvents])

  const showShimmer = shimmerLoading || isLoading

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
            activeFilter === f.key
              ? 'bg-[#25D366] text-white border-[#25D366]/30 shadow-[0_0_20px_-5px_rgba(37,211,102,0.2)]'
              : 'bg-white/[0.02] text-white/35 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
          )}>{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => {
          const IconComp = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <BeamBorder color={s.color === 'text-red-400' ? '#EF4444' : s.color === 'text-[#25D366]' ? '#25D366' : '#ffffff'}>
                <SpotlightCard className="p-5 flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]', s.color)}><IconComp className="h-5 w-5" /></div>
                  <div><p className="text-2xl font-display font-bold"><CounterAnimated target={s.value} /></p><p className="text-[11px] text-white/30">{s.label}</p></div>
                </SpotlightCard>
              </BeamBorder>
            </motion.div>
          )
        })}
      </div>

      {showShimmer ? (
        <div className="relative">
          <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/[0.04]" />
          <div className="space-y-0">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="relative flex gap-4 pb-5">
                <Shimmer className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 pt-1 space-y-2">
                  <Shimmer className="h-16 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="h-12 w-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum evento encontrado</p>
          <p className="text-xs text-white/15 mt-1">Os eventos aparecerao aqui assim que os dispositivos reportarem actividade</p>
        </div>
      ) : (
      <div className="relative">
        <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/[0.04]" />
        <div className="space-y-0">
          {filteredEvents.map((event, i) => {
            const config = eventConfig[event.type] || eventConfig.location
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
                      <span className="text-[10px] text-white/20 whitespace-nowrap flex items-center gap-1 shrink-0 font-mono"><Clock className="h-3 w-3" />{formatTimestamp(event.created_at)}</span>
                    </div>
                    {event.latitude && event.longitude && (
                      <p className="text-[10px] text-white/15 mt-2 font-mono flex items-center gap-1"><MapPin className="h-3 w-3" />{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</p>
                    )}
                  </SpotlightCard>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}
