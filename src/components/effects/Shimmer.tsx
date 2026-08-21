import { cn } from '@/lib/utils'

export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-white/[0.04]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }}
      />
    </div>
  )
}
