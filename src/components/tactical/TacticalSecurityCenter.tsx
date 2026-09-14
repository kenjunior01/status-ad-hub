/**
 * TacticalSecurityCenter — CENTRAL DE SEGURANÇA com design EXCLUSIVO da
 * versão APK (v3.17.0).
 *
 * Estende a estética "Tactical Grid" (v3.16) ao novo módulo: HUD militar
 * verde-radar sobre carvão, tipografia mono, brackets de canto, score de
 * segurança tipo medidor de blindagem, sparkline de risco e diário de
 * eventos em formato consola. SÓ renderiza em native (Capacitor) — a web
 * usa o design dourado padrão (SecurityCenter.tsx).
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Siren, Download, Trash2, CloudUpload, RefreshCw, Wifi, Bluetooth,
  Satellite, AlertTriangle, CheckCircle2, XCircle, ChevronRight, Radar as RadarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useBleRadar } from '@/hooks/useBleRadar'
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useContacts } from '@/hooks/useContacts'
import { useCheckIn } from '@/hooks/useCheckIn'
import {
  getSecurityEvents, clearSecurityEvents, markSynced,
  EVENT_KIND_LABEL, type SecurityEvent,
} from '@/lib/security-events'
import { exportSecurityEvents } from '@/lib/export-data'
import { saveSecurityEvents } from '@/lib/api'
import { toast } from 'sonner'

function TacScore({ score }: { score: number }) {
  const color = score >= 75 ? 'var(--tac-green)' : score >= 50 ? 'var(--tac-amber)' : 'var(--tac-red)'
  const label = score >= 75 ? 'BLINDADO' : score >= 50 ? 'ATENCAO' : 'EXPOSTO'
  const angle = Math.round((score / 100) * 360)
  return (
    <div className="relative h-32 w-32 shrink-0">
      <div className="tac-sweep absolute inset-0 opacity-30" />
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${angle}deg, rgba(52,211,153,0.08) ${angle}deg)` }}
      />
      <div className="absolute inset-[8px] rounded-full bg-[#070c0a] flex flex-col items-center justify-center border border-[rgba(52,211,153,0.2)]">
        <span className="tac-value text-3xl leading-none" style={{ color }}>{score}</span>
        <span className="tac-label mt-1">{label}</span>
      </div>
    </div>
  )
}

function TacSpark({ history }: { history: Array<{ t: number; r: number }> }) {
  if (history.length < 2) {
    return <p className="text-[10px] text-[rgba(52,211,153,0.4)] py-2">SEM DADOS — ACTIVE A SENTINELA</p>
  }
  const bars = history.slice(-40)
  return (
    <div className="flex items-end gap-[2px] h-10 mt-2">
      {bars.map((p, i) => {
        const h = Math.max(3, Math.round((p.r / 100) * 40))
        const color = p.r >= 75 ? 'var(--tac-red)' : p.r >= 50 ? '#fb923c' : p.r >= 25 ? 'var(--tac-amber)' : 'var(--tac-green)'
        return <div key={i} className="flex-1 rounded-sm" style={{ height: h, background: color, opacity: 0.85 }} />
      })}
    </div>
  )
}

export default function TacticalSecurityCenter() {
  const { user } = useAuth()
  const net = useNetRadar()
  const ble = useBleRadar()
  const watch = useRadarWatch()
  const { contacts } = useContacts()
  const { config: checkinConfig } = useCheckIn()

  const [events, setEvents] = useState<SecurityEvent[]>(() => getSecurityEvents().slice(0, 60))
  const [syncing, setSyncing] = useState(false)

  const reloadEvents = () => setEvents(getSecurityEvents().slice(0, 60))

  const securityScore = useMemo(() => {
    let score = 100
    score -= Math.round((net.riskScore / 100) * 25)
    if (ble.trackers.some((t) => t.severity === 'high')) score -= 30
    else if (ble.trackers.length > 0) score -= 15
    if ((contacts?.length ?? 0) === 0) score -= 12
    if (!checkinConfig?.is_active) score -= 8
    if (!watch.watching) score -= 10
    if (net.registry.length === 0 && ble.registry.length === 0) score -= 8
    if (events.length === 0) score -= 7
    return Math.max(0, Math.min(100, score))
  }, [net.riskScore, net.registry.length, ble.trackers, ble.registry.length, contacts, checkinConfig, watch.watching, events.length])

  const handleSync = async () => {
    if (!user) return
    const pending = getSecurityEvents().filter((e) => !e.synced)
    if (pending.length === 0) {
      toast.info('Diario ja sincronizado')
      return
    }
    setSyncing(true)
    try {
      await saveSecurityEvents(user.id, pending)
      markSynced(pending.map((e) => e.id))
      reloadEvents()
      toast.success(`${pending.length} evento(s) na nuvem`)
    } catch {
      toast.error('Falha ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const checks = [
    { ok: (contacts?.length ?? 0) > 0, label: `CONTACTOS EMERGENCIA: ${contacts?.length ?? 0}`, to: '/dashboard/contacts' },
    { ok: !!checkinConfig?.is_active, label: 'CHECK-IN CONFIGURADO', to: '/dashboard/checkin' },
    { ok: watch.watching, label: 'SENTINELA ACTIVA', to: '/dashboard/seguranca' },
    { ok: net.trailRunning || ble.trailRunning, label: 'RASTRO AUTOMATICO', to: '/dashboard/ble' },
    { ok: net.registry.length + ble.registry.length > 0, label: 'HISTORICO DO AMBIENTE', to: '/dashboard/net-radar' },
  ]

  return (
    <div className="tactical min-h-screen pb-10 relative">
      <div className="tac-scanline" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-5 space-y-4">

        {/* Cabeçalho HUD */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[var(--tac-green)]" />
            <div>
              <h1 className="tac-value text-lg tracking-wider">CENTRAL DE SEGURANCA</h1>
              <p className="tac-label">MODULO TATICO v3.17 · SO NA APK</p>
            </div>
          </div>
          <div className="tac-status-bar">
            <span className="tac-dot" />
            {watch.watching ? 'SENTINELA ON' : 'SENTINELA OFF'}
          </div>
        </div>

        {/* Score + Sentinela */}
        <div className="tac-panel p-4 flex flex-col sm:flex-row items-center gap-5">
          <TacScore score={securityScore} />
          <div className="flex-1 min-w-0 w-full space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="tac-label mb-1">VIGILANCIA CONTINUA · 45S/CICLO</p>
                <p className="text-[11px] text-[rgba(209,250,229,0.6)]">
                  {watch.watching
                    ? `ULTIMO CICLO ${watch.lastCycleAt ? new Date(watch.lastCycleAt).toLocaleTimeString('pt-PT') : '—'} · ${watch.cycles} CICLOS`
                    : 'AUTO-SCAN WI-FI + BLE DESLIGADO'}
                </p>
              </div>
              <button
                onClick={() => { const v = watch.toggle(); toast.success(v ? 'SENTINELA ACTIVA' : 'SENTINELA OFF') }}
                className={cn('tac-btn', !watch.watching && 'tac-btn-ghost')}
              >
                {watch.watching ? 'DESARMAR' : 'ARMAR'}
              </button>
            </div>
            <div>
              <p className="tac-label mb-1">EVOLUCAO DO RISCO · AGORA {watch.riskScore}/100</p>
              <TacSpark history={watch.riskHistory} />
            </div>
            {watch.lastError && (
              <p className="text-[10px] text-[var(--tac-amber)]">AVISO: {watch.lastError}</p>
            )}
          </div>
        </div>

        {/* Alertas de rastreador */}
        {ble.trackers.length > 0 && (
          <div className="tac-panel p-4 border-[rgba(248,113,113,0.4)]">
            <div className="flex items-center gap-2 mb-2">
              <Siren className="h-4 w-4 text-[var(--tac-red)] animate-pulse" />
              <p className="tac-value text-[13px] text-[var(--tac-red)] tracking-wider">
                {ble.trackers.length} ALVO(S) HOSTIL(EST) PROXIMO(S)
              </p>
            </div>
            {ble.trackers.slice(0, 3).map((t) => (
              <p key={t.mac} className="text-[11px] text-[rgba(209,250,229,0.65)] leading-snug py-1 border-t border-dashed border-[rgba(248,113,113,0.2)]">
                [{t.kind === 'known-tracker' ? 'RASTREADOR' : 'PERSEGUIDOR'}] {t.name || t.mac} — {t.reason}
              </p>
            ))}
            <Link to="/dashboard/ble" className="tac-label inline-flex items-center gap-1 mt-2 underline">
              ABRIR RADAR BT <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Métricas do ambiente */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Wifi, label: 'REDES REGISTADAS', value: net.registry.length, to: '/dashboard/net-radar' },
            { icon: AlertTriangle, label: 'AMEACAS REDE', value: net.threats.length, to: '/dashboard/net-radar' },
            { icon: Bluetooth, label: 'DISPOSITIVOS BLE', value: ble.registry.length, to: '/dashboard/ble' },
            { icon: Satellite, label: 'PONTOS GPS', value: net.trail.length + ble.trail.length, to: '/dashboard/net-radar' },
          ].map((c) => (
            <Link key={c.label} to={c.to} className="tac-panel p-3 block">
              <c.icon className="h-3.5 w-3.5 text-[var(--tac-cyan)] mb-1.5" />
              <p className="tac-value text-xl leading-none">{c.value}</p>
              <p className="tac-label mt-1.5 leading-tight">{c.label}</p>
            </Link>
          ))}
        </div>

        {/* Checklist tática */}
        <div className="tac-panel p-4">
          <p className="tac-label mb-2.5">PRONTIDAO PESSOAL</p>
          <div className="space-y-1.5">
            {checks.map((c) => (
              <Link key={c.label} to={c.to} className="flex items-center gap-2.5 py-1.5 group">
                {c.ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--tac-green)]" />
                  : <XCircle className="h-3.5 w-3.5 text-[var(--tac-red)]" />}
                <span className={cn('text-[11px] tracking-wider flex-1', c.ok ? 'text-[rgba(209,250,229,0.5)]' : 'text-[#ecfdf5]')}>
                  {c.label}
                </span>
                {!c.ok && <ChevronRight className="h-3 w-3 text-[rgba(52,211,153,0.4)] group-hover:text-[var(--tac-green)]" />}
              </Link>
            ))}
          </div>
        </div>

        {/* Diário — consola */}
        <div className="tac-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--tac-line)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RadarIcon className="h-4 w-4 text-[var(--tac-green)]" />
              <p className="tac-value text-[13px] tracking-wider">LOG DE SEGURANCA · {events.length}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => exportSecurityEvents(getSecurityEvents())}
                disabled={events.length === 0}
                className="tac-btn tac-btn-ghost !px-2.5 !py-1.5 !text-[9px]"
                aria-label="Exportar"
              >
                <Download className="h-3 w-3" />
              </button>
              <button
                onClick={handleSync}
                disabled={syncing || !user || events.length === 0}
                className="tac-btn tac-btn-ghost !px-2.5 !py-1.5 !text-[9px]"
                aria-label="Sincronizar"
              >
                {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
              </button>
              <button
                onClick={() => { clearSecurityEvents(); reloadEvents(); toast.info('LOG APAGADO') }}
                disabled={events.length === 0}
                className="tac-btn tac-btn-ghost !px-2.5 !py-1.5 !text-[9px] !text-[var(--tac-red)] !border-[rgba(248,113,113,0.3)]"
                aria-label="Apagar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-dashed divide-[rgba(52,211,153,0.08)]">
            {events.length === 0 && (
              <p className="px-4 py-6 text-center text-[10px] tracking-widest text-[rgba(52,211,153,0.35)]">
                LOG VAZIO — ARME A SENTINELA OU ESCANEE O RADAR
              </p>
            )}
            {events.map((ev) => (
              <div key={ev.id} className="px-4 py-2.5 flex items-start gap-2.5">
                <span className={cn(
                  'tac-badge shrink-0 mt-0.5',
                  ev.severity === 'high' ? 'bg-[rgba(248,113,113,0.12)] text-[var(--tac-red)]'
                    : ev.severity === 'medium' ? 'bg-[rgba(251,191,36,0.12)] text-[var(--tac-amber)]'
                      : 'bg-[rgba(34,211,238,0.1)] text-[var(--tac-cyan)]'
                )}>
                  {EVENT_KIND_LABEL[ev.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#ecfdf5] leading-tight">{ev.title}</p>
                  {ev.detail && <p className="text-[10px] text-[rgba(209,250,229,0.4)] leading-snug mt-0.5">{ev.detail}</p>}
                  <p className="text-[9px] text-[rgba(52,211,153,0.35)] mt-0.5 tracking-wider">
                    {new Date(ev.ts).toLocaleString('pt-PT')}{ev.synced ? ' · CLOUD ✓' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
