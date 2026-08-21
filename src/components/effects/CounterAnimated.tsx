import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export function CounterAnimated({
  target, duration = 2, prefix = '', suffix = '', decimals = 0, className,
}: {
  target: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - t0) / 1000 / duration, 1)
      setVal((1 - Math.pow(1 - p, 3)) * target)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target, duration])

  return <span ref={ref} className={className}>{prefix}{val.toFixed(decimals)}{suffix}</span>
}
