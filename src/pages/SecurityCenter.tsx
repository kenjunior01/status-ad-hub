/**
 * SecurityCenter — CENTRAL DE SEGURANÇA (v3.17.0, inteligência v3.18.0).
 *
 * Consolida TODA a inteligência de segurança da app num só ecrã:
 *
 *   · SCORE DE SEGURANÇA 0-100 — mistura o risco do ambiente (redes,
 *     rastreadores BLE) com a prontidão pessoal (contactos, check-in,
 *     queda, PIN duress, vigilância)
 *   · VIGILÂNCIA CONTÍNUA — sentinela que escana Wi-Fi + BLE em loop
 *   · AMBIENTE — ameaças de rede activas, rastreadores detectados
 *   · INTELIGÊNCIA DE AMBIENTE (v3.18) — veredicto correlacionado
 *     (Wi-Fi + BLE + local), perfil do local por impressão digital de
 *     BSSIDs, locais conhecidos com sync na nuvem e exportação
 *   · DIÁRIO DE SEGURANÇA — feed de eventos + sync na nuvem + exportar
 *   · HISTÓRICO DE RISCO — sparkline das últimas horas
 *
 * DESIGN DUAL (igual ao Radar de Redes):
 *   · Web (esta) — identidade dourada StatusAds
 *   · APK — "Tactical HUD" exclusivo (TacticalSecurityCenter)
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, Radar, Bluetooth, Wifi, Users, CheckCircle2,
  XCircle, CloudUpload, Download, Trash2, Activity, ScanLine, AlertTriangle,
  Satellite, Siren, Fingerprint, Archive, RefreshCw, ChevronRight, Eye,
  Crosshair, MapPin,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/native'
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
import { exportSecurityEvents, exportPlaces } from '@/lib/export-data'
import { PullToRefresh } from '@/components/native/PullToRefresh'
import { saveSecurityEvents, savePlaceFingerprints } from '@/lib/api'
import {
  getKnownPlaces, clearKnownPlaces, getPlaceState, correlateEnvironment, ambientLevelColor,
  type AmbientVerdict,
} from '@/lib/net-intel'
import TacticalSecurityCenter from '@/components/tactical/TacticalSecurityCenter'
import AiCopilotPanel from '@/components/ai/AiCopilotPanel'
import { toast } from 'sonner'

export default function SecurityCenter() {
  if (isNative()) return <TacticalSecurityCenter />
  return <SecurityCenterWeb />
}

// ══════════════════════════════════════════════════════════════════════════
// Design WEB (identidade dourada StatusAds)
// ══════════════════════════════════════════════════════════════════════════

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  const label = score >= 75 ? 'BEM PROTEGIDO' : score >= 50 ? 'ATENÇÃO' : 'VULNERÁVEL'
  const angle = Math.round((score / 100) * 360)
  return (
    <div className="relative h-36 w-36 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${angle}deg, rgba(255,255,255,0.06) ${angle}deg)` }}
      />
      <div className="absolute inset-[10px] rounded-full bg-[#12110e] flex flex-col items-center justify-center">
        <span className="text-4xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-white/30 mt-1 tracking-wider uppercase">{label}</span>
      </div>
    </div>
  )
}

function ReadinessItem({ ok, label, to }: { ok: boolean; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition group"
    >
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-400/70 shrink-0" />}
      <span className={cn('text-[12px] flex-1', ok ? 'text-white/60' : 'text-white/85 font-medium')}>{label}</span>
      {!ok && <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-brand transition" />}
    </Link>
  )
}

function EventRow({ ev }: { ev: SecurityEvent }) {
  const tone =
    ev.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/25'
      : ev.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
        : ev.severity === 'low' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
          : 'bg-white/[0.04] text-white/40 border-white/[0.08]'
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <span className={cn('shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border mt-0.5 uppercase', tone)}>
        {EVENT_KIND_LABEL[ev.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-white/85 leading-tight">{ev.title}</p>
        {ev.detail && <p className="text-[11px] text-white/35 leading-snug mt-0.5">{ev.detail}</p>}
        <p className="text-[10px] text-white/20 mt-1">
          {new Date(ev.ts).toLocaleString('pt-PT')}
          {ev.synced ? ' · na nuvem ✓' : ''}
        </p>
      </div>
    </div>
  )
}

function RiskSparkline({ history }: { history: Array<{ t: number; r: number }> }) {
  if (history.length < 2) {
    return (
      <p className="text-[11px] text-white/25 py-3">
        Sem histórico suficiente — active a vigilância contínua para registar a evolução do risco.
      </p>
    )
  }
  const bars = history.slice(-40)
  return (
    <div className="flex items-end gap-[2px] h-12 mt-2">
      {bars.map((p, i) => {
        const h = Math.max(8, Math.round((p.r / 100) * 48))
        const color = p.r >= 75 ? 'bg-red-400' : p.r >= 50 ? 'bg-orange-400' : p.r >= 25 ? 'bg-amber-400' : 'bg-emerald-400'
        return <div key={i} className={cn('flex-1 rounded-sm opacity-80', color)} style={{ height: h }} />
      })}
    </div>
  )
}

function SecurityCenterWeb() {
  const { user } = useAuth()
  const net = useNetRadar()
  const ble = useBleRadar()
  const watch = useRadarWatch()
  const { contacts } = useContacts()
  const { config: checkinConfig } = useCheckIn()

  const [events, setEvents] = useState<SecurityEvent[]>(() => getSecurityEvents().slice(0, 60))
  const [syncing, setSyncing] = useState(false)
  const [syncingPlaces, setSyncingPlaces] = useState(false)

  const reloadEvents = () => setEvents(getSecurityEvents().slice(0, 60))

  // v3.18.0 — veredicto correlacionado + locais conhecidos
  const verdict: AmbientVerdict = useMemo(
    () => watch.verdict ?? correlateEnvironment(net.threats, ble.trackers, getPlaceState()),
    [watch.verdict, net.threats, ble.trackers],
  )
  const places = useMemo(() => getKnownPlaces(), [watch.place])

  // ── Score de segurança 0-100 ──────────────────────────────────────────
  const securityScore = useMemo(() => {
    let score = 100
    // ambiente de rede (peso 25)
    score -= Math.round((net.riskScore / 100) * 25)
    // rastreadores (peso 30)
    if (ble.trackers.some((t) => t.severity === 'high')) score -= 30
    else if (ble.trackers.length > 0) score -= 15
    // prontidão pessoal (peso 45)
    if ((contacts?.length ?? 0) === 0) score -= 12
    if (!checkinConfig?.is_active) score -= 8
    if (!watch.watching) score -= 10
    if (net.registry.length === 0 && ble.registry.length === 0) score -= 8
    if (events.length === 0) score -= 7
    // v3.18.0 — deslocamento abrupto para local desconhecido (peso 25)
    if (watch.placeAnomaly) score -= 25
    return Math.max(0, Math.min(100, score))
  }, [net.riskScore, net.registry.length, ble.trackers, ble.registry.length, contacts, checkinConfig, watch.watching, events.length])

  const handleSyncEvents = async () => {
    if (!user) return
    const pending = getSecurityEvents().filter((e) => !e.synced)
    if (pending.length === 0) {
      toast.info('Diário já está sincronizado')
      return
    }
    setSyncing(true)
    try {
      await saveSecurityEvents(user.id, pending)
      markSynced(pending.map((e) => e.id))
      reloadEvents()
      toast.success(`${pending.length} evento(s) guardado(s) na nuvem`)
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncPlaces = async () => {
    if (!user || places.length === 0) return
    setSyncingPlaces(true)
    try {
      const n = await savePlaceFingerprints(user.id, places)
      toast.success(`${n} local(is) sincronizado(s) na nuvem`)
    } catch {
      toast.error('Falha ao sincronizar (sem internet?)')
    } finally {
      setSyncingPlaces(false)
    }
  }

  const topThreats = net.threats.slice(0, 3)
  const highThreats = net.threats.filter((t) => t.severity === 'high').length
  const hasTrackerAlert = ble.trackers.length > 0

  // v3.21.0 — pull-to-refresh: recarrega diário + sincroniza pendentes (sem toast se nada a fazer)
  const handlePullRefresh = async () => {
    reloadEvents()
    if (!user) return
    const pending = getSecurityEvents().filter((e) => !e.synced)
    if (pending.length > 0) {
      try {
        await saveSecurityEvents(user.id, pending)
        markSynced(pending.map((e) => e.id))
        reloadEvents()
        toast.success(`${pending.length} evento(s) sincronizado(s)`)
      } catch {
        toast.error('Sem internet — eventos ficam na fila')
      }
    }
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand" />
            Central de Segurança
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Tudo o que a app vê, analisa e guarda para o proteger — num só lugar
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white/[0.03] text-white/40 border-white/[0.08]">
          v3.23
        </span>
      </div>

      {/* COPILOTO AEGIS · IA (v3.19.0) */}
      <AiCopilotPanel securityScore={securityScore} />

      {/* Score + vigilância */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing score={securityScore} />
        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-sm text-white">Vigilância contínua</p>
              <p className="text-[11px] text-white/30">
                {watch.watching
                  ? `Sentinela activa · último ciclo ${watch.lastCycleAt ? new Date(watch.lastCycleAt).toLocaleTimeString('pt-PT') : '—'}`
                  : 'Auto-scan do ambiente a cada 45s (Wi-Fi + Bluetooth)'}
              </p>
            </div>
            <Switch checked={watch.watching} onCheckedChange={(v) => { watch.toggle(v); toast.success(v ? 'Sentinela activa' : 'Sentinela desligada') }} />
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider mb-1">
              <span>Histórico de risco</span>
              <span>agora: {watch.riskScore}/100</span>
            </div>
            <RiskSparkline history={watch.riskHistory} />
          </div>
        </div>
      </div>

      {/* Alerta de rastreador */}
      {hasTrackerAlert && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 flex gap-3">
          <Siren className="h-5 w-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-300">
              {ble.trackers.length === 1 ? 'Possível rastreador detectado' : `${ble.trackers.length} possíveis rastreadores/perseguidores`}
            </p>
            {ble.trackers.slice(0, 2).map((t) => (
              <p key={t.mac} className="text-[11px] text-white/50 mt-1 leading-snug">
                <b className="text-white/70">{t.name || t.mac}</b> — {t.reason}
              </p>
            ))}
            <Link to="/dashboard/ble" className="inline-flex items-center gap-1 text-[11px] text-red-300 underline mt-2">
              Ver no Radar Bluetooth <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Ambiente de rede */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Wifi, label: 'Redes no registo', value: net.registry.length, to: '/dashboard/net-radar' },
          { icon: AlertTriangle, label: 'Ameaças de rede', value: net.threats.length, danger: highThreats > 0, to: '/dashboard/net-radar' },
          { icon: Bluetooth, label: 'Dispositivos BLE vistos', value: ble.registry.length, to: '/dashboard/ble' },
          { icon: Satellite, label: 'Pontos GPS do rastro', value: net.trail.length + ble.trail.length, to: '/dashboard/net-radar' },
        ].map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition group"
          >
            <c.icon className={cn('h-4 w-4 mb-2', c.danger ? 'text-red-400' : 'text-brand')} />
            <p className="text-xl font-bold text-white leading-none">{c.value}</p>
            <p className="text-[10px] text-white/30 mt-1.5 leading-tight">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Ameaças activas */}
      {topThreats.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
            <div className="flex-1">
              <p className="font-display font-semibold text-sm text-white">Ameaças do ambiente actual</p>
              <p className="text-[11px] text-white/30">Análise automática das redes à sua volta</p>
            </div>
            <Link to="/dashboard/net-radar" className="text-[11px] text-brand hover:underline">Detalhes</Link>
          </div>
          <div className="px-5 py-3 space-y-2.5">
            {topThreats.map((t, i) => (
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
        </div>
      )}

      {/* INTELIGÊNCIA DE AMBIENTE (v3.18.0) */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
            <Crosshair className="h-4.5 w-4.5" style={{ color: ambientLevelColor(verdict.level) }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm text-white">Inteligência de ambiente</p>
            <p className="text-[11px] text-white/30">Correlação de rede, Bluetooth e local — o que tudo indica em conjunto</p>
          </div>
          <span
            className="shrink-0 px-2 py-1 rounded-full text-[9px] font-bold border uppercase"
            style={{ color: ambientLevelColor(verdict.level), borderColor: `${ambientLevelColor(verdict.level)}55`, background: `${ambientLevelColor(verdict.level)}14` }}
          >
            {verdict.level === 'critical' ? 'CRÍTICO' : verdict.level === 'elevated' ? 'ELEVADO' : 'CALMO'}
          </span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className={cn('text-[13px] font-semibold', verdict.level === 'calm' ? 'text-emerald-300' : verdict.level === 'elevated' ? 'text-amber-300' : 'text-red-300')}>
            {verdict.label}
          </p>
          {verdict.reasons.length > 0 ? (
            <div className="space-y-1.5">
              {verdict.reasons.slice(0, 4).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-white/50">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" style={{ color: ambientLevelColor(verdict.level) }} />
                  {r}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-white/35">Rede, Bluetooth e local sem sinais combinados — tudo dentro do padrão habitual.</p>
          )}
          {/* Perfil do local */}
          {watch.place.current && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3 flex items-center gap-3">
              <MapPin className="h-4 w-4 text-brand shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/85 font-medium leading-tight">
                  {watch.place.current.label}
                  {watch.place.current.seenCount <= 1 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">NOVO</span>
                  )}
                </p>
                <p className="text-[10px] text-white/30 truncate">
                  {watch.place.current.seenCount} visita(s) · {watch.place.current.sampleSsids.slice(0, 2).join(' · ') || 'sem SSIDs de exemplo'}
                </p>
              </div>
              {watch.place.changedToNew && (
                <span className="shrink-0 text-[9px] font-bold text-red-400 border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                  DESLOCAMENTO RECENTE
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prontidão pessoal */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
            <Users className="h-4.5 w-4.5 text-white/50" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-white">Prontidão pessoal</p>
            <p className="text-[11px] text-white/30">Tudo pronto para a app ajudar quando mais precisar?</p>
          </div>
        </div>
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-2">
          <ReadinessItem ok={(contacts?.length ?? 0) > 0} label={`Contactos de emergência (${contacts?.length ?? 0})`} to="/dashboard/contacts" />
          <ReadinessItem ok={!!checkinConfig?.is_active} label="Check-in seguro configurado" to="/dashboard/checkin" />
          <ReadinessItem ok={net.registry.length + ble.registry.length > 0} label="Radar com histórico do ambiente" to="/dashboard/net-radar" />
          <ReadinessItem ok={watch.watching} label="Vigilância contínua activa" to="/dashboard/seguranca" />
          <ReadinessItem ok={ble.trailRunning || net.trailRunning} label="Rastro automático ligado" to="/dashboard/ble" />
          <ReadinessItem ok={events.some((e) => e.synced)} label="Diário sincronizado na nuvem" to="/dashboard/seguranca" />
        </div>
        <div className="px-5 pb-4 flex flex-wrap gap-2 text-[11px]">
          <Link to="/dashboard/queda" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 transition"><Activity className="h-3.5 w-3.5" /> Deteção de queda</Link>
          <Link to="/dashboard/ficha-medica" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 transition"><Archive className="h-3.5 w-3.5" /> Ficha médica</Link>
          <Link to="/dashboard/discreto" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 transition"><Fingerprint className="h-3.5 w-3.5" /> Modo discreto</Link>
          <Link to="/dashboard/evidencias" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 transition"><Eye className="h-3.5 w-3.5" /> Cofre de evidências</Link>
        </div>
      </div>

      {/* Locais conhecidos (v3.18.0) */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
            <Fingerprint className={cn('h-4.5 w-4.5', places.length ? 'text-brand' : 'text-white/40')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm text-white">Locais conhecidos</p>
            <p className="text-[11px] text-white/30">
              {places.length} local(is) pela impressão digital Wi-Fi · onde costuma estar
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost" size="sm"
              onClick={() => exportPlaces(places)}
              disabled={places.length === 0}
              className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleSyncPlaces}
              disabled={syncingPlaces || !user || places.length === 0}
              className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06] gap-1.5"
            >
              {syncingPlaces ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Nuvem</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { clearKnownPlaces(); toast.info('Locais apagados') }}
              disabled={places.length === 0}
              className="h-8 px-2.5 text-[11px] text-red-400/70 hover:bg-red-500/10 rounded-lg border border-red-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {places.length === 0 ? (
          <p className="px-5 py-6 text-center text-xs text-white/25">
            A vigilância contínua regista cada sítio pelo padrão das redes Wi-Fi — ative a sentinela para começar.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-[260px] overflow-y-auto">
            {places.slice(0, 12).map((p) => (
              <div key={p.hash} className="px-5 py-3 flex items-center gap-3">
                <span
                  className={cn(
                    'shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border',
                    p.seenCount > 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25',
                  )}
                >
                  {p.seenCount > 1 ? 'HABITUAL' : 'NOVO'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/85 font-medium leading-tight">{p.label}</p>
                  <p className="text-[10px] text-white/30 font-mono truncate">
                    {p.sampleSsids.slice(0, 2).join(' · ') || '—'}
                    {typeof p.lat === 'number' && typeof p.lng === 'number' ? ` · ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 text-[10px] text-white/35 leading-tight">
                  <p>{p.seenCount}×</p>
                  <p className="text-white/20">{new Date(p.lastSeen).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diário de segurança */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border bg-white/[0.03] border-white/[0.06]">
            <ScanLine className={cn('h-4.5 w-4.5', events.length ? 'text-brand' : 'text-white/40')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm text-white">Diário de segurança</p>
            <p className="text-[11px] text-white/30">
              {events.length} evento(s) locais · ameaças, rastreadores, SOS e sistema
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost" size="sm"
              onClick={() => exportSecurityEvents(getSecurityEvents())}
              disabled={events.length === 0}
              className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleSyncEvents}
              disabled={syncing || !user || events.length === 0}
              className="h-8 px-2.5 text-[11px] text-white/60 hover:bg-white/[0.06] rounded-lg border border-white/[0.06] gap-1.5"
            >
              {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Nuvem</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { clearSecurityEvents(); reloadEvents(); toast.info('Diário apagado') }}
              disabled={events.length === 0}
              className="h-8 px-2.5 text-[11px] text-red-400/70 hover:bg-red-500/10 rounded-lg border border-red-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
          {events.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-white/25">
              Nada registado ainda. Escanee o Radar de Redes ou ligue a vigilância contínua.
            </p>
          )}
          {events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
        </div>
      </div>

      {/* Nota da versão */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-brand/15 bg-brand/[0.03] p-4 flex gap-3"
      >
        <Radar className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <div className="text-[12px] text-white/45 leading-relaxed">
          <p className="font-semibold text-white/70 mb-1">Novidades v3.18</p>
          Inteligência de ambiente: veredicto correlacionado (rede + Bluetooth +
          local), locais conhecidos por impressão digital Wi-Fi com detecção de
          deslocamento abrupto (sinal de rapto/coação), congestionamento de
          canais com recomendação, fabricante por OUI, classificação de redes e
          tendência de sinal por rede. Tudo também no SMS/email do SOS.
        </div>
      </motion.div>
    </PullToRefresh>
  )
}
