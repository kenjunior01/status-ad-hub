import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export function TextReveal({
  text, className, delay = 0, stagger = 0.03, as: Tag = 'p',
}: {
  text: string; className?: string; delay?: number; stagger?: number; as?: 'p' | 'h1' | 'h2' | 'h3' | 'span'
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={cn('flex flex-wrap', className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ delay: delay + i * stagger, duration: 0.5, ease: 'easeOut' }}
        >{word}</motion.span>
      ))}
    </Tag>
  )
}
