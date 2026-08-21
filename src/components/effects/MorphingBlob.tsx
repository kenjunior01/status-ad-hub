import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function MorphingBlob({ className, color = 'rgba(37, 211, 102, 0.08)', size = 400 }: {
  className?: string; color?: string; size?: number
}) {
  return (
    <motion.div
      className={cn('absolute rounded-full blur-3xl pointer-events-none', className)}
      style={{
        width: size, height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
      }}
      animate={{
        borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '70% 30% 30% 70% / 70% 70% 30% 30%',
                   '30% 70% 70% 30% / 30% 30% 70% 70%', '50% 50% 50% 50% / 50% 50% 50% 50%'],
        scale: [1, 1.15, 1, 0.9, 1],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
