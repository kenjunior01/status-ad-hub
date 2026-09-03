/**
 * GuardianCard — O ÚNICO interruptor do StatusAds Connect (v3.7.0).
 *
 * Desligado: cartão discreto "Protecção desligada" + botão ARMAR (1 toque).
 * Armado: cartão verde com pulso — mostra os gatilhos activos e opções.
 *
 * Desarmar exige SEGURAR 1.5s (evita desarme acidental no bolso — e se
 * alguém lhe tirar o telemóvel e tentar desarmar, o SOS pode já ter saído).
 *
 * variant="panel" → coluna esquerda do Dashboard (desktop)
 * variant="banner" → faixa horizontal sob a barra de estado (mobile)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldOff, Mic, VolumeX, Smartphone, Vibrate,
  ChevronDown, Hand, Power, Link as LinkIcon, Loader2, BellRing,
  BatteryWarning, ChevronRight,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useGuardian } from '@/hooks/useGuardian'
import { requestMotionPermission } from '@/lib/shake'
import { getNativePanic } from '@/lib/guardian'
import { haptic } from '@/lib/native'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DISARM_HOLD_MS = 1500

function useDisarmHold(onComplete: () => void) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    setProgress(0)
  }, [])

  const start = useCallback(() => {
    startRef.current = Date.now()
    setHolding(true)
    const tick = () => {
      const p = Math.min((Date.now() - startRef.current) / DISARM_HOLD_MS, 1)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        stop()
        void haptic('heavy')
        onComplete()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onComplete, stop])

  useEffect(() => stop, [stop])

  return { progress, holding, start, stop }
}

interface GuardianCardProps {
  variant?: 'panel' | 'banner'
}

export function GuardianCard({ variant = 'panel' }: GuardianCardProps) {
  const { config, arm, disarm, update } = useGuardian()
  const [expanded, setExpanded] = useState(false)
  const [arming, setArming] = useState(false)
  const disarmHold = useDisarmHold(() => {
    disarm()
    toast.success('Guardião desligado', { description: 'O telemóvel já não está de sentinela.' })
  })

  const doArm = useCallback(async () => {
    setArming(true)
    // iOS precisa de permissão de motion para o gatilho de agitação
    if (config.shakeEnabled) await requestMotionPermission()
    arm()
    setArming(false)
    setExpanded(false)
    void haptic('sos')
    toast.success('Guardião ACTIVO', {
      description: 'Sentinela 24/7 armada — Agite ×3, atalho SOS ou Power ×4, mesmo com a app fechada.',
      duration: 6000,
    })
  }, [arm, config.shakeEnabled])

  const armed = config.armed

  // ── BANNER (mobile) ────────────────────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}
        className="mx-3 mt-2 z-30"
      >
        <div
          className={cn(
            'rounded-2xl border backdrop-blur-xl overflow-hidden transition-colors duration-300',
            armed ? 'bg-emerald-500/[0.08] border-emerald-400/30' : 'bg-background/70 border-white/[0.08]'
          )}
        >
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <div className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-xl shrink-0',
              armed ? 'bg-emerald-500/15 border border-emerald-400/25' : 'bg-white/[0.04] border border-white/[0.08]'
            )}>
              {armed ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldOff className="h-4 w-4 text-white/30" />
              )}
              {armed && <span className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-ping opacity-30" />}
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex-1 min-w-0 text-left"
            >
              <p className={cn('text-xs font-bold leading-none', armed ? 'text-emerald-300' : 'text-white/50')}>
                {armed ? 'Guardião activo' : 'Guardião desligado'}
              </p>
              <p className="text-[10px] text-white/35 mt-1 truncate">
                {armed
                  ? 'Sentinela 24/7 · Agite ×3 · Power ×4 — mesmo com a app fechada'
                  : 'Toque para ver como armar o telemóvel'}
              </p>
            </button>
            {armed ? (
              <button
                onPointerDown={disarmHold.start}
                onPointerUp={disarmHold.stop}
                onPointerLeave={disarmHold.stop}
                className="relative shrink-0 h-8 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/60 overflow-hidden active:scale-95 transition-transform"
              >
                {disarmHold.holding && (
                  <span
                    className="absolute inset-y-0 left-0 bg-red-500/40"
                    style={{ width: `${disarmHold.progress * 100}%` }}
                  />
                )}
                <span className="relative">{disarmHold.holding ? 'Segure…' : 'Desarmar'}</span>
              </button>
            ) : (
              <button
                onClick={doArm}
                disabled={arming}
                className="shrink-0 h-8 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {arming ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Armar
              </button>
            )}
          </div>
          <AnimatePresence>
            {expanded && <GuardianDetails config={config} update={update} />}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // ── PANEL (desktop, coluna esquerda) ───────────────────────────────────────
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors duration-300 overflow-hidden',
        armed ? 'bg-emerald-500/[0.07] border-emerald-400/25' : 'bg-white/[0.02] border-white/[0.06]'
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl shrink-0',
          armed ? 'bg-emerald-500/15 border border-emerald-400/25' : 'bg-white/[0.04] border border-white/[0.08]'
        )}>
          {armed ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldOff className="h-4 w-4 text-white/30" />
          )}
          {armed && <span className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-ping opacity-25" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('text-xs font-bold', armed ? 'text-emerald-300' : 'text-white/60')}>Modo Guardião</p>
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wider',
              armed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.05] text-white/30'
            )}>
              {armed ? 'ARMADO' : 'OFF'}
            </span>
          </div>
          <p className="text-[10px] text-white/35 mt-0.5">
            {armed
              ? 'Sentinela 24/7 activa — funciona mesmo com a app fechada'
              : 'Arme para o telemóvel proteger sozinho'}
          </p>
        </div>
        {armed ? (
          <button
            onPointerDown={disarmHold.start}
            onPointerUp={disarmHold.stop}
            onPointerLeave={disarmHold.stop}
            className="relative shrink-0 h-8 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/60 overflow-hidden hover:bg-white/[0.1] transition-colors"
          >
            {disarmHold.holding && (
              <span className="absolute inset-y-0 left-0 bg-red-500/40" style={{ width: `${disarmHold.progress * 100}%` }} />
            )}
            <span className="relative">{disarmHold.holding ? 'Segure…' : 'Desarmar'}</span>
          </button>
        ) : (
          <button
            onClick={doArm}
            disabled={arming}
            className="shrink-0 h-8 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold flex items-center gap-1.5 transition-colors"
          >
            {arming ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Armar
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && <GuardianDetails config={config} update={update} />}
      </AnimatePresence>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-white/30 hover:text-white/50 border-t border-white/[0.04] transition-colors"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Menos' : 'Gatilhos e opções'}
      </button>
    </div>
  )
}

/** Lista de gatilhos + opções (compartilhada entre variantes) */
function GuardianDetails({ config, update }: {
  config: { autoRecord: boolean; silent: boolean; shakeEnabled: boolean; armed: boolean }
  update: (patch: { autoRecord?: boolean; silent?: boolean; shakeEnabled?: boolean }) => void
}) {
  const isAndroid = Capacitor.getPlatform() === 'android'
  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null)

  // Estado da bateria (só Android — a sentinela pode ser "adormecida" por OEMs)
  useEffect(() => {
    if (!isAndroid) return
    const panic = getNativePanic()
    if (!panic) { setBatteryExempt(true); return }
    panic.batteryStatus()
      .then((r) => setBatteryExempt(!!r.exempt))
      .catch(() => setBatteryExempt(true))
  }, [isAndroid])

  const requestExemption = useCallback(async () => {
    const panic = getNativePanic()
    if (!panic) return
    try {
      await panic.requestBatteryExemption()
      toast.info('Escolha "Permitir" no diálogo do sistema', {
        description: 'Isto impede o Android de adormecer a sentinela do Guardião.',
      })
      setBatteryExempt(true)
    } catch {
      toast.error('Abra manualmente: Definições › Bateria › StatusAds Connect › Sem restrições')
    }
  }, [])

  const toggles = [
    { key: 'shakeEnabled' as const, icon: Vibrate, label: 'Agitação forte ×3', desc: 'Agarraram-lhe o braço — agite o telemóvel' },
    { key: 'autoRecord' as const, icon: Mic, label: 'Gravação automática', desc: 'Áudio + fotos disfarçadas ao disparar' },
    { key: 'silent' as const, icon: VolumeX, label: 'Modo silencioso', desc: 'Sem sirene — o ladrão não percebe' },
  ]
  const triggers = [
    { icon: Vibrate, text: 'Agite o telemóvel 3× com força' },
    { icon: LinkIcon, text: 'Long-press no ícone da app → SOS' },
    { icon: Smartphone, text: 'Atalho rápido "SOS" (barra do Android)' },
    { icon: Power, text: 'Botão Power ×4 com o ecrã apagado' },
  ]

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-3.5 pb-3.5 pt-1 space-y-3">
        {/* Sentinela 24/7: notificação + bateria (só Android) */}
        {isAndroid && (
          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5 p-2 rounded-xl border border-emerald-400/[0.15] bg-emerald-500/[0.04]">
              <BellRing className="h-3.5 w-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/50 leading-relaxed">
                A notificação discreta <b className="text-white/70">«Protecção activa»</b> mantém a sentinela
                viva 24/7 — <b className="text-white/70">funciona mesmo com a app fechada</b> e religa-se
                sozinha ao reiniciar o telemóvel. Não a deslize.
              </p>
            </div>
            {batteryExempt === false && (
              <button
                onClick={requestExemption}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] text-left active:scale-[0.99] transition-transform"
              >
                <BatteryWarning className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-amber-300">Optimizar bateria</span>
                  <span className="block text-[9px] text-white/40">Permita «Sem restrições» para a sentinela nunca dormir (Xiaomi/Samsung)</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-1.5">
          {toggles.map(t => (
            <button
              key={t.key}
              onClick={() => update({ [t.key]: !config[t.key] })}
              className={cn(
                'flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors',
                config[t.key]
                  ? 'bg-white/[0.04] border-white/[0.1]'
                  : 'bg-transparent border-white/[0.04] opacity-50'
              )}
            >
              <t.icon className={cn('h-3.5 w-3.5 shrink-0', config[t.key] ? 'text-emerald-400' : 'text-white/30')} />
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-white/80">{t.label}</span>
                <span className="block text-[9px] text-white/30 truncate">{t.desc}</span>
              </span>
              <span className={cn(
                'w-8 h-[18px] rounded-full relative transition-colors shrink-0',
                config[t.key] ? 'bg-emerald-500/80' : 'bg-white/10'
              )}>
                <span className={cn(
                  'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all',
                  config[t.key] ? 'left-[16px]' : 'left-0.5'
                )} />
              </span>
            </button>
          ))}
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[9px] font-bold tracking-wider text-white/40 mb-1.5">COMO DISPARAR O SOS (armado)</p>
          <div className="space-y-1.5">
            {triggers.map((tr, i) => (
              <div key={i} className="flex items-center gap-2">
                <tr.icon className="h-3 w-3 text-white/35 shrink-0" />
                <span className="text-[10px] text-white/50">{tr.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/[0.05]">
            <Hand className="h-3 w-3 text-amber-400/70 shrink-0 mt-0.5" />
            <p className="text-[9px] text-white/35 leading-relaxed">
              Cada disparo tem contagem decrescente para cancelar — se for falso alarme, toque em <b className="text-white/60">CANCELO</b>.
              Desarmar exige segurar 1.5s.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
