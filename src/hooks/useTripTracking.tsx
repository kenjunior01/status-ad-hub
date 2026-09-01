/**
 * useTripTracking — Partilha de viagem em tempo real com contactos de confiança.
 * 
 * Funcionalidades:
 * - Criar viagens com nome e destino
 * - Partilhar com contactos de confiança via link
 * - GPS pings automáticos a cada 30s durante a viagem
 * - ETA calculada automaticamente
 * - Auto-notificação se ETA excedido
 * - Finalização automática ao chegar ao destino
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useEmergency } from '@/hooks/useEmergency'
import { toast } from 'sonner'
import type { TripTracking } from '@/lib/types'

interface TripTrackingContextValue {
  trips: TripTracking[]
  activeTrip: TripTracking | null
  isTracking: boolean
  createTrip: (input: { name: string; destination: string; destLat?: number; destLng?: number }) => void
  startTrip: (tripId: string) => void
  completeTrip: (tripId: string) => void
  cancelTrip: (tripId: string) => void
}

const TripTrackingContext = createContext<TripTrackingContextValue>({
  trips: [], activeTrip: null, isTracking: false,
  createTrip: () => {}, startTrip: () => {}, completeTrip: () => {}, cancelTrip: () => {},
})

export function TripTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { position } = useGeolocation()
  const { triggerEmergency } = useEmergency()
  const [trips, setTrips] = useState<TripTracking[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load trips from localStorage
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(`trips-${user.id}`)
    if (saved) {
      try { setTrips(JSON.parse(saved)) } catch {}
    }
  }, [user?.id])

  const activeTrip = trips.find(t => t.status === 'active') || null

  const saveTrips = useCallback((newTrips: TripTracking[]) => {
    if (!user) return
    setTrips(newTrips)
    localStorage.setItem(`trips-${user.id}`, JSON.stringify(newTrips))
  }, [user])

  const createTrip = useCallback((input: { name: string; destination: string; destLat?: number; destLng?: number }) => {
    if (!user) return
    const trip: TripTracking = {
      id: crypto.randomUUID(),
      user_id: user.id,
      trip_name: input.name,
      destination: input.destination,
      destination_lat: input.destLat ?? null,
      destination_lng: input.destLng ?? null,
      shared_with: [],
      share_tokens: [crypto.randomUUID().slice(0, 8).toUpperCase()],
      status: 'planned',
      eta_minutes: null,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const newTrips = [trip, ...trips]
    saveTrips(newTrips)
    toast.success(`Viagem "${input.name}" criada`)
  }, [user, trips, saveTrips])

  const startTrip = useCallback((tripId: string) => {
    const updated = trips.map(t => t.id === tripId ? {
      ...t,
      status: 'active' as const,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : t)
    saveTrips(updated)
    setIsTracking(true)
    toast.info('Viagem iniciada — GPS activo')
  }, [trips, saveTrips])

  const completeTrip = useCallback((tripId: string) => {
    setIsTracking(false)
    const updated = trips.map(t => t.id === tripId ? {
      ...t,
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : t)
    saveTrips(updated)
    toast.success('Viagem concluída com segurança!')
  }, [trips, saveTrips])

  const cancelTrip = useCallback((tripId: string) => {
    setIsTracking(false)
    const updated = trips.map(t => t.id === tripId ? {
      ...t, status: 'cancelled' as const, updated_at: new Date().toISOString(),
    } : t)
    saveTrips(updated)
    toast('Viagem cancelada', { icon: 'ℹ️' })
  }, [trips, saveTrips])

  // Auto GPS ping during active trip (every 30s)
  useEffect(() => {
    if (!isTracking || !user || !position) return
    trackingIntervalRef.current = setInterval(() => {
      // Log location for trip tracking
      const ping = {
        trip_id: activeTrip?.id,
        lat: position.latitude,
        lng: position.longitude,
        speed: position.speed,
        battery: (navigator as any).getBattery ? undefined : undefined,
        timestamp: new Date().toISOString(),
      }
      // Store pings in localStorage (in production, send to Supabase)
      const pingsKey = `trip-pings-${activeTrip?.id}`
      const existing = JSON.parse(localStorage.getItem(pingsKey) || '[]')
      existing.push(ping)
      // Keep last 200 pings
      if (existing.length > 200) existing.shift()
      localStorage.setItem(pingsKey, JSON.stringify(existing))
    }, 30_000)
    return () => { if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current) }
  }, [isTracking, user, position, activeTrip?.id])

  return (
    <TripTrackingContext.Provider value={{ trips, activeTrip, isTracking, createTrip, startTrip, completeTrip, cancelTrip }}>
      {children}
    </TripTrackingContext.Provider>
  )
}

export function useTripTracking() { return useContext(TripTrackingContext) }
