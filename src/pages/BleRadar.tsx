/**
 * BleRadar — RADAR BLUETOOTH SEM EMPARELHAR (v3.15.0).
 *
 * Puxa TODA a informação dos dispositivos Bluetooth próximos SEM emparelhar:
 * MAC real, nome, sinal (distância aproximada), fabricante e tipo
 * (Telemóvel, Carro, AirTag...). Dois usos:
 *
 *  1. RADAR — varredura pontual para ver o que anda ao seu redor AGORA.
 *  2. RASTRO — captura automática de pontos GPS + dispositivos; no SOS a
 *     trilha "Quem/Onde/Quando" sai por SMS + email + nuvem e ajuda a
 *     localizar/reconstituir o percurso se algo acontecer.
 *
 * É o diferenciador SaaS da StatusAds: transformar os Bluetooth das
 * redondezas (que TODOS os telemóveis e carros emitem) numa rede passiva
 * de segurança — sem precisar de hardware extra nem de que os outros
 * instalem a app.
 */

import { useState } from 'react'
import {
  Radar, Play, Square, Trash2, CloudUpload, Satellite, MapPin,
  Smartphone, Car, Headphones, Watch, Navigation, Info, ShieldAlert,
  Bluetooth, BluetoothOff, Activity, ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useBleRadar } from '@/hooks/useBleRadar'
import { useAuth } from '@/hooks/useAuth'
import { saveBleTrail } from '@/lib/api'
import { rssiBars, distanceLabel } from '@/lib/ble-radar'
import type { BleRadarDevice, BleTrailPoint } from '@/lib/ble-radar'
import { toast } from 'sonner'

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
]

function kindIcon(kind?: string) {
  const k = kind || ''
  if (k.includes('Telemóvel')) return Smartphone
  if (k.includes('Carro')) return Car
  if (k.includes('Auscult')) return Headphones
  if (k.includes('Relógio') || k.includes('Banda')) return Watch
  if (k.includes('Localizador')) return MapPin
  return Bluetooth
}

function SignalBars({ rssi }: { rssi: number }) {
  const bars = rssiBars(rssi)
  return (
    <span className="flex items-end gap-[2px] h-3.5" aria-label={`sinal ${bars}/4`}>
      {[4, 7, 10, 13].map((h, i) => (
        <span
          key={i}
          style={{ height: h }}
          className={cn(
            'w-[3px] rounded-sm transition-colors',
            i < bars ? (bars >= 3 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-white/10'
          )}
        />
      ))}
    </span>
  )
}

export default function BleRadar() {
  const {
    available, permissions, scanning, devices, trailRunning, trail,
    trailIntervalSec, lastError, scan, startTrail, stopTrail, clearTrail, requestPerms, refresh,
  } = useBleRadar()
  const { user } = useAuth()
  const [intervalSel, setIntervalSel] = useState(trailIntervalSec)
  const [syncing, setSyncing] = useState(false)
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null)

  const needsPerms = available && permissions && (!permissions.granted || !permissions.btEnabled)

  const handleScan = () => {
    if (needsPerms) {
      requestPerms().then(() => refresh())
      return
    }
    scan(4000)
  }

  const handleTrailToggle = async (on: boolean) => {
    if (on) {
      if (needsPerms) {
        await requestPerms()
        await refresh()
        return
      }
      const ok = await startTrail(intervalSel)
      if (ok) {
        toast.success('Rastro BLE activo', {
          description: `A cada ${intervalSel < 60 ? `${intervalSel}s` : `${intervalSel / 60} min`} é capturado um ponto GPS + os dispositivos por perto.`,
        })
      }
    } else {
      await stopTrail()
      toast.info('Rastro BLE desligado')
    }
  }

  const handleSync = async () => {
    if (!user || trail.length === 0) return
    setSyncing(true)
    try {
      await saveBleTrail(user.id, trail.slice(-20), null)
      toast.success('Rastro guardado na nuvem', { description: 'Disponível no Painel Admin mesmo que o telemóvel se perca.' })
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncing(false)
    }
  }

  const totalObs = trail.reduce((acc, p) => acc + (p.n || 0), 0)
  const uniqueMacs = new Set(trail.flatMap((p) => (p.d || []).map((d) => d.mac))).size

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-brand" />
            Radar Bluetooth
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Vê e guarda TODOS os dispositivos próximos — sem emparelhar
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border',
            available
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}
        >
          {available ? 'NATIVO ACTIVO' : 'SÓ NA APP (APK)'}
        </span>
      </div>

      {!available && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 flex gap-3">
          <BluetoothOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[13px] text-white/50 leading-relaxed">
            <p className="font-semibold text-amber-300 mb-1">Disponível na app Android (APK)</p>
            O navegador não permite scan Bluetooth sem emparelhar. Instale o APK
            StatusAds para ligar o Radar completo: MAC real, fabricante, distância e
            rastro automático com GPS.
          </div>
        </div>
      )}

      {/* Permissões */}
      {needsPerms && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300 mb-1">
              {permissions && !permissions.btEnabled ? 'Bluetooth desligado' : 'Permissões em falta'}
            </p>
            <p className="text-[12px] text-white/40 mb-2.5">
              O Radar precisa de Bluetooth e Localização (o Android exige para ver
              dispositivos próximos). Nada é partilhado sem o seu SOS.
            </p>
            <Button size="sm" onClick={() => requestPerms().then(() => refresh())}
              className="h-8 px-3 text-[11px] bg-brand hover:bg-brand/90 text-white rounded-lg">
              Conceder permissões
            </Button>
          </div>
        </div>
      )}

      {/* Explicação (valor SaaS) */}
      <div className="rounded-2xl border border-brand/15 bg-brand/[0.03] p-4 flex gap-3">
        <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <div className="text-[12px] text-white/45 leading-relaxed">
          <p className="font-semibold text-white/70 mb-1">Como ajuda a encontrar alguém</p>
          Todo telemóvel, carro e auscultador emite Bluetooth constantemente. O Radar
          guarda <span className="text-white/70">quem estava perto</span> (MAC + nome +
          fabricante) e <span className="text-white/70">onde/quando</span> (pontos GPS).
          Num sequestro ou roubo, esta trilha digital sai com o SOS e a polícia usa os
          MACs/fabricantes para seguir o rasto — mesmo que o telemóvel da vítima seja
          apagado.
        </div>
      </div>

      {/* Radar pontual */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center border',
            scanning ? 'bg-brand/15 border-brand/30' : 'bg-white/[0.03] border-white/[0.06]'
          )}>
            <motion.div animate={scanning ? { rotate: 360 } : { rotate: 0 }}
              transition={scanning ? { repeat: Infinity, duration: 1.2, ease: 'linear' } : { duration: 0.3 }}>
              <Radar className={cn('h-4.5 w-4.5', scanning ? 'text-brand' : 'text-white/50')} />
            </motion.div>
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-white">Varredura agora</p>
            <p className="text-[11px] text-white/30">
              {scanning ? 'A escanear 4 segundos…' : `${devices.length} dispositivo(s) na última varredura`}
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={!available || scanning}
            className={cn(
              'h-9 px-4 text-[12px] rounded-xl gap-1.5 font-semibold',
              scanning ? 'bg-white/10 text-white/40' : 'bg-brand hover:bg-brand/90 text-white'
            )}
          >
            <Play className="h-3.5 w-3.5" />
            {scanning ? 'A escanear' : 'Escanear'}
          </Button>
        </div>

        {/* Lista de dispositivos ao vivo */}
        <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
          {devices.length === 0 && !scanning && (
            <p className="px-5 py-8 text-center text-xs text-white/25">
              Toque em "Escanear" para ver os dispositivos Bluetooth à sua volta
            </p>
          )}
          {devices.length === 0 && scanning && (
            <p className="px-5 py-8 text-center text-xs text-white/40 animate-pulse">
              <Activity className="h-4 w-4 inline mr-1.5 text-brand" />
              À escuta de sinais Bluetooth…
            </p>
          )}
          {devices.map((d) => (
            <DeviceRow key={d.mac} device={d} />
          ))}
        </div>
      </div>

      {/* Rastro automático */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center border',
            trailRunning ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.03] border-white/[0.06]'
          )}>
            <Satellite className={cn('h-4.5 w-4.5', trailRunning ? 'text-emerald-400' : 'text-white/50')} />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-white">Rastro automático</p>
            <p className="text-[11px] text-white/30">
              {trailRunning ? 'A gravar onde/quem — sai com o SOS' : 'Grava pontos GPS + dispositivos continuamente'}
            </p>
          </div>
          <Switch checked={trailRunning} onCheckedChange={handleTrailToggle} disabled={!available} />
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* intervalo */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Intervalo de captura</p>
            <div className="flex gap-2 flex-wrap">
              {INTERVALS.map((iv) => (
                <button
                  key={iv.value}
                  onClick={() => {
                    setIntervalSel(iv.value)
                    if (trailRunning) startTrail(iv.value)
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-medium border transition',
                    intervalSel === iv.value
                      ? 'bg-brand/15 text-brand border-brand/30'
                      : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60'
                  )}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>

          {/* estatísticas do rastro */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-white leading-none">{trail.length}</p>
              <p className="text-[10px] text-white/30 mt-1">pontos GPS</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-white leading-none">{totalObs}</p>
              <p className="text-[10px] text-white/30 mt-1">detecções</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-brand leading-none">{uniqueMacs}</p>
              <p className="text-[10px] text-white/30 mt-1">disp. únicos</p>
            </div>
          </div>

          {/* acções */}
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={handleSync}
              disabled={!available || syncing || trail.length === 0}
              className="flex-1 h-9 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-xl gap-1.5 border border-white/[0.06]"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              {syncing ? 'A sincronizar…' : 'Guardar na nuvem'}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { clearTrail(); toast.info('Rastro apagado') }}
              disabled={!available || trail.length === 0}
              className="h-9 px-3 text-[11px] text-red-400/70 hover:bg-red-500/10 rounded-xl gap-1.5 border border-red-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </Button>
          </div>

          {lastError && (
            <p className="text-[11px] text-red-400/80">{lastError}</p>
          )}
        </div>

        {/* lista de pontos do rastro */}
        {trail.length > 0 && (
          <div className="divide-y divide-white/[0.04]">
            {[...trail].reverse().slice(0, 12).map((p, idx) => (
              <TrailPointRow
                key={p.t}
                point={p}
                expanded={expandedPoint === p.t}
                onToggle={() => setExpandedPoint(expandedPoint === p.t ? null : p.t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeviceRow({ device: d }: { device: BleRadarDevice }) {
  const Icon = kindIcon(d.k)
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">
          {d.n || d.k || 'Dispositivo sem nome'}
        </p>
        <p className="text-[10px] text-white/30 font-mono truncate">
          {d.mac}
          {d.k && d.n ? ` · ${d.k}` : ''}
          {d.mf ? ` · ${d.mf}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <SignalBars rssi={d.r} />
        <p className="text-[9px] text-white/25 mt-0.5">{distanceLabel(d.r, d.tx)}</p>
      </div>
    </div>
  )
}

function TrailPointRow({ point: p, expanded, onToggle }: {
  point: BleTrailPoint
  expanded: boolean
  onToggle: () => void
}) {
  const hasGps = typeof p.lat === 'number' && typeof p.lng === 'number'
  return (
    <div>
      <button onClick={onToggle} className="w-full px-5 py-3 flex items-center gap-3 text-left">
        {hasGps ? <MapPin className="h-4 w-4 text-brand shrink-0" /> : <Clock className="h-4 w-4 text-white/25 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium">
            {new Date(p.t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            <span className="text-white/30 font-normal ml-2">{new Date(p.t).toLocaleDateString('pt-PT')}</span>
          </p>
          <p className="text-[10px] text-white/30 truncate">
            {p.n} dispositivo(s) · {p.u} únicos
            {hasGps ? ` · ${p.lat!.toFixed(4)}, ${p.lng!.toFixed(4)}` : ' · sem GPS'}
          </p>
        </div>
        {hasGps && (
          <a
            href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
            target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06]"
            aria-label="Abrir no mapa"
          >
            <Navigation className="h-3.5 w-3.5 text-brand" />
          </a>
        )}
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {expanded && (p.d || []).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/20"
          >
            <div className="px-5 py-2 divide-y divide-white/[0.03]">
              {[...(p.d || [])].sort((a, b) => (b.r ?? -127) - (a.r ?? -127)).slice(0, 10).map((d) => (
                <div key={d.mac} className="py-1.5 flex items-center gap-2 text-[10px]">
                  <SignalBars rssi={d.r} />
                  <span className="text-white/60 truncate flex-1">{d.n || d.k || 'sem nome'}</span>
                  <span className="text-white/25 font-mono">{d.mac}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
