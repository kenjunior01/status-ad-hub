import { useRef, type ReactNode, type MouseEvent } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

export function MagneticButton({
  children, className, onClick, strength = 0.25, as = 'button', href,
}: {
  children: ReactNode; className?: string; onClick?: () => void
  strength?: number; as?: 'button' | 'a'; href?: string
}) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 20 })
  const sy = useSpring(y, { stiffness: 200, damping: 20 })

  const move = (cx: number, cy: number) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    x.set((cx - r.left - r.width / 2) * strength)
    y.set((cy - r.top - r.height / 2) * strength)
  }
  const leave = () => { x.set(0); y.set(0) }

  const Comp = as === 'a' ? motion.a : motion.button
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <Comp ref={ref as any} className={cn('relative inline-block', className)} href={href} onClick={onClick}
      onMouseMove={(e: MouseEvent) => move(e.clientX, e.clientY)}
      onMouseLeave={leave} onTouchEnd={leave}
      style={{ x: sx, y: sy }}
    >{children}</Comp>
  )
}
