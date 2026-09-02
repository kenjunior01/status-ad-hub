import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function ParticleField({ className, count = 45 }: { className?: string; count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    const CONN = 110

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['212,175,55', '212,175,55', '139,92,246']
    type P = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number; c: string }

    const mkP = (): P => {
      const ml = 300 + Math.random() * 500
      return {
        x: Math.random() * canvas.offsetWidth, y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        size: 0.8 + Math.random() * 1.2, alpha: 0.15 + Math.random() * 0.35,
        life: Math.random() * ml, maxLife: ml,
        c: colors[Math.floor(Math.random() * colors.length)],
      }
    }
    const ps: P[] = Array.from({ length: count }, mkP)

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life++
        if (p.life > p.maxLife || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          Object.assign(p, mkP())
        }
        const a = p.alpha * (1 - p.life / p.maxLife)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.c},${a})`; ctx.fill()
      })
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < CONN) {
            ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y)
            ctx.strokeStyle = `rgba(212,175,55,${(1 - d / CONN) * 0.1})`; ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [count])

  return <canvas ref={canvasRef} className={cn('absolute inset-0 w-full h-full', className)} />
}
