import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function GlowCard({
  children, className,
  glowColor = 'rgba(212, 175, 55, 0.12)',
  borderGlow = 'rgba(212, 175, 55, 0.25)',
}: {
  children: ReactNode; className?: string
  glowColor?: string; borderGlow?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [rx, setRx] = useState(0)
  const [ry, setRy] = useState(0)
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const [hover, setHover] = useState(false)

  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    setRx((y - r.height / 2) / 25)
    setRy((r.width / 2 - x) / 25)
    setGlow({ x: (x / r.width) * 100, y: (y / r.height) * 100 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setRx(0); setRy(0); setHover(false) }}
      animate={{ rotateX: rx, rotateY: ry }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1321]/70 backdrop-blur-xl transition-shadow duration-500',
        hover && 'shadow-[0_0_60px_-15px_rgba(212,175,55,0.12)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(600px circle at ${glow.x}% ${glow.y}%, ${glowColor}, transparent 40%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(400px circle at ${glow.x}% ${glow.y}%, ${borderGlow}, transparent 40%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
