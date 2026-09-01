import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, AlertTriangle, Shield, Bluetooth, Clock, Activity, Inbox,
  Download, Filter, ChevronDown, ChevronUp, MapPinned, Radio, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useHistory } from '@/hooks/useHistory'
import { SpotlightCard, BeamBorder, CounterAnimated, Shimmer } from '@/components/effects'
import type { HistoryPeriod, EventType } from '@/lib/types'

type FilterPeriod = HistoryPeriod

const periodFilters: { key: FilterPeriod; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'tudo', label: 'Tudo' },
]

const typeFilters: { key: EventType | 'all'; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Todos', icon: Activity },
  { key: 'emergency', label: 'Emergencia', icon: AlertTriangle },
  { key: 'alert', label: 'Alertas', icon: Shield },
  { key: 'location', label: 'Localizacao', icon: MapPin },
  { key: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
  { key: 'geofence', label: 'Geofence', icon: Radio },
  { key: 'shield', label: 'Escudo', icon: Shield },
]

const eventConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  location: { icon: MapPin, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10 border border-[#25D366]/15', label: 'Localizacao' },
  alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/15', label: 'Alerta' },
  shield: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/15', label: 'Escudo' },
  bluetooth: { icon: Bluetooth, color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/15', label: 'Bluetooth' },
  emergency: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/15', label: 'Emergencia' },
  geofence: { icon: Radio, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/15', label: 'Geofence' },
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

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-MZ', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function History() {
  const [activePeriod, setActivePeriod] = useState<FilterPeriod>('hoje')
  const [activeType, setActiveType] = useState<EventType | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [shimmerLoading, setShimmerLoading] = useState(true)
  const { data: events, isLoading } = useHistory(activePeriod)

  useEffect(() => {
    setShimmerLoading(true)
    setExpandedId(null)
    const t = setTimeout(() => setShimmerLoading(false), 400)
    return () => clearTimeout(t)
  }, [activePeriod])

  const filteredEvents = useMemo(() => {
    const base = events || []
    if (activeType === 'all') return base
    return base.filter(e => e.type === activeType)
  }, [events, activeType])

  const stats = useMemo(() => [
    { label: 'Eventos', value: filteredEvents.length, icon: Activity, color: 'text-white' },
    { label: 'Alertas', value: filteredEvents.filter(e => e.type === 'alert' || e.type === 'emergency').length, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Localizacoes', value: filteredEvents.filter(e => e.type === 'location').length, icon: MapPin, color: 'text-[#25D366]' },
  ], [filteredEvents])

  const showShimmer = shimmerLoading || isLoading

  const handleExportCSV = useCallback(() => {
    setShowExportMenu(false)
    if (filteredEvents.length === 0) return
    const header = 'ID,Tipo,Descricao,Latitude,Longitude,Data\n'
    const rows = filteredEvents.map(e =>
      `${e.id},${e.type},"${e.description.replace(/"/g, '""')}",${e.latitude ?? ''},${e.longitude ?? ''},${e.created_at}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statusads-historico-${activePeriod}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredEvents, activePeriod])

  const handleExportJSON = useCallback(() => {
    setShowExportMenu(false)
    if (filteredEvents.length === 0) return
    const data = {
      exportado_em: new Date().toISOString(),
      periodo: activePeriod,
      total_eventos: filteredEvents.length,
      eventos: filteredEvents,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statusads-historico-${activePeriod}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredEvents, activePeriod])

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Historico</h1>
          <p className="text-sm text-white/30 mt-1">Registo de actividades e eventos</p>
        </div>
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={filteredEvents.length === 0}
            variant="outline"
            className="gap-2 rounded-xl border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.04] text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
            <ChevronDown className="h-3 w-3" />
          </Button>
          <AnimatePresence>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-[#111827] border border-white/[0.08] shadow-xl overflow-hidden"
                >
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.04] transition"
                  >
                    <Download className="h-3.5 w-3.5 text-white/30" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.04] transition border-t border-white/[0.04]"
                  >
                    <Activity className="h-3.5 w-3.5 text-white/30" />
                    Exportar JSON
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Period filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {periodFilters.map(f => (
          <button key={f.key} onClick={() => setActivePeriod(f.key)} className={cn(
            'px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border',
            activePeriod === f.key
              ? 'bg-[#25D366] text-white border-[#25D366]/30 shadow-[0_0_20px_-5px_rgba(37,211,102,0.2)]'
              : 'bg-white/[0.02] text-white/35 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
          )}>{f.label}</button>
        ))}
      </div>

      {/* Type filter toggle + pills */}
      <div className="mb-8">
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition mb-3"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtrar por tipo
          {activeType !== 'all' && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#25D366]/10 text-[#25D366] text-[10px] font-medium">
              {typeFilters.find(f => f.key === activeType)?.label}
              <button onClick={(e) => { e.stopPropagation(); setActiveType('all') }} className="ml-1 hover:text-white"><X className="h-2.5 w-2.5 inline" /></button>
            </span>
          )}
          {showTypeFilter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {showTypeFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                {typeFilters.map(f => {
                  const IconComp = f.icon
                  return (
                    <button
                      key={f.key}
                      onClick={() => setActiveType(f.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border',
                        activeType === f.key
                          ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20'
                          : 'bg-white/[0.02] text-white/30 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/50'
                      )}
                    >
                      <IconComp className="h-3 w-3" />
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats cards */}
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

      {/* Event count with type filter active */}
      {activeType !== 'all' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <p className="text-xs text-white/25">
            A mostrar {filteredEvents.length} evento(s) do tipo "<span className="text-white/40">{typeFilters.find(f => f.key === activeType)?.label}</span>"
            {filteredEvents.length !== (events?.length ?? 0) && (
              <span> de {(events?.length ?? 0)} total</span>
            )}
          </p>
        </motion.div>
      )}

      {/* Events timeline */}
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
          <p className="text-xs text-white/15 mt-1">
            {activeType !== 'all'
              ? 'Tente alterar o filtro de tipo ou o periodo'
              : 'Os eventos aparecerao aqui assim que os dispositivos reportarem actividade'
            }
          </p>
          {activeType !== 'all' && (
            <button
              onClick={() => setActiveType('all')}
              className="mt-3 text-xs text-[#25D366]/60 hover:text-[#25D366] transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
      <div className="relative">
        <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/[0.04]" />
        <div className="space-y-0">
          {filteredEvents.map((event, i) => {
            const config = eventConfig[event.type] || eventConfig.location
            const IconComp = config.icon
            const isExpanded = expandedId === event.id
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 120 }}
                className="relative flex gap-4 pb-5 last:pb-0"
              >
                <div className={cn('relative z-10 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border border-[#0A0F1A]', config.bg)}>
                  <IconComp className={cn('h-4 w-4', config.color)} strokeWidth={1.5} />
                </div>
                <div className="flex-1 pt-1">
                  <SpotlightCard className="p-4">
                    <div
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border', config.bg, config.color)}>
                            {config.label}
                          </span>
                          <p className="text-sm text-white/60 leading-relaxed truncate">{event.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-white/20 whitespace-nowrap flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />{formatTimestamp(event.created_at)}
                          </span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/20" /> : <ChevronDown className="h-3.5 w-3.5 text-white/20" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2.5">
                            {/* Full date */}
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-white/20" />
                              <span className="text-[11px] text-white/30">{formatFullDate(event.created_at)}</span>
                            </div>

                            {/* Coordinates */}
                            {event.latitude && event.longitude && (
                              <div className="flex items-center gap-2">
                                <MapPinned className="h-3 w-3 text-white/20" />
                                <span className="text-[11px] text-white/30 font-mono">
                                  {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#25D366]/50 hover:text-[#25D366] transition ml-1"
                                >
                                  Ver no Maps
                                </a>
                              </div>
                            )}

                            {/* Device ID */}
                            {event.device_id && (
                              <div className="flex items-center gap-2">
                                <Bluetooth className="h-3 w-3 text-white/20" />
                                <span className="text-[11px] text-white/30 font-mono">Dispositivo: {event.device_id.slice(0, 8)}...</span>
                              </div>
                            )}

                            {/* Event ID */}
                            <div className="flex items-center gap-2">
                              <Activity className="h-3 w-3 text-white/15" />
                              <span className="text-[10px] text-white/15 font-mono">ID: {event.id}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SpotlightCard>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      )}

      {/* Footer summary */}
      {!showShimmer && filteredEvents.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 pt-4 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/15">
              {filteredEvents.length} evento(s) {activeType !== 'all' ? `filtrados por "${typeFilters.find(f => f.key === activeType)?.label}"` : ''} — {periodFilters.find(f => f.key === activePeriod)?.label}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="text-[10px] text-[#25D366]/40 hover:text-[#25D366] transition flex items-center gap-1"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="text-[10px] text-[#25D366]/40 hover:text-[#25D366] transition flex items-center gap-1"
              >
                <Activity className="h-3 w-3" /> JSON
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
