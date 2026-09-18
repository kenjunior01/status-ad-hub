/**
 * PresenceHistoryCard — Companhias de Caminho & Histórico de 30 Dias
 * (v3.33.0 · redesign AEGIS Expressive v3.34.0).
 *
 * O "Contexto Actual" passa a ser um herói de aurora tonal com um radar
 * de proximidade ao vivo (quem está à volta nos últimos 10 min, colocado
 * por força de sinal), números fluidos e grão de filme. As companhias de
 * caminho entram em cascata, ganham tom próprio por dono e — quando alguém
 * NOVO aparece no caminho — a app vibra e brilha uma pílula de mel.
 * Paleta suave: lavanda, céu, sálvia, areia, mel, rosa-argila.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Footprints, Route, Trash2, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getPresenceDevices, setPresenceOwner, clearPresenceHistory,
  findPathCompanions, presenceNowContext, suggestOwner,
  type PresenceEntry,
} from '@/lib/presence-history'
import { exportPresenceHistory } from '@/lib/export-data'
import { ProximityRadar, type ProximityBlip } from '@/components/security/ProximityRadar'

// Paleta expressiva (suave por natureza — nada de tons duros)
const AX = {
  lavender: '#B8A9F5',
  sky: '#8ED1F2',
  sage: '#9FE8C0',
  sand: '#F2DDB0',
  honey: '#E8C9A0',
  blush: '#E8B4B8',
}
const OWNER_TONES = [AX.lavender, AX.sky, AX.sage, AX.sand, AX.honey, AX.blush]

/** tom estável por identidade (dono > nome > id) */
function toneFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return OWNER_TONES[h % OWNER_TONES.length]
}

/** "agora" / "há 5min" / "há 3h" / "há 2d" */
function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 90) return 'agora'
  if (s < 3600) return `há ${Math.round(s / 60)}min`
  if (s < 86400) return `há ${Math.round(s / 3600)}h`
  return `há ${Math.round(s / 86400)}d`
}

/** MAC curto: aa:aa…:aa:01 */
function shortId(id: string): string {
  const p = id.split(':')
  if (p.length >= 6) return `${p[0]}:${p[1]}…:${p[4]}:${p[5]}`
  return id.length > 18 ? `${id.slice(0, 9)}…${id.slice(-4)}` : id
}

const KIND_LABEL: Record<string, string> = { wifi: 'Wi-Fi', ble: 'BLE' }
const FRESH_MS = 90_000

export function PresenceHistoryCard() {
  const [devices, setDevices] = useState<PresenceEntry[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)

  const refresh = useCallback(() => { setDevices(getPresenceDevices()) }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [refresh])

  const companions = useMemo(() => findPathCompanions(devices).slice(0, 6), [devices])
  const ctx = useMemo(() => presenceNowContext(devices), [devices])
  const suggested = useMemo(
    () => new Map(devices.filter((d) => !d.owner).map((d) => [d.id, suggestOwner(d)])),
    [devices],
  )
  const companionKey = useMemo(
    () => companions.map((d) => d.id.toLowerCase()).sort().join(','),
    [companions],
  )

  // v3.34.0 — detecção de companheiro NOVO: vibra + pílula "NOVO" 90 s
  const knownIds = useRef<Set<string> | null>(null)
  const [freshIds, setFreshIds] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!companionKey) { knownIds.current = knownIds.current ?? new Set(); return }
    const ids = companionKey.split(',')
    if (knownIds.current === null) {
      knownIds.current = new Set(ids)
      return
    }
    const novos: Record<string, number> = {}
    for (const id of ids) {
      if (!knownIds.current.has(id)) novos[id] = Date.now()
    }
    if (Object.keys(novos).length > 0) {
      knownIds.current = new Set([...knownIds.current, ...ids])
      setFreshIds((f) => ({ ...f, ...novos }))
      try { navigator.vibrate?.([18, 70, 18]) } catch { /* segue */ }
    }
  }, [companionKey])
  const isFresh = (id: string): boolean => {
    const t = freshIds[id.toLowerCase()]
    return !!t && Date.now() - t < FRESH_MS
  }

  // radar do contexto: quem está à volta agora, por força de sinal
  const radarBlips = useMemo<ProximityBlip[]>(() => ctx.total.map((d) => ({
    id: d.id,
    label: d.owner || d.name || undefined,
    rssi: d.lastRssi ?? -80,
    tone: d.owner ? AX.sage : d.pathPoints >= 2 ? AX.lavender : d.kind === 'wifi' ? AX.sky : AX.honey,
  })), [ctx.total])

  const saveOwner = (id: string) => {
    setPresenceOwner(id, draft)
    setEditing(null)
    setDraft('')
    refresh()
  }

  const clearAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      setTimeout(() => setConfirmingClear(false), 4000)
      return
    }
    clearPresenceHistory()
    setConfirmingClear(false)
    setFreshIds({})
    refresh()
  }

  // v3.36.0 — presenças exportáveis (CSV/JSON): prova fora do aparelho
  const exportAll = () => { void exportPresenceHistory(getPresenceDevices()) }

  const stats = [
    { icon: Users, label: 'À volta agora', value: ctx.total.length, color: AX.sky },
    { icon: Footprints, label: 'Companhias presentes', value: ctx.companions.length, color: AX.lavender },
    { icon: SparklesLabel, label: 'Com dono à volta', value: ctx.owned.length, color: AX.sage },
  ]

  return (
    <div
      className="rounded-3xl p-5 space-y-4 border"
      style={{
        background: 'linear-gradient(145deg, rgba(184,169,245,0.055), rgba(142,209,242,0.04) 55%, rgba(159,232,192,0.045))',
        borderColor: 'rgba(184,169,245,0.16)',
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Route className="h-4.5 w-4.5 shrink-0" style={{ color: AX.lavender }} />
        <div className="flex-1 min-w-[180px]">
          <p className="font-display font-semibold text-sm text-white">Companhias de Caminho</p>
          <p className="text-[11px] text-white/35">
            Quem esteve no seu caminho nos últimos 30 dias — e de quem são
          </p>
        </div>
        <span className="ax-chip" style={{ color: AX.sky, background: `${AX.sky}12`, boxShadow: `inset 0 0 0 1px ${AX.sky}30` }}>
          30 DIAS
        </span>
      </div>

      {/* CONTEXTO ACTUAL — herói de aurora com radar ao vivo (v3.34.0) */}
      <div className="ax-aurora ax-glass rounded-3xl p-4">
        <i className="ax-grain" />
        <div className="relative z-[1] flex items-center gap-4">
          <ProximityRadar
            blips={radarBlips}
            size={128}
            sweepColor="rgba(184,169,245,0.34)"
            className="shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="ax-rise flex items-center gap-2.5"
                style={{ '--ax-i': i } as CSSProperties}
              >
                <span
                  className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}14`, color: s.color }}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 leading-none">{s.label}</p>
                  <p className="ax-hero-num mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {radarBlips.length > 0 && (
          <p className="relative z-[1] text-[9px] text-white/25 mt-2.5 leading-snug">
            Radar: anel por força do sinal (perto · médio · longe) nos últimos 10 min —
            <span style={{ color: AX.sage }}> sálvia com dono</span> ·
            <span style={{ color: AX.lavender }}> lavanda no seu caminho</span> ·
            <span style={{ color: AX.sky }}> céu Wi-Fi</span> ·
            <span style={{ color: AX.honey }}> mel BLE</span>
          </p>
        )}
      </div>

      {/* Companhias de caminho — cascata expressiva */}
      {companions.length > 0 ? (
        <div className="space-y-2">
          {companions.map((d, i) => {
            const tone = toneFor(d.owner || d.name || d.id)
            const fresh = isFresh(d.id)
            return (
              <div
                key={d.id}
                className={cn(
                  'ax-rise rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3 flex items-start gap-3',
                  fresh && 'ax-new border-[#E8C9A0]/25 bg-[#E8C9A0]/[0.04]',
                )}
                style={{ '--ax-i': i + 3 } as CSSProperties}
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                  style={{ background: `${tone}1c`, color: tone, boxShadow: `inset 0 0 0 1px ${tone}30` }}
                >
                  {(d.owner?.[0] || d.name?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12.5px] font-medium text-white truncate max-w-[220px]">
                      {d.name || d.owner || shortId(d.id)}
                    </p>
                    <span
                      className="ax-chip"
                      style={{ color: AX.sky, background: `${AX.sky}0d`, boxShadow: `inset 0 0 0 1px ${AX.sky}2e` }}
                    >
                      {KIND_LABEL[d.kind] || d.kind}
                    </span>
                    {fresh && (
                      <span
                        className="ax-chip ax-new"
                        style={{ color: AX.honey, background: `${AX.honey}16`, boxShadow: `inset 0 0 0 1px ${AX.honey}38` }}
                      >
                        NOVO NO CAMINHO
                      </span>
                    )}
                  </div>
                  {d.owner ? (
                    <p className="text-[10.5px] flex items-center gap-1 mt-0.5" style={{ color: AX.sage }}>
                      <UserRound className="h-3 w-3" /> {d.owner}
                    </p>
                  ) : suggested.get(d.id) ? (
                    <p className="text-[10.5px] text-white/40 mt-0.5 italic">{suggested.get(d.id)}</p>
                  ) : (
                    <p className="text-[10.5px] text-white/30 mt-0.5">{shortId(d.id)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="ax-chip" style={{ color: AX.lavender, background: `${AX.lavender}14` }}>
                      no caminho ×{d.pathPoints}
                    </span>
                    <span className="text-[9px] text-white/35">visto {d.seen}×</span>
                    {d.movingSeen > 0 && (
                      <span className="text-[9px] text-white/35">· em movimento {d.movingSeen}×</span>
                    )}
                    <span className="text-[9px] text-white/25">· {ago(d.lastSeen)}</span>
                  </div>
                </div>
                {editing === d.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => saveOwner(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveOwner(d.id); if (e.key === 'Escape') setEditing(null) }}
                    placeholder="De quem é?"
                    className="w-28 shrink-0 h-8 rounded-lg bg-white/[0.06] border border-white/10 px-2 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-[rgba(184,169,245,0.45)]"
                  />
                ) : (
                  <button
                    onClick={() => { setEditing(d.id); setDraft(d.owner || '') }}
                    className="ax-press shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition hover:brightness-125"
                    style={{ color: d.owner ? AX.sage : AX.sand, borderColor: `${d.owner ? AX.sage : AX.sand}30`, background: 'transparent' }}
                  >
                    {d.owner ? 'Editar' : 'De quem é?'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11.5px] text-white/35 leading-relaxed">
          Ainda sem companhias de caminho. Active a <b className="text-white/55">Vigilância contínua</b> e
          desloque-se — quem acompanhar o seu percurso (≥2 pontos distintos) aparece aqui automaticamente,
          com a sugestão de quem pode ser. Quando alguém novo entrar no seu caminho, a app avisa com uma
          vibração suave.
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <p className="text-[9.5px] text-white/25 leading-snug flex-1">
          Histórico de presenças mantido por 30 dias · tudo fica no aparelho
          {devices.length > 0 && ` · ${devices.length} dispositivos registados`}
        </p>
        {devices.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportAll}
            className="ax-press h-7 rounded-lg text-[10px] border-white/10 bg-white/[0.03] text-white/35 shrink-0"
            title="Exportar o histórico de presenças (CSV)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Exportar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          className={cn('ax-press h-7 rounded-lg text-[10px] border-white/10 bg-white/[0.03] shrink-0', confirmingClear ? 'text-red-300 border-red-400/30' : 'text-white/35')}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {confirmingClear ? 'Confirmar limpeza' : 'Limpar'}
        </Button>
      </div>
    </div>
  )
}

/** ícone-rotulo do terceiro stat (sparkles fixe em tom sálvia) */
function SparklesLabel({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 3l1.8 4.6L18.4 9.4l-4.6 1.8L12 15.8l-1.8-4.6L5.6 9.4l4.6-1.8L12 3z" />
      <path d="M19 15l.9 2.3 2.3.9-2.3.9L19 21.4l-.9-2.3-2.3-.9 2.3-.9L19 15z" />
    </svg>
  )
}
