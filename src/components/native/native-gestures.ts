/**
 * Gestos nativos reutilizáveis (v3.22.0)
 * ─ spawnRipple / useRipple : "ink" táctil estilo Material no ponto de toque
 * ─ useLongPress            : long-press (450ms) com tolerância a micro-movimentos
 *
 * Zero dependências além de React — funciona igual na web e na WebView da APK.
 */
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'

/* ════════════════════════════════════════════════════════════════════════
   INK RIPPLE (Material)
   ════════════════════════════════════════════════════════════════════════ */

export type RippleVariant = 'light' | 'gold' | 'danger'

/** Cria uma onda "ink" dentro do elemento host, a partir do ponto tocado. */
export function spawnRipple(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
  variant: RippleVariant = 'gold',
): void {
  if (!host) return
  // respeita preferência por menos movimento
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const rect = host.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2.2
  const ink = document.createElement('span')
  ink.className = `aegis-ripple-ink aegis-ripple-${variant}`
  ink.style.width = `${size}px`
  ink.style.height = `${size}px`
  ink.style.left = `${clientX - rect.left - size / 2}px`
  ink.style.top = `${clientY - rect.top - size / 2}px`
  host.appendChild(ink)
  window.setTimeout(() => ink.remove(), 640)
}

/** Handler onPointerDown pronto a espalhar num elemento interactivo. */
export function useRipple<T extends HTMLElement = HTMLElement>(variant: RippleVariant = 'gold') {
  return useCallback(
    (e: ReactPointerEvent<T>) => {
      spawnRipple(e.currentTarget, e.clientX, e.clientY, variant)
    },
    [variant],
  )
}

/* ════════════════════════════════════════════════════════════════════════
   LONG-PRESS
   ════════════════════════════════════════════════════════════════════════ */

export interface LongPressHandlers {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onPointerLeave: () => void
}

/**
 * Long-press com "vida" nativa: ignora micro-tremores (até 12px), cancela
 * se o dedo se afasta, e opcionalmente desenha ink ripple ao tocar.
 * Nota: o haptic() fica a cargo do callback do chamador.
 */
export function useLongPress(
  onLongPress: () => void,
  opts: { ms?: number; ripple?: RippleVariant } = {},
): LongPressHandlers {
  const { ms = 450, ripple } = opts
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      clear()
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      if (ripple) spawnRipple(e.currentTarget as HTMLElement, e.clientX, e.clientY, ripple)
      timer.current = window.setTimeout(() => {
        timer.current = null
        fired.current = true
        onLongPress()
      }, ms)
    },
    [clear, ms, onLongPress, ripple],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const o = origin.current
      if (!o || timer.current === null) return
      // micro-tremor até 12px não cancela (dedos não são preciso como o rato)
      if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > 12) clear()
    },
    [],
  )

  const onPointerUp = useCallback(() => {
    origin.current = null
    clear()
  }, [clear])

  const onPointerCancel = useCallback(() => {
    origin.current = null
    clear()
  }, [clear])

  const onPointerLeave = useCallback(() => {
    origin.current = null
    clear()
  }, [clear])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave }
}
