/**
 * DisguisePicker v1 — Seletor visual de camuflagem com preview ao vivo.
 * 
 * Permite ao utilizador:
 * - Ver todos os disfarces como miniaturas interactivas
 * - Preview em tempo real do disfarce seleccionado
 * - Escolher rapidamente com um toque
 * - Ver como funciona o SOS em cada disfarce
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Eye, Play, Check, Info, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { ALL_DISGUISES } from '@/lib/types'
import type { DiscreetModeType } from '@/lib/types'

import { CalculatorDisguise } from './DiscreetModeOverlay'
import { WeatherDisguise } from './DiscreetModeOverlay'
import { NotesDisguise } from './DiscreetModeOverlay'
import { ClockDisguise } from './DiscreetModeOverlay'
import { ContactsDisguise } from '@/components/disguises/ContactsDisguise'
import { SettingsDisguise } from '@/components/disguises/SettingsDisguise'
import { MusicPlayerDisguise } from '@/components/disguises/MusicPlayerDisguise'
import { CurrencyDisguise } from '@/components/disguises/CurrencyDisguise'
import { FlashlightDisguise } from '@/components/disguises/FlashlightDisguise'
import { SMSChatDisguise } from '@/components/disguises/SMSChatDisguise'
import { PhotoGalleryDisguise } from '@/components/disguises/PhotoGalleryDisguise'

const borderColorMap: Record<string, string> = {
  gray: 'border-gray-300 dark:border-gray-600',
  blue: 'border-blue-300 dark:border-blue-700',
  yellow: 'border-yellow-300 dark:border-yellow-700',
  neutral: 'border-neutral-300 dark:border-neutral-600',
  green: 'border-green-300 dark:border-green-700',
  slate: 'border-slate-300 dark:border-slate-600',
  purple: 'border-purple-300 dark:border-purple-700',
  emerald: 'border-emerald-300 dark:border-emerald-700',
  amber: 'border-amber-300 dark:border-amber-700',
  teal: 'border-teal-300 dark:border-teal-700',
  sky: 'border-sky-300 dark:border-sky-700',
}

// ==========================================
// MINI THUMBNAIL PREVIEWS (static, lightweight)
// ==========================================
function MiniPreview({ type }: { type: DiscreetModeType }) {
  const base = 'w-full h-full rounded-lg overflow-hidden pointer-events-none'
  switch (type) {
    case 'calculator':
      return (
        <div className={cn(base, 'bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-1.5')}>
          <div className='bg-white dark:bg-gray-700 rounded-md p-1 mb-1'><div className='text-right text-[8px] font-light text-gray-800 dark:text-white'>1,234</div></div>
          <div className='grid grid-cols-4 gap-0.5'>
            {['C','','','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','.','='].map((btn, i) => (
              <div key={i} className={cn('rounded-sm aspect-square flex items-center justify-center text-[5px] font-medium',
                ['÷','×','-','+','='].includes(btn) ? 'bg-amber-400 text-white' : ['C'].includes(btn) ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white' : 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white'
              )}>{btn}</div>
            ))}
          </div>
        </div>
      )
    case 'weather':
      return (
        <div className={cn(base, 'bg-gradient-to-b from-blue-400 to-blue-600 dark:from-blue-900 dark:to-blue-950 flex flex-col items-center justify-center text-white p-2')}>
          <div className='text-[7px] text-blue-200'>Maputo</div>
          <div className='text-2xl font-thin my-0.5'>27°</div>
          <div className='text-[6px] text-blue-100'>Parcialmente Nublado</div>
        </div>
      )
    case 'notes':
      return (
        <div className={cn(base, 'bg-yellow-50 dark:bg-yellow-950 p-1.5')}>
          <div className='text-[7px] text-yellow-600 dark:text-yellow-400 text-center mb-1'>Notas</div>
          <div className='space-y-0.5'>
            <div className='h-1 bg-yellow-200/60 dark:bg-yellow-800/40 rounded w-full' />
            <div className='h-1 bg-yellow-200/60 dark:bg-yellow-800/40 rounded w-4/5' />
            <div className='h-1 bg-yellow-200/60 dark:bg-yellow-800/40 rounded w-3/5' />
            <div className='h-1 bg-yellow-200/60 dark:bg-yellow-800/40 rounded w-full' />
          </div>
        </div>
      )
    case 'clock':
      return (
        <div className={cn(base, 'bg-black dark:bg-gray-950 flex flex-col items-center justify-center text-white')}>
          <div className='text-xl font-extralight tracking-wider'>12:45</div>
          <div className='text-[10px] text-gray-500 mt-0.5'>30</div>
        </div>
      )
    case 'contacts':
      return (
        <div className={cn(base, 'bg-white dark:bg-gray-800 p-1.5')}>
          <div className='text-[7px] font-semibold text-gray-900 dark:text-white mb-1'>Contactos</div>
          {[{ i: 'AS', c: '#3B82F6' }, { i: 'CM', c: '#10B981' }, { i: 'DT', c: '#F59E0B' }, { i: 'EN', c: '#EC4899' }].map((c, idx) => (
            <div key={idx} className='flex items-center gap-1 mb-0.5'>
              <div className='w-3 h-3 rounded-full flex items-center justify-center text-[4px] text-white font-bold' style={{ backgroundColor: c.c }}>{c.i}</div>
              <div className='h-1 bg-gray-200 dark:bg-gray-600 rounded w-10' />
            </div>
          ))}
        </div>
      )
    case 'settings_app':
      return (
        <div className={cn(base, 'bg-gray-50 dark:bg-gray-900 p-1.5')}>
          <div className='text-[7px] font-semibold text-gray-900 dark:text-white mb-1'>Configurações</div>
          {['Wi-Fi', 'Bluetooth', 'Notificações', 'Tela'].map((item, idx) => (
            <div key={idx} className='flex items-center justify-between py-0.5'>
              <div className='h-1 bg-gray-300 dark:bg-gray-600 rounded w-8' />
              <div className='w-3 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600' />
            </div>
          ))}
        </div>
      )
    case 'music_player':
      return (
        <div className={cn(base, 'bg-gradient-to-b from-purple-500 to-pink-500 flex flex-col items-center justify-center text-white p-2')}>
          <div className='w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center mb-1'><span className='text-lg'>🎵</span></div>
          <div className='text-[7px] font-bold'>Nwahuluhlu</div>
          <div className='text-[5px] text-white/60'>MozambicanHits</div>
        </div>
      )
    case 'currency':
      return (
        <div className={cn(base, 'bg-emerald-50 dark:bg-emerald-950 p-1.5')}>
          <div className='text-[7px] text-emerald-600 dark:text-emerald-400 mb-1'>Conversor</div>
          <div className='bg-white dark:bg-emerald-900/50 rounded p-1 mb-0.5'><div className='text-[8px] text-gray-800 dark:text-white'>1,000 MZN</div></div>
          <div className='bg-white dark:bg-emerald-900/50 rounded p-1'><div className='text-[8px] text-gray-800 dark:text-white'>15.63 USD</div></div>
        </div>
      )
    case 'flashlight':
      return (
        <div className={cn(base, 'bg-white dark:bg-gray-100 flex items-center justify-center')}>
          <span className='text-xl'>🔦</span>
        </div>
      )
    case 'sms_chat':
      return (
        <div className={cn(base, 'bg-gray-100 dark:bg-gray-900 p-1.5')}>
          <div className='text-[7px] font-semibold text-gray-900 dark:text-white mb-1'>Maria</div>
          <div className='space-y-0.5'>
            <div className='bg-white dark:bg-gray-800 rounded p-0.5 max-w-[70%]'><div className='h-0.5 bg-gray-300 dark:bg-gray-600 rounded w-8' /></div>
            <div className='bg-green-500 rounded p-0.5 max-w-[50%] ml-auto'><div className='h-0.5 bg-green-400 rounded w-5' /></div>
          </div>
        </div>
      )
    case 'photo_gallery':
      return (
        <div className={cn(base, 'bg-white dark:bg-gray-800 p-1')}>
          <div className='text-[6px] font-semibold text-gray-900 dark:text-white mb-0.5'>Galeria</div>
          <div className='grid grid-cols-3 gap-0.5'>
            {['from-amber-400 to-orange-500', 'from-blue-400 to-cyan-500', 'from-green-400 to-emerald-500', 'from-purple-400 to-pink-500', 'from-red-400 to-rose-500', 'from-sky-400 to-blue-500'].map((c, i) => (
              <div key={i} className={cn('aspect-square rounded-sm bg-gradient-to-br', c)} />
            ))}
          </div>
        </div>
      )
    default:
      return <div className={cn(base, 'bg-gray-100 flex items-center justify-center')}><span className='text-lg'>📱</span></div>
  }
}

// ==========================================
// LIVE PREVIEW (full-size in phone frame)
// ==========================================
function LivePreview({ type, onClose, onSelect, isSelected, onSOS }: {
  type: DiscreetModeType
  onClose: () => void
  onSelect: () => void
  isSelected: boolean
  onSOS: () => void
}) {
  const renderDisguise = () => {
    switch (type) {
      case 'calculator': return <CalculatorDisguise onSOS={onSOS} />
      case 'weather': return <WeatherDisguise onSOS={onSOS} />
      case 'notes': return <NotesDisguise onSOS={onSOS} />
      case 'clock': return <ClockDisguise onSOS={onSOS} />
      case 'contacts': return <ContactsDisguise onSOS={onSOS} />
      case 'settings_app': return <SettingsDisguise onSOS={onSOS} />
      case 'music_player': return <MusicPlayerDisguise onSOS={onSOS} />
      case 'currency': return <CurrencyDisguise onSOS={onSOS} />
      case 'flashlight': return <FlashlightDisguise onSOS={onSOS} />
      case 'sms_chat': return <SMSChatDisguise onSOS={onSOS} />
      case 'photo_gallery': return <PhotoGalleryDisguise onSOS={onSOS} />
      default: return <CalculatorDisguise onSOS={onSOS} />
    }
  }

  const info = ALL_DISGUISES.find(d => d.type === type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className='flex flex-col lg:flex-row gap-6 items-start'
    >
      {/* Phone Frame */}
      <div className='relative mx-auto lg:mx-0 shrink-0'>
        <div className='w-[280px] h-[560px] rounded-[2.5rem] border-[3px] border-gray-600 dark:border-gray-500 bg-black overflow-hidden shadow-2xl relative'>
          <div className='absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-10' />
          <div className='w-full h-full overflow-hidden'>{renderDisguise()}</div>
        </div>
        <div className='absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-500 rounded-full' />
      </div>

      {/* Info Panel */}
      <div className='flex-1 space-y-4 w-full'>
        <div className='flex items-start justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-2xl'>{info?.icon}</span>
              <h3 className='text-white text-lg font-semibold'>{info?.name}</h3>
            </div>
            <p className='text-white/40 text-sm mt-1'>{info?.description}</p>
          </div>
          <button onClick={onClose} className='p-2 rounded-xl hover:bg-white/5 transition text-white/40 hover:text-white'>
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* SOS Trigger */}
        <div className='bg-purple-500/10 border border-purple-500/20 rounded-xl p-3'>
          <div className='flex items-center gap-2 text-purple-300 text-sm font-medium'>
            <Zap className='w-4 h-4' />
            Como acionar o SOS:
          </div>
          <p className='text-purple-200/70 text-xs mt-1'>{info?.sosTrigger}</p>
        </div>

        {/* Features */}
        <div>
          <div className='text-white/40 text-xs font-medium mb-2 uppercase tracking-wider'>Funcionalidades</div>
          <div className='flex flex-wrap gap-1.5'>
            {info?.features.map(f => (
              <span key={f} className='text-xs px-2 py-1 rounded-lg bg-white/5 text-white/50 border border-white/[0.06]'>{f}</span>
            ))}
          </div>
        </div>

        {/* Select + Test buttons */}
        <div className='flex gap-2'>
          <button
            onClick={onSelect}
            className={cn(
              'flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
              isSelected
                ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30'
                : 'bg-[#25D366] text-white hover:bg-[#25D366]/90'
            )}
          >
            {isSelected ? <><Check className='w-4 h-4' /> Activo</> : <><Eye className='w-4 h-4' /> Usar Este</>}
          </button>
          <button
            onClick={() => { onSelect() }}
            className='px-4 py-3 rounded-xl font-semibold text-sm bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition flex items-center gap-2'
          >
            <Play className='w-4 h-4' /> Testar
          </button>
        </div>

        <div className='flex items-start gap-2 text-white/20 text-[11px]'>
          <Info className='w-3.5 h-3.5 mt-0.5 shrink-0' />
          <span>Para voltar à app real durante o disfarce, faça long-press no canto superior esquerdo por 2 segundos e digite o seu PIN.</span>
        </div>
      </div>
    </motion.div>
  )
}

// ==========================================
// MAIN PICKER
// ==========================================

interface DisguisePickerProps {
  mode?: 'page' | 'inline'
  onSelect?: (type: DiscreetModeType) => void
  autoPreview?: boolean
}

export function DisguisePicker({ mode = 'inline', onSelect, autoPreview = false }: DisguisePickerProps) {
  const { disguiseType, changeDisguise, activate } = useDiscreetMode()
  const [previewType, setPreviewType] = useState<DiscreetModeType | null>(autoPreview ? disguiseType : null)

  const handleSelect = useCallback((type: DiscreetModeType) => {
    changeDisguise(type)
    onSelect?.(type)
  }, [changeDisguise, onSelect])

  const handlePreviewSelect = useCallback(() => {
    if (previewType) handleSelect(previewType)
  }, [previewType, handleSelect])

  const handlePreviewSOS = useCallback(() => {
    // In preview mode, just vibrate — don't trigger real SOS
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
  }, [])

  return (
    <div className='space-y-5'>
      {/* Grid of disguise thumbnails */}
      <div className={cn(
        'grid gap-2.5',
        mode === 'page' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'
      )}>
        {ALL_DISGUISES.map(disguise => {
          const isSelected = disguiseType === disguise.type
          const isPreview = previewType === disguise.type
          return (
            <motion.button
              key={disguise.type}
              whileTap={{ scale: 0.96 }}
              onClick={() => setPreviewType(isPreview ? null : disguise.type)}
              className={cn(
                'relative rounded-2xl border-2 p-2 text-left transition-all overflow-hidden group',
                isSelected
                  ? 'border-[#25D366]/60 bg-[#25D366]/[0.06]'
                  : isPreview
                    ? 'border-purple-500/60 bg-purple-500/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              )}
            >
              {isSelected && (
                <div className='absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30'>
                  <Check className='w-3 h-3 text-white' strokeWidth={3} />
                </div>
              )}

              {/* Thumbnail */}
              <div className={cn(
                'aspect-[9/16] rounded-xl border overflow-hidden mb-1.5',
                borderColorMap[disguise.color] || 'border-white/10'
              )}>
                <MiniPreview type={disguise.type} />
              </div>

              {/* Label */}
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>{disguise.icon}</span>
                <span className='text-white/80 text-[11px] font-medium truncate'>{disguise.name}</span>
              </div>
              <div className='text-white/25 text-[9px] mt-0.5 truncate'>{disguise.sosTrigger}</div>

              {/* Hover overlay */}
              <div className='absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors pointer-events-none rounded-2xl' />
            </motion.button>
          )
        })}
      </div>

      {/* Live Preview Panel */}
      <AnimatePresence>
        {previewType && (
          <div className='bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6'>
            <LivePreview
              type={previewType}
              onClose={() => setPreviewType(null)}
              onSelect={handlePreviewSelect}
              isSelected={disguiseType === previewType}
              onSOS={handlePreviewSOS}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// QUICK DISGUISE SELECTOR (compact, for QuickActions)
// ==========================================

export function QuickDisguiseSelector() {
  const { disguiseType, changeDisguise, activate } = useDiscreetMode()
  const [expanded, setExpanded] = useState(false)

  const handlePick = (type: DiscreetModeType) => {
    changeDisguise(type)
    setExpanded(false)
  }

  const current = ALL_DISGUISES.find(d => d.type === disguiseType)

  return (
    <div className='space-y-2'>
      {/* Current disguise + expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className='w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition text-left'
      >
        <div className='w-10 h-10 rounded-xl border overflow-hidden shrink-0' style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <MiniPreview type={disguiseType} />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='text-white text-sm font-medium flex items-center gap-2'>
            <span>{current?.icon}</span> {current?.name}
          </div>
          <div className='text-white/30 text-[10px]'>SOS: {current?.sosTrigger}</div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={(e) => { e.stopPropagation(); activate() }}
            className='px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition'
          >
            Activar
          </button>
        </div>
      </button>

      {/* Expanded grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='overflow-hidden'
          >
            <div className='grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-2'>
              {ALL_DISGUISES.map(disguise => {
                const isSel = disguiseType === disguise.type
                return (
                  <motion.button
                    key={disguise.type}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handlePick(disguise.type)}
                    className={cn(
                      'relative rounded-xl border overflow-hidden transition-all',
                      isSel
                        ? 'border-[#25D366]/60 ring-1 ring-[#25D366]/20'
                        : 'border-white/[0.06] hover:border-white/[0.15]'
                    )}
                  >
                    <div className='aspect-[9/16]'>
                      <MiniPreview type={disguise.type} />
                    </div>
                    {isSel && (
                      <div className='absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#25D366] flex items-center justify-center'>
                        <Check className='w-2 h-2 text-white' strokeWidth={3} />
                      </div>
                    )}
                    <div className='absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1'>
                      <span className='text-white text-[8px] font-medium truncate block text-center'>{disguise.icon} {disguise.name}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
