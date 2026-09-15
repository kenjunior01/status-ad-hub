/**
 * TacticalAiCopilot — AEGIS · CONSULTOR IA (v3.19.0) — EXCLUSIVO APK.
 *
 * Consola de inteligência estilo "mission control": verde-radar sobre
 * carvão, tipografia mono, respostas com efeito de escrita (typewriter),
 * comandos rápidos tipo terminal militar. NÃO existe na versão web —
 * a web usa o painel dourado (AiCopilotPanel).
 *
 * Fonte de inteligência: edge function `ai-analyst` (LLM na nuvem) com
 * fallback automático para o analista local offline (ai-copilot.ts).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal, CornerDownLeft, Cpu, HardDrive, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNetRadar } from '@/hooks/useNetRadar'
import { useBleRadar } from '@/hooks/useBleRadar'
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useContacts } from '@/hooks/useContacts'
import { useCheckIn } from '@/hooks/useCheckIn'
import { getSecurityEvents } from '@/lib/security-events'
import { getKnownPlaces, getPlaceState, correlateEnvironment } from '@/lib/net-intel'
import { haptic } from '@/lib/native'
import {
  askCopilot, copilotCloudConfigured, localBriefingText, copilotMsgId,
  type CopilotMsg, type CopilotSnapshot,
} from '@/lib/ai-copilot'

/** Comandos rápidos estilo terminal militar. */
const CMDS = [
  { cmd: 'BRIEFING', q: 'Briefing do ambiente' },
  { cmd: 'AMEACAS', q: 'Redes Wi-Fi suspeitas' },
  { cmd: 'RASTREADORES', q: 'Rastreadores e Bluetooth' },
  { cmd: 'CONSELHO', q: 'O que melhorar?' },
]

export default function TacticalAiCopilot({ securityScore }: { securityScore?: number }) {
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

  useEffect(() => {
    let alive = true
    copilotCloudConfigured().then((ok) => { if (alive) setCloudOk(ok) })
    return () => { alive = false }
  }, [])

  const snapshot = useMemo(buildSnapshot, [net, ble, watch, contacts, checkinConfig])

  function buildSnapshot(): CopilotSnapshot {
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
      events: getSecurityEvents().slice(0, 10),
      contactsCount: contacts?.length ?? 0,
      checkinActive: !!checkinConfig?.is_active,
    }
  }

  // Primeiro contacto: briefing local imediato
  useEffect(() => {
    setMessages([{
      id: copilotMsgId(),
      role: 'ai',
      text: localBriefingText(buildSnapshot()),
      ts: Date.now(),
      source: 'local',
    }])
    // apenas na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollDown = () => {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function run(q: string) {
    if (!q.trim() || busy) return
    void haptic('light')
    setInput('')
    setMessages((m) => [...m, { id: copilotMsgId(), role: 'user', text: q, ts: Date.now(), source: 'local' }])
    setBusy(true)
    scrollDown()
    try {
      const res = await askCopilot(q, snapshot, messages)
      setMessages((m) => [...m, { id: copilotMsgId(), role: 'ai', text: res.text, ts: Date.now(), source: res.source }])
    } catch {
      setMessages((m) => [...m, {
        id: copilotMsgId(), role: 'ai', source: 'local',
        text: '> ERRO DE LINK — REINICIE A CONSULTA', ts: Date.now(),
      }])
    } finally {
      setBusy(false)
      void haptic('light')
      scrollDown()
    }
  }

  const hh = (t: number) => new Date(t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="tac-panel overflow-hidden">
      {/* Cabeçalho da consola */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--tac-line)' }}>
        <Terminal className="h-4 w-4" style={{ color: 'var(--tac-green)' }} />
        <p className="tac-value text-[13px] tracking-wider flex-1">CONSULTOR AEGIS · IA</p>
        <span className="tac-badge tac-badge-ok flex items-center gap-1">
          {cloudOk === null ? <Cpu className="h-2.5 w-2.5" />
            : cloudOk ? <><Cloud className="h-2.5 w-2.5" />NUVEM+LOCAL</> : <><HardDrive className="h-2.5 w-2.5" />LOCAL</>}
        </span>
      </div>

      {/* Log estilo terminal */}
      <div ref={logRef} className="tac-chat-log max-h-[340px] overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((m) => (
          <div key={m.id} className={cn(m.role === 'user' && 'flex justify-end')}>
            {m.role === 'ai' ? (
              <div className="tac-msg-ai rounded-sm px-3 py-2">
                <p className="text-[8.5px] tracking-[0.2em] mb-1" style={{ color: m.source === 'cloud' ? '#67e8f9' : 'rgba(52,211,153,0.55)' }}>
                  AEGIS[{m.source === 'cloud' ? 'NUVEM' : 'LOCAL'}] {hh(m.ts)}
                </p>
                <p className="text-[11.5px] leading-relaxed" style={{ color: '#d1fae5' }}>{m.text}</p>
              </div>
            ) : (
              <div className="tac-msg-user rounded-sm px-3 py-2 max-w-[80%]">
                <p className="text-[11.5px]" style={{ color: '#a5f3fc' }}>&gt; {m.text}</p>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="tac-msg-ai rounded-sm px-3 py-2 inline-block">
            <p className="text-[11px] tac-caret" style={{ color: 'rgba(52,211,153,0.8)' }}>A ANALISAR DADOS DO SENSOR</p>
          </div>
        )}
      </div>

      {/* Comandos rápidos */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto tac-chat-log">
        {CMDS.map((c) => (
          <button key={c.cmd} onClick={() => void run(c.q)} disabled={busy} className="tac-cmd disabled:opacity-40 shrink-0">
            {c.cmd}
          </button>
        ))}
      </div>

      {/* Linha de comando */}
      <form
        onSubmit={(e) => { e.preventDefault(); void run(input) }}
        className="px-4 pb-4 pt-1 flex items-center gap-2"
      >
        <div className="flex-1 flex items-center gap-2 px-3 h-10 tac-input rounded-sm">
          <span style={{ color: 'var(--tac-green)' }} className="text-[12px] font-bold shrink-0">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="PERGUNTA AO CONSULTOR…"
            className="flex-1 bg-transparent focus:outline-none text-[12px]"
            style={{ color: '#ecfdf5' }}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="tac-btn !px-3 !py-2.5 flex items-center gap-1.5 disabled:opacity-40"
          aria-label="Enviar"
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
