import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

export function SpotlightCard({
  children, className, spotlightColor = 'rgba(37, 211, 102, 0.08)',
}: {
  children: ReactNode; className?: string; spotlightColor?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1321]/70 backdrop-blur-xl transition-all duration-500',
        hover && 'border-white/[0.15] shadow-lg shadow-black/20',
        className
      )}
      onMouseMove={(e: MouseEvent) => {
        const r = ref.current?.getBoundingClientRect()
        if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 rounded-2xl"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
