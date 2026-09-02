/**
 * DiscreetModeOverlay v2 — UI de camuflagem com 10 disfarces.
 * Cada disfarce é uma app completamente funcional e independente.
 * O sistema de segurança continua activo em background.
 * Suporta Duress PIN, Anti-Forced-Entry, Volume SOS.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { cn } from '@/lib/utils'

import { ContactsDisguise } from '@/components/disguises/ContactsDisguise'
import { SettingsDisguise } from '@/components/disguises/SettingsDisguise'
import { MusicPlayerDisguise } from '@/components/disguises/MusicPlayerDisguise'
import { CurrencyDisguise } from '@/components/disguises/CurrencyDisguise'
import { FlashlightDisguise } from '@/components/disguises/FlashlightDisguise'
import { SMSChatDisguise } from '@/components/disguises/SMSChatDisguise'
import { PhotoGalleryDisguise } from '@/components/disguises/PhotoGalleryDisguise'

// ==========================================
// CALCULATOR DISGUISE
// ==========================================
export function CalculatorDisguise({ onSOS }: { onSOS: () => void }) {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [newNumber, setNewNumber] = useState(true)

  useEffect(() => { if (display === '911' || display === '112') { const t = setTimeout(onSOS, 500); return () => clearTimeout(t) } }, [display, onSOS])

  const handleDigit = (d: string) => { if (newNumber) { setDisplay(d); setNewNumber(false) } else { setDisplay(p => p === '0' ? d : p + d) } }
  const handleOp = (newOp: string) => { const current = parseFloat(display); if (prev !== null && op) { const r = calc(prev, current, op); setDisplay(String(r)); setPrev(r) } else { setPrev(current) } setOp(newOp); setNewNumber(true) }
  const handleEquals = () => { if (prev === null || !op) return; const r = calc(prev, parseFloat(display), op); setDisplay(String(r)); setPrev(null); setOp(null); setNewNumber(true) }
  const handleClear = () => { setDisplay('0'); setPrev(null); setOp(null); setNewNumber(true) }
  const calc = (a: number, b: number, o: string) => { switch(o) { case '+': return a+b; case '-': return a-b; case '×': return a*b; case '÷': return b!==0?a/b:0; default: return b } }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex flex-col p-4">
      <div className="text-center text-gray-400 dark:text-gray-500 text-sm mb-2">Calculadora</div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="text-right text-4xl font-light text-gray-800 dark:text-white truncate">{display.length>12?parseFloat(display).toExponential(6):display}</div>
        {prev!==null&&op&&<div className="text-right text-sm text-gray-400">{prev} {op}</div>}
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {['C','±','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','.','='].map(btn=>(
          <button key={btn} onClick={()=>{if(btn==='C')handleClear();else if(btn==='=')handleEquals();else if(['+','-','×','÷'].includes(btn))handleOp(btn);else if(btn==='±')setDisplay(p=>String(-parseFloat(p)));else if(btn==='%')setDisplay(p=>String(parseFloat(p)/100));else handleDigit(btn)}}
            className={cn('rounded-2xl text-xl font-medium flex items-center justify-center transition-colors active:scale-95',['÷','×','-','+','='].includes(btn)?'bg-amber-400 dark:bg-amber-500 text-white':['C','±','%'].includes(btn)?'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white':'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm')}>{btn}</button>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// WEATHER DISGUISE
// ==========================================
export function WeatherDisguise({ onSOS }: { onSOS: () => void }) {
  const tapRef = useRef({ count: 0, last: 0 })
  const handleTempTap = () => { const now = Date.now(); if (now - tapRef.current.last < 1000) { tapRef.current.count++; if (tapRef.current.count >= 5) { tapRef.current.count = 0; onSOS() } } else { tapRef.current.count = 1 } tapRef.current.last = now }
  const forecast = [
    { day: 'Seg', high: 29, low: 21 }, { day: 'Ter', high: 31, low: 22 }, { day: 'Qua', high: 28, low: 20 }, { day: 'Qui', high: 30, low: 21 }, { day: 'Sex', high: 27, low: 19 },
  ]
  return (
    <div className="bg-gradient-to-b from-blue-400 to-blue-600 dark:from-blue-900 dark:to-blue-950 min-h-screen flex flex-col p-6 text-white">
      <div className="text-center mt-8">
        <div className="text-gray-200 text-lg">Maputo</div>
        <button onClick={handleTempTap} className="my-4"><span className="text-8xl font-thin">27°</span><div className="text-xl text-blue-100">Parcialmente Nublado</div><div className="text-sm text-blue-200 mt-2">H: 65% | V: 12 km/h</div></button>
      </div>
      <div className="flex-1 flex items-end">
        <div className="w-full bg-white/10 backdrop-blur rounded-2xl p-4"><div className="text-sm text-blue-100 mb-3">Previsão 5 dias</div><div className="flex justify-between">{forecast.map(d=>(<div key={d.day} className="text-center"><div className="text-xs text-blue-200">{d.day}</div><div className="font-medium">{d.high}°</div><div className="text-xs text-blue-300">{d.low}°</div></div>))}</div></div>
      </div>
    </div>
  )
}

// ==========================================
// NOTES DISGUISE
// ==========================================
export function NotesDisguise({ onSOS }: { onSOS: () => void }) {
  const [text, setText] = useState('Lista de compras:\n- Pão\n- Leite\n- Ovos\n- Frutas')
  const tapRef = useRef({ count: 0, last: 0 })
  const handleTextTap = () => { const now = Date.now(); if (now - tapRef.current.last < 800) { tapRef.current.count++; if (tapRef.current.count >= 5) { tapRef.current.count = 0; onSOS() } } else { tapRef.current.count = 1 } tapRef.current.last = now }
  return (
    <div className="bg-yellow-50 dark:bg-yellow-950 min-h-screen flex flex-col">
      <div className="p-4 text-center text-yellow-600 dark:text-yellow-400 font-medium">Notas Rápidas</div>
      <div className="flex-1 p-4"><textarea value={text} onChange={e=>setText(e.target.value)} onClick={handleTextTap}
        className="w-full h-full bg-transparent text-gray-700 dark:text-gray-300 resize-none focus:outline-none leading-relaxed" placeholder="Escreva aqui..." /></div>
    </div>
  )
}

// ==========================================
// CLOCK DISGUISE
// ==========================================
export function ClockDisguise({ onSOS }: { onSOS: () => void }) {
  const [time, setTime] = useState(new Date())
  const tapRef = useRef({ count: 0, last: 0 })
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t)},[])
  const handleClockTap = () => { const now = Date.now(); if (now - tapRef.current.last < 1000) { tapRef.current.count++; if (tapRef.current.count >= 5) { tapRef.current.count = 0; onSOS() } } else { tapRef.current.count = 1 } tapRef.current.last = now }
  const h = time.getHours().toString().padStart(2,'0'); const m = time.getMinutes().toString().padStart(2,'0'); const s = time.getSeconds().toString().padStart(2,'0')
  return (
    <div className="bg-black dark:bg-gray-950 min-h-screen flex flex-col items-center justify-center text-white" onClick={handleClockTap}>
      <div className="text-7xl font-extralight tracking-wider">{h}<span className="animate-pulse">:</span>{m}</div>
      <div className="text-2xl text-gray-500 mt-2">{s}</div>
      <div className="text-gray-600 mt-8">{time.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
    </div>
  )
}

// ==========================================
// MAIN OVERLAY
// ==========================================
export function DiscreetModeOverlay() {
  const { isActive, disguiseType, deactivate, discreetSOS, config } = useDiscreetMode()
  const [showPinEntry, setShowPinEntry] = useState(false)
  const [pinInput, setPinInput] = useState('')

  const handleDiscreetSOS = useCallback(() => discreetSOS(), [discreetSOS])

  const handlePinSubmit = () => {
    const result = deactivate(pinInput)
    if (result.success) {
      setShowPinEntry(false)
      setPinInput('')
    } else {
      setPinInput('')
    }
  }

  // Long-press top-left corner to show PIN entry
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleTitleStart = () => { longPressTimer.current = setTimeout(() => setShowPinEntry(true), 2000) }
  const handleTitleEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }

  // Stealth indicators (subtle dots showing system status)
  const stealthIndicators = config?.show_stealth_indicators

  const renderDisguise = () => {
    switch (disguiseType) {
      case 'calculator': return <CalculatorDisguise onSOS={handleDiscreetSOS} />
      case 'weather': return <WeatherDisguise onSOS={handleDiscreetSOS} />
      case 'notes': return <NotesDisguise onSOS={handleDiscreetSOS} />
      case 'clock': return <ClockDisguise onSOS={handleDiscreetSOS} />
      case 'contacts': return <ContactsDisguise onSOS={handleDiscreetSOS} />
      case 'settings_app': return <SettingsDisguise onSOS={handleDiscreetSOS} />
      case 'music_player': return <MusicPlayerDisguise onSOS={handleDiscreetSOS} />
      case 'currency': return <CurrencyDisguise onSOS={handleDiscreetSOS} />
      case 'flashlight': return <FlashlightDisguise onSOS={handleDiscreetSOS} />
      case 'sms_chat': return <SMSChatDisguise onSOS={handleDiscreetSOS} />
      case 'photo_gallery': return <PhotoGalleryDisguise onSOS={handleDiscreetSOS} />
      default: return <CalculatorDisguise onSOS={handleDiscreetSOS} />
    }
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[9999]" style={{ touchAction: 'manipulation' }}>
          {/* PIN entry overlay */}
          <AnimatePresence>
            {showPinEntry && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
                <div className="bg-gray-800 rounded-2xl p-6 w-72">
                  <div className="text-center text-white mb-4">PIN de Desbloqueio</div>
                  <input type="password" inputMode="numeric" maxLength={6} value={pinInput}
                    onChange={e=>setPinInput(e.target.value.replace(/\D/g,''))}
                    onKeyDown={e=>e.key==='Enter'&&handlePinSubmit()}
                    className="w-full bg-gray-700 text-white text-center text-2xl tracking-[0.5em] rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" autoFocus placeholder="• • • •" />
                  <button onClick={()=>{setShowPinEntry(false);setPinInput('')}} className="w-full text-gray-400 text-sm py-2">Cancelar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Long-press zone (top-left corner) */}
          <div className="absolute top-0 left-0 w-20 h-10 z-20" onTouchStart={handleTitleStart} onTouchEnd={handleTitleEnd} onMouseDown={handleTitleStart} onMouseUp={handleTitleEnd} />

          {/* Stealth status indicators (very subtle) */}
          {stealthIndicators && (
            <div className="absolute top-1 right-2 z-30 flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300/40" title="Sistema activo" />
            </div>
          )}

          {/* The actual disguise UI */}
          {renderDisguise()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}