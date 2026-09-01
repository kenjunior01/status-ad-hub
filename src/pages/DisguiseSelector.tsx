/**
 * DisguiseSelector — Página dedicada à escolha de camuflagem.
 * 
 * Experiência visual completa:
 * - Grid de miniaturas de todos os 11 disfarces
 * - Preview ao vivo em moldura de telemóvel
 * - Selecção instantânea
 * - Informação detalhada de cada disfarce
 * - Teste imediato
 */

import { motion } from 'framer-motion'
import { EyeOff, Sparkles } from 'lucide-react'
import { DisguisePicker } from '@/components/DisguisePicker'

export default function DisguiseSelector() {
  return (
    <div className='min-h-screen space-y-6 pb-8'>
      {/* Header */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex items-center gap-3'
        >
          <div className='p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20'>
            <EyeOff className='w-5 h-5 text-purple-400' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-white'>Escolher Camuflagem</h1>
            <p className='text-white/40 text-sm mt-0.5'>Seleccione como quer camuflar a sua app de segurança</p>
          </div>
        </motion.div>
      </div>

      {/* Hint banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className='flex items-center gap-3 bg-purple-500/[0.06] border border-purple-500/15 rounded-xl p-3'
      >
        <Sparkles className='w-4 h-4 text-purple-400 shrink-0' />
        <p className='text-purple-200/60 text-xs'>
          Toque num disfarce para ver o <strong className='text-purple-300'>preview ao vivo</strong>. 
          O sistema de segurança permanece activo em background mesmo quando o disfarce está activo.
        </p>
      </motion.div>

      {/* The Picker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DisguisePicker mode='page' autoPreview={false} />
      </motion.div>
    </div>
  )
}
