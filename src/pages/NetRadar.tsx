/**
 * NetRadar — RADAR WI-FI & REDES (v3.16.0, inteligência v3.18.0).
 *
 * Captura e regista TODAS as redes à sua volta SEM SE LIGAR a elas:
 *
 *  · WI-FI — BSSID, SSID, sinal, canal, banda, segurança anunciada
 *  · BLUETOOTH — testemunhas BLE (mesmo motor do Radar Bluetooth)
 *  · REDE MÓVEL — operadora + torres celulares visíveis
 *
 * ANÁLISE DE SEGURANÇA: redes abertas, encriptação quebrada (WEP/WPA),
 * evil twins (mesmo SSID, vários BSSID), honeypots de nome suspeito,
 * redes novas no ambiente + índice de risco do local.
 *
 * INTELIGÊNCIA (v3.18.0): fabricante por OUI, classificação
 * router/hotspot/mesh/enterprise, congestionamento de canais com
 * recomendação, tendência de sinal por rede (sparkline) e locais
 * conhecidos por impressão digital de BSSIDs.
 *
 * REGISTO: todas as redes já vistas ficam com 1.ª vez, última vez, nº de
 * vezes, melhor sinal e GPS aproximado — o histórico sobrevive a
 * reinícios e sai com o SOS + sincroniza na nuvem.
 *
 * DESIGN DUAL:
 *  · Web (esta) — identidade dourada padrão da StatusAds
 *  · APK — design exclusivo "Tactical Grid" (verde-radar HUD) que só
 *    existe na versão nativa, mantendo a app única no telemóvel.
 *
 * No navegador não é possível escanear Wi-Fi (limitação do sistema): a
 * página mostra o ambiente pelo Network Information API, permite o
 * registo da ligação actual e explica como activar o radar completo no APK.
 */

import { useMemo, useState } from 'react'
import {
  Radar, Play, Square, Trash2, CloudUpload, Satellite, Wifi, WifiOff,
  ShieldAlert, Info, Signal, Bluetooth, ScanLine, Gauge,
  Network, Smartphone, ChevronDown, ChevronUp, MapPin, Clock, AlertTriangle,
  History, Search, Download, BarChart3, TrendingUp, TrendingDown, MoveRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useAuth } from '@/hooks/useAuth'
import { saveNetTrail, saveBleTrail, saveWifiRegistry } from '@/lib/api'
import { exportWifiRegistry } from '@/lib/export-data'
import { isNative } from '@/lib/native'
import {
  securityLevel, securityLabel, wifiDistanceLabel, wifiRssiBars, wifiRssiToMeters,
  bleScanNowSafe, type BleQuickDevice,
} from '@/components/net/net-shared'
import TacticalNetRadar from '@/components/net/TacticalNetRadar'
import { PullToRefresh } from '@/components/native/PullToRefresh'
import { RadarSkeleton } from '@/components/net/RadarSkeleton'
import type { WifiRadarNetwork, WifiRegistryEntry } from '@/lib/net-radar'
import {
  analyzeChannelCongestion, classifyWifiNetwork, wifiVendor, rssiTrend, topChannels,
  type ChannelCongestion,
} from '@/lib/net-intel'
import { toast } from 'sonner'

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
]

/** Quando corre nativo, a página veste o design exclusivo da APK. */
export default function NetRadar() {
  if (isNative()) return <TacticalNetRadar />
  return <NetRadarWeb />
}

// ══════════════════════════════════════════════════════════════════════════
// Design WEB (identidade dourada StatusAds)
// ══════════════════════════════════════════════════════════════════════════

function SignalBars({ rssi }: { rssi: number }) {
  const bars = wifiRssiBars(rssi)
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

function SecBadge({ sec }: { sec: string }) {
  const lvl = securityLevel(sec)
  const styles: Record<number, string> = {
    0: 'bg-red-500/10 text-red-400 border-red-500/25',
    1: 'bg-red-500/10 text-red-400 border-red-500/25',
    2: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    3: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
    4: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  }
  return (
    <span className={cn('shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border', styles[lvl])}>
      {sec}
    </span>
  )
}

function NetRadarWeb() {
  const {
    available, permissions, scanning, networks, registry, threats, riskScore,
    environment, trailRunning, trail, trailIntervalSec, lastError,
    scan, startTrail, stopTrail, clearTrail, clearRegistry, requestPerms, refresh,
  } = useNetRadar()
  const { user } = useAuth()
  const [intervalSel, setIntervalSel] = useState(trailIntervalSec)
  const [syncing, setSyncing] = useState(false)
  const [bleScanning, setBleScanning] = useState(false)
  const [bleDevices, setBleDevices] = useState<BleQuickDevice[]>([])
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null)

  const needsPerms = available && permissions && (!permissions.granted || !permissions.wifiEnabled)
  const riskColor =
    riskScore >= 75 ? 'bg-red-500' : riskScore >= 50 ? 'bg-orange-500' : riskScore >= 25 ? 'bg-amber-500' : 'bg-emerald-500'
  const uniqueBssids = new Set(networks.map((n) => n.bssid)).size
  const towerCount = environment?.towers?.length ?? 0
  const totalNets = trail.reduce((acc, p) => acc + (p.n || 0), 0)
  // v3.18.0 — congestionamento de canais do ambiente capturado
  const congestion = useMemo(() => analyzeChannelCongestion(networks), [networks])

  const handleScan = async () => {
    if (needsPerms) {
      await requestPerms()
      await refresh()
      return
    }
    scan()
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
        toast.success('Rastro de redes activo', {
          description: `A cada ${intervalSel < 60 ? `${intervalSel}s` : `${intervalSel / 60} min`} é capturado um ponto GPS + as redes por perto.`,
        })
      }
    } else {
      await stopTrail()
      toast.info('Rastro de redes desligado')
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
      toast.success('Rastro guardado na nuvem', { description: 'Disponível no Painel Admin mesmo que o telemóvel se perca.' })
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
      if (devs.length === 0 && available) toast.info('Sem dispositivos BLE detectados nesta janela')
    } finally {
      setBleScanning(false)
    }
  }

  return (
    <PullToRefresh onRefresh={handleScan} className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-brand" />
            Radar Wi-Fi &amp; Redes
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Captura e analisa TODAS as redes à sua volta — sem se ligar a nenhuma
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

      {/* Web fallback */}
      {!available && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 flex gap-3">
          <WifiOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[13px] text-white/50 leading-relaxed">
            <p className="font-semibold text-amber-300 mb-1">Scan Wi-Fi completo na app Android (APK)</p>
            O navegador não permite escanear redes Wi-Fi próximas. A app APK
            StatusAds liga o radar completo: BSSID real, canal, banda, segurança e
            rastro automático com GPS — com um design exclusivo "Tactical Grid".
          </div>
        </div>
      )}

      {/* Permissões */}
      {needsPerms && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300 mb-1">
              {permissions && !permissions.wifiEnabled ? 'Wi-Fi desligado' : 'Permissões em falta'}
            </p>
            <p className="text-[12px] text-white/40 mb-2.5">
              O radar precisa de Localização + Dispositivos próximos (o Android exige para
              ver redes). Nada é partilhado sem o seu SOS.
            </p>
            <Button size="sm" onClick={() => requestPerms().then(() => refresh())}
              className="h-8 px-3 text-[11px] bg-brand hover:bg-brand/90 text-white rounded-lg">
              Conceder permissões
            </Button>
          </div>
        </div>
      )}

      {/* Explicação (valor) */}
      <div className="rounded-2xl border border-brand/15 bg-brand/[0.03] p-4 flex gap-3">
        <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <div className="text-[12px] text-white/45 leading-relaxed">
          <p className="font-semibold text-white/70 mb-1">Como ajuda a proteger você</p>
          Todo router, telemóvel e carro emite sinais constantemente. O Radar guarda
          <span className="text-white/70"> que redes estavam perto</span> (BSSID + SSID + sinal +
          segurança) e <span className="text-white/70">onde/quando</span> (pontos GPS). Num
          sequestro, a trilha digital sai com o SOS e ajuda a polícia a reconstituir o percurso.
          A análise de segurança avisa ainda para redes abertas, "evil twins" e honeypots.
        </div>
      </div>

      {/* Análise de segurança */}
      {(threats.length > 0 || networks.length > 0) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
              <Gauge className={cn('h-4.5 w-4.5', threats.length > 0 ? 'text-amber-400' : 'text-white/50')} />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm text-white">Análise de segurança</p>
              <p className="text-[11px] text-white/30">
                {threats.length === 0
                  ? networks.length > 0
                    ? 'Nenhuma ameaça detectada neste ambiente'
                    : 'Escanee para analisar o ambiente'
                  : `${threats.length} aviso(s) para o ambiente actual`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-lg font-bold leading-none', riskColor.replace('bg-', 'text-'))}>{riskScore}</p>
              <p className="text-[9px] text-white/25">risco /100</p>
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', riskColor)} style={{ width: `${Math.max(riskScore, 3)}%` }} />
            </div>
            {threats.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {threats.map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border mt-0.5',
                        t.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/25'
                          : t.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                      )}
                    >
                      {t.severity === 'high' ? 'ALTA' : t.severity === 'medium' ? 'MÉDIA' : 'BAIXA'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white/85 leading-tight">{t.title}</p>
                      <p className="text-[11px] text-white/35 leading-snug mt-0.5">{t.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan + ambiente */}
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
            <p className="font-display font-semibold text-sm text-white">Varredura do espectro</p>
            <p className="text-[11px] text-white/30">
              {scanning ? 'A escanear redes próximas…' : `${networks.length} rede(s) · ${uniqueBssids} BSSID únicos`}
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
            <ScanLine className="h-3.5 w-3.5" />
            {scanning ? 'A escanear' : 'Escanear'}
          </Button>
        </div>

        {/* ambiente actual */}
        <div className="px-5 py-3 border-b border-white/[0.05] flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
          {environment?.wifi?.connected ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              Ligado a <b className="font-semibold">{environment.wifi.ssid}</b>
              <span className="text-white/30">({environment.wifi.rssi} dBm)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-white/40">
              <WifiOff className="h-3.5 w-3.5" />
              {environment?.online ? `Sem Wi-Fi · dados móveis ${environment.effectiveType ? `(${environment.effectiveType.toUpperCase()})` : ''}` : 'Offline'}
            </span>
          )}
          {environment?.operator && (
            <span className="flex items-center gap-1.5 text-white/40">
              <Smartphone className="h-3.5 w-3.5" />
              {environment.operator}
              <span className="text-white/25">· {towerCount} torre(s) visível(is)</span>
            </span>
          )}
          {environment?.downlinkMbps != null && (
            <span className="flex items-center gap-1.5 text-white/40">
              <Network className="h-3.5 w-3.5" />
              ~{environment.downlinkMbps} Mbps
            </span>
          )}
        </div>

        {/* lista de redes */}
        <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
          {networks.length === 0 && !scanning && (
            <p className="px-5 py-8 text-center text-xs text-white/25">
              {available
                ? 'Toque em "Escanear" para mapear as redes Wi-Fi à sua volta'
                : 'Instale a APK para mapear as redes Wi-Fi à sua volta'}
            </p>
          )}
          {networks.length === 0 && scanning && (
            <RadarSkeleton rows={6} />
          )}
          {networks.map((n) => (
            <WifiRow key={n.bssid} net={n} />
          ))}
        </div>
      </div>

      {/* INTELIGÊNCIA: congestionamento de canais (v3.18.0) */}
      <CongestionPanel congestion={congestion} total={networks.length} />

      {/* Rede móvel (torres) */}
      {towerCount > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
              <Signal className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm text-white">Rede móvel</p>
              <p className="text-[11px] text-white/30">
                {environment?.operator || 'Operadora'} · {towerCount} torre(s) visível(eis) como testemunha
              </p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {environment?.towers?.map((t, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-3 text-[11px]">
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border bg-cyan-500/10 text-cyan-400 border-cyan-500/25">
                  {t.type}
                </span>
                <span className="text-white/55 font-mono flex-1">
                  {t.type === '5G' ? `NCI ${t.nci ?? '—'}` : `CID ${t.cid ?? '—'}`}
                  {t.pci != null ? ` · PCI ${t.pci}` : ''}
                </span>
                <span className="text-white/30 font-mono">{t.dbm ?? '?'} dBm</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testemunhas BLE */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
            <Bluetooth className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-white">Testemunhas Bluetooth</p>
            <p className="text-[11px] text-white/30">
              {bleScanning ? 'A escutar dispositivos BLE…' : `${bleDevices.length} dispositivo(s) na última captura`}
            </p>
          </div>
          <Button
            onClick={handleBleScan}
            disabled={!available || bleScanning}
            className={cn(
              'h-9 px-4 text-[12px] rounded-xl gap-1.5 font-semibold',
              bleScanning ? 'bg-white/10 text-white/40' : 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1] border border-white/[0.08]'
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Capturar
          </Button>
        </div>
        {bleDevices.length > 0 && (
          <div className="divide-y divide-white/[0.04] max-h-[240px] overflow-y-auto">
            {bleDevices.map((d) => (
              <div key={d.mac} className="px-5 py-2.5 flex items-center gap-3">
                <SignalBars rssi={d.r} />
                <span className="text-[13px] text-white/70 truncate flex-1">{d.n || d.k || 'Dispositivo sem nome'}</span>
                <span className="text-[10px] text-white/25 font-mono">{d.mac}</span>
              </div>
            ))}
          </div>
        )}
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
            <p className="font-display font-semibold text-sm text-white">Rastro automático de redes</p>
            <p className="text-[11px] text-white/30">
              {trailRunning ? 'A gravar onde/quais redes — sai com o SOS' : 'Grava pontos GPS + redes Wi-Fi + torres continuamente'}
            </p>
          </div>
          <Switch checked={trailRunning} onCheckedChange={handleTrailToggle} disabled={!available} />
        </div>

        <div className="px-5 py-4 space-y-4">
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

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-white leading-none">{trail.length}</p>
              <p className="text-[10px] text-white/30 mt-1">pontos GPS</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-white leading-none">{totalNets}</p>
              <p className="text-[10px] text-white/30 mt-1">redes vistas</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[18px] font-bold text-brand leading-none">{registry.length}</p>
              <p className="text-[10px] text-white/30 mt-1">no registo</p>
            </div>
          </div>

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
              Rastro
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { clearRegistry(); toast.info('Registo de redes apagado') }}
              disabled={registry.length === 0}
              className="h-9 px-3 text-[11px] text-amber-400/70 hover:bg-amber-500/10 rounded-xl gap-1.5 border border-amber-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Registo
            </Button>
          </div>

          {lastError && <p className="text-[11px] text-red-400/80">{lastError}</p>}
        </div>

        {/* pontos do rastro */}
        {trail.length > 0 && (
          <div className="divide-y divide-white/[0.04]">
            {[...trail].reverse().slice(0, 12).map((p) => (
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
      {/* Registo Wi-Fi — histórico completo (v3.17.0) */}
      <WifiRegistryPanel
        registry={registry}
        onClear={() => { clearRegistry(); toast.info('Registo de redes apagado') }}
      />
    </PullToRefresh>
  )
}

/**
 * Painel do registo Wi-Fi (v3.17.0): busca por nome/BSSID, filtro de
 * segurança, detalhe (1.ª vez, última vez, nº de vezes, GPS), exportação
 * CSV/JSON e sincronização na nuvem (tabela wifi_registry).
 */
function WifiRegistryPanel({ registry, onClear }: {
  registry: WifiRegistryEntry[]
  onClear: () => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [secFilter, setSecFilter] = useState<'all' | 'risk' | 'open'>('all')
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return registry
      .filter((e) => {
        if (q && !(e.ssid?.toLowerCase().includes(q) || e.bssid?.toLowerCase().includes(q))) return false
        if (secFilter === 'open') return securityLevel(e.sec) === 0
        if (secFilter === 'risk') return securityLevel(e.sec) <= 2
        return true
      })
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 120)
  }, [registry, query, secFilter])

  const handleSync = async () => {
    if (!user || registry.length === 0) return
    setSyncing(true)
    try {
      const n = await saveWifiRegistry(user.id, registry)
      toast.success(`${n} redes sincronizadas na nuvem`, { description: 'O histórico sobrevive à perda do telemóvel.' })
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true)
    try { await exportWifiRegistry(registry, format) } finally { setExporting(false) }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
          <History className="h-4.5 w-4.5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-white">Registo de redes já vistas</p>
          <p className="text-[11px] text-white/30">
            {registry.length} rede(s) no histórico · 1.ª vez, última vez, nº de vezes e GPS
          </p>
        </div>
      </div>

      {/* barra de ferramentas */}
      <div className="px-5 py-3 border-b border-white/[0.05] space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou BSSID…"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-white placeholder:text-white/20 outline-none focus:border-brand/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { v: 'all', label: 'Todas' },
            { v: 'risk', label: 'Risco (WEP/WPA/abertas)' },
            { v: 'open', label: 'Só abertas' },
          ] as const).map((f) => (
            <button
              key={f.v}
              onClick={() => setSecFilter(f.v)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition',
                secFilter === f.v
                  ? 'bg-brand/15 text-brand border-brand/30'
                  : 'bg-white/[0.03] text-white/35 border-white/[0.06] hover:text-white/60'
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="flex-1" />
          <Button
            variant="ghost" size="sm"
            onClick={() => handleExport('csv')}
            disabled={exporting || registry.length === 0}
            className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06] gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => handleExport('json')}
            disabled={exporting || registry.length === 0}
            className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06]"
          >
            JSON
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={handleSync}
            disabled={syncing || !user || registry.length === 0}
            className="h-8 px-2.5 text-[11px] text-brand/80 hover:bg-brand/10 rounded-lg border border-brand/20 gap-1.5"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {syncing ? 'A enviar…' : 'Nuvem'}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onClear}
            disabled={registry.length === 0}
            className="h-8 px-2.5 text-[11px] text-amber-400/70 hover:bg-amber-500/10 rounded-lg border border-amber-500/15 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* lista do registo */}
      <div className="divide-y divide-white/[0.04] max-h-[360px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-white/25">
            {registry.length === 0
              ? 'Sem redes registadas ainda — escanee para começar o histórico'
              : 'Nenhuma rede corresponde à busca/filtro'}
          </p>
        )}
        {filtered.map((e) => {
          const cls = classifyWifiNetwork({ bssid: e.bssid, ssid: e.ssid, rssi: e.rssi ?? -100, freq: e.freq ?? 0, ch: 0, band: '', sec: e.sec })
          const vendor = cls.vendor || wifiVendor(e.bssid)
          return (
            <div key={e.bssid || e.ssid} className="px-5 py-3 flex items-center gap-3">
              <SecBadge sec={e.sec} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white font-medium truncate">{e.ssid}</p>
                <p className="text-[10px] text-white/30 font-mono truncate">
                  {e.bssid || 'BSSID desconhecido'}
                  {vendor ? ` · ${vendor}` : ''}
                  {typeof e.lat === 'number' && typeof e.lng === 'number' ? ` · ${e.lat.toFixed(3)}, ${e.lng.toFixed(3)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 text-[10px] text-white/35 leading-tight">
                <p>{e.seen}×</p>
                <p className="text-white/20">{new Date(e.lastSeen).toLocaleDateString('pt-PT')}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function WifiRow({ net: n }: { net: WifiRadarNetwork }) {
  const label = securityLabel(n.sec)
  const lvl = securityLevel(n.sec)
  // v3.18.0 — fabricante, classificação e tendência de sinal
  const cls = classifyWifiNetwork(n)
  const vendor = cls.vendor || wifiVendor(n.bssid)
  const trend = rssiTrend(n.bssid)
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Wifi className={cn('h-3.5 w-3.5', lvl === 0 ? 'text-red-400' : 'text-white/50')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-white truncate">{n.ssid}</p>
          <SecBadge sec={n.sec} />
          {cls.kind !== 'router' && cls.kind !== 'unknown' && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border bg-violet-500/10 text-violet-300 border-violet-500/25">
              {cls.label}
            </span>
          )}
          {trend === 'stronger' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-label="a aproximar-se" />}
          {trend === 'weaker' && <TrendingDown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="a afastar-se" />}
          {trend === 'stable' && <MoveRight className="h-3.5 w-3.5 text-white/20 shrink-0" aria-label="sinal estável" />}
        </div>
        <p className="text-[10px] text-white/30 font-mono truncate">
          {n.bssid}{vendor ? ` · ${vendor}` : ''} · CH {n.ch} · {n.band}{n.caps ? ` · ${n.caps}` : ''} · {wifiRssiToMeters(n.rssi)}m
        </p>
        {(lvl === 0 || lvl === 1) && (
          <p className="text-[10px] text-red-400/70 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="h-3 w-3" />
            {label.text}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <SignalBars rssi={n.rssi} />
        <p className="text-[9px] text-white/25 mt-0.5">{wifiDistanceLabel(n.rssi)}</p>
      </div>
    </div>
  )
}

/**
 * Painel de CONGESTIONAMENTO DE CANAIS (v3.18.0) — design web dourado.
 * Mostra a ocupação por canal, o canal mais carregado e a recomendação
 * do melhor canal (útil para o utilizador escolher rede/canal em casa).
 */
export function CongestionPanel({ congestion, total }: { congestion: ChannelCongestion | null; total: number }) {
  if (!congestion || total === 0) return null
  const top = topChannels(congestion, 8)
  const maxCount = Math.max(...top.map((c) => c.count), 1)
  const congColor =
    congestion.congestionPct >= 70 ? 'bg-red-500' : congestion.congestionPct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
          <BarChart3 className="h-4.5 w-4.5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm text-white">Congestionamento de canais</p>
          <p className="text-[11px] text-white/30">{congestion.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-lg font-bold leading-none', congColor.replace('bg-', 'text-'))}>{congestion.congestionPct}%</p>
          <p className="text-[9px] text-white/25">ocupação</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', congColor)} style={{ width: `${Math.max(congestion.congestionPct, 3)}%` }} />
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {top.map((c) => (
            <div key={c.ch} className="flex-1 flex flex-col items-center gap-1" title={`Canal ${c.ch}: ${c.count} rede(s), sinal médio ${c.avgRssi} dBm`}>
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all duration-500',
                  c.ch === congestion.worstCh ? 'bg-red-400/80' : 'bg-cyan-400/50',
                )}
                style={{ height: `${Math.max(8, (c.count / maxCount) * 48)}px` }}
              />
              <span className="text-[9px] text-white/30">{c.ch}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {congestion.best2g != null && (
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Melhor 2.4 GHz: canal {congestion.best2g}
            </span>
          )}
          {congestion.best5g != null && (
            <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Melhor 5 GHz: canal {congestion.best5g}
            </span>
          )}
          {congestion.worstCh != null && (
            <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">
              Mais poluído: canal {congestion.worstCh}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Linha de um ponto do rastro (design web). */
function NetTrailRow({ point: p, expanded, onToggle }: {
  point: { t: number; lat?: number; lng?: number; acc?: number; n: number; u: number; w: Array<{ b: string; s: string; r: number; f: number; sec: string }>; c?: unknown[]; cc?: number }
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
            {p.n} redes · {p.u} únicos{p.cc ? ` · ${p.cc} torres` : ''}
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
            <MapPin className="h-3.5 w-3.5 text-brand" />
          </a>
        )}
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {expanded && (p.w || []).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/20"
          >
            <div className="px-5 py-2 divide-y divide-white/[0.03]">
              {[...(p.w || [])].sort((a, b) => b.r - a.r).slice(0, 10).map((w) => (
                <div key={w.b} className="py-1.5 flex items-center gap-2 text-[10px]">
                  <SecBadge sec={w.sec} />
                  <span className="text-white/60 truncate flex-1">{w.s}</span>
                  <span className="text-white/25 font-mono">{w.b}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
