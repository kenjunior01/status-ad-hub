import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import {
  ShieldAlert, ShieldCheck, XCircle, Phone, Clock, MapPin,
  RefreshCw, ExternalLink, AlertTriangle, Shield, HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Shimmer, NoiseTexture, MorphingBlob } from '@/components/effects'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

// ============================================
// Types for the public API response
// ============================================

interface PublicEmergencyData {
  id: string
  latitude: number
  longitude: number
  contacts_notified: string[]
  created_at: string
  resolved_at: string | null
  status: 'active' | 'resolved' | 'false_alarm'
  full_name?: string | null
  blood_type?: string | null
  allergies?: string | null
  medications?: string | null
  medical_notes?: string | null
}

// ============================================
// Map helpers
// ============================================

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 16, { animate: true })
  }, [map, center])
  return null
}

function EmergencyMarker({ position, resolved }: { position: [number, number]; resolved: boolean }) {
  const color = resolved ? '#D4AF37' : '#EF4444'
  const pulseColor = resolved ? 'rgba(212,175,55,' : 'rgba(239,68,68,'
  const html = '<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">' +
    (!resolved ? '<div style="position:absolute;width:28px;height:28px;border-radius:50%;background:' + pulseColor + '0.15);animation:pulse-ring 1.5s infinite;"></div>' +
    '<div style="position:absolute;width:44px;height:44px;border-radius:50%;background:' + pulseColor + '0.06);animation:pulse-ring 1.5s infinite 0.4s;"></div>' : '') +
    '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:3px solid rgba(10,15,26,0.9);box-shadow:0 0 20px ' + color + '88;z-index:2;position:relative;"></div>' +
    '</div>' +
    '<style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(3);opacity:0}}</style>'
  const icon = L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
  return <Marker position={position} icon={icon} />
}

// ============================================
// Relative time
// ============================================

function RelativeTime({ dateStr }: { dateStr: string }) {
  const [text, setText] = useState('')
  useEffect(() => {
    const update = () => {
      try {
        setText(formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pt }))
      } catch { setText(dateStr) }
    }
    update()
    const interval = setInterval(update, 10_000)
    return () => clearInterval(interval)
  }, [dateStr])
  return <span>{text}</span>
}

// ============================================
// Loading screen
// ============================================

function TrackLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <NoiseTexture opacity={0.02} />
      <MorphingBlob className="-left-32 top-1/3" color="rgba(239, 68, 68, 0.04)" size={350} />
      <MorphingBlob className="-right-32 bottom-1/3" color="rgba(239, 68, 68, 0.03)" size={300} />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-7 w-7 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl" />
        </div>
        <div className="flex flex-col items-center gap-2.5 w-48">
          <Shimmer className="h-3 w-40 rounded-lg" />
          <Shimmer className="h-2 w-28 rounded-lg" />
        </div>
        <p className="text-xs text-white/20 mt-4">A carregar dados da emergencia...</p>
      </div>
    </div>
  )
}

// ============================================
// Error / Not Found
// ============================================

function NotFoundState() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4">
      <NoiseTexture opacity={0.02} />
      <div className="relative z-10 text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06] mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-white/15" />
        </div>
        <h1 className="text-xl font-display font-bold text-white mb-3">Emergencia Nao Encontrada</h1>
        <p className="text-sm text-white/30 leading-relaxed">
          O link de emergencia que recebeu e invalido, expirou, ou a emergencia ja foi removida.
          Verifique com a pessoa que partilhou este link.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors"
        >
          <Shield className="h-4 w-4" />
          Ir para StatusAds Connect
        </a>
      </div>
    </div>
  )
}

// ============================================
// Resolved state
// ============================================

function ResolvedBanner({ data }: { data: PublicEmergencyData }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand/10 to-amber-900/20 border-b border-brand/15">
      <div className="px-4 md:px-6 py-4 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 shrink-0">
          <ShieldCheck className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-display font-bold text-white">Emergencia Resolvida</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {data.status === 'false_alarm'
              ? 'Esta emergencia foi marcada como falso alarme.'
              : 'A situacao foi resolvida com sucesso.'}
            {data.resolved_at && (
              <> Resolvida <RelativeTime dateStr={data.resolved_at} />.</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main tracking page
// ============================================

export default function TrackEmergency() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicEmergencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const fetchEmergency = useCallback(async () => {
    if (!token) return
    try {
      const { data: result, error: err } = await supabase
        .rpc('get_emergency_by_token', { p_token: token })
      if (err || !result || result.length === 0) {
        setError(true)
        setData(null)
      } else {
        const row = result[0]
        setData({
          id: row.id,
          latitude: row.latitude,
          longitude: row.longitude,
          contacts_notified: row.contacts_notified || [],
          created_at: row.created_at,
          resolved_at: row.resolved_at,
          status: row.status,
          full_name: (row as any).full_name ?? null,
          blood_type: (row as any).blood_type ?? null,
          allergies: (row as any).allergies ?? null,
          medications: (row as any).medications ?? null,
          medical_notes: (row as any).medical_notes ?? null,
        })
        setError(false)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Initial fetch + polling every 15s for active emergencies
  useEffect(() => {
    fetchEmergency()
  }, [fetchEmergency])

  useEffect(() => {
    if (!data || data.status !== 'active') {
      setElapsed(0)
      return
    }
    setElapsed(Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000))
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [data?.status, data?.created_at])

  // Poll for updates when active
  useEffect(() => {
    if (!data || data.status !== 'active') return
    const poll = setInterval(fetchEmergency, 15_000)
    return () => clearInterval(poll)
  }, [data?.status, fetchEmergency])

  const mapCenter: [number, number] = useMemo(() => {
    if (data) return [data.latitude, data.longitude]
    return [-25.9692, 32.5732]
  }, [data])

  const formatElapsed = (s: number) => {
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (loading) return <TrackLoading />
  if (error || !data) return <NotFoundState />

  const isActive = data.status === 'active'
  const googleMapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NoiseTexture opacity={0.01} />

      {/* Top bar with branding */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-6 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20">
            <Shield className="h-4 w-4 text-brand" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">
            Status<span className="text-brand">Ads</span>
          </span>
          <span className="text-[10px] text-white/20 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] ml-1">
            Tracking Publico
          </span>
        </div>
        <Button
          onClick={fetchEmergency}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isActive && 'animate-spin')} style={isActive ? { animationDuration: '3s' } : {}} />
        </Button>
      </header>

      {/* Active Emergency Banner */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-red-950/80 to-red-900/40 border-b border-red-500/20"
        >
          <div className="absolute inset-0 bg-red-500/[0.03] animate-pulse" />
          <div className="relative px-4 md:px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
                    <ShieldAlert className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-red-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <h1 className="text-lg font-display font-bold text-white tracking-tight">Emergencia Activa</h1>
                  <p className="text-xs text-red-300/60 mt-0.5">
                    Detectada <RelativeTime dateStr={data.created_at} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 border border-red-500/15">
                <Clock className="h-3.5 w-3.5 text-red-400/60" />
                <span className="text-2xl font-mono font-bold text-white tabular-nums tracking-wider">
                  {formatElapsed(elapsed)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Resolved Banner */}
      {!isActive && <ResolvedBanner data={data} />}

      {/* Map */}
      <div className="flex-1 relative">
        <div className="h-[50vh] md:h-[60vh] relative z-10">
          <MapContainer center={mapCenter} zoom={16} className="h-full w-full" zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapController center={mapCenter} />
            <EmergencyMarker position={[data.latitude, data.longitude]} resolved={!isActive} />
          </MapContainer>
        </div>

        {/* Info cards overlaying bottom of map */}
        <div className="relative z-20 -mt-8 px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Coordinates */}
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-red-400/70" />
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Localizacao GPS</span>
              </div>
              <p className="text-sm font-mono text-white/80">
                {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
              </p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[10px] text-brand hover:text-brand-dark transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir no Google Maps
              </a>
            </div>

            {/* Contacts notified */}
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-blue-400/70" />
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Contactos</span>
              </div>
              <p className="text-2xl font-display font-bold text-white mb-1">
                {data.contacts_notified.length}
              </p>
              <p className="text-[10px] text-white/25">notificados automaticamente</p>
              {data.contacts_notified.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.contacts_notified.map((phone, i) => (
                    <span key={i} className="text-[10px] font-mono text-white/30 px-1.5 py-0.5 rounded-md bg-white/[0.03]">
                      {phone}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Time info */}
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-400/70" />
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Tempo</span>
              </div>
              <p className="text-sm text-white/70">
                Activada: {new Date(data.created_at).toLocaleString('pt-PT', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {data.resolved_at && (
                <p className="text-xs text-white/40 mt-1">
                  Resolvida: {new Date(data.resolved_at).toLocaleString('pt-PT', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Ficha médica — para socorristas */}
          {(data.blood_type || data.allergies || data.medications || data.medical_notes) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-[10px] font-semibold text-red-300/80 uppercase tracking-wider">
                  Ficha médica {data.full_name ? `— ${data.full_name}` : ''}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {data.blood_type && (
                  <div className="rounded-xl bg-black/25 border border-white/[0.04] px-3 py-2">
                    <p className="text-[9px] text-white/25 uppercase">Tipo sanguíneo</p>
                    <p className="text-sm font-bold text-white">{data.blood_type}</p>
                  </div>
                )}
                {data.allergies && (
                  <div className="rounded-xl bg-black/25 border border-white/[0.04] px-3 py-2">
                    <p className="text-[9px] text-white/25 uppercase">Alergias</p>
                    <p className="text-xs text-white/80">{data.allergies}</p>
                  </div>
                )}
                {data.medications && (
                  <div className="rounded-xl bg-black/25 border border-white/[0.04] px-3 py-2">
                    <p className="text-[9px] text-white/25 uppercase">Medicação</p>
                    <p className="text-xs text-white/80">{data.medications}</p>
                  </div>
                )}
                {data.medical_notes && (
                  <div className="rounded-xl bg-black/25 border border-white/[0.04] px-3 py-2 sm:col-span-2">
                    <p className="text-[9px] text-white/25 uppercase">Notas médicas</p>
                    <p className="text-xs text-white/80">{data.medical_notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 md:px-6 py-6 border-t border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[10px] text-white/20">
            StatusAds Connect — Sistema de seguranca pessoal. Este link e temporario e pode ser desactivado pelo utilizador.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-white/15">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              isActive ? 'bg-red-500 animate-pulse' : 'bg-brand'
            )} />
            {isActive ? 'Emergencia activa' : 'Emergencia encerrada'}
            {isActive && ' — Dados actualizados automaticamente'}
          </div>
        </div>
      </footer>
    </div>
  )
}