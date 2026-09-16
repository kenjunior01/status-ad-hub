/**
 * TacticalNetRadar — RADAR DE REDES com design EXCLUSIVO da versão APK
 * (v3.16.0, inteligência v3.18.0).
 *
 * Estética militar/sonar única: verde-radar + ciano sobre carvão, tipografia
 * mono, brackets de canto, varrimento de radar em tempo real e linha de
 * scan. Só renderiza quando a app corre nativa (Capacitor Android) — a
 * versão web usa o design dourado padrão da StatusAds.
 *
 * Funcionalidade completa:
 *  · Scan Wi-Fi pontual — TODAS as redes próximas SEM se ligar
 *  · Análise de segurança: abertas, WEP/WPA, evil twins, honeypots, novas
 *  · Operadora + torres celulares visíveis (testemunhas GSM/LTE/5G)
 *  · Registo persistente de todas as redes já vistas (1.ª/última vez)
 *  · Rastro automático GPS + redes (sai com o SOS e sincroniza na nuvem)
 *  · Testemunhas BLE integradas (mesmo motor do Radar Bluetooth)
 *  · v3.18: congestionamento de canais, fabricante por OUI, classificação
 *    de redes e perfil do local por impressão digital de BSSIDs
 */

import { useCallback, useRef, useState } from 'react'
import {
  Radar, Play, Square, Trash2, CloudUpload, Satellite, Wifi, WifiOff,
  ChevronDown, ChevronUp, MapPin, Clock, AlertTriangle, Radio, Signal,
  Bluetooth, ScanLine, ShieldAlert, CircleDashed, Download, History, Search, SearchX,
  BarChart3, Fingerprint, Copy, Share2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useAuth } from '@/hooks/useAuth'
import { saveNetTrail, saveBleTrail, saveWifiRegistry } from '@/lib/api'
import { exportWifiRegistry } from '@/lib/export-data'
import {
  securityLevel, wifiDistanceLabel, wifiRssiBars, wifiRssiToMeters,
  bleScanNowSafe, type BleQuickDevice,
} from './net-shared'
import type { WifiRadarNetwork, WifiRegistryEntry, NetTrailPoint } from '@/lib/net-radar'
import { wifiRemoveEntry } from '@/lib/net-radar'
import {
  analyzeChannelCongestion, classifyWifiNetwork, wifiVendor, topChannels,
  getKnownPlaces, getPlaceState,
  type ChannelCongestion,
} from '@/lib/net-intel'
import { toast } from 'sonner'
import { PullToRefresh } from '@/components/native/PullToRefresh'
import { RadarSkeleton } from '@/components/net/RadarSkeleton'
import { useLongPress } from '@/components/native/native-gestures'
import { haptic, nativeShare, copyText } from '@/lib/native'

const INTERVALS = [
  { value: 30, label: '30S' },
  { value: 60, label: '1M' },
  { value: 120, label: '2M' },
  { value: 300, label: '5M' },
]

function riskLabel(score: number): { text: string; color: string } {
  if (score >= 75) return { text: 'CRÍTICO', color: '#f87171' }
  if (score >= 50) return { text: 'ELEVADO', color: '#fb923c' }
  if (score >= 25) return { text: 'MODERADO', color: '#fbbf24' }
  return { text: 'BAIXO', color: '#34d399' }
}

function securityBadgeClass(sec: string): string {
  const lvl = securityLevel(sec)
  if (lvl === 0) return 'tac-badge tac-badge-danger'
  if (lvl === 1) return 'tac-badge tac-badge-danger'
  if (lvl === 2) return 'tac-badge tac-badge-warn'
  if (lvl === 3) return 'tac-badge tac-badge-ok'
  return 'tac-badge tac-badge-good'
}

function TacBars({ rssi }: { rssi: number }) {
  const bars = wifiRssiBars(rssi)
  return (
    <span className="flex items-end gap-[2px] h-3" aria-label={`sinal ${bars}/4`}>
      {[3, 5, 8, 11].map((h, i) => (
        <span
          key={i}
          style={{ height: h, background: i < bars ? (bars >= 3 ? '#34d399' : '#fbbf24') : 'rgba(52,211,153,0.12)' }}
          className="w-[3px] rounded-sm"
        />
      ))}
    </span>
  )
}

export default function TacticalNetRadar() {
  const {
    permissions, scanning, networks, registry, threats, riskScore, environment,
    trailRunning, trail, trailIntervalSec, lastError,
    scan, startTrail, stopTrail, clearTrail, clearRegistry, requestPerms, refresh,
  } = useNetRadar()
  const { user } = useAuth()
  const [intervalSel, setIntervalSel] = useState(trailIntervalSec)
  const [syncing, setSyncing] = useState(false)
  const [bleScanning, setBleScanning] = useState(false)
  const [bleDevices, setBleDevices] = useState<BleQuickDevice[]>([])
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null)

  const needsPerms = permissions && (!permissions.granted || !permissions.wifiEnabled)
  const risk = riskLabel(riskScore)
  const uniqueBssids = new Set(networks.map((n) => n.bssid)).size
  const towerCount = environment?.towers?.length ?? 0
  // v3.18.0 — inteligência do ambiente
  const congestion: ChannelCongestion | null = networks.length > 0 ? analyzeChannelCongestion(networks) : null
  const place = getPlaceState()
  const knownPlaces = getKnownPlaces()

  const handleTrailToggle = async (on: boolean) => {
    if (on) {
      if (needsPerms) {
        await requestPerms()
        await refresh()
        return
      }
      const ok = await startTrail(intervalSel)
      if (ok) {
        toast.success('RASTRO ACTIVO', {
          description: `Ponto GPS + redes a cada ${intervalSel < 60 ? `${intervalSel}s` : `${intervalSel / 60} min`}.`,
        })
      }
    } else {
      await stopTrail()
      toast.info('Rastro desligado')
    }
  }

  const handleSync = async () => {
    if (!user || trail.length === 0) return
    setSyncing(true)
    try {
      await saveNetTrail(user.id, trail.slice(-20), null, threats.length)
      if (bleDevices.length > 0) {
        await saveBleTrail(user.id, [{ t: Date.now(), n: bleDevices.length, u: bleDevices.length, d: bleDevices }], null).catch(() => {})
      }
      toast.success('SINCRONIZADO NA NUVEM', { description: 'Disponível no Painel Admin mesmo que o aparelho se perca.' })
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncing(false)
    }
  }

  const handleBleScan = async () => {
    if (bleScanning) return
    setBleScanning(true)
    try {
      const devs = await bleScanNowSafe(4000)
      setBleDevices(devs)
      if (devs.length === 0) toast.info('Sem dispositivos BLE detectados')
    } finally {
      setBleScanning(false)
    }
  }

  return (
    <PullToRefresh onRefresh={scan} className="tactical relative min-h-screen pb-10 -mx-4 px-4 sm:-mx-6 sm:px-6">
      {/* linha de scan global */}
      <div className="tac-scanline" />

      {/* ── Cabeçalho HUD ─────────────────────────────────────────── */}
      <div className="relative z-10 pt-2 flex items-start justify-between gap-3">
        <div>
          <p className="tac-label mb-1">Signal Surveillance Grid · v3.22</p>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radar className="w-5 h-5" style={{ color: 'var(--tac-green)' }} />
            <span className="tracking-[0.18em]">RADAR DE REDES</span>
          </h1>
        </div>
        <div className="tac-status-bar shrink-0 mt-1">
          <span className="tac-dot" />
          <span>{scanning ? 'SCANNING' : 'STANDBY'}</span>
        </div>
      </div>

      {/* ── Radar circular + métricas ────────────────────────────── */}
      <div className="relative z-10 mt-5 grid grid-cols-[auto_1fr] gap-4 items-center">
        <div className="relative h-32 w-32 shrink-0">
          <div className={cn('tac-sweep absolute inset-0', scanning && 'opacity-100')} />
          {!scanning && (
            <>
              <div className="tac-ping" />
              <div className="tac-ping" />
              <div className="tac-ping" />
            </>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tac-value text-3xl leading-none">{networks.length}</span>
            <span className="tac-label mt-1">redes vivas</span>
          </div>
          {/* blips das redes mais próximas */}
          {networks.slice(0, 5).map((n, i) => {
            const angle = (i * 72 + new Date().getSeconds() * 6) % 360
            const rad = (angle * Math.PI) / 180
            const dist = Math.min(Math.max((n.rssi + 95) / 50, 0.2), 0.9)
            const danger = securityLevel(n.sec) === 0
            return (
              <span
                key={n.bssid}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  left: `${50 + Math.cos(rad) * dist * 46}%`,
                  top: `${50 + Math.sin(rad) * dist * 46}%`,
                  background: danger ? '#f87171' : '#34d399',
                  boxShadow: `0 0 6px ${danger ? '#f87171' : '#34d399'}`,
                }}
              />
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="tac-panel px-3 py-2.5">
            <p className="tac-label">ameaças</p>
            <p className="tac-value text-2xl leading-tight" style={{ color: threats.length > 0 ? 'var(--tac-amber)' : undefined }}>
              {threats.length}
            </p>
          </div>
          <div className="tac-panel px-3 py-2.5">
            <p className="tac-label">registo</p>
            <p className="tac-value text-2xl leading-tight">{registry.length}</p>
          </div>
          <div className="tac-panel px-3 py-2.5">
            <p className="tac-label">bssid únicos</p>
            <p className="tac-value text-2xl leading-tight" style={{ color: 'var(--tac-cyan)' }}>{uniqueBssids}</p>
          </div>
          <div className="tac-panel px-3 py-2.5">
            <p className="tac-label">torres móveis</p>
            <p className="tac-value text-2xl leading-tight">{towerCount}</p>
          </div>
        </div>
      </div>

      {/* ── Medidor de risco ─────────────────────────────────────── */}
      <div className="relative z-10 mt-4 tac-panel px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="tac-label">índice de risco do ambiente</p>
          <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color: risk.color }}>{risk.text} · {riskScore}/100</p>
        </div>
        <div className="tac-meter">
          <div style={{ width: `${Math.max(riskScore, 3)}%`, background: risk.color }} />
        </div>
        {threats.length > 0 && (
          <div className="mt-3 space-y-2">
            {threats.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="tac-badge shrink-0 mt-0.5"
                  style={{
                    background: t.severity === 'high' ? 'rgba(248,113,113,0.15)' : t.severity === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(34,211,238,0.1)',
                    color: t.severity === 'high' ? '#fca5a5' : t.severity === 'medium' ? '#fcd34d' : '#67e8f9',
                    border: `1px solid ${t.severity === 'high' ? 'rgba(248,113,113,0.35)' : t.severity === 'medium' ? 'rgba(251,191,36,0.3)' : 'rgba(34,211,238,0.3)'}`,
                  }}
                >
                  {t.severity === 'high' ? 'ALTA' : t.severity === 'medium' ? 'MEDIA' : 'BAIXA'}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-50/90 leading-tight">{t.title}</p>
                  <p className="text-[10px] text-emerald-100/40 leading-snug mt-0.5">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Perfil do local (v3.18.0) ──────────────────────────── */}
      <div className="relative z-10 mt-4 tac-panel px-4 py-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-3.5 w-3.5" style={{ color: 'var(--tac-cyan)' }} />
          <p className="tac-label flex-1">perfil do local · impressão digital wi-fi</p>
          {place.current && (
            <span className="tac-badge" style={{
              background: place.current.seenCount > 1 ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.12)',
              color: place.current.seenCount > 1 ? '#6ee7b7' : '#fcd34d',
              border: `1px solid ${place.current.seenCount > 1 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
            }}>
              {place.current.seenCount > 1 ? 'HABITUAL' : 'NOVO'}
            </span>
          )}
        </div>
        {place.current ? (
          <>
            <div className="flex items-baseline gap-3 mt-2">
              <p className="tac-value text-xl" style={{ color: 'var(--tac-green)' }}>{place.current.label}</p>
              <p className="tac-label">{place.current.seenCount} visita(s) · {knownPlaces.length} local(is) conhecido(s)</p>
            </div>
            {place.current.sampleSsids.length > 0 && (
              <p className="text-[10px] text-emerald-100/40 font-mono mt-1 truncate">
                {place.current.sampleSsids.join(' · ')}
              </p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-emerald-100/30 mt-2 tracking-wider">
            SEM DADOS — ESCANEE PARA IDENTIFICAR O LOCAL PELO PADRÃO DE REDES
          </p>
        )}
      </div>

      {/* ── Congestionamento de canais (v3.18.0) ───────────────── */}
      <TacCongestionPanel congestion={congestion} />

      {/* ── Permissões ───────────────────────────────────────────── */}
      {needsPerms && (
        <div className="relative z-10 mt-4 tac-panel px-4 py-3 flex items-start gap-3" style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--tac-red)' }} />
          <div className="flex-1">
            <p className="text-[11px] font-bold tracking-wider" style={{ color: '#fca5a5' }}>
              {!permissions?.granted ? 'PERMISSÕES EM FALTA' : 'WI-FI DESLIGADO'}
            </p>
            <p className="text-[10px] text-emerald-100/40 mt-1 leading-snug">
              {!permissions?.granted
                ? 'Localização + Dispositivos próximos são exigidos pelo Android para ver redes. Nada sai do aparelho sem SOS.'
                : 'Active o Wi-Fi para o radar capturar o ambiente (não é preciso ligar-se a rede alguma).'}
            </p>
            {!permissions?.granted && (
              <button onClick={() => requestPerms().then(() => refresh())} className="tac-btn tac-btn-ghost mt-2">
                CONCEDER PERMISSÕES
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Acções: scan + ligação actual ────────────────────────── */}
      <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button onClick={scan} disabled={scanning} className="tac-btn flex items-center justify-center gap-2">
          {scanning ? <ScanLine className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {scanning ? 'A VARRER O ESPECTRO…' : 'ESCANEAR AGORA'}
        </button>
        <div className="tac-panel px-3 py-2 flex items-center gap-3">
          {environment?.wifi?.connected ? (
            <>
              <Wifi className="h-4 w-4" style={{ color: 'var(--tac-green)' }} />
              <div>
                <p className="tac-value text-[11px] leading-none">{environment.wifi.ssid}</p>
                <p className="tac-label mt-1">{environment.wifi.rssi ?? '?'} dBm · ligado</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" style={{ color: 'var(--tac-cyan)' }} />
              <div>
                <p className="tac-value text-[11px] leading-none">{environment?.online ? 'DADOS MÓVEIS' : 'OFFLINE'}</p>
                <p className="tac-label mt-1">{environment?.effectiveType?.toUpperCase() || '—'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Lista de redes ───────────────────────────────────────── */}
      <div className="relative z-10 mt-4 tac-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
          <Radio className="h-3.5 w-3.5" style={{ color: 'var(--tac-green)' }} />
          <p className="tac-label">espectro wi-fi · {networks.length} redes</p>
        </div>
        {networks.length === 0 && scanning && (
          <RadarSkeleton rows={6} variant="tac" />
        )}
        {networks.length === 0 && !scanning && (
          <p className="px-4 py-8 text-center text-[11px] text-emerald-100/30 tracking-wider">
            PRIMA ESCANEAR PARA MAPEAR O AMBIENTE
          </p>
        )}
        <div className="max-h-[380px] overflow-y-auto">
          {networks.map((n) => (
            <NetRow key={n.bssid} net={n} />
          ))}
        </div>
      </div>

      {/* ── Rede móvel (torres) ──────────────────────────────────── */}
      {towerCount > 0 && (
        <div className="relative z-10 mt-4 tac-panel overflow-hidden">
          <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
            <Signal className="h-3.5 w-3.5" style={{ color: 'var(--tac-cyan)' }} />
            <p className="tac-label">rede móvel · {environment?.operator || 'operadora'}</p>
          </div>
          <div className="px-4 py-1">
            {environment?.towers?.map((t, i) => (
              <div key={i} className="py-2 flex items-center gap-3 text-[10px] border-b last:border-b-0" style={{ borderColor: 'rgba(52,211,153,0.08)' }}>
                <span className="tac-badge tac-badge-ok">{t.type}</span>
                <span className="text-emerald-100/60 font-mono flex-1">
                  {t.type === '5G' ? `NCI ${t.nci ?? '—'}` : `CID ${t.cid ?? '—'}`}
                  {t.pci != null ? ` · PCI ${t.pci}` : ''}
                </span>
                <span className="text-emerald-100/40 font-mono">{t.dbm ?? '?'} dBm</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Testemunhas BLE ──────────────────────────────────────── */}
      <div className="relative z-10 mt-4 tac-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
          <Bluetooth className="h-3.5 w-3.5" style={{ color: 'var(--tac-cyan)' }} />
          <p className="tac-label">testemunhas bluetooth · {bleDevices.length}</p>
          <button
            onClick={handleBleScan}
            disabled={bleScanning}
            className="ml-auto text-[9px] font-bold tracking-[0.18em] px-2.5 py-1.5"
            style={{ color: 'var(--tac-cyan)', border: '1px solid var(--tac-line)', borderRadius: 3, opacity: bleScanning ? 0.5 : 1 }}
          >
            {bleScanning ? 'A ESCUTAR…' : 'CAPTURAR'}
          </button>
        </div>
        {bleDevices.length === 0 ? (
          <p className="px-4 py-4 text-center text-[10px] text-emerald-100/30 tracking-wider">
            CAPTURE OS DISPOSITIVOS BLE À SUA VOLTA (TELEMÓVEIS, CARROS, TAGS)
          </p>
        ) : (
          <div className="max-h-[220px] overflow-y-auto">
            {bleDevices.map((d) => (
              <div key={d.mac} className="tac-row">
                <TacBars rssi={d.r} />
                <span className="text-[11px] text-emerald-50/85 flex-1 truncate">{d.n || d.k || 'sem nome'}</span>
                <span className="text-[9px] text-emerald-100/35 font-mono">{d.mac}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rastro automático ────────────────────────────────────── */}
      <div className="relative z-10 mt-4 tac-panel overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <Satellite className="h-4 w-4" style={{ color: trailRunning ? 'var(--tac-green)' : 'rgba(52,211,153,0.4)' }} />
          <div className="flex-1">
            <p className="text-[11px] font-bold tracking-[0.14em] text-emerald-50/90">RASTRO AUTOMÁTICO</p>
            <p className="tac-label mt-0.5">{trailRunning ? 'A GRAVAR · SAI COM O SOS' : 'GPS + REDES CONTINUAMENTE'}</p>
          </div>
          <button
            onClick={() => handleTrailToggle(!trailRunning)}
            className={cn('tac-btn', trailRunning && 'tac-btn-ghost')}
            style={trailRunning ? { color: '#fca5a5', borderColor: 'rgba(248,113,113,0.35)' } : undefined}
          >
            {trailRunning ? <Square className="h-3 w-3 inline mr-1.5" /> : <Play className="h-3 w-3 inline mr-1.5" />}
            {trailRunning ? 'PARAR' : 'INICIAR'}
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1.5 mb-3">
            {INTERVALS.map((iv) => (
              <button
                key={iv.value}
                onClick={() => { setIntervalSel(iv.value); if (trailRunning) startTrail(iv.value) }}
                className={cn('tac-badge', intervalSel === iv.value ? 'tac-badge-good' : '')}
                style={intervalSel === iv.value ? {} : { background: 'rgba(52,211,153,0.05)', color: 'rgba(110,231,183,0.4)', border: '1px solid rgba(52,211,153,0.12)' }}
              >
                {iv.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing || trail.length === 0} className="tac-btn tac-btn-ghost flex-1 flex items-center justify-center gap-2">
              <CloudUpload className="h-3.5 w-3.5" />
              {syncing ? 'A SINCRONIZAR…' : 'SINCRONIZAR'}
            </button>
            <button
              onClick={() => { clearTrail(); toast.info('Rastro apagado') }}
              disabled={trail.length === 0}
              className="tac-btn tac-btn-ghost"
              style={{ color: '#fca5a5', borderColor: 'rgba(248,113,113,0.25)' }}
              title="Apagar rastro"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { clearRegistry(); toast.info('Registo de redes apagado') }}
              disabled={registry.length === 0}
              className="tac-btn tac-btn-ghost"
              style={{ color: '#fcd34d', borderColor: 'rgba(251,191,36,0.25)' }}
              title="Apagar registo de redes"
            >
              <CircleDashed className="h-3.5 w-3.5" />
            </button>
          </div>
          {lastError && <p className="text-[10px] mt-2" style={{ color: '#fca5a5' }}>{lastError}</p>}
        </div>

        {trail.length > 0 && (
          <div>
            {[...trail].reverse().slice(0, 10).map((p) => (
              <NetTrailRow
                key={p.t}
                point={p}
                expanded={expandedPoint === p.t}
                onToggle={() => setExpandedPoint(expandedPoint === p.t ? null : p.t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Registo de redes já vistas (v3.17.0) ─────────────────── */}
      <TacRegistryPanel registry={registry} onClear={() => { clearRegistry(); toast.info('Registo de redes apagado') }} />

      <p className="relative z-10 mt-5 text-center text-[9px] tracking-[0.25em] text-emerald-100/25">
        STATUSADS TACTICAL GRID · CAPTAÇÃO PASSIVA SEM LIGAÇÃO A REDES
      </p>
    </PullToRefresh>
  )
}

/** Painel tático do registo Wi-Fi: busca, filtro, exportação e nuvem (v3.17.0). */
function TacRegistryPanel({ registry, onClear }: {
  registry: WifiRegistryEntry[]
  onClear: () => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  // v3.22.0 — menu de contexto por linha (long-press) + esquecidas na sessão
  const [rowSheet, setRowSheet] = useState<WifiRegistryEntry | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const rowRef = useRef<WifiRegistryEntry | null>(null)
  const openRowSheet = useCallback(() => {
    const e = rowRef.current
    if (!e) return
    void haptic('medium')
    setRowSheet(e)
  }, [])
  const rowPress = useLongPress(openRowSheet)

  const q = query.trim().toLowerCase()
  const filtered = registry
    .filter((e) => !hidden.has((e.bssid || e.ssid).toLowerCase()))
    .filter((e) => !q || e.ssid?.toLowerCase().includes(q) || e.bssid?.toLowerCase().includes(q))
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 60)

  /** copia um campo da rede (v3.22.0) */
  const copyField = async (text: string | undefined, msg: string) => {
    if (!text) {
      toast.error('NADA PARA COPIAR')
      return
    }
    void haptic('light')
    const ok = await copyText(text)
    setRowSheet(null)
    if (ok) toast.success(msg, { description: text })
    else toast.error('FALHA AO COPIAR')
  }

  /** partilha os detalhes da rede (v3.22.0) */
  const shareEntry = async (e: WifiRegistryEntry) => {
    void haptic('light')
    const text = [
      `Rede Wi-Fi: ${e.ssid || '(sem nome)'}`,
      `BSSID: ${e.bssid || '?'}`,
      `Segurança: ${e.sec}`,
      `Vista ${e.seen}× · última vez ${new Date(e.lastSeen).toLocaleString('pt-PT')}`,
    ].join('\n')
    const shared = await nativeShare('Rede Wi-Fi registada', text)
    if (!shared) {
      const ok = await copyText(text)
      if (ok) toast.success('DETALHES COPIADOS')
      else toast.error('PARTILHA INDISPONÍVEL')
    }
    setRowSheet(null)
  }

  /** esquece a rede: some do histórico (v3.22.0) */
  const forgetEntry = async (e: WifiRegistryEntry) => {
    void haptic('medium')
    await wifiRemoveEntry(e.bssid, e.ssid)
    setHidden((prev) => new Set(prev).add((e.bssid || e.ssid).toLowerCase()))
    setRowSheet(null)
    toast.success(`REDE ESQUECIDA: ${e.ssid || e.bssid || '?'}`, {
      description: 'Deixou de aparecer no histórico deste dispositivo.',
    })
  }

  const handleSync = async () => {
    if (!user || registry.length === 0) return
    setSyncing(true)
    try {
      const n = await saveWifiRegistry(user.id, registry)
      toast.success(`NUVEM: ${n} REDES REGISTADAS`, { description: 'Histórico sobrevive à perda do aparelho.' })
    } catch {
      toast.error('FALHA NA SINCRONIZAÇÃO')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="tac-panel relative z-10 mt-4 overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--tac-line)' }}>
        <History className="h-4 w-4" style={{ color: 'var(--tac-green)' }} />
        <div className="flex-1 min-w-0">
          <p className="tac-value text-[13px] tracking-wider">REGISTO DE REDES · {registry.length}</p>
          <p className="tac-label">TODAS AS REDES JÁ CAPTURADAS · 1A/ULTIMA VEZ · GPS</p>
        </div>
        <button
          onClick={() => void exportWifiRegistry(registry, 'csv')}
          disabled={registry.length === 0}
          className="tac-btn tac-btn-ghost !px-2.5 !py-1.5"
          title="Exportar CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || !user || registry.length === 0}
          className="tac-btn tac-btn-ghost !px-2.5 !py-1.5"
          title="Sincronizar na nuvem"
        >
          {syncing ? <ScanLine className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onClear}
          disabled={registry.length === 0}
          className="tac-btn tac-btn-ghost !px-2.5 !py-1.5"
          style={{ color: '#fcd34d', borderColor: 'rgba(251,191,36,0.25)' }}
          title="Apagar registo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
        <Search className="h-3.5 w-3.5 opacity-30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="FILTRAR POR SSID OU BSSID…"
          className="flex-1 bg-transparent border-none outline-none text-[11px] tracking-wider text-emerald-50 placeholder:text-emerald-100/20 font-mono"
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] tracking-widest text-emerald-100/25 flex items-center justify-center gap-2">
            <SearchX className="h-3.5 w-3.5" />
            {registry.length === 0 ? 'SEM REDES REGISTADAS' : 'SEM CORRESPONDÊNCIAS'}
          </p>
        ) : filtered.map((e) => {
          const vendor = classifyWifiNetwork({ bssid: e.bssid, ssid: e.ssid, rssi: e.rssi ?? -100, freq: e.freq ?? 0, ch: 0, band: '', sec: e.sec }).vendor
          return (
            <div
              key={e.bssid || e.ssid}
              className="tac-row aegis-row-press"
              onPointerDown={(ev) => { rowRef.current = e; rowPress.onPointerDown(ev) }}
              onPointerMove={rowPress.onPointerMove}
              onPointerUp={rowPress.onPointerUp}
              onPointerCancel={rowPress.onPointerCancel}
              onPointerLeave={rowPress.onPointerLeave}
              aria-label={`Rede ${e.ssid} — manter premido para ações`}
            >
              <span className={securityBadgeClass(e.sec)}>{e.sec}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-emerald-50 truncate">{e.ssid}</p>
                <p className="text-[9px] text-emerald-100/30 font-mono truncate">
                  {e.bssid || 'BSSID ?'}
                  {vendor ? ` · ${vendor}` : ''}
                  {typeof e.lat === 'number' && typeof e.lng === 'number' ? ` · ${e.lat.toFixed(3)}, ${e.lng.toFixed(3)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="tac-value text-[12px]">{e.seen}×</p>
                <p className="text-[9px] text-emerald-100/25">{new Date(e.lastSeen).toLocaleDateString('pt-PT')}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* folha de contexto da rede (v3.22.0 — long-press numa linha) */}
      <AnimatePresence>
        {rowSheet && (
          <>
            <motion.div
              key="tac-row-sheet-bk"
              className="aegis-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRowSheet(null)}
            />
            <motion.div
              key="tac-row-sheet"
              className="aegis-sheet"
              role="menu"
              aria-label={`Rede ${rowSheet.ssid || 'sem nome'} — ações`}
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.55 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 550) {
                  void haptic('light')
                  setRowSheet(null)
                }
              }}
            >
              <div className="aegis-sheet-handle" />
              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-emerald-100/40 mb-2 px-4 truncate">
                ALVO · {rowSheet.ssid || 'SEM NOME'}
              </p>
              <button type="button" className="aegis-sheet-row" onClick={() => void copyField(rowSheet.ssid, 'SSID copiado')}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.10)' }}>
                  <Copy className="h-4.5 w-4.5" style={{ color: 'var(--tac-green, #34d399)' }} />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[13px] font-semibold text-white">Copiar SSID</span>
                  <span className="block text-[10.5px] text-white/40">Nome da rede para a área de transferência</span>
                </span>
              </button>
              <button type="button" className="aegis-sheet-row" onClick={() => void copyField(rowSheet.bssid, 'BSSID copiado')}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.04] border-white/[0.07]">
                  <Copy className="h-4.5 w-4.5 text-white/60" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[13px] font-semibold text-white">Copiar BSSID</span>
                  <span className="block text-[10.5px] text-white/40">Endereço físico do ponto de acesso</span>
                </span>
              </button>
              <button type="button" className="aegis-sheet-row" onClick={() => void shareEntry(rowSheet)}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.04] border-white/[0.07]">
                  <Share2 className="h-4.5 w-4.5 text-white/60" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[13px] font-semibold text-white">Partilhar ficha do alvo</span>
                  <span className="block text-[10.5px] text-white/40">SSID, BSSID, segurança e histórico</span>
                </span>
              </button>
              <button type="button" className="aegis-sheet-row" onClick={() => void forgetEntry(rowSheet)}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.10)' }}>
                  <Trash2 className="h-4.5 w-4.5 text-amber-400" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[13px] font-semibold text-white">Esquecer alvo</span>
                  <span className="block text-[10.5px] text-white/40">Remove do registo deste dispositivo</span>
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Linha de uma rede Wi-Fi (estilo tático). */
function NetRow({ net: n }: { net: WifiRadarNetwork }) {
  const lvl = securityLevel(n.sec)
  // v3.18.0 — fabricante + classificação
  const cls = classifyWifiNetwork(n)
  const vendor = cls.vendor || wifiVendor(n.bssid)
  return (
    <div className="tac-row">
      <TacBars rssi={n.rssi} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-bold text-emerald-50 truncate">{n.ssid}</p>
          <span className={securityBadgeClass(n.sec)}>{n.sec}</span>
          {cls.kind !== 'router' && cls.kind !== 'unknown' && (
            <span className="tac-badge" style={{ background: 'rgba(34,211,238,0.08)', color: '#67e8f9', border: '1px solid rgba(34,211,238,0.25)' }}>
              {cls.kind === 'hidden' ? 'OCULTA' : cls.kind === 'enterprise' ? 'ENTERPRISE' : cls.kind === 'hotspot' ? 'HOTSPOT' : 'MESH'}
            </span>
          )}
          {lvl === 0 && <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: 'var(--tac-red)' }} />}
        </div>
        <p className="text-[9px] text-emerald-100/35 font-mono mt-0.5 truncate">
          {n.bssid}{vendor ? ` · ${vendor}` : ''} · CH {n.ch} · {n.band} · {wifiRssiToMeters(n.rssi)}m
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-mono" style={{ color: lvl === 0 ? '#fca5a5' : '#6ee7b7' }}>{n.rssi} dBm</p>
        <p className="text-[8px] text-emerald-100/30">{wifiDistanceLabel(n.rssi)}</p>
      </div>
    </div>
  )
}

/** Linha de um ponto do rastro (estilo tático). */
function NetTrailRow({ point: p, expanded, onToggle }: {
  point: NetTrailPoint
  expanded: boolean
  onToggle: () => void
}) {
  const hasGps = typeof p.lat === 'number' && typeof p.lng === 'number'
  return (
    <div>
      <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-emerald-500/[0.03]">
        {hasGps
          ? <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--tac-green)' }} />
          : <Clock className="h-3.5 w-3.5 shrink-0 opacity-30" />}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-emerald-50/90 font-bold">
            {new Date(p.t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            <span className="opacity-40 font-normal ml-2">{new Date(p.t).toLocaleDateString('pt-PT')}</span>
          </p>
          <p className="text-[9px] text-emerald-100/35 font-mono truncate">
            {p.n} redes · {p.u} únicos{p.cc ? ` · ${p.cc} torres` : ''}
            {hasGps ? ` · ${p.lat!.toFixed(4)}, ${p.lng!.toFixed(4)}` : ' · sem GPS'}
          </p>
        </div>
        {hasGps && (
          <a
            href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
            target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1 rounded"
            aria-label="Abrir no mapa"
          >
            <MapPin className="h-3 w-3" style={{ color: 'var(--tac-cyan)' }} />
          </a>
        )}
        {expanded ? <ChevronUp className="h-3 w-3 opacity-40" /> : <ChevronDown className="h-3 w-3 opacity-40" />}
      </button>
      <AnimatePresence>
        {expanded && (p.w || []).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="px-4 py-1.5">
              {[...(p.w || [])].sort((a, b) => b.r - a.r).slice(0, 8).map((w) => (
                <div key={w.b} className="py-1 flex items-center gap-2 text-[9px]">
                  <span className={securityBadgeClass(w.sec)}>{w.sec}</span>
                  <span className="text-emerald-100/60 truncate flex-1">{w.s}</span>
                  <span className="text-emerald-100/30 font-mono">{w.r}dBm</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Painel tático de CONGESTIONAMENTO DE CANAIS (v3.18.0). */
function TacCongestionPanel({ congestion }: { congestion: ChannelCongestion | null }) {
  if (!congestion) return null
  const top = topChannels(congestion, 8)
  const maxCount = Math.max(...top.map((c) => c.count), 1)
  const color = congestion.congestionPct >= 70 ? '#f87171' : congestion.congestionPct >= 40 ? '#fbbf24' : '#34d399'
  return (
    <div className="relative z-10 mt-4 tac-panel overflow-hidden">
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
        <BarChart3 className="h-3.5 w-3.5" style={{ color: 'var(--tac-cyan)' }} />
        <p className="tac-label">ocupação do espectro</p>
        <span className="tac-value text-sm ml-auto" style={{ color }}>{congestion.congestionPct}%</span>
      </div>
      <div className="px-4 py-3">
        <div className="tac-meter mb-3">
          <div style={{ width: `${Math.max(congestion.congestionPct, 3)}%`, background: color }} />
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {top.map((c) => (
            <div key={c.ch} className="flex-1 flex flex-col items-center gap-1" title={`Canal ${c.ch}: ${c.count} rede(s)`}>
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${Math.max(6, (c.count / maxCount) * 38)}px`,
                  background: c.ch === congestion.worstCh ? 'rgba(248,113,113,0.75)' : 'rgba(34,211,238,0.45)',
                }}
              />
              <span className="text-[8px] text-emerald-100/35 font-mono">{c.ch}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {congestion.best2g != null && (
            <span className="tac-badge tac-badge-good">MELHOR 2.4G: CH {congestion.best2g}</span>
          )}
          {congestion.best5g != null && (
            <span className="tac-badge tac-badge-ok">MELHOR 5G: CH {congestion.best5g}</span>
          )}
          {congestion.worstCh != null && (
            <span className="tac-badge tac-badge-danger">POLUÍDO: CH {congestion.worstCh}</span>
          )}
        </div>
      </div>
    </div>
  )
}
