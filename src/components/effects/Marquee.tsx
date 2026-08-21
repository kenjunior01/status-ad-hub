import { cn } from '@/lib/utils'

export function Marquee({
  children, className, reverse = false, speed = 40, pauseOnHover = true,
}: {
  children: React.ReactNode; className?: string; reverse?: boolean; speed?: number; pauseOnHover?: boolean
}) {
  return (
    <div className={cn('group relative flex overflow-hidden', className)}>
      <div
        className={cn(
          'flex shrink-0 gap-4 py-2',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >{children}</div>
      <div
        aria-hidden
        className={cn(
          'flex shrink-0 gap-4 py-4',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >{children}</div>
    </div>
  )
}
