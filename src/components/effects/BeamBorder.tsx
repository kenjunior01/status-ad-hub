import { cn } from '@/lib/utils'

export function BeamBorder({ children, className, color = '#D4AF37' }: {
  children: React.ReactNode; className?: string; color?: string
}) {
  return (
    <div className={cn('relative rounded-2xl p-px overflow-hidden group', className)}>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${color}, transparent, transparent)`,
          animation: 'beam-spin 3s linear infinite',
        }}
      />
      <div className="relative rounded-2xl bg-[#0D1321] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
