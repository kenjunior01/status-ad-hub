/**
 * RadioPositionCard — cartão do Motor de Posição por Rádio
 * (v3.32.0 · redesign AEGIS Expressive v3.34.0).
 *
 * Mostra, em tempo real, o que o aparelho consegue prever a partir das
 * redes Wi-Fi/BLE à sua volta: posição estimada (GPS, RÁDIO ou HÍBRIDO),
 * precisão, rumo, velocidade e a predição textual ("A seguir para NE ·
 * a aproximar-se de Casa"). O herói traz um radar de âncoras com
 * COLOCAÇÃO EXACTA — cada router/BLE calibrado fica na direcção e à
 * distância reais do fix actual (ângulo = bearing, raio = haversine).
 * Também o estado da calibração de âncoras.
 */

import { useMemo } from 'react'
import { Compass, LocateFixed, Navigation, RefreshCw, RotateCw, Trash2, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  bearingDeg, compassLabel, getRadioAnchors, haversineM,
  type RadioAnchor,
} from '@/lib/radio-position'
import { useRadioPosition } from '@/hooks/useRadioPosition'
import { ProximityRadar, type ProximityBlip } from '@/components/security/ProximityRadar'

// Paleta expressiva (suave por natureza)
const AX = {
  lavender: '#B8A9F5',
  sky: '#8ED1F2',
  sage: '#9FE8C0',
  sand: '#F2DDB0',
  honey: '#E8C9A0',
}

const MODE_LABEL: Record<string, { text: string; cls: string }> = {
  gps: { text: 'GPS', cls: 'text-white/55 border-white/10' },
  radio: { text: 'RÁDIO (sem GPS)', cls: 'border-[#B8A9F5]/35 bg-[#B8A9F5]/10 text-[#C9BDF8]' },
  hybrid: { text: 'HÍBRIDO', cls: 'border-[#9FE8C0]/35 bg-[#9FE8C0]/10 text-[#9FE8C0]' },
}

export function RadioPositionCard() {
  const rp = useRadioPosition()
  const mode = rp.fix ? MODE_LABEL[rp.fix.mode] ?? MODE_LABEL.gps : null

  // âncoras à volta do fix actual — colocação exacta no radar
  const anchorBlips = useMemo<ProximityBlip[]>(() => {
    if (!rp.fix) return []
    const fix = rp.fix
    const anchors: RadioAnchor[] = getRadioAnchors()
    return anchors
      .map((a) => ({
        a,
        distM: haversineM(fix.lat, fix.lng, a.lat, a.lng),
        deg: bearingDeg(fix.lat, fix.lng, a.lat, a.lng),
      }))
      .sort((x, z) => x.distM - z.distM)
      .slice(0, 10)
      .map(({ a, distM, deg }) => ({
        id: a.id,
        label: `${a.label || a.id} · ${Math.round(distM)} m`,
        angleDeg: deg,
        distM,
        precise: !!(
          a.n >= 3 && a.spreadM >= 40
        ),
        tone: a.kind === 'wifi' ? AX.sky : AX.honey,
      }))
  }, [rp.fix, rp.lastAt])

  // escala do radar adapta-se à âncora mais distante (cap 200 m)
  const radarMaxM = useMemo(() => {
    let max = 60
    for (const b of anchorBlips) if ((b.distM ?? 0) > max) max = b.distM as number
    return Math.min(200, Math.max(60, Math.ceil(max / 20) * 20))
  }, [anchorBlips])

  const cellTint = (color: string) => ({
    borderColor: `${color}1c`,
    background: `${color}08`,
  })

  return (
    <div
      className="rounded-3xl p-5 space-y-4 border"
      style={{
        background: 'linear-gradient(150deg, rgba(184,169,245,0.05), rgba(142,209,242,0.035) 60%)',
        border: '1px solid rgba(184,169,245,0.14)',
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Waypoints className="h-4.5 w-4.5 shrink-0" style={{ color: AX.lavender }} />
        <div className="flex-1 min-w-[180px]">
          <p className="font-display font-semibold text-sm text-white">Posição por Rádio</p>
          <p className="text-[11px] text-white/30">
            Prevejo a sua localização e direcção pelas redes Wi-Fi/BLE à volta — funciona sem GPS
          </p>
        </div>
        {mode && (
          <Badge variant="outline" className={cn('text-[10px] font-bold', mode.cls)}>{mode.text}</Badge>
        )}
      </div>

      {rp.fix ? (
        <div className="space-y-3">
          {/* HERÓI — aurora + radar de âncoras com colocação exacta */}
          <div className="ax-aurora ax-glass rounded-3xl p-4">
            <i className="ax-grain" />
            <div className="relative z-[1] flex items-center gap-4">
              {anchorBlips.length > 0 ? (
                <ProximityRadar
                  blips={anchorBlips}
                  size={128}
                  maxDistM={radarMaxM}
                  sweepColor="rgba(142,209,242,0.34)"
                  showNorth
                  className="shrink-0"
                />
              ) : (
                <div className="shrink-0 h-[128px] w-[128px] flex items-center justify-center">
                  <ProximityRadar blips={[]} size={128} sweepColor="rgba(142,209,242,0.22)" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2.5">
                <div>
                  <p className="text-[10px] text-white/40 leading-none flex items-center gap-1">
                    <LocateFixed className="h-3 w-3" /> PRECISÃO · {rp.fix.mode.toUpperCase()}
                  </p>
                  <p className="ax-hero-num mt-1 text-white">
                    ±{Math.round(rp.fix.acc)}<span className="text-[13px] font-semibold text-white/40"> m</span>
                  </p>
                </div>
                <p className="text-[11px] font-mono text-white/60 leading-tight">
                  {rp.fix.lat.toFixed(5)}, {rp.fix.lng.toFixed(5)}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {rp.fix.heading != null && (
                    <span
                      className="ax-chip"
                      style={{ color: AX.lavender, background: `${AX.lavender}12`, boxShadow: `inset 0 0 0 1px ${AX.lavender}2c` }}
                    >
                      <Compass className="h-3 w-3" style={{ transform: `rotate(${rp.fix.heading}deg)` }} />
                      {compassLabel(rp.fix.heading)} {Math.round(rp.fix.heading)}°
                    </span>
                  )}
                  <span
                    className="ax-chip"
                    style={{ color: AX.sage, background: `${AX.sage}10` }}
                  >
                    {rp.fix.speedMs != null ? `${(rp.fix.speedMs * 3.6).toFixed(1)} km/h` : 'estático'}
                  </span>
                  {rp.rttSupported && (
                    <span className="ax-chip" style={{ color: AX.honey, background: `${AX.honey}12` }}>
                      RTT real
                    </span>
                  )}
                </div>
              </div>
            </div>
            {anchorBlips.length > 0 && (
              <p className="relative z-[1] text-[9px] text-white/25 mt-2.5 leading-snug">
                Radar geográfico: cada blip fica na direcção e distância reais do emissor
                (escala até {radarMaxM} m) — <span style={{ color: AX.sky }}>céu Wi-Fi</span> ·
                <span style={{ color: AX.honey }}> mel BLE</span> · blips maiores = âncoras navegáveis
              </p>
            )}
          </div>

          {rp.prediction && (
            <div className="ax-aurora rounded-2xl border border-[#B8A9F5]/20 bg-[#B8A9F5]/[0.06] px-4 py-3 flex items-center gap-3">
              <Compass className="h-4 w-4 shrink-0" style={{ color: AX.lavender, transform: rp.prediction.heading != null ? `rotate(${rp.prediction.heading}deg)` : undefined }} />
              <p className="text-[12px] text-white/80 leading-snug">{rp.prediction.text}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border p-3" style={cellTint(AX.lavender)}>
              <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <Waypoints className="h-3 w-3" /> Âncoras
              </p>
              <p className="text-[15px] font-bold text-white mt-1">{rp.navAnchorsCount}<span className="text-white/30 text-[11px] font-normal">/{rp.anchorsCount}</span></p>
              <p className="text-[10px] text-white/35">navegáveis / calibradas</p>
            </div>
            <div className="rounded-2xl border p-3" style={cellTint(AX.sky)}>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">RTT 802.11mc</p>
              <p className="text-[13px] font-bold text-white mt-1">
                {rp.rttSupported == null ? '—' : rp.rttSupported ? 'ACTIVO' : 'SEM HW'}
              </p>
              <p className="text-[10px] text-white/35">{rp.rttSupported ? 'distância real aos routers' : 'usa modelo de sinal'}</p>
            </div>
            <div className="rounded-2xl border p-3" style={cellTint(AX.sage)}>
              <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Movimento
              </p>
              <p className="text-[13px] font-bold text-white mt-1">
                {rp.fix.speedMs != null && rp.fix.speedMs > 0.3 ? 'EM CURSO' : 'PARADO'}
              </p>
              <p className="text-[10px] text-white/35">rumo e velocidade entre fixes</p>
            </div>
            <div className="rounded-2xl border p-3" style={cellTint(AX.honey)}>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">Actualização</p>
              <p className="text-[13px] font-bold text-white mt-1">
                {rp.lastAt > 0 ? new Date(rp.lastAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
              <p className="text-[10px] text-white/35">último fix processado</p>
            </div>
          </div>

          <p className="text-[10px] text-white/25 leading-relaxed">
            Calibração: ande com o GPS activo — cada ciclo do radar fixa a posição dos routers
            ao seu redor. Com ≥3 âncoras navegáveis a posição passa a calcular-se só pelo rádio
            (interiores, GPS morto). Tudo local no aparelho; nada sobe para a nuvem.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={rp.refresh} className="ax-press h-8 border-white/10 bg-white/[0.03] text-white/70 rounded-lg text-[11px]">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar agora
            </Button>
            <Button variant="outline" size="sm" onClick={rp.reset} className="ax-press h-8 border-white/10 bg-white/[0.03] text-white/40 rounded-lg text-[11px] hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Repor calibração
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="ax-aurora ax-glass rounded-3xl p-4 flex items-center gap-4">
            <i className="ax-grain" />
            <ProximityRadar blips={[]} size={96} sweepColor="rgba(142,209,242,0.2)" className="shrink-0" />
            <p className="relative z-[1] text-[12px] text-white/45 leading-relaxed flex-1">
              Ainda sem posição calculada. Active a <b className="text-white/60">Vigilância contínua</b>
              {' '}e ande um pouco com o GPS ligado — o motor calibra as âncoras (routers e BLE) ao seu
              redor e passa a prever posição, rumo e direcção mesmo quando o GPS falha.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={rp.refresh} className="ax-press h-8 border-white/10 bg-white/[0.03] text-white/70 rounded-lg text-[11px]">
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Calibrar agora
          </Button>
        </div>
      )}
    </div>
  )
}
