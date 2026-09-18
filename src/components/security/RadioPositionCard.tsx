/**
 * RadioPositionCard — cartão do Motor de Posição por Rádio (v3.32.0).
 *
 * Mostra, em tempo real, o que o aparelho consegue prever a partir das
 * redes Wi-Fi/BLE à sua volta: posição estimada (GPS, RÁDIO ou HÍBRIDO),
 * precisão, rumo, velocidade e a predição textual ("A seguir para NE ·
 * a aproximar-se de Casa"). Também o estado da calibração de âncoras.
 */

import { Compass, LocateFixed, Navigation, RefreshCw, RotateCw, Trash2, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { compassLabel } from '@/lib/radio-position'
import { useRadioPosition } from '@/hooks/useRadioPosition'

const MODE_LABEL: Record<string, { text: string; cls: string }> = {
  gps: { text: 'GPS', cls: 'text-white/55 border-white/10' },
  radio: { text: 'RÁDIO (sem GPS)', cls: 'border-[#B8A9F5]/35 bg-[#B8A9F5]/10 text-[#C9BDF8]' },
  hybrid: { text: 'HÍBRIDO', cls: 'border-[#9FE8C0]/35 bg-[#9FE8C0]/10 text-[#9FE8C0]' },
}

export function RadioPositionCard() {
  const rp = useRadioPosition()
  const mode = rp.fix ? MODE_LABEL[rp.fix.mode] ?? MODE_LABEL.gps : null

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'linear-gradient(150deg, rgba(184,169,245,0.05), rgba(142,209,242,0.035) 60%)', border: '1px solid rgba(184,169,245,0.14)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Waypoints className="h-4.5 w-4.5 text-[#B8A9F5] shrink-0" />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <LocateFixed className="h-3 w-3" /> Posição
              </p>
              <p className="text-[12px] font-mono text-white mt-1 leading-tight">
                {rp.fix.lat.toFixed(5)}, {rp.fix.lng.toFixed(5)}
              </p>
              <p className="text-[10px] text-white/35">±{Math.round(rp.fix.acc)} m</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Rumo
              </p>
              <p className="text-[15px] font-bold text-white mt-1">
                {rp.fix.heading != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Compass className="h-4 w-4 text-[#B8A9F5]" style={{ transform: `rotate(${rp.fix.heading}deg)` }} />
                    {compassLabel(rp.fix.heading)}
                  </span>
                ) : '—'}
              </p>
              <p className="text-[10px] text-white/35">{rp.fix.speedMs != null ? `${(rp.fix.speedMs * 3.6).toFixed(1)} km/h` : 'sem movimento'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <Waypoints className="h-3 w-3" /> Âncoras
              </p>
              <p className="text-[15px] font-bold text-white mt-1">{rp.navAnchorsCount}<span className="text-white/30 text-[11px] font-normal">/{rp.anchorsCount}</span></p>
              <p className="text-[10px] text-white/35">navegáveis / calibradas</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">RTT 802.11mc</p>
              <p className="text-[13px] font-bold text-white mt-1">
                {rp.rttSupported == null ? '—' : rp.rttSupported ? 'ACTIVO' : 'SEM HW'}
              </p>
              <p className="text-[10px] text-white/35">{rp.rttSupported ? 'distância real aos routers' : 'usa modelo de sinal'}</p>
            </div>
          </div>

          {rp.prediction && (
            <div className="rounded-xl border border-[#B8A9F5]/20 bg-[#B8A9F5]/[0.06] px-4 py-3 flex items-center gap-3">
              <Compass className="h-4 w-4 text-[#B8A9F5] shrink-0" style={{ transform: rp.prediction.heading != null ? `rotate(${rp.prediction.heading}deg)` : undefined }} />
              <p className="text-[12px] text-white/80 leading-snug">{rp.prediction.text}</p>
            </div>
          )}

          <p className="text-[10px] text-white/25 leading-relaxed">
            Calibração: ande com o GPS activo — cada ciclo do radar fixa a posição dos routers
            ao seu redor. Com ≥3 âncoras navegáveis a posição passa a calcular-se só pelo rádio
            (interiores, GPS morto). Tudo local no aparelho; nada sobe para a nuvem.
            {rp.lastAt > 0 && ` Última actualização: ${new Date(rp.lastAt).toLocaleTimeString('pt-PT')}.`}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={rp.refresh} className="h-8 border-white/10 bg-white/[0.03] text-white/70 rounded-lg text-[11px]">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar agora
            </Button>
            <Button variant="outline" size="sm" onClick={rp.reset} className="h-8 border-white/10 bg-white/[0.03] text-white/40 rounded-lg text-[11px] hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Repor calibração
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-white/40 leading-relaxed">
            Ainda sem posição calculada. Active a <b className="text-white/60">Vigilância contínua</b> (sentinela)
            e ande um pouco com o GPS ligado — o motor calibra as âncoras (routers e BLE) ao seu redor
            e passa a prever posição, rumo e direcção mesmo quando o GPS falha.
          </p>
          <Button variant="outline" size="sm" onClick={rp.refresh} className="h-8 border-white/10 bg-white/[0.03] text-white/70 rounded-lg text-[11px]">
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Calibrar agora
          </Button>
        </div>
      )}
    </div>
  )
}
