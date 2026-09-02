import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const orbs = [
  { size: 300, x: '10%', y: '20%', color: '212,175,55', a: 0.08, blur: 80, dur: 20 },
  { size: 200, x: '70%', y: '10%', color: '212,175,55', a: 0.06, blur: 60, dur: 25 },
  { size: 250, x: '80%', y: '60%', color: '139,92,246', a: 0.05, blur: 70, dur: 22 },
  { size: 180, x: '30%', y: '70%', color: '16,185,129', a: 0.06, blur: 50, dur: 18 },
  { size: 120, x: '50%', y: '40%', color: '212,175,55', a: 0.04, blur: 40, dur: 15 },
]

export function FloatingOrbs({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {orbs.map((o, i) => (
        <motion.div
          key={i} className="absolute rounded-full"
          style={{
            width: o.size, height: o.size, left: o.x, top: o.y,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(${o.color},${o.a}), transparent 70%)`,
            filter: `blur(${o.blur / 3}px)`,
          }}
          animate={{ x: [0, 30, -20, 15, 0], y: [0, -25, 15, -10, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
