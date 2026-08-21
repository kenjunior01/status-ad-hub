import { cn } from '@/lib/utils'

let noiseId = 0
export function NoiseTexture({ className, opacity = 0.035 }: { className?: string; opacity?: number }) {
  const id = `noise-${++noiseId}`
  return (
    <svg className={cn('absolute inset-0 w-full h-full pointer-events-none', className)} xmlns="http://www.w3.org/2000/svg">
      <filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} opacity={opacity} />
    </svg>
  )
}
