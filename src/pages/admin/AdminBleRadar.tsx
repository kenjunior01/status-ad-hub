/**
 * AdminBleRadar — RASTROS BLE dos utilizadores (v3.15.0).
 *
 * O admin vê o "Quem/Onde/Quando" capturado pelo Radar Bluetooth de cada
 * utilizador: pontos GPS com os dispositivos próximos (MAC real, nome,
 * fabricante, tipo e sinal). Quando o rastro está ligado a um SOS activo,
 * fica marcado em vermelho — é a pista digital para investigação/localização.
 */

import { useState } from 'react'
import {
  Radar, Loader2, MapPin, Clock, Navigation, Siren, ChevronDown,
  ChevronUp, Bluetooth, User, Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminBleTrails } from '@/hooks/useAdmin'
import { formatDateTime } from '@/lib/payments'
import { cn } from '@/lib/utils'

export default function AdminBleRadar() {
  const { data: trails = [], isLoading } = useAdminBleTrails()
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = trails.filter((t) => {
    if (!q.trim()) return true
    const needle = q.toLowerCase()
    return (
      (t.user_name || '').toLowerCase().includes(needle) ||
      (t.user_email || '').toLowerCase().includes(needle)
    )
  })

  const linkedToSos = trails.filter((t) => !!t.sos_alert_id).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Radar className="h-4.5 w-4.5 text-brand" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-white">Rastros Bluetooth (Radar)</p>
            <p className="text-[10px] text-white/30">
              {trails.length} rastro(s) · {linkedToSos} ligado(s) a SOS
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar utilizador…"
            className="pl-8 h-8 text-[11px] bg-white/[0.03] border-white/[0.06] rounded-lg"
          />
        </div>
      </div>

      {isLoading && (
        <div className="py-10 text-center">
          <Loader2 className="h-5 w-5 text-brand animate-spin mx-auto" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-10 text-center">
          <Bluetooth className="h-6 w-6 text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/25">
            Nenhum rastro ainda. Os utilizadores geram rastros com o Radar Bluetooth
            ligado ou ao disparar o SOS.
          </p>
        </div>
      )}

      {/* Lista de rastros */}
      {filtered.map((t) => {
        const isOpen = expanded === t.id
        const hasSos = !!t.sos_alert_id
        return (
          <div
            key={t.id}
            className={cn(
              'rounded-2xl border overflow-hidden',
              hasSos ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
            )}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : t.id)}
              className="w-full px-5 py-3.5 flex items-center gap-3 text-left"
            >
              {hasSos ? (
                <Siren className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
              ) : (
                <Bluetooth className="h-4 w-4 text-white/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white flex items-center gap-2 flex-wrap">
                  <User className="h-3 w-3 text-white/30" />
                  {t.user_name || t.user_email || 'Utilizador'}
                  {hasSos && (
                    <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/25">
                      ligado a SOS
                    </Badge>
                  )}
                </p>
                <p className="text-[10px] text-white/30">
                  {t.points.length} ponto(s) GPS · {t.device_count} detecções · {t.unique_devices} disp. únicos
                </p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-[10px] text-white/25">{formatDateTime(t.created_at)}</p>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
            </button>

            {isOpen && (
              <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                {t.points.length === 0 && (
                  <p className="px-5 py-4 text-[11px] text-white/25">Rastro sem pontos.</p>
                )}
                {[...t.points].reverse().map((p) => {
                  const hasGps = typeof p.lat === 'number' && typeof p.lng === 'number'
                  return (
                    <div key={p.t} className="px-5 py-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {hasGps ? (
                          <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-white/25 shrink-0" />
                        )}
                        <span className="text-[11px] text-white font-medium">
                          {new Date(p.t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-white/30 font-normal ml-1.5">
                            {new Date(p.t).toLocaleDateString('pt-PT')}
                          </span>
                        </span>
                        <span className="text-[10px] text-white/30">
                          {p.n ?? p.d?.length ?? 0} disp · {p.u ?? '-'} únicos
                          {hasGps ? ` · ${p.lat!.toFixed(5)}, ${p.lng!.toFixed(5)}` : ' · sem GPS'}
                        </span>
                        {hasGps && (
                          <Button size="sm" variant="ghost" asChild
                            className="h-6 px-2 text-[10px] text-brand hover:bg-brand/10 rounded-lg gap-1 ml-auto">
                            <a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">
                              <Navigation className="h-3 w-3" /> Mapa
                            </a>
                          </Button>
                        )}
                      </div>
                      {/* dispositivos do ponto */}
                      {(p.d || []).length > 0 && (
                        <div className="mt-2 rounded-xl bg-black/25 border border-white/[0.04] divide-y divide-white/[0.03]">
                          {[...(p.d || [])].sort((a, b) => (b.r ?? -127) - (a.r ?? -127)).map((d) => (
                            <div key={d.mac + p.t} className="px-3 py-1.5 flex items-center gap-2 text-[10px] flex-wrap">
                              <span className="font-mono text-white/40">{d.mac}</span>
                              <span className="text-white/70 font-medium">{d.n || d.k || 'sem nome'}</span>
                              {d.k && d.k !== d.n && (
                                <Badge variant="outline" className="text-[8px] text-white/40 border-white/10">{d.k}</Badge>
                              )}
                              {d.mf && <span className="text-white/25">· {d.mf}</span>}
                              <span className={cn('ml-auto font-mono', d.r >= -65 ? 'text-emerald-400' : d.r >= -80 ? 'text-amber-400' : 'text-white/30')}>
                                {d.r} dBm
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
