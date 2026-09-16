/**
 * PullToRefresh — gesto nativo de "puxar para actualizar" (v3.20.0).
 *
 * Envolve o conteúdo de um ecrã e, quando o utilizador puxa para baixo
 * com o scroll no topo, mostra um indicador tático circular e dispara
 * `onRefresh` (assíncrono). Na APK dá vibração háptica ao cruzar o
 * limiar — igual às apps nativas do Android/iOS. Na web mobile funciona
 * pelo toque; no desktop não interfere (sem toque).
 *
 * Uso:
 *   <PullToRefresh onRefresh={scan} className="min-h-screen space-y-6">
 *     …conteúdo…
 *   </PullToRefresh>
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/native'

/** distância (px, já amortecida) para confirmar o refresh */
const TRIGGER = 64
/** distância máxima do indicador */
const MAX_PULL = 96
/** amortecimento do gesto (1px dedo = 0.5px indicador — sensação nativa) */
const DAMPING = 0.5

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | unknown
  /** desactiva o gesto (ex.: sem permissões) */
  disabled?: boolean
  className?: string
  children: ReactNode
}

export function PullToRefresh({ onRefresh, disabled, className, children }: PullToRefreshProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshingRef = useRef(false)
  const pullRef = useRef(0)
  const hintRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const setPullSafe = useCallback((v: number) => {
    pullRef.current = v
    setPull(v)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return

    let startY = 0
    let engaged = false
    let dragging = false

    const atTop = () => {
      const se = document.scrollingElement
      return (se?.scrollTop ?? window.scrollY) <= 0
    }

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return
      if (!atTop()) return
      startY = e.touches[0].clientY
      engaged = true
      dragging = false
    }

    const onMove = (e: TouchEvent) => {
      if (!engaged || refreshingRef.current) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) {
        if (dragging) setPullSafe(0)
        dragging = false
        return
      }
      const d = Math.min(MAX_PULL, dy * DAMPING)
      setPullSafe(d)
      if (d > 10) dragging = true
      // háptica de "quase lá" — só uma vez por gesto
      if (d >= TRIGGER - 8) {
        if (!hintRef.current) {
          hintRef.current = true
          void haptic('light')
        }
      } else {
        hintRef.current = false
      }
      if (dragging && e.cancelable) e.preventDefault()
    }

    const onEnd = () => {
      if (!engaged) return
      engaged = false
      hintRef.current = false
      if (pullRef.current >= TRIGGER && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        setPullSafe(TRIGGER)
        void haptic('medium')
        void (async () => {
          try {
            await onRefreshRef.current()
          } catch {
            /* o chamador trata erros */
          }
          // garante uma perceção mínima do estado de actualização
          await new Promise((r) => setTimeout(r, 400))
          refreshingRef.current = false
          setRefreshing(false)
          setPullSafe(0)
        })()
      } else {
        setPullSafe(0)
      }
      dragging = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [disabled, setPullSafe])

  const ready = pull >= TRIGGER
  const show = refreshing || pull > 4
  const indicatorY = refreshing ? TRIGGER : pull

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Indicador circular tático */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[45] flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, indicatorY - 34)}px)`,
          opacity: show ? Math.min(1, pull / 40) : 0,
          transition: refreshing ? 'transform .25s ease, opacity .2s ease' : 'opacity .15s ease',
        }}
        aria-hidden
      >
        <div className={cn('ptr-ring', ready && 'ptr-ring-ready', refreshing && 'ptr-ring-active')}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 text-brand animate-spin" />
          ) : (
            <Loader2
              className="h-4 w-4 text-brand"
              style={{ transform: `rotate(${pull * 4}deg)`, opacity: 0.5 + pull / 160 }}
            />
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
