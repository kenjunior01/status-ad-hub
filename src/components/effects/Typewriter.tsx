import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Typewriter({ texts, className, speed = 80, deleteSpeed = 40, pause = 2000 }: {
  texts: string[]; className?: string; speed?: number; deleteSpeed?: number; pause?: number
}) {
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[idx]
    let timer: ReturnType<typeof setTimeout>

    if (!deleting) {
      if (text.length < current.length) {
        timer = setTimeout(() => setText(current.slice(0, text.length + 1)), speed)
      } else {
        timer = setTimeout(() => setDeleting(true), pause)
      }
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, -1)), deleteSpeed)
      } else {
        setDeleting(false)
        setIdx((prev) => (prev + 1) % texts.length)
      }
    }
    return () => clearTimeout(timer)
  }, [text, deleting, idx, texts, speed, deleteSpeed, pause])

  return (
    <span className={cn('inline-block', className)}>
      {text}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[2px] h-[1em] bg-[#D4AF37] ml-0.5 align-middle"
      />
    </span>
  )
}
