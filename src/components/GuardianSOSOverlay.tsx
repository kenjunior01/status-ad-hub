/**
 * GuardianSOSOverlay — contagem decrescente quando um gatilho do Guardião dispara.
 *
 * Ecrã cheio, escuro, SEM som (silencioso serve para roubo). Mostra a origem
 * ("Agitação detectada", "Botão Power ×4"…) e um botão CANCELO gigante.
 * Se ninguém cancelar quando chega a zero → firePanicNow() → cadeia completa
 * de emergência (gravação + fotos + SOS + SMS + GPS) via usePanicMode.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import {
  CountdownRequest, onCountdownRequest, firePanicNow, SOURCE_LABEL,
} from '@/lib/guardian'
import { useGuardian } from '@/hooks/useGuardian'

export function GuardianSOSOverlay() {
  const { config } = useGuardian()
  const [req, setReq] = useState<CountdownRequest | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    return onCountdownRequest((r) => {
      setReq(r)
      setRemaining(r.seconds)
    })
  }, [])

  useEffect(() => {
    if (!req) return
    if (remaining <= 0) {
      const source = req.source
      setReq(null)
      firePanicNow(source)
      return
    }
    const t = setTimeout(() => setRemaining(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [req, remaining])

  const cancel = () => setReq(null)

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center gap-6 px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-1 rounded-full bg-red-500/60 mb-6" />
            <p className="text-[11px] font-bold tracking-[0.25em] text-red-400 uppercase">
              SOS do Guardião
            </p>
            <p className="text-sm text-white/60 mt-2">{SOURCE_LABEL[req.source]}</p>
            <div className="relative mt-6 mb-2">
              <motion.span
                key={remaining}
                initial={{ scale: 1.35, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="block font-display text-[120px] leading-none font-black text-white tabular-nums"
              >
                {remaining}
              </motion.span>
            </div>
            <p className="text-xs text-white/45 max-w-[260px] leading-relaxed mt-2">
              Ao terminar: contactos de confiança recebem a sua localização por SMS
              {config.autoRecord ? ', o áudio passa a gravar' : ''} e o GPS fica em rastreio.
            </p>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={cancel}
            className="mt-4 h-14 w-64 rounded-2xl bg-white text-black font-display font-black text-sm tracking-widest flex items-center justify-center gap-2 active:bg-white/90"
          >
            <X className="h-4 w-4" />
            CANCELO — FALSO ALARME
          </motion.button>
          <p className="text-[10px] text-white/25">
            Tocou por engano? Tem {req.seconds}s para cancelar.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
