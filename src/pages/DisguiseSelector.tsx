/**
 * DisguiseSelector — Página dedicada à escolha de camuflagem.
 *
 * Experiência visual completa:
 * - Grid de miniaturas de todos os 11 disfarces
 * - Preview ao vivo em moldura de telemóvel
 * - Selecção instantânea
 * - Informação detalhada de cada disfarce
 * - Teste imediato
 *
 * v3.9.0 — Camuflagem TOTAL no Android: além do disfarce interior, o
 * ícone+nome no launcher são trocados via activity-alias (DisguisePlugin).
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EyeOff, Sparkles, Play, Smartphone, Check, RotateCcw } from 'lucide-react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { DisguisePicker } from '@/components/DisguisePicker'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { toast } from 'sonner'
import { haptic } from '@/lib/native'

interface DisguiseNativeInterface {
  current(): Promise<{ id: string }>
  apply(opts: { id: string }): Promise<{ applied: string }>
}

const LAUNCHER_DISGUISES: { id: string; name: string; emoji: string }[] = [
  { id: 'real', name: 'App real (StatusAds)', emoji: '🛡️' },
  { id: 'calculator', name: 'Calculadora', emoji: '🔢' },
  { id: 'weather', name: 'Meteorologia', emoji: '🌤️' },
  { id: 'notes', name: 'Notas', emoji: '📝' },
  { id: 'clock', name: 'Relógio', emoji: '⏰' },
  { id: 'contacts', name: 'Contactos', emoji: '👥' },
  { id: 'music', name: 'Música', emoji: '🎵' },
]

/** Secção de camuflagem do ícone/nome no launcher — só na app nativa Android. */
function LauncherDisguise() {
  const [current, setCurrent] = useState<string>('real')
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const Disguise = registerPlugin<DisguiseNativeInterface>('Disguise')
      const { id } = await Disguise.current()
      setCurrent(id)
    } catch {
      // plugin indisponível
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const applyDisguise = useCallback(async (id: string) => {
    setBusy(id)
    try {
      const Disguise = registerPlugin<DisguiseNativeInterface>('Disguise')
      await Disguise.apply({ id })
      setCurrent(id)
      void haptic('medium')
      toast.success(id === 'real' ? 'Ícone real restaurado' : 'Ícone disfarçado no ecrã principal', {
        description: 'Se o ícone não mudar em segundos, feche e reabra a gaveta de apps.',
        duration: 6000,
      })
    } catch {
      toast.error('Não foi possível trocar o ícone neste telemóvel')
    } finally {
      setBusy(null)
    }
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className='rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4 space-y-3'
    >
      <div className='flex items-start gap-3'>
        <div className='p-2 rounded-lg bg-emerald-500/15 border border-emerald-400/25 h-fit shrink-0'>
          <Smartphone className='w-4 h-4 text-emerald-400' />
        </div>
        <div>
          <h2 className='text-sm font-bold text-emerald-200'>Ícone e nome no telemóvel (versão APK)</h2>
          <p className='text-xs text-white/50 mt-1 leading-relaxed'>
            A camuflagem interior esconde o ecrã da app — esta secção troca também o{' '}
            <strong className='text-emerald-300'>ícone e o nome no ecrã principal</strong>.
            Escolha o disfarce e o telemóvel inteiro parece outra app.
          </p>
        </div>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
        {LAUNCHER_DISGUISES.map((d) => {
          const active = current === d.id
          return (
            <button
              key={d.id}
              onClick={() => applyDisguise(d.id)}
              disabled={busy !== null}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                active
                  ? 'border-emerald-400/50 bg-emerald-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              } disabled:opacity-50`}
            >
              {active && (
                <span className='absolute top-1.5 right-1.5 p-0.5 rounded-full bg-emerald-500 text-black'>
                  <Check className='w-2.5 h-2.5' />
                </span>
              )}
              <span className='text-xl leading-none'>{d.emoji}</span>
              <span className={`text-[10px] font-semibold leading-tight ${active ? 'text-emerald-300' : 'text-white/60'}`}>
                {d.id === 'real' ? 'Ícone real' : d.name}
              </span>
            </button>
          )
        })}
      </div>
      {current !== 'real' && (
        <button
          onClick={() => applyDisguise('real')}
          disabled={busy !== null}
          className='w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 hover:bg-white/[0.08] transition-colors disabled:opacity-50'
        >
          <RotateCcw className='w-3.5 h-3.5' /> Restaurar ícone real (StatusAds Connect)
        </button>
      )}
      <p className='text-[10px] text-white/30 leading-relaxed'>
        Nota: alguns launchers guardam o ícone em cache — se não mudar em segundos, arraste a gaveta
        de apps para baixo ou reinicie o telemóvel. O SOS, atalhos e Guardião continuam a funcionar
        normalmente com a app disfarçada.
      </p>
    </motion.section>
  )
}

export default function DisguiseSelector() {
  const { activate, isActive } = useDiscreetMode()
  const handleActivate = () => {
    void haptic('medium')
    activate()
    toast.success('Camuflagem activa — a app agora parece outra coisa', {
      description: 'Fica activa mesmo se fechar a app. Long-press 2s no canto superior esquerdo + PIN para voltar',
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

      {/* Camuflagem do ícone no launcher (nativa Android) */}
      {Capacitor.getPlatform() === 'android' && <LauncherDisguise />}

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
