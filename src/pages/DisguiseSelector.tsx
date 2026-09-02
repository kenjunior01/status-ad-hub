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
import { EyeOff, Sparkles, Play } from 'lucide-react'
import { DisguisePicker } from '@/components/DisguisePicker'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { toast } from 'sonner'
import { haptic } from '@/lib/native'

export default function DisguiseSelector() {
  const { activate, isActive, disguiseType } = useDiscreetMode()
  const handleActivate = () => {
    void haptic('medium')
    activate()
    toast.success('Camuflagem activa — a app agora parece outra coisa', {
      description: 'Long-press 2s no canto superior esquerdo + PIN para voltar',
      duration: 5000,
    })
  }

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

      {/* Activar agora — o passo que faltava nesta página */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-4'
      >
        <div>
          <p className='text-sm font-semibold text-purple-200'>Pronto para camuflar?</p>
          <p className='text-xs text-white/40 mt-0.5'>
            {isActive
              ? 'A camuflagem está ACTIVA neste momento.'
              : 'Ao activar, a app transforma-se no disfarce escolhido. O SOS continua activo em background.'}
          </p>
        </div>
        <button
          onClick={handleActivate}
          className='shrink-0 flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95'
        >
          <Play className='w-4 h-4' /> {isActive ? 'Ver disfarce activo' : 'Activar Camuflagem Agora'}
        </button>
      </motion.div>
    </div>
  )
}
