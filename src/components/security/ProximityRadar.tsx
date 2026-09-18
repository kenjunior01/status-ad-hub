/**
 * ProximityRadar — radar de proximidade expressivo (v3.34.0).
 *
 * Visual circular com sweep a rodar (CSS puro), anéis de proximidade e
 * blips. Duas formas honestas de colocação:
 *
 *  · EXACTA — `angleDeg` (0 = Norte) + `distM`: usado para as âncoras do
 *    motor de Posição por Rádio, cuja posição real é conhecida. O blip
 *    fica onde o emissor ESTÁ, não onde "parece".
 *  · POR SINAL — `rssi`: sem direcção disponível para dispositivos BLE/
 *    Wi-Fi, o blip fica no anel de força de sinal (perto/médio/longe) e
 *    o ângulo é estável por identidade (hash), nunca aleatório.
 *
 * Calma por defeito: nada pisca excepto o eco suave dos blips.
 */

import { useMemo, type CSSProperties } from 'react'

export interface ProximityBlip {
  id: string
  /** cor tonal do blip */
  tone: string
  label?: string
  /** colocação exacta — ângulo em graus (0 = N, 90 = L) */
  angleDeg?: number | null
  /** colocação exacta — distância em metros */
  distM?: number | null
  /** colocação por sinal — RSSI (dBm) */
  rssi?: number | null
  /** blip com colocação exacta (desenha maior) */
  precise?: boolean
}

interface Placed {
  b: ProximityBlip
  r: number
  deg: number
  x: number
  y: number
}

/** hash estável djb2 → ângulo determinístico por identidade */
function hashDeg(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0
  return h % 360
}

/** raio em fração do radar a partir do sinal (perto → centro) */
function rssiRadius(rssi: number): number {
  if (rssi >= -58) return 0.3
  if (rssi >= -72) return 0.58
  return 0.86
}

export function ProximityRadar({
  blips,
  size = 148,
  maxDistM = 150,
  sweepColor,
  showNorth = false,
  className,
}: {
  blips: ProximityBlip[]
  size?: number
  /** distância que corresponde ao bordo do radar (m) */
  maxDistM?: number
  /** cor da cunha de sweep (padrão: lavanda) */
  sweepColor?: string
  /** marca "N" no topo (quando a colocação é geográfica) */
  showNorth?: boolean
  className?: string
}) {
  const placed = useMemo<Placed[]>(() => {
    return blips
      .map((b) => {
        const exact = b.angleDeg != null && b.distM != null
        const r = exact
          ? Math.min(0.94, Math.max(0.16, (b.distM as number) / Math.max(1, maxDistM)))
          : b.rssi != null
            ? rssiRadius(b.rssi)
            : 0.86
        const deg = exact ? (b.angleDeg as number) : hashDeg(b.id)
        const rad = ((deg - 90) * Math.PI) / 180
        return {
          b,
          r,
          deg,
          x: 50 + r * 46 * Math.cos(rad),
          y: 50 + r * 46 * Math.sin(rad),
        }
      })
      // em excesso: exactas primeiro, depois sinal mais forte
      .sort((a, z) =>
        ((z.b.distM != null ? 1 : 0) - (a.b.distM != null ? 1 : 0)) ||
        ((z.b.rssi ?? -100) - (a.b.rssi ?? -100)))
      .slice(0, 10)
  }, [blips, maxDistM])

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden="true">
      <div
        className="relative h-full w-full rounded-full border border-white/[0.07]"
        style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.045), rgba(255,255,255,0.012) 70%, transparent)' }}
      >
        {/* anéis de proximidade + eixos suaves */}
        <div className="absolute rounded-full border border-white/[0.06]" style={{ inset: '16.5%' }} />
        <div className="absolute rounded-full border border-white/[0.06]" style={{ inset: '33%' }} />
        <div className="absolute rounded-full border border-white/[0.06]" style={{ inset: '49.5%' }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.04]" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.04]" />

        {/* sweep */}
        <div
          className="ax-sweep"
          style={sweepColor ? ({ '--ax-sweep-color': sweepColor } as CSSProperties) : undefined}
        />

        {/* marca do Norte */}
        {showNorth && (
          <span className="absolute left-1/2 top-[3px] -translate-x-1/2 text-[7px] font-bold text-white/30 tracking-widest">N</span>
        )}

        {/* você, no centro */}
        <span className="ax-center" />

        {/* alvos */}
        {placed.map(({ b, x, y }) => (
          <span
            key={b.id}
            title={b.label}
            className="ax-blip"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              color: b.tone,
              background: b.tone,
              width: b.precise ? 9 : 7,
              height: b.precise ? 9 : 7,
            }}
          />
        ))}
      </div>
    </div>
  )
}
