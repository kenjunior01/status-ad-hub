/**
 * RadarSkeleton — linhas fantasma de "a capturar" (v3.20.0).
 *
 * Substitui o texto simples "A capturar pacotes de beacon…" por um
 * skeleton com shimmer no ritmo do radar: barra de nome + barra de
 * informação + barra de sinal animada. Duas variantes:
 *   • 'gold'     — estilo dourado da Web (NetRadar, BleRadar)
 *   • 'tac'      — estilo Tactical Grid da APK (TacticalNetRadar)
 */

import { cn } from '@/lib/utils'

interface RadarSkeletonProps {
  rows?: number
  variant?: 'gold' | 'tac'
  className?: string
}

export function RadarSkeleton({ rows = 5, variant = 'gold', className }: RadarSkeletonProps) {
  return (
    <div className={cn('skel-wrap', `skel-wrap-${variant}`, className)} role="status" aria-label="A capturar">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skel-row"
          style={{ animationDelay: `${i * 120}ms`, opacity: Math.max(0.25, 1 - i * 0.13) }}
        >
          <span className="skel-bar skel-bar-name" style={{ width: `${72 + (i % 3) * 14}px` }} />
          <span className="skel-bar skel-bar-info" style={{ width: `${110 + ((i * 37) % 70)}px` }} />
          <span className="skel-signal">
            <span style={{ width: `${28 + ((i * 23) % 58)}%` }} />
          </span>
          <span
            className={cn('skel-dot', i % 3 === 0 ? 'skel-dot-danger' : 'skel-dot-ok')}
            style={{ animationDelay: `${i * 260}ms` }}
          />
        </div>
      ))}
    </div>
  )
}
