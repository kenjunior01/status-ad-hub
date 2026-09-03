/**
 * SafeRoute — Página de rota segura inteligente.
 * 
 * O utilizador insere um destino e o sistema calcula a rota
 * mais segura, desviando-se de zonas de perigo reportadas
 * pela comunidade.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation, MapPin, AlertTriangle, Shield, Clock, Route, Play, X, Info } from 'lucide-react'
import { useSafeRoute } from '@/hooks/useSafeRoute'
import { useGeolocation } from '@/hooks/useGeolocation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SafeRoute() {
  const { position } = useGeolocation()
  const { result, isCalculating, calculateSafeRoute, clearRoute } = useSafeRoute()
  const [destLat, setDestLat] = useState('')
  const [destLng, setDestLng] = useState('')
  const [destName, setDestName] = useState('')

  const handleCalculate = () => {
    const lat = parseFloat(destLat)
    const lng = parseFloat(destLng)
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordenadas inválidas')
      return
    }
    calculateSafeRoute(lat, lng)
  }

  const handleUseMyLocation = () => {
    if (position) {
      setDestLat(position.latitude.toFixed(6))
      setDestLng(position.longitude.toFixed(6))
    }
  }

  // Preset destinations in Maputo
  const presets = [
    { name: 'Maputo Shopping', lat: -25.9692, lng: 32.5732 },
    { name: 'Praia da Costa do Sol', lat: -25.9583, lng: 32.5700 },
    { name: 'Centro de Maputo', lat: -25.9667, lng: 32.5833 },
    { name: 'Airport', lat: -25.9208, lng: 32.5736 },
  ]

  return (
    <div className='min-h-screen space-y-5 pb-8'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <div className='p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20'>
          <Navigation className='w-5 h-5 text-amber-300' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-white'>Rota Segura</h1>
          <p className='text-white/40 text-sm mt-0.5'>Rota mais segura evitando zonas de perigo</p>
        </div>
      </div>

      {/* Origin info */}
      <div className='bg-brand/[0.06] border border-brand/15 rounded-xl p-3 flex items-center gap-3'>
        <div className='w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center'>
      <div className='w-3 h-3 rounded-full bg-brand shadow-[0_0_8px_rgba(212,175,55,0.5)]' />
    </div>
    <div className='flex-1'>
      <div className='text-white text-sm font-medium'>Sua Localização</div>
      <div className='text-white/40 text-xs'>
        {position ? `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}` : 'Aguardando GPS...'}
      </div>
    </div>
  </div>

      {/* Destination Input */}
      <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3'>
        <div className='flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-medium'>
          <MapPin className='w-3.5 h-3.5' /> Destino
        </div>
        <div>
          <input value={destName} onChange={e => setDestName(e.target.value)} placeholder='Nome do destino (opcional)'
            className='w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 mb-2' />
          <div className='grid grid-cols-2 gap-2'>
            <input value={destLat} onChange={e => setDestLat(e.target.value)} placeholder='Latitude' type='number' step='any'
              className='bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40' />
            <input value={destLng} onChange={e => setDestLng(e.target.value)} placeholder='Longitude' type='number' step='any'
              className='bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40' />
          </div>
        </div>
        <div className='flex gap-2'>
          <button onClick={handleCalculate} disabled={isCalculating || !destLat || !destLng}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              isCalculating || !destLat || !destLng ? 'bg-white/5 text-white/20' : 'bg-amber-400 text-white hover:bg-amber-500')}>
            {isCalculating ? <><div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' /> A calcular...</> : <><Route className='w-4 h-4' /> Calcular Rota</>}
          </button>
          {result && <button onClick={clearRoute} className='p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 transition'><X className='w-4 h-4' /></button>}
        </div>
      </div>

      {/* Presets */}
      {!result && (
        <div>
          <div className='text-white/40 text-xs font-medium mb-2 uppercase tracking-wider'>Destinos Rápidos</div>
          <div className='grid grid-cols-2 gap-2'>
            {presets.map(p => (
              <button key={p.name} onClick={() => { setDestName(p.name); setDestLat(String(p.lat)); setDestLng(String(p.lng)) }}
                className='text-left p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition'>
                <div className='text-white text-sm font-medium'>{p.name}</div>
                <div className='text-white/30 text-[10px] mt-0.5'>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Route Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          {/* Stats Cards */}
          <div className='grid grid-cols-3 gap-2'>
            <StatCard icon={Route} label='Distância' value={`${result.totalDistanceKm.toFixed(1)} km`} color='emerald' />
            <StatCard icon={Clock} label='Tempo Est.' value={`${result.estimatedMinutes} min`} color='blue' />
            <StatCard icon={Shield} label='Zonas Evitadas' value={`${result.dangerZonesAvoided}`} color={result.dangerZonesAvoided > 0 ? 'amber' : 'emerald'} />
          </div>

          {/* Route Visualization — Simple list of waypoints */}
          <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='text-white/60 text-xs uppercase tracking-wider font-medium'>Pontos da Rota</div>
              <div className='flex items-center gap-3 text-[10px]'>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-amber-300' /> Seguro</span>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-amber-400' /> Cautela</span>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-red-400' /> Perigo</span>
              </div>
            </div>
            <div className='space-y-1.5 max-h-64 overflow-y-auto pr-1'>
              {result.waypoints.map((wp, i) => (
                <div key={i} className='flex items-center gap-2.5'>
                  <div className='flex flex-col items-center'>
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
                      wp.dangerLevel === 'safe' ? 'bg-amber-300' : wp.dangerLevel === 'caution' ? 'bg-amber-400' : 'bg-red-400')} />
                    {i < result.waypoints.length - 1 && <div className='w-0.5 h-3 bg-white/10' />}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-white/60 text-[10px]'>Ponto {i + 1}</div>
                    {wp.reason && <div className='text-amber-300/60 text-[9px] truncate'>{wp.reason}</div>}
                  </div>
                  <div className='text-white/20 text-[9px] font-mono'>{wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className='bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3'>
              <div className='flex items-center gap-2 text-amber-300 text-xs font-medium mb-1.5'>
                <AlertTriangle className='w-3.5 h-3.5' /> Avisos
              </div>
              {result.warnings.map((w, i) => (
                <p key={i} className='text-amber-200/50 text-[11px] ml-5.5'>{w}</p>
              ))}
            </div>
          )}

          {/* Info tip */}
          <div className='flex items-start gap-2 text-white/20 text-[11px]'>
            <Info className='w-3.5 h-3.5 mt-0.5 shrink-0' />
            <span>A rota é calculada com desvios automáticos de zonas reportadas pela comunidade. Para navegação detalhada, use uma app de mapas com a rota aproximada como referência.</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-amber-400/10 text-amber-300',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
  }
  return (
    <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center'>
      <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center', colors[color] || colors.emerald)}>
        <Icon className='w-4 h-4' />
      </div>
      <div className='text-white text-sm font-semibold'>{value}</div>
      <div className='text-white/30 text-[10px]'>{label}</div>
    </div>
  )
}