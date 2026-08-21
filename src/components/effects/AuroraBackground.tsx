import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function AuroraBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let time = 0

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    const blobs = [
      { xOff: 0.3, yOff: 0.3, xFreq: 0.7, yFreq: 0.5, xAmp: 0.2, yAmp: 0.15, rFactor: 0.35, r: 37, g: 211, b: 102, a: 0.07 },
      { xOff: 0.7, yOff: 0.5, xFreq: 0.6, yFreq: 0.8, xAmp: 0.15, yAmp: 0.2, rFactor: 0.3, r: 59, g: 130, b: 246, a: 0.06 },
      { xOff: 0.5, yOff: 0.7, xFreq: 0.4, yFreq: 0.3, xAmp: 0.25, yAmp: 0.1, rFactor: 0.25, r: 139, g: 92, b: 246, a: 0.05 },
      { xOff: 0.2, yOff: 0.6, xFreq: 0.9, yFreq: 0.6, xAmp: 0.1, yAmp: 0.2, rFactor: 0.2, r: 16, g: 185, b: 129, a: 0.04 },
    ]

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      time += 0.003
      ctx.clearRect(0, 0, w, h)

      blobs.forEach(bl => {
        const bx = w * bl.xOff + Math.sin(time * bl.xFreq) * w * bl.xAmp
        const by = h * bl.yOff + Math.cos(time * bl.yFreq) * h * bl.yAmp
        const br = Math.max(1, w * bl.rFactor)
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        grad.addColorStop(0, `rgba(${bl.r},${bl.g},${bl.b},${bl.a})`)
        grad.addColorStop(1, `rgba(${bl.r},${bl.g},${bl.b},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className={cn('absolute inset-0 w-full h-full', className)} />
}
