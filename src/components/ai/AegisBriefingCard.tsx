/**
 * AegisBriefingCard — Briefing do Copiloto IA no Dashboard (v3.19.0).
 *
 * Versão compacta do Copiloto AEGIS: mostra o veredicto correlacionado
 * do ambiente + 1 insight e 1 acção do analista local (offline, sem
 * depender de chave IA). Tocável → abre a Central de Segurança onde
 * está o chat completo.
 *
 * Design dourado StatusAds (APK + web partilham; o Dashboard é o mesmo
 * nos dois — o que muda por plataforma é a Central e a consola tática).
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, ShieldAlert, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useBleRadar } from '@/hooks/useBleRadar'
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useContacts } from '@/hooks/useContacts'
import { useCheckIn } from '@/hooks/useCheckIn'
import { getSecurityEvents } from '@/lib/security-events'
import { getKnownPlaces, getPlaceState, correlateEnvironment } from '@/lib/net-intel'
import { dailyBriefing, type CopilotSnapshot } from '@/lib/ai-copilot'

export default function AegisBriefingCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const net = useNetRadar()
  const ble = useBleRadar()
  const watch = useRadarWatch()
  const { contacts } = useContacts()
  const { config: checkinConfig } = useCheckIn()

  const briefing = useMemo(() => {
    const threats = net.threats ?? []
    const trackers = ble.trackers ?? []
    const verdict = watch.verdict ?? correlateEnvironment(threats, trackers, getPlaceState())
    let score = 100
    score -= Math.round(((net.riskScore ?? 0) / 100) * 25)
    if (trackers.some((t) => t.severity === 'high')) score -= 30
    else if (trackers.length > 0) score -= 15
    if ((contacts?.length ?? 0) === 0) score -= 12
    if (!checkinConfig?.is_active) score -= 8
    if (!watch.watching) score -= 10
    if (watch.placeAnomaly) score -= 25
    const snapshot: CopilotSnapshot = {
      securityScore: Math.max(0, Math.min(100, score)),
      networksLive: net.networks?.length ?? 0,
      registryWifi: net.registry?.length ?? 0,
      threats,
      riskNet: net.riskScore ?? 0,
      registryBle: ble.registry?.length ?? 0,
      devicesBle: ble.devices?.length ?? 0,
      trackers,
      watching: watch.watching,
      cycles: watch.cycles,
      riskWatch: watch.riskScore,
      placeAnomaly: watch.placeAnomaly,
      congestion: watch.congestion ?? null,
      verdict,
      places: getKnownPlaces(),
      events: getSecurityEvents().slice(0, 10),
      contactsCount: contacts?.length ?? 0,
      checkinActive: !!checkinConfig?.is_active,
    }
    return dailyBriefing(snapshot)
  }, [net, ble, watch, contacts, checkinConfig])

  const toneColor =
    briefing.level === 'critical' ? '#f87171'
      : briefing.level === 'elevated' ? '#fbbf24'
        : '#34d399'

  // ── COMPACTO (faixa flutuante mobile sobre a bottom bar) ──
  if (compact) {
    return (
      <motion.button
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
        onClick={() => navigate('/dashboard/seguranca')}
        className="absolute bottom-[76px] left-3 right-3 z-30 md:hidden"
      >
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl backdrop-blur-2xl border"
          style={{
            background: 'linear-gradient(90deg, rgba(26,23,17,0.92), rgba(18,16,12,0.94))',
            borderColor: `${toneColor}33`,
          }}
        >
          <div className="relative h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: `${toneColor}14`, borderColor: `${toneColor}30` }}>
            <Sparkles className="h-4 w-4" style={{ color: toneColor }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-bold leading-tight" style={{ color: toneColor }}>
              AEGIS · {briefing.headline}
            </p>
            <p className="text-[10px] text-white/45 leading-tight truncate">{briefing.insights[0] ?? briefing.actions[0]}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: `${toneColor}88` }} />
        </div>
      </motion.button>
    )
  }

  // ── COMPLETO (painel direito do desktop) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="mb-4"
    >
      <div
        className="rounded-2xl border p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toneColor}08, rgba(255,255,255,0.015))`,
          borderColor: `${toneColor}30`,
        }}
      >
        {/* brilho de canto */}
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl pointer-events-none" style={{ background: `${toneColor}18` }} />
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center border shrink-0" style={{ background: `${toneColor}14`, borderColor: `${toneColor}30` }}>
            {briefing.level === 'calm' ? <Crosshair className="h-3.5 w-3.5" style={{ color: toneColor }} /> : <ShieldAlert className="h-3.5 w-3.5" style={{ color: toneColor }} />}
          </div>
          <p className="text-[11px] font-bold flex-1" style={{ color: toneColor }}>AEGIS · {briefing.headline}</p>
          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border uppercase" style={{ color: `${toneColor}cc`, borderColor: `${toneColor}35` }}>
            IA
          </span>
        </div>
        <div className="space-y-1.5">
          {briefing.insights.slice(0, 2).map((i, k) => (
            <p key={k} className="text-[10.5px] text-white/55 leading-snug flex gap-1.5">
              <span className="shrink-0" style={{ color: toneColor }}>›</span>{i}
            </p>
          ))}
          <p className="text-[10.5px] text-white/75 leading-snug flex gap-1.5 font-medium">
            <span className="shrink-0" style={{ color: toneColor }}>→</span>{briefing.actions[0]}
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/seguranca')}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-[10.5px] font-bold border transition active:scale-[0.98]"
          style={{ background: `${toneColor}10`, borderColor: `${toneColor}35`, color: toneColor }}
        >
          Perguntar ao Copiloto <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}
