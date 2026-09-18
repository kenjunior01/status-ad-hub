/**
 * PresenceHistoryCard — Companhias de Caminho & Histórico de 30 Dias (v3.33.0).
 *
 * Mostra o contexto actual (quem está à volta agora), os dispositivos que
 * ESTIVERAM NO CAMINHO do utilizador (≥2 pontos do percurso) e permite
 * atribuir donos ("de quem é?"). Paleta suave: lavanda, céu, sálvia, areia.
 */

import { useCallback, useEffect, useState } from 'react'
import { Footprints, Route, Sparkles, Trash2, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getPresenceDevices, setPresenceOwner, clearPresenceHistory,
  findPathCompanions, presenceNowContext, suggestOwner,
  type PresenceEntry,
} from '@/lib/presence-history'

// Paleta suave (escolhida para não cansar: nada de vermelhos/alaranjados duros)
const SOFT = {
  lavender: '#B8A9F5',
  sky: '#8ED1F2',
  sage: '#9FE8C0',
  sand: '#F2DDB0',
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

  const companions = findPathCompanions(devices).slice(0, 5)
  const ctx = presenceNowContext(devices)
  const suggested = new Map(devices.filter((d) => !d.owner).map((d) => [d.id, suggestOwner(d)]))

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
    refresh()
  }

  return (
    <div
      className="rounded-3xl p-5 space-y-4 border"
      style={{
        background: 'linear-gradient(145deg, rgba(184,169,245,0.055), rgba(142,209,242,0.04) 55%, rgba(159,232,192,0.045))',
        borderColor: 'rgba(184,169,245,0.16)',
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Route className="h-4.5 w-4.5 shrink-0" style={{ color: SOFT.lavender }} />
        <div className="flex-1 min-w-[180px]">
          <p className="font-display font-semibold text-sm text-white">Companhias de Caminho</p>
          <p className="text-[11px] text-white/35">
            Quem esteve no seu caminho nos últimos 30 dias — e de quem são
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{ color: SOFT.sky, borderColor: `${SOFT.sky}44`, background: `${SOFT.sky}0f` }}
        >
          30 DIAS
        </span>
      </div>

      {/* Contexto actual */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: Users, label: 'À volta agora', value: ctx.total.length, color: SOFT.sky },
          { icon: Footprints, label: 'Companhias presentes', value: ctx.companions.length, color: SOFT.lavender },
          { icon: Sparkles, label: 'Com dono à volta', value: ctx.owned.length, color: SOFT.sage },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-3 text-center"
            style={{ borderColor: `${s.color}22`, background: `${s.color}08` }}
          >
            <s.icon className="h-3.5 w-3.5 mx-auto" style={{ color: s.color }} />
            <p className="text-lg font-bold text-white leading-none mt-1.5">{s.value}</p>
            <p className="text-[9px] text-white/35 mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Companhias de caminho */}
      {companions.length > 0 ? (
        <div className="space-y-2">
          {companions.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3 flex items-start gap-3"
            >
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                style={{ background: `${SOFT.lavender}1c`, color: SOFT.lavender }}
              >
                {(d.owner?.[0] || d.name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12.5px] font-medium text-white truncate max-w-[220px]">
                    {d.name || d.owner || shortId(d.id)}
                  </p>
                  <span
                    className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border"
                    style={{ color: SOFT.sky, borderColor: `${SOFT.sky}3a`, background: `${SOFT.sky}0d` }}
                  >
                    {KIND_LABEL[d.kind] || d.kind}
                  </span>
                </div>
                {d.owner ? (
                  <p className="text-[10.5px] flex items-center gap-1 mt-0.5" style={{ color: SOFT.sage }}>
                    <UserRound className="h-3 w-3" /> {d.owner}
                  </p>
                ) : suggested.get(d.id) ? (
                  <p className="text-[10.5px] text-white/40 mt-0.5 italic">{suggested.get(d.id)}</p>
                ) : (
                  <p className="text-[10.5px] text-white/30 mt-0.5">{shortId(d.id)}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: SOFT.lavender, background: `${SOFT.lavender}14` }}
                  >
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
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition hover:brightness-125"
                  style={{ color: d.owner ? SOFT.sage : SOFT.sand, borderColor: `${d.owner ? SOFT.sage : SOFT.sand}30`, background: 'transparent' }}
                >
                  {d.owner ? 'Editar' : 'De quem é?'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11.5px] text-white/35 leading-relaxed">
          Ainda sem companhias de caminho. Active a <b className="text-white/55">Vigilância contínua</b> e
          desloque-se — quem acompanhar o seu percurso (≥2 pontos distintos) aparece aqui automaticamente,
          com a sugestão de quem pode ser.
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <p className="text-[9.5px] text-white/25 leading-snug flex-1">
          Histórico de presenças mantido por 30 dias · tudo fica no aparelho
          {devices.length > 0 && ` · ${devices.length} dispositivos registados`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          className={cn('h-7 rounded-lg text-[10px] border-white/10 bg-white/[0.03] shrink-0', confirmingClear ? 'text-red-300 border-red-400/30' : 'text-white/35')}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {confirmingClear ? 'Confirmar limpeza' : 'Limpar'}
        </Button>
      </div>
    </div>
  )
}
