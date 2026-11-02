/** An?lise indicativa de alertas comunit?rios numa linha directa. */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation, MapPin, AlertTriangle, Shield, Clock, Route, X, Info, Search, Loader2 } from 'lucide-react'
import { useSafeRoute } from '@/hooks/useSafeRoute'
import { useGeolocation } from '@/hooks/useGeolocation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { searchAddress, type AddressSearchResult } from '@/lib/free-apis'

export default function SafeRoute() {
  const { position } = useGeolocation()
  const { result, isCalculating, calculateSafeRoute, clearRoute } = useSafeRoute()
  const [destLat, setDestLat] = useState('')
  const [destLng, setDestLng] = useState('')
  const [destName, setDestName] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleCalculate = async () => {
    const lat = parseFloat(destLat)
    const lng = parseFloat(destLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordenadas inv?lidas')
      return
    }

    const routeResult = await calculateSafeRoute(lat, lng)
    if (routeResult && 'error' in routeResult) {
      toast.error(routeResult.error)
    }
  }

  const handleAddressSearch = async () => {
    setIsSearching(true)
    setSearchResults([])
    try {
      const results = await searchAddress(addressQuery)
      setSearchResults(results)
      if (results.length === 0) toast.info('N?o foram encontrados locais para essa pesquisa.')
    } catch {
      toast.error('N?o foi poss?vel pesquisar o endere?o. Verifique a liga??o e tente novamente.')
    } finally {
      setIsSearching(false)
    }
  }

  const selectAddress = (place: AddressSearchResult) => {
    setDestName(place.displayName)
    setAddressQuery(place.displayName)
    setDestLat(String(place.latitude))
    setDestLng(String(place.longitude))
    setSearchResults([])
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
          <h1 className='text-2xl font-bold text-white'>An?lise de percurso</h1>
          <p className='text-white/40 text-sm mt-0.5'>Veja alertas comunit?rios entre si e o destino</p>
        </div>
      </div>

      {/* Origin info */}
      <div className='bg-brand/[0.06] border border-brand/15 rounded-xl p-3 flex items-center gap-3'>
        <div className='w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center'>
      <div className='w-3 h-3 rounded-full bg-brand shadow-[0_0_8px_rgba(212,175,55,0.5)]' />
    </div>
    <div className='flex-1'>
      <div className='text-white text-sm font-medium'>Sua Localiza??o</div>
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
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleAddressSearch()
          }}
          className='space-y-2'
        >
          <label htmlFor='safe-route-address' className='sr-only'>Pesquisar um endere?o</label>
          <div className='flex gap-2'>
            <input
              id='safe-route-address'
              value={addressQuery}
              onChange={(event) => {
                setAddressQuery(event.target.value)
                setSearchResults([])
                setDestName('')
                setDestLat('')
                setDestLng('')
              }}
              placeholder='Pesquisar endere?o ou local'
              autoComplete='street-address'
              disabled={isSearching}
              className='min-w-0 flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/40'
            />
            <button
              type='submit'
              disabled={isSearching || addressQuery.trim().length < 3}
              className='shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'
              aria-label='Pesquisar endere?o'
            >
              {isSearching ? <Loader2 className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
            </button>
          </div>
          <p className='text-[10px] leading-relaxed text-white/30'>
            A pesquisa envia apenas o destino escrito para o OpenStreetMap; a sua localiza??o actual n?o ? inclu?da.
          </p>
        </form>

        {searchResults.length > 0 && (
          <ul className='overflow-hidden rounded-xl border border-white/[0.08] divide-y divide-white/[0.06]' aria-label='Resultados da pesquisa'>
            {searchResults.map((place) => (
              <li key={place.placeId}>
                <button
                  type='button'
                  onClick={() => selectAddress(place)}
                  className='flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-white/[0.05]'
                >
                  <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-brand' />
                  <span className='text-xs leading-relaxed text-white/70'>{place.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className='flex items-center gap-2 text-[10px] text-white/30' aria-hidden='true'>
          <span className='h-px flex-1 bg-white/[0.08]' />
          ou introduza coordenadas
          <span className='h-px flex-1 bg-white/[0.08]' />
        </div>
        <div>
          <label htmlFor='safe-route-name' className='sr-only'>Nome do destino</label>
          <input id='safe-route-name' value={destName} onChange={e => setDestName(e.target.value)} placeholder='Nome do destino (opcional)'
            className='w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 mb-2' />
          <div className='grid grid-cols-2 gap-2'>
            <label className='sr-only' htmlFor='safe-route-latitude'>Latitude do destino</label>
            <input id='safe-route-latitude' value={destLat} onChange={e => { setDestLat(e.target.value); setDestName('') }} placeholder='Latitude' type='number' min='-90' max='90' step='any'
              className='bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40' />
            <label className='sr-only' htmlFor='safe-route-longitude'>Longitude do destino</label>
            <input id='safe-route-longitude' value={destLng} onChange={e => { setDestLng(e.target.value); setDestName('') }} placeholder='Longitude' type='number' min='-180' max='180' step='any'
              className='bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40' />
          </div>
        </div>
        <div className='flex gap-2'>
          <button onClick={handleCalculate} disabled={isCalculating || !destLat || !destLng}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              isCalculating || !destLat || !destLng ? 'bg-white/5 text-white/20' : 'bg-amber-400 text-white hover:bg-amber-500')}>
            {isCalculating ? <><div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' /> A analisar...</> : <><Route className='w-4 h-4' /> Analisar linha</>}
          </button>
          {result && <button onClick={clearRoute} className='p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 transition'><X className='w-4 h-4' /></button>}
        </div>
      </div>

      {/* Presets */}
      {!result && (
        <div>
          <div className='text-white/40 text-xs font-medium mb-2 uppercase tracking-wider'>Destinos R?pidos</div>
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
            <StatCard icon={Route} label='Linha directa' value={`${result.totalDistanceKm.toFixed(1)} km`} color='emerald' />
            <StatCard icon={Clock} label='A p? (estim.)' value={`${result.estimatedMinutes} min`} color='blue' />
            <StatCard icon={Shield} label='Alertas na linha' value={`${result.dangerZonesDetected}`} color={result.dangerZonesDetected > 0 ? 'amber' : 'emerald'} />
          </div>

          {/* Route Visualization ? Simple list of waypoints */}
          <div className='bg-white/[0.02] border border-white/[0.06] rounded-xl p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='text-white/60 text-xs uppercase tracking-wider font-medium'>Pontos da linha</div>
              <div className='flex items-center gap-3 text-[10px]'>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-amber-300' /> Sem alerta</span>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-amber-400' /> Cautela</span>
                <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-red-400' /> Perigo</span>
              </div>
            </div>
            <div className='space-y-1.5 max-h-64 overflow-y-auto pr-1'>
              {result.waypoints.map((wp, i) => (
                <div key={i} className='flex items-center gap-2.5'>
                  <div className='flex flex-col items-center'>
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
                      wp.dangerLevel === 'unmarked' ? 'bg-amber-300' : wp.dangerLevel === 'caution' ? 'bg-amber-400' : 'bg-red-400')} />
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
          <div className='flex items-start gap-2 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-3 text-white/45 text-[11px]'>
            <Info className='w-3.5 h-3.5 mt-0.5 shrink-0' />
            <span>Esta ? uma an?lise em linha directa, n?o uma rota por ruas. Usa apenas os alertas comunit?rios carregados pelo radar, n?o calcula desvios nem garante seguran?a. O tempo ? apenas uma projec??o a p? baseada na dist?ncia em linha recta. Confirma o percurso numa app de navega??o; a aus?ncia de alertas n?o prova que uma zona seja segura. ? OpenStreetMap contributors.</span>
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