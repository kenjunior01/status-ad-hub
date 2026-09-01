/**
 * CommunityRadar — Página do Radar de Segurança Comunitária.
 * 
 * Mapa com alertas anónimos de segurança, filtros por tipo,
 * publicar novo alerta, e detalhes de cada alerta.
 */

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet'
import {
  Radar, AlertTriangle, ShieldCheck, ShieldX, Eye, Plus, X,
  MapPin, Clock, Users, Filter, ChevronDown, Send, Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommunityRadar } from '@/hooks/useCommunityRadar'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SpotlightCard } from '@/components/effects'
import type { CommunityAlert } from '@/lib/types'

function MapController() {
  const map = useMap()
  setTimeout(() => map.invalidateSize(), 100)
  return null
}

function createAlertIcon(type: CommunityAlert['type'], isVerified: boolean): L.DivIcon {
  const colors: Record<string, string> = {
    danger_zone: isVerified ? '#EF4444' : '#F97316',
    suspicious_activity: '#F59E0B',
    verified_incident: '#EF4444',
    safe_route_tip: '#25D366',
  }
  const color = colors[type] || '#6B7280'

  const html = `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">` +
    `<div style="position:absolute;width:28px;height:28px;border-radius:50%;background:${color}33;animation:pulse-ring 2s infinite;"></div>` +
    (isVerified ? `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:#25D366;border:2px solid #0A0F1A;"></div>` : '') +
    `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid rgba(10,15,26,0.8);box-shadow:0 0 12px ${color}66;z-index:2;position:relative;"></div></div>` +
    `<style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>`

  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

const typeConfig: Record<CommunityAlert['type'], { label: string; icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  danger_zone: { label: 'Zona de Perigo', icon: ShieldX, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  suspicious_activity: { label: 'Actividade Suspeita', icon: Eye, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  verified_incident: { label: 'Incidente Verificado', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  safe_route_tip: { label: 'Dica de Rota Segura', icon: ShieldCheck, color: 'text-green-400', bgColor: 'bg-green-500/10' },
}

export default function CommunityRadar() {
  const { alerts, isLoading, radiusKm, setRadiusKm, filter, setFilter, postAlert, dangerZoneCount } = useCommunityRadar()
  const { position } = useGeolocation()
  const [showPostForm, setShowPostForm] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert | null>(null)
  const [postType, setPostType] = useState<CommunityAlert['type']>('suspicious_activity')
  const [postTitle, setPostTitle] = useState('')
  const [postDesc, setPostDesc] = useState('')

  const userPos: [number, number] = position
    ? [position.latitude, position.longitude]
    : [-25.9692, 32.5732]

  const filters: { value: CommunityAlert['type'] | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'danger_zone', label: 'Zona Perigo' },
    { value: 'suspicious_activity', label: 'Suspeita' },
    { value: 'verified_incident', label: 'Verificado' },
    { value: 'safe_route_tip', label: 'Rota Segura' },
  ]

  const handlePost = async () => {
    if (!postTitle.trim() || !position) return
    await postAlert({
      type: postType,
      title: postTitle.trim(),
      description: postDesc.trim(),
      latitude: position.latitude,
      longitude: position.longitude,
      radiusMeters: 500,
    })
    setPostTitle('')
    setPostDesc('')
    setShowPostForm(false)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'agora mesmo'
    if (mins < 60) return `ha ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `ha ${hours}h`
    return `ha ${Math.floor(hours / 24)}d`
  }

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-teal-400" />
            Radar Comunitário
          </h1>
          <p className="text-white/40 text-sm mt-1">Alertas de segurança anónimos na sua área ({radiusKm}km)</p>
        </div>
        <Button
          onClick={() => setShowPostForm(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Reportar
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              filter === f.value
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-white/10 h-[300px]">
        <MapContainer center={userPos} zoom={14} className="h-full w-full" attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController />
          {/* User position */}
          <Circle center={userPos} radius={radiusKm * 1000} pathOptions={{ color: '#25D366', fillColor: '#25D366', fillOpacity: 0.03, weight: 1, dashArray: '4 4' }} />
          {/* Alert markers */}
          {alerts.map(alert => (
            <div key={alert.id}>
              <Circle
                center={[alert.latitude, alert.longitude]}
                radius={alert.radius_meters}
                pathOptions={{
                  color: typeConfig[alert.type]?.color === 'text-red-400' || typeConfig[alert.type]?.color === 'text-red-500'
                    ? '#EF4444' : alert.type === 'safe_route_tip' ? '#25D366' : '#F59E0B',
                  fillColor: alert.type === 'danger_zone' || alert.type === 'verified_incident' ? '#EF4444' : '#F59E0B',
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              />
              <Marker
                position={[alert.latitude, alert.longitude]}
                icon={createAlertIcon(alert.type, alert.is_verified)}
                eventHandlers={{ click: () => setSelectedAlert(alert) }}
              />
            </div>
          ))}
        </MapContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{alerts.length}</div>
          <div className="text-white/40 text-xs mt-0.5">Alertas na área</div>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{dangerZoneCount}</div>
          <div className="text-white/40 text-xs mt-0.5">Zonas de perigo</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{alerts.filter(a => a.is_verified).length}</div>
          <div className="text-white/40 text-xs mt-0.5">Verificados</div>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="text-center py-12 text-white/20">
          <Radar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div>Nenhum alerta na sua área</div>
          <div className="text-xs mt-1">A sua área está limpa de relatórios recentes</div>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const cfg = typeConfig[alert.type]
            return (
              <motion.div
                key={alert.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedAlert(alert)}
                className={cn('rounded-xl border p-3 cursor-pointer transition-colors hover:brightness-110', cfg.bgColor, 'border-white/[0.06]')}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-1.5 rounded-lg', cfg.bgColor)}>
                    <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{alert.title}</span>
                      {alert.is_verified && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">VERIFICADO</span>
                      )}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5 truncate">{alert.description}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-white/25 text-[10px]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(alert.created_at)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{alert.report_count} reporte(s)</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(alert.radius_meters / 1000).toFixed(1)}km</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Post Alert Modal */}
      <AnimatePresence>
        {showPostForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowPostForm(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-[#1F2937] rounded-2xl p-5 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Reportar Alerta</h3>
                <button onClick={() => setShowPostForm(false)}><X className="w-5 h-5 text-white/40" /></button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  {(Object.keys(typeConfig) as CommunityAlert['type'][]).map(t => (
                    <button
                      key={t}
                      onClick={() => setPostType(t)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-[10px] font-medium transition',
                        postType === t ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-white/5 text-white/40 border border-white/10'
                      )}
                    >
                      {typeConfig[t].label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <Input
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="Título do alerta..."
                  className="bg-white/5 border-white/10 text-white"
                />

                <textarea
                  value={postDesc}
                  onChange={e => setPostDesc(e.target.value)}
                  placeholder="Descrição (opcional)..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                />

                <div className="flex items-center gap-2 text-white/30 text-xs">
                  <Eye className="w-3 h-3" />
                  O seu alerta será 100% anónimo
                </div>

                <Button
                  onClick={handlePost}
                  disabled={!postTitle.trim()}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Alerta Anónimo
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedAlert(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-[#1F2937] rounded-2xl p-5 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => { const I = typeConfig[selectedAlert.type].icon; return <I className={cn('w-5 h-5', typeConfig[selectedAlert.type].color)} /> })()}
                  <span className="text-white font-semibold">{selectedAlert.title}</span>
                </div>
                <button onClick={() => setSelectedAlert(null)}><X className="w-5 h-5 text-white/40" /></button>
              </div>
              <p className="text-white/60 text-sm mb-3">{selectedAlert.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/60">Tipo:</span> {typeConfig[selectedAlert.type].label}</div>
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/60">Raio:</span> {selectedAlert.radius_meters}m</div>
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/60">Reportes:</span> {selectedAlert.report_count}</div>
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/60">Status:</span> {selectedAlert.is_verified ? 'Verificado' : 'Pendente'}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
