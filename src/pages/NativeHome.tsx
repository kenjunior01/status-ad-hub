/**
 * NativeHome — CONSOLE GUARDIÃO (v3.37.0) — o ecrã inicial da APK.
 *
 * A APK deixa de abrir numa "página com textos" (a landing da web) e
 * passa a abrir DIRECTO nas funcionalidades: um console com design
 * PRÓPRIO da app nativa (identidade Tactical verde-radar, tipografia
 * mono, HUD) — não uma réplica da versão web.
 *
 * Tudo a um toque no primeiro ecrã:
 *   · SENTINELA  — armar/desarmar a vigilância contínua + verificar
 *                  o ambiente agora, com o risco e o local ao vivo
 *   · CAMUFLAGEM — ACTIVAR imediatamente (um toque) ou escolher o
 *                  disfarce; na APK troca também o ícone no launcher
 *   · ACÇÕES     — SOS, 112, sirene, partilhar GPS, radares, evidências,
 *                  viagens, chamada falsa, check-in e painel completo
 *   · À VOLTA    — quem está ao redor agora (histórico de presenças)
 *
 * Na WEB esta página não faz parte do fluxo (a rota redirecciona para
 * o /dashboard dourado) — o console é exclusivo da app nativa.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radar as RadarIcon, ShieldAlert, Phone, Volume2, VolumeX, Share2, Wifi,
  Bluetooth, Shield, Archive, Map, PhoneIncoming, ShieldCheck, EyeOff,
  LayoutDashboard, RefreshCw, ChevronRight, MapPin, BatteryCharging,
  CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { haptic, geoGetCurrent } from '@/lib/native'
import { shareLocation } from '@/lib/share'
import { startEmergencyAlarm, stopEmergencyAlarm, isAlarmPlaying } from '@/lib/emergency-alarm'
import { presenceNowContext } from '@/lib/presence-history'
import { Capacitor } from '@capacitor/core'

/** Nível de bateria do aparelho (0-100) — null quando indisponível. */
function useDeviceBattery(): { level: number | null; charging: boolean } {
  const [bat, setBat] = useState<{ level: number | null; charging: boolean }>({ level: null, charging: false })
  useEffect(() => {
    let stop = false
    try {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void }>
      }
      nav.getBattery?.().then((b) => {
        if (stop) return
        const read = () => setBat({ level: Math.round(b.level * 100), charging: b.charging })
        read()
        b.addEventListener('levelchange', read)
        b.addEventListener('chargingchange', read)
      }).catch(() => { /* sem bateria */ })
    } catch { /* sem bateria */ }
    return () => { stop = true }
  }, [])
  return bat
}

function agoLabel(ts: number): string {
  if (!ts) return '—'
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  return `${h}h`
}

/** Item da grelha de acções do console. */
function ActionTile(opts: {
  icon: React.ElementType
  label: string
  sub: string
  tone?: 'green' | 'red' | 'amber' | 'cyan'
  active?: boolean
  onClick: () => void
}) {
  const Icon = opts.icon
  const toneColor
    = opts.tone === 'red' ? 'var(--tac-red)'
    : opts.tone === 'amber' ? 'var(--tac-amber)'
    : opts.tone === 'cyan' ? 'var(--tac-cyan)'
    : 'var(--tac-green)'
  return (
    <button
      type="button"
      onClick={opts.onClick}
      className="tac-btn tac-btn-ghost relative flex flex-col items-start gap-1.5 p-3 text-left"
      style={opts.active ? { borderColor: `${toneColor}66`, background: `${toneColor}14` } : undefined}
    >
      {opts.active && (
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: toneColor }} />
      )}
      <Icon className="h-4.5 w-4.5" style={{ color: toneColor }} strokeWidth={1.8} />
      <span className="text-[12px] font-bold text-emerald-50/90 leading-tight">{opts.label}</span>
      <span className="text-[9.5px] text-emerald-100/35 leading-tight">{opts.sub}</span>
    </button>
  )
}

export default function NativeHome() {
  const navigate = useNavigate()
  const radar = useRadarWatch()
  const discreet = useDiscreetMode()
  const network = useNetworkStatus(true)
  const bat = useDeviceBattery()

  const [verifying, setVerifying] = useState(false)
  const [alarmOn, setAlarmOn] = useState(false)
  const [presence, setPresence] = useState(presenceNowContext())
  const isAndroid = Capacitor.getPlatform() === 'android'

  // contexto "à volta agora" — refresca a cada 20 s (leitura local, barata)
  useEffect(() => {
    const tick = () => setPresence(presenceNowContext())
    tick()
    const iv = window.setInterval(tick, 20_000)
    return () => window.clearInterval(iv)
  }, [])

  const toggleSentinel = () => {
    void haptic('medium')
    const next = radar.toggle()
    toast.success(next ? 'Sentinela ACTIVADA' : 'Sentinela desactivada', {
      description: next ? 'Vigilância Wi-Fi + BLE a cada 45s, mesmo com o ecrã apagado (com isenção de bateria).' : undefined,
    })
  }

  const verifyNow = async () => {
    void haptic('light')
    setVerifying(true)
    toast.info('A verificar o ambiente…')
    try {
      await radar.runOnce()
      setPresence(presenceNowContext())
      toast.success('Verificação concluída')
    } catch {
      toast.error('Não foi possível verificar o ambiente agora')
    } finally {
      setVerifying(false)
    }
  }

  // CAMUFLAGEM a UM TOQUE — a função fica pronta desde o primeiro ecrã
  const activateCamouflage = () => {
    void haptic('medium')
    discreet.activate()
    toast.success('Camuflagem ACTIVA — a app agora parece outra coisa', {
      description: 'Continua activa mesmo se fechar a app. Long-press 2s no canto superior esquerdo + PIN para voltar.',
      duration: 6000,
    })
  }

  const shareNow = async () => {
    void haptic('light')
    toast.info('A obter a localização…')
    const pos = await geoGetCurrent(8_000).catch(() => null)
    if (!pos) {
      toast.error('Sem GPS disponível — tente ao ar livre')
      return
    }
    const ok = await shareLocation({
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy,
      deviceName: 'StatusAds Connect',
    })
    if (!ok) toast.error('Não foi possível partilhar a localização')
  }

  const toggleAlarm = () => {
    if (alarmOn) {
      stopEmergencyAlarm()
      setAlarmOn(false)
      toast.success('Sirene desligada')
    } else {
      startEmergencyAlarm()
      setAlarmOn(true)
      void haptic('heavy')
      toast.success('Sirene de emergência ACTIVA')
    }
  }

  const go = (to: string) => {
    void haptic('light')
    navigate(to)
  }

  const risk = radar.riskScore
  const riskColor = risk >= 75 ? 'var(--tac-red)' : risk >= 50 ? '#fb923c' : risk >= 25 ? 'var(--tac-amber)' : 'var(--tac-green)'
  const placeLabel = radar.place?.current?.label || null
  const verdictLabel = radar.verdict?.label || null
  const verdictCritical = radar.verdict?.level === 'critical'

  return (
    <div
      className="tactical min-h-screen text-emerald-50 relative"
    >
      {/* linhas de varredura do HUD — identidade própria da APK */}
      <div className="tac-scanline pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-md px-4 pt-4 pb-6 space-y-4">
        {/* ── CABEÇALHO — GUARDIÃO ─────────────────────────────── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.07)]">
              <RadarIcon className="h-5 w-5" style={{ color: 'var(--tac-green)' }} strokeWidth={1.8} />
              <span className="tac-dot absolute -top-0.5 -right-0.5" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-bold tracking-[0.18em] text-emerald-50 leading-none">
                GUARDIÃO
              </h1>
              <p className="font-mono text-[9px] tracking-[0.28em] text-emerald-100/35 mt-1">
                STATUSADS CONNECT · APK
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {!network.isOnline && (
                <span className="tac-badge tac-badge-danger font-mono text-[8.5px]">OFFLINE</span>
              )}
              {bat.level !== null && (
                <span className="tac-badge font-mono text-[8.5px] flex items-center gap-1">
                  <BatteryCharging className="h-2.5 w-2.5" />
                  {bat.level}%
                </span>
              )}
            </div>
            <span className="font-mono text-[9px] tracking-[0.2em] text-emerald-100/25">
              {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} · v3.40
            </span>
          </div>
        </header>

        {/* ── SENTINELA — herói do console ─────────────────────── */}
        <section className="tac-panel relative overflow-hidden p-4">
          <div className="tac-sweep absolute inset-0 opacity-[0.13]" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="tac-label">SENTINELA · VIGILÂNCIA CONTÍNUA</p>
              <div className="flex items-center gap-2">
                {radar.watching ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--tac-green)' }} />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-emerald-100/40" />
                )}
                <span
                  className="font-mono text-xl font-bold tracking-wider"
                  style={{ color: radar.watching ? 'var(--tac-green)' : 'rgba(209,250,229,0.45)' }}
                >
                  {radar.watching ? 'ARMADA' : 'EM ESPERA'}
                </span>
              </div>
              <div className="font-mono text-[10px] text-emerald-100/40 space-y-0.5">
                <p>ÚLTIMO CICLO: {agoLabel(radar.lastCycleAt)} · {radar.cycles} CICLOS</p>
                {placeLabel && <p className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {placeLabel}</p>}
              </div>
            </div>
            {/* medidor de risco */}
            <div className="relative h-20 w-20 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(${riskColor} ${Math.round((risk / 100) * 360)}deg, rgba(52,211,153,0.08) 0deg)` }}
              />
              <div className="absolute inset-[7px] rounded-full bg-[#070c0a] border border-[rgba(52,211,153,0.2)] flex flex-col items-center justify-center">
                <span className="tac-value text-2xl leading-none" style={{ color: riskColor }}>{risk}</span>
                <span className="tac-label text-[7px]">RISCO</span>
              </div>
            </div>
          </div>

          {verdictLabel && (
            <div
              className="relative mt-3 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] leading-snug"
              style={{
                borderColor: verdictCritical ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.18)',
                background: verdictCritical ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.04)',
                color: verdictCritical ? '#fca5a5' : 'rgba(209,250,229,0.65)',
              }}
            >
              {verdictLabel.toUpperCase()}
              {radar.verdict?.reasons && radar.verdict.reasons.length > 0 && (
                <span className="text-emerald-100/40"> · {radar.verdict.reasons[0]}</span>
              )}
            </div>
          )}

          <div className="relative mt-3 flex gap-2">
            <button type="button" onClick={toggleSentinel} className="tac-btn flex-1">
              {radar.watching ? 'DESARMAR' : 'ARMAR SENTINELA'}
            </button>
            <button type="button" onClick={() => void verifyNow()} disabled={verifying} className="tac-btn tac-btn-ghost flex-1">
              {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RadarIcon className="h-3.5 w-3.5" />}
              {verifying ? 'A VERIFICAR…' : 'VERIFICAR AGORA'}
            </button>
          </div>
        </section>

        {/* ── CAMUFLAGEM — pronta desde o arranque ─────────────── */}
        <section className="tac-panel relative p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="tac-label">CAMUFLAGEM · DISFARCE A APP</p>
              <div className="flex items-center gap-2">
                <EyeOff className="h-4.5 w-4.5" style={{ color: discreet.isActive ? 'var(--tac-cyan)' : 'rgba(209,250,229,0.4)' }} />
                <span className="font-mono text-sm font-bold" style={{ color: discreet.isActive ? 'var(--tac-cyan)' : 'rgba(209,250,229,0.5)' }}>
                  {discreet.isActive ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <p className="font-mono text-[9.5px] text-emerald-100/35 leading-relaxed max-w-[220px]">
                {discreet.isActive
                  ? 'A app está disfarçada. O SOS e o Guardião continuam activos em background.'
                  : isAndroid
                    ? 'Um toque disfarça o ecrã. Também pode trocar o ícone no launcher.'
                    : 'Um toque disfarça o ecrã da app inteira.'}
              </p>
            </div>
            <button
              type="button"
              onClick={discreet.isActive ? () => go('/dashboard/camuflar') : activateCamouflage}
              className="tac-btn shrink-0"
              style={discreet.isActive ? { borderColor: 'rgba(34,211,238,0.35)', color: 'var(--tac-cyan)' } : undefined}
            >
              {discreet.isActive ? 'GERIR' : 'ACTIVAR'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => go('/dashboard/camuflar')}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-[rgba(52,211,153,0.14)] bg-[rgba(52,211,153,0.03)] px-3 py-2 font-mono text-[10px] text-emerald-100/50 transition-colors hover:bg-[rgba(52,211,153,0.07)]"
          >
            ESCOLHER DISFARCE · 7 DISGUISES + ÍCONE NO LAUNCHER
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* ── À VOLTA AGORA ────────────────────────────────────── */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { n: presence.total.length, l: 'À VOLTA' },
            { n: presence.companions.length, l: 'NO CAMINHO' },
            { n: presence.owned.length, l: 'COM DONO' },
          ].map((s) => (
            <div key={s.l} className="tac-panel px-2 py-2.5 text-center">
              <p className="tac-value text-xl leading-none">{s.n}</p>
              <p className="tac-label mt-1 text-[8px]">{s.l}</p>
            </div>
          ))}
        </section>

        {/* ── GRELHA DE ACÇÕES — tudo a um toque ───────────────── */}
        <section className="space-y-2">
          <p className="tac-label px-1">ACÇÕES RÁPIDAS</p>
          <div className="grid grid-cols-2 gap-2">
            <ActionTile
              icon={ShieldAlert}
              label="SOS Emergência"
              sub="Alerta + GPS + contactos"
              tone="red"
              onClick={() => go('/dashboard/emergency')}
            />
            <ActionTile
              icon={Phone}
              label="Ligar 112"
              sub="Emergência nacional"
              tone="red"
              onClick={() => { void haptic('heavy'); window.location.href = 'tel:112' }}
            />
            <ActionTile
              icon={alarmOn ? VolumeX : Volume2}
              label={alarmOn ? 'Parar sirene' : 'Sirene'}
              sub={alarmOn ? 'A tocar — toque para parar' : 'Som alto para afastar'}
              tone="amber"
              active={alarmOn}
              onClick={toggleAlarm}
            />
            <ActionTile
              icon={Share2}
              label="Partilhar GPS"
              sub="Local actual a quem confia"
              onClick={() => void shareNow()}
            />
            <ActionTile
              icon={Wifi}
              label="Radar Wi-Fi"
              sub="Redes e ameaças à volta"
              onClick={() => go('/dashboard/net-radar')}
            />
            <ActionTile
              icon={Bluetooth}
              label="Radar BLE"
              sub="Rastreadores e perseguidores"
              onClick={() => go('/dashboard/ble')}
            />
            <ActionTile
              icon={Shield}
              label="Central Segurança"
              sub="Diário, locais e sync"
              onClick={() => go('/dashboard/seguranca')}
            />
            <ActionTile
              icon={Archive}
              label="Cofre Evidências"
              sub="Gravações REC no aparelho"
              onClick={() => go('/dashboard/evidencias')}
            />
            <ActionTile
              icon={Map}
              label="Viagens"
              sub="Rastreamento de percurso"
              onClick={() => go('/dashboard/viagens')}
            />
            <ActionTile
              icon={PhoneIncoming}
              label="Chamada Falsa"
              sub="Saída discreta de situação"
              onClick={() => go('/dashboard/chamada-falsa')}
            />
            <ActionTile
              icon={ShieldCheck}
              label="Check-in"
              sub="Confirmar que está bem"
              onClick={() => go('/dashboard/checkin')}
            />
            <ActionTile
              icon={LayoutDashboard}
              label="Painel completo"
              sub="Mapa, dispositivos e mais"
              tone="cyan"
              onClick={() => go('/dashboard')}
            />
          </div>
        </section>

        <p className="pt-1 text-center font-mono text-[8.5px] tracking-[0.22em] text-emerald-100/20">
          CONSOLE EXCLUSIVO DA APP NATIVA · v3.40.0
        </p>
      </div>
    </div>
  )
}
