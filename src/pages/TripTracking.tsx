/**
 * TripTracking — Página de gestão de viagens com rastreamento.
 * 
 * O utilizador pode:
 * - Criar viagens com destino
 * - Iniciar rastreamento GPS em tempo real
 * - Partilhar com contactos de confiança
 * - Ver viagens passadas
 * - Finalizar ou cancelar viagens activas
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, MapPin, Play, Square, X, Clock, Share2, Plus, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTripTracking } from '@/hooks/useTripTracking'
import { useGeolocation } from '@/hooks/useGeolocation'
import { toast } from 'sonner'

export default function TripTracking() {
  const { trips, activeTrip, isTracking, createTrip, startTrip, completeTrip, cancelTrip } = useTripTracking()
  const { position } = useGeolocation()
  const [showCreate, setShowCreate] = useState(false)
  const [tripName, setTripName] = useState('')
  const [tripDest, setTripDest] = useState('')
  const [tripDestLat, setTripDestLat] = useState('')
  const [tripDestLng, setTripDestLng] = useState('')

  const handleCreate = () => {
    if (!tripName.trim()) { toast.error('Dê um nome à viagem'); return }
    createTrip({
      name: tripName.trim(),
      destination: tripDest.trim() || 'Destino não especificado',
      destLat: tripDestLat ? parseFloat(tripDestLat) : undefined,
      destLng: tripDestLng ? parseFloat(tripDestLng) : undefined,
    })
    setTripName(''); setTripDest(''); setTripDestLat(''); setTripDestLng('');
    setShowCreate(false)
  }

  const handleShare = (token: string) => {
    const url = `${window.location.origin}/track/${token}`
    if (navigator.share) {
      navigator.share({ title: 'StatusAds Connect — Rastrear Viagem', url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    planned: { label: 'Planeada', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
    active: { label: 'Em Curso', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Play },
    completed: { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
    cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10', icon: X },
  }

  return (
    <div className='min-h-screen space-y-5 pb-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20'>
            <Map className='w-5 h-5 text-cyan-400' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-white'>Rastrear Viagem</h1>
            <p className='text-white/40 text-sm mt-0.5'>Partilhe a sua localização em tempo real</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className='p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition'>
          <Plus className='w-5 h-5' />
        </button>
      </div>

      {/* Active Trip Banner */}
      <AnimatePresence>
        {activeTrip && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className='bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-4'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <div className='w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse' />
                <span className='text-emerald-300 text-sm font-medium'>Viagem em Curso</span>
              </div>
              <span className='text-emerald-400/40 text-[10px]'>{activeTrip.share_tokens[0]}</span>
            </div>
            <div className='text-white font-medium'>{activeTrip.trip_name}</div>
            <div className='text-white/40 text-xs mt-0.5 flex items-center gap-1'>
              <MapPin className='w-3 h-3' /> {activeTrip.destination}
            </div>
            {position && (
              <div className='text-white/20 text-[10px] mt-2 font-mono'>
                GPS: {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)} | Ping a cada 30s
              </div>
            )}
            <div className='flex gap-2 mt-3'>
              <button onClick={() => handleShare(activeTrip.share_tokens[0])} className='flex-1 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 transition flex items-center justify-center gap-1.5'>
                <Share2 className='w-3.5 h-3.5' /> Partilhar
              </button>
              <button onClick={() => completeTrip(activeTrip.id)} className='flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition flex items-center justify-center gap-1.5'>
                <CheckCircle2 className='w-3.5 h-3.5' /> Cheguei
              </button>
              <button onClick={() => cancelTrip(activeTrip.id)} className='py-2 px-3 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition'>
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trips List */}
      <div>
        <div className='text-white/40 text-xs font-medium mb-2.5 uppercase tracking-wider'>
          Todas as Viagens ({trips.length})
        </div>
        {trips.length === 0 ? (
          <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center'>
            <Map className='w-10 h-10 text-white/10 mx-auto mb-2' />
            <p className='text-white/30 text-sm'>Nenhuma viagem criada</p>
            <p className='text-white/15 text-xs mt-1'>Crie uma viagem para partilhar a sua localização em tempo real com contactos de confiança</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {trips.map(trip => {
              const cfg = statusConfig[trip.status] || statusConfig.planned
              const Icon = cfg.icon
              return (
                <div key={trip.id} className={cn('rounded-xl border p-3 transition',
                  trip.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]')}>
                  <div className='flex items-center gap-3'>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', cfg.bg)}>
                      <Icon className={cn('w-4 h-4', cfg.color)} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-white text-sm font-medium truncate'>{trip.trip_name}</div>
                      <div className='text-white/30 text-[11px] flex items-center gap-1 mt-0.5'>
                        <MapPin className='w-3 h-3' /> {trip.destination}
                      </div>
                      <div className='text-white/15 text-[10px] mt-0.5'>
                        {new Date(trip.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', cfg.bg, cfg.color)}>{cfg.label}</span>
                      {trip.status === 'planned' && (
                        <button onClick={() => startTrip(trip.id)} className='text-emerald-400 text-[10px] hover:underline flex items-center gap-0.5'>
                          <Play className='w-2.5 h-2.5' /> Iniciar
                        </button>
                      )}
                      {trip.status === 'active' && (
                        <button onClick={() => handleShare(trip.share_tokens[0])} className='text-cyan-400 text-[10px] hover:underline flex items-center gap-0.5'>
                          <Share2 className='w-2.5 h-2.5' /> Partilhar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6' onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className='bg-[#1F2937] rounded-2xl p-6 w-full max-w-sm' onClick={e => e.stopPropagation()}>
              <h3 className='text-white text-center text-lg font-semibold mb-1'>Nova Viagem</h3>
              <p className='text-white/40 text-center text-xs mb-4'>Crie uma viagem para partilhar a sua localização</p>
              <div className='space-y-3'>
                <input value={tripName} onChange={e => setTripName(e.target.value)} placeholder='Nome da viagem' autoFocus
                  className='w-full bg-gray-700 text-white text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-white/20' />
                <input value={tripDest} onChange={e => setTripDest(e.target.value)} placeholder='Destino (ex: Casa da Maria)'
                  className='w-full bg-gray-700 text-white text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-white/20' />
                <div className='text-white/30 text-[10px]'>Coordenadas do destino (opcional)</div>
                <div className='grid grid-cols-2 gap-2'>
                  <input value={tripDestLat} onChange={e => setTripDestLat(e.target.value)} placeholder='Latitude' type='number' step='any'
                    className='bg-gray-700 text-white text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-white/20' />
                  <input value={tripDestLng} onChange={e => setTripDestLng(e.target.value)} placeholder='Longitude' type='number' step='any'
                    className='bg-gray-700 text-white text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-white/20' />
                </div>
              </div>
              <div className='flex gap-2 mt-4'>
                <button onClick={() => setShowCreate(false)} className='flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm'>Cancelar</button>
                <button onClick={handleCreate} className='flex-1 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600'>Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}