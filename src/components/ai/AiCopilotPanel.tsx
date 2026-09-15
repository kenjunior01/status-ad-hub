/**
 * AiCopilotPanel — AEGIS · Copiloto de Segurança IA (v3.19.0) — DESIGN WEB.
 *
 * Chat inteligente que analisa os dados reais do ambiente (Wi-Fi, BLE,
 * locais, eventos, score) e responde em linguagem natural.
 *
 *   · IA na nuvem (LLM compatível OpenAI via edge function `ai-analyst`)
 *     quando o secret AI_API_KEY está configurado no Supabase;
 *   · Analista Local (motor de regras offline) — fallback automático,
 *     funciona sempre e sem enviar dados para fora do dispositivo.
 *
 * Design dourado StatusAds (a APK usa a consola tática exclusiva).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SendHorizonal, ShieldQuestion, Sparkles, Cloud, HardDrive } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useBleRadar } from '@/hooks/useBleRadar'
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useContacts } from '@/hooks/useContacts'
import { useCheckIn } from '@/hooks/useCheckIn'
import { getSecurityEvents } from '@/lib/security-events'
import { getKnownPlaces, getPlaceState, correlateEnvironment } from '@/lib/net-intel'
import {
  askCopilot, copilotCloudConfigured, localBriefingText, copilotMsgId,
  type CopilotMsg, type CopilotSnapshot,
} from '@/lib/ai-copilot'

const CHIPS = [
  'Briefing do ambiente',
  'Como estou protegido?',
  'Rastreadores e Bluetooth',
  'Redes Wi-Fi suspeitas',
  'O que melhorar?',
]

export default function AiCopilotPanel({ securityScore }: { securityScore?: number }) {
  const net = useNetRadar()
  const ble = useBleRadar()
  const watch = useRadarWatch()
  const { contacts } = useContacts()
  const { config: checkinConfig } = useCheckIn()

  const [messages, setMessages] = useState<CopilotMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [cloudOk, setCloudOk] = useState<boolean | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Verifica (uma vez) se a IA na nuvem está configurada
  useEffect(() => {
    let alive = true
    copilotCloudConfigured().then((ok) => { if (alive) setCloudOk(ok) })
    return () => { alive = false }
  }, [])

  // Mensagem de abertura com o briefing local
  useEffect(() => {
    const snapshot = buildSnapshot()
    setMessages([{
      id: copilotMsgId(),
      role: 'ai',
      text: localBriefingText(snapshot),
      ts: Date.now(),
      source: 'local',
    }])
    // apenas na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snapshot = useMemo(buildSnapshot, [net, ble, watch, contacts, checkinConfig])

  function buildSnapshot(): CopilotSnapshot {
    const threats = net.threats ?? []
    const trackers = ble.trackers ?? []
    const verdict = watch.verdict ?? correlateEnvironment(threats, trackers, getPlaceState())
    const events = getSecurityEvents().slice(0, 10)
    // fallback de score se o pai não fornecer
    let score = 100
    score -= Math.round(((net.riskScore ?? 0) / 100) * 25)
    if (trackers.some((t) => t.severity === 'high')) score -= 30
    else if (trackers.length > 0) score -= 15
    if ((contacts?.length ?? 0) === 0) score -= 12
    if (!checkinConfig?.is_active) score -= 8
    if (!watch.watching) score -= 10
    if (watch.placeAnomaly) score -= 25
    return {
      securityScore: Math.max(0, Math.min(100, securityScore ?? score)),
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
      events,
      contactsCount: contacts?.length ?? 0,
      checkinActive: !!checkinConfig?.is_active,
    }
  }

  const scrollDown = () => {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const userMsg: CopilotMsg = { id: copilotMsgId(), role: 'user', text: q, ts: Date.now(), source: 'local' }
    const history = messages
    setMessages((m) => [...m, userMsg])
    setBusy(true)
    scrollDown()
    try {
      const res = await askCopilot(q, snapshot, history)
      setMessages((m) => [...m, { id: copilotMsgId(), role: 'ai', text: res.text, ts: Date.now(), source: res.source }])
    } catch {
      setMessages((m) => [...m, {
        id: copilotMsgId(), role: 'ai', source: 'local',
        text: 'Não consegui analisar agora — tente novamente em instantes.',
        ts: Date.now(),
      }])
    } finally {
      setBusy(false)
      scrollDown()
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-gradient-to-b from-[rgba(212,175,55,0.05)] to-[rgba(255,255,255,0.01)] overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.05]">
        <div className="relative h-10 w-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-[#f5d76e]" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#12110e] animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white flex items-center gap-1.5">
            Copiloto AEGIS
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[rgba(212,175,55,0.12)] text-[#f5d76e] border border-[rgba(212,175,55,0.25)]">IA</span>
          </p>
          <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
            {cloudOk === null ? 'a verificar IA na nuvem…' : cloudOk
              ? (<><Cloud className="h-3 w-3 text-emerald-400" /> IA na nuvem activa + analista local</>)
              : (<><HardDrive className="h-3 w-3 text-amber-400/80" /> Analista local offline (sem chave IA configurada)</>)}
          </p>
        </div>
      </div>

      {/* Log de mensagens */}
      <div ref={logRef} className="aegis-chat-log max-h-[380px] overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5', m.role === 'user'
              ? 'bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] text-white/90'
              : 'bg-white/[0.03] border border-white/[0.06] text-white/80')}
            >
              {m.role === 'ai' && (
                <p className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase mb-1"
                  style={{ color: m.source === 'cloud' ? '#6ee7b7' : 'rgba(245,215,110,0.7)' }}>
                  {m.source === 'cloud' ? <Cloud className="h-2.5 w-2.5" /> : <HardDrive className="h-2.5 w-2.5" />}
                  {m.source === 'cloud' ? 'AEGIS · IA nuvem' : 'AEGIS · analista local'}
                </p>
              )}
              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.06]">
              <span className="aegis-typing"><span /><span /><span /></span>
            </div>
          </div>
        )}
      </div>

      {/* Chips de sugestão */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto aegis-chat-log">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => void send(c)} disabled={busy} className="aegis-chip shrink-0 disabled:opacity-40">
            {c}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); void send(input) }}
        className="px-4 pb-4 pt-1 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre a sua segurança…"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-11 w-11 rounded-xl bg-gradient-to-b from-[#d4af37] to-[#b8952e] flex items-center justify-center shadow-[0_4px_14px_rgba(212,175,55,0.35)] disabled:opacity-40 active:scale-95 transition"
          aria-label="Enviar"
        >
          <SendHorizonal className="h-4.5 w-4.5 text-[#0c0b08]" />
        </button>
      </form>
    </div>
  )
}
