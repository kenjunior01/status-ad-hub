import { type ReactNode, type MouseEvent, useState } from 'react'
import { cn } from '@/lib/utils'

export function RippleButton({
  children, className, onClick, variant = 'default', disabled = false,
}: {
  children: ReactNode; className?: string; onClick?: () => void
  variant?: 'default' | 'outline' | 'danger'; disabled?: boolean
}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
    onClick?.()
  }

  const base = 'relative overflow-hidden rounded-xl font-medium transition-all duration-300 active:scale-[0.98]'
  const variants = {
    default: 'bg-[#D4AF37] text-white hover:bg-[#B8962E] hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.4)]',
    outline: 'border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]',
  }

  return (
    <button onClick={handleClick} disabled={disabled} className={cn(base, variants[variant], disabled && 'opacity-50 cursor-not-allowed pointer-events-none', className)}>
      {ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/20 animate-ripple"
          style={{
            left: r.x - 50, top: r.y - 50,
            width: 100, height: 100,
          }}
        />
      ))}
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}
