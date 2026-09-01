/**
 * IncidentTimeline — Reconstrução visual de incidentes de emergência.
 * 
 * Mostra uma linha temporal completa com todos os eventos
 * recolhidos durante uma emergência: GPS, BLE, voz, fotos, áudio.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Mic, Camera, Radio, Skull, ShieldAlert, Activity, AlertTriangle, Timer, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIncidentTimeline } from '@/hooks/useIncidentTimeline'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  emergency_start: { icon: ShieldAlert, color: 'bg-red-500/20 text-red-400 border-red-500/20', label: 'Emergência' },
  location: { icon: MapPin, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', label: 'GPS' },
  alert: { icon: AlertTriangle, color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', label: 'Alerta' },
  bluetooth: { icon: Radio, color: 'bg-blue-500/20 text-blue-400 border-blue-500/20', label: 'BLE' },
  geofence: { icon: MapPin, color: 'bg-purple-500/20 text-purple-400 border-purple-500/20', label: 'Geofence' },
  voice_sos: { icon: Mic, color: 'bg-red-500/20 text-red-400 border-red-500/20', label: 'Voz SOS' },
  panic_mode: { icon: Skull, color: 'bg-red-500/20 text-red-400 border-red-500/20', label: 'Pânico' },
  threat_detected: { icon: Activity, color: 'bg-orange-500/20 text-orange-400 border-orange-500/20', label: 'Ameaça' },
  dead_mans_switch: { icon: Timer, color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', label: "DMS" },
  glasses_sos: { icon: Camera, color: 'bg-pink-500/20 text-pink-400 border-pink-500/20', label: 'Óculos' },
  audio_evidence: { icon: Mic, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20', label: 'Áudio' },
  photo_evidence: { icon: Camera, color: 'bg-teal-500/20 text-teal-400 border-teal-500/20', label: 'Foto' },
  checkin: { icon: Clock, color: 'bg-green-500/20 text-green-400 border-green-500/20', label: 'Check-in' },
  glasses_removal: { icon: AlertTriangle, color: 'bg-rose-500/20 text-rose-400 border-rose-500/20', label: 'Remoção' },
  resolved: { icon: ShieldAlert, color: 'bg-green-500/20 text-green-400 border-green-500/20', label: 'Resolvida' },
}

export default function IncidentTimeline() {
  const { history: emergencies } = useEmergencyAlerts()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const { timeline, isLoading, error, rebuild } = useIncidentTimeline(selectedId)

  const filteredEmergencies = showResolved
    ? emergencies
    : emergencies.filter(e => e.status === 'active')

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${Math.round(secs)}s`
    const m = Math.floor(secs / 60)
    const s = Math.round(secs % 60)
    return `${m}m ${s}s`
  }

  return (
    <div className='min-h-screen space-y-5 pb-8'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <div className='p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20'>
          <Clock className='w-5 h-5 text-amber-400' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-white'>Timeline de Incidentes</h1>
          <p className='text-white/40 text-sm mt-0.5'>Reconstrução completa de emergências</p>
        </div>
      </div>

      {/* Emergency Selection */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <div className='text-white/40 text-xs font-medium uppercase tracking-wider'>Emergências ({emergencies.length})</div>
          <button onClick={() => setShowResolved(!showResolved)} className='text-white/30 text-xs hover:text-white/50 flex items-center gap-1'>
            {showResolved ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
            {showResolved ? 'Activas' : 'Todas (incl. resolvidas)'}
          </button>
        </div>
        {filteredEmergencies.length === 0 ? (
          <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center'>
            <p className='text-white/30 text-sm'>Nenhuma emergência {showResolved ? '' : 'activa'}</p>
          </div>
        ) : (
          <div className='space-y-1.5'>
            {filteredEmergencies.map(em => (
              <button key={em.id} onClick={() => handleSelect(em.id)}
                className={cn('w-full text-left rounded-xl border p-3 transition',
                  selectedId === em.id ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]')}>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className={cn('w-2 h-2 rounded-full', em.status === 'active' ? 'bg-red-400 animate-pulse' : em.status === 'resolved' ? 'bg-green-400' : 'bg-gray-400')} />
                    <span className='text-white text-sm font-medium'>
                      {em.status === 'active' ? 'Emergência Activa' : em.status === 'resolved' ? 'Resolvida' : 'Falso Alarme'}
                    </span>
                  </div>
                  <span className='text-white/20 text-[10px]'>{new Date(em.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className='text-white/20 text-[10px] mt-1 font-mono'>{em.latitude.toFixed(4)}, {em.longitude.toFixed(4)} | Contactos: {em.contacts_notified.length}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline View */}
      {selectedId && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          {isLoading && (
            <div className='flex items-center justify-center py-8'>
              <div className='w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin' />
              <span className='text-white/40 text-sm ml-2'>A construir timeline...</span>
            </div>
          )}

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-3'>
              <p className='text-red-300 text-sm'>{error}</p>
              <button onClick={rebuild} className='text-red-300/60 text-xs mt-1 hover:underline flex items-center gap-1'><RefreshCw className='w-3 h-3' /> Tentar novamente</button>
            </div>
          )}

          {timeline && !isLoading && !error && (
            <>
              {/* Stats */}
              <div className='grid grid-cols-3 gap-2'>
                <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center'>
                  <div className='text-white text-sm font-semibold'>{formatDuration(timeline.reconstruction.totalDuration)}</div>
                  <div className='text-white/30 text-[10px]'>Duração</div>
                </div>
                <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center'>
                  <div className='text-white text-sm font-semibold'>{(timeline.reconstruction.maxDistanceFromStart / 1000).toFixed(2)} km</div>
                  <div className='text-white/30 text-[10px]'>Distância Máx.</div>
                </div>
                <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center'>
                  <div className='text-white text-sm font-semibold'>{timeline.events.length}</div>
                  <div className='text-white/30 text-[10px]'>Eventos</div>
                </div>
              </div>

              {/* Events by type summary */}
              <div className='flex flex-wrap gap-1.5'>
                {Object.entries(timeline.reconstruction.eventsByType).map(([type, count]) => {
                  const cfg = typeConfig[type]
                  if (!cfg) return null
                  return (
                    <span key={type} className={cn('text-[10px] px-2 py-0.5 rounded-full border', cfg.color)}>
                      {cfg.label}: {count}
                    </span>
                  )
                })}
              </div>

              {/* Timeline */}
              <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-4'>
                <div className='text-white/40 text-xs font-medium mb-3 uppercase tracking-wider'>Linha Temporal</div>
                <div className='space-y-0'>
                  {timeline.events.map((evt, i) => {
                    const cfg = typeConfig[evt.type] || { icon: Activity, color: 'bg-gray-500/20 text-gray-400 border-gray-500/20', label: evt.type }
                    const Icon = cfg.icon
                    const isLast = i === timeline.events.length - 1
                    return (
                      <div key={i} className='flex gap-3'>
                        <div className='flex flex-col items-center'>
                          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', cfg.color)}>
                            <Icon className='w-3.5 h-3.5' />
                          </div>
                          {!isLast && <div className='w-0.5 flex-1 bg-white/[0.06] min-h-4' />}
                        </div>
                        <div className={cn('pb-4', isLast && 'pb-0')}>
                          <div className='flex items-center gap-2'>
                            <span className='text-white text-xs font-medium'>{evt.title}</span>
                          </div>
                          <p className='text-white/30 text-[11px] mt-0.5'>{evt.description}</p>
                          <div className='flex items-center gap-2 mt-1'>
                            <span className='text-white/15 text-[10px] font-mono'>{formatTime(evt.timestamp)}</span>
                            {evt.latitude && <span className='text-white/15 text-[10px]'>📍 {evt.latitude.toFixed(4)}, {evt.longitude?.toFixed(4)}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}