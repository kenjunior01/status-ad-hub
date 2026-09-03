/**
 * DiscreetModeSettings — Página de configuração do Modo Discreto.
 * 
 * O utilizador pode:
 * - Escolher entre 10 disfarces diferentes
 * - Ver preview e descrição de cada um
 * - Configurar PIN normal e Duress PIN
 * - Activar/desactivar métodos de activação
 * - Activar anti-forced-entry
 * - Activar volume button SOS
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Shield, Volume2, Hand, Lock, AlertTriangle,
  Info, Zap, Fingerprint
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { ALL_DISGUISES } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DisguisePicker } from '@/components/DisguisePicker'

export default function DiscreetModeSettings() {
  const { config, disguiseType, changeDisguise, setPin, setDuressPin, updateConfig, activate } = useDiscreetMode()
  const [showPinSetup, setShowPinSetup] = useState<'normal' | 'duress' | null>(null)
  const [newPin, setNewPin] = useState('')

  // Consome disfarce escolhido no ecrã de instalação (/instalar → modo camuflado)
  useEffect(() => {
    try {
      const pending = localStorage.getItem('statusads-pending-disguise')
      if (pending) {
        localStorage.removeItem('statusads-pending-disguise')
        changeDisguise(pending as typeof disguiseType)
        toast.success('Camuflagem aplicada a partir da instalação')
      }
    } catch { /* storage indisponível */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSavePin = () => {
    if (newPin.length < 4) { toast.error('PIN deve ter pelo menos 4 dígitos'); return }
    if (showPinSetup === 'normal') { setPin(newPin); toast.success('PIN actualizado') }
    else { setDuressPin(newPin); toast.success('Duress PIN actualizado') }
    setNewPin(''); setShowPinSetup(null)
  }

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <EyeOff className="w-6 h-6 text-purple-400" />
            Modo Discreto
          </h1>
          <p className="text-white/40 text-sm mt-1">Escolha como camuflar a sua app de segurança</p>
        </div>
        <Button onClick={activate} variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
          <Eye className="w-4 h-4 mr-1" /> Testar
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
          <div className="text-sm text-purple-200/80">
            <p className="font-medium text-purple-200 mb-1">Como funciona?</p>
            <p>Quando activado, a app transforma-se numa app inofensiva à escolha. O sistema de segurança continua a funcionar em background. Para voltar à app real, faça <strong>long-press no canto superior esquerdo</strong> e digite o PIN.</p>
          </div>
        </div>
      </div>

      {/* Disguise Selection — uses the visual DisguisePicker */}
      <div>
        <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">Escolher Disfarce ({ALL_DISGUISES.length} disponíveis)</h2>
        <DisguisePicker mode='inline' onSelect={(type) => {
          toast.success(`Disfarce alterado: ${ALL_DISGUISES.find(d => d.type === type)?.name}`)
        }} />
      </div>

      {/* PIN Configuration */}
      <div>
        <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">PINs de Segurança</h2>
        <div className="space-y-3">
          {/* Normal PIN */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/15"><Lock className="w-4 h-4 text-amber-300" /></div>
                <div>
                  <div className="text-white text-sm font-medium">PIN Normal</div>
                  <div className="text-white/40 text-xs">Abre a app real</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowPinSetup('normal'); setNewPin(config?.deactivation_pin || '') }}
                className="border-white/10 text-white/60 hover:bg-white/5">
                Alterar
              </Button>
            </div>
          </div>

          {/* Duress PIN */}
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/15"><Fingerprint className="w-4 h-4 text-red-400" /></div>
                <div>
                  <div className="text-white text-sm font-medium">Duress PIN <span className="text-red-400 text-[9px] bg-red-500/10 px-1.5 py-0.5 rounded-full ml-1">SILENCIOSO</span></div>
                  <div className="text-white/40 text-xs">Abre a app mas dispara SOS silencioso em background</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowPinSetup('duress'); setNewPin(config?.duress_pin || '') }}
                className="border-red-500/20 text-red-300/60 hover:bg-red-500/5">
                Alterar
              </Button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-red-300/40 text-[11px]">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Se alguém o obrigar a abrir a app, use o Duress PIN. A app parecerá normal mas uma emergência silenciosa será activada com a sua localização GPS enviada a todos os contactos.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activation Methods */}
      <div>
        <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">Métodos de Activacão</h2>
        <div className="space-y-2">
          <ToggleRow icon={Hand} label="Shake para Activar" description="Agitar o telemóvel 3x para activar o disfarce"
            checked={config?.shake_to_activate ?? true} onChange={v => updateConfig({ shake_to_activate: v })} />
          <ToggleRow icon={Volume2} label="Volume Button SOS" description="Sequência ↑↑↓↓ nos botões de volume dispara SOS (funciona no bolso)"
            checked={config?.volume_sos_enabled ?? true} onChange={v => updateConfig({ volume_sos_enabled: v })} />
          <ToggleRow icon={Shield} label="Anti-Forced-Entry" description={`PIN errado ${config?.max_wrong_attempts ?? 3}x = SOS silencioso automático`}
            checked={config?.anti_forced_entry ?? true} onChange={v => updateConfig({ anti_forced_entry: v })} />
          <ToggleRow icon={Eye} label="Indicadores Stealth" description="Mostra pontos subtis de estado dentro do disfarce"
            checked={config?.show_stealth_indicators ?? false} onChange={v => updateConfig({ show_stealth_indicators: v })} />
        </div>
      </div>

      {/* PIN Setup Modal */}
      <AnimatePresence>
        {showPinSetup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setShowPinSetup(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-white text-center text-lg font-semibold mb-1">
                {showPinSetup === 'normal' ? 'Definir PIN Normal' : 'Definir Duress PIN'}
              </h3>
              <p className="text-white/40 text-center text-xs mb-4">
                {showPinSetup === 'normal'
                  ? 'Este PIN abre a app real'
                  : 'Este PIN abre a app MAS dispara SOS silencioso'}
              </p>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSavePin()}
                className="w-full bg-gray-700 text-white text-center text-2xl tracking-[0.5em] rounded-xl p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus placeholder="• • • •" />
              <p className="text-white/20 text-[10px] text-center mb-4">4-6 dígitos</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowPinSetup(null); setNewPin('') }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm">Cancelar</button>
                <button onClick={handleSavePin}
                  className={cn('flex-1 py-2.5 rounded-xl text-white text-sm font-medium',
                    showPinSetup === 'normal' ? 'bg-amber-400 hover:bg-amber-500' : 'bg-red-500 hover:bg-red-600')}>
                Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: {
  icon: React.ElementType; label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <button onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition text-left">
      <div className={cn('p-2 rounded-lg', checked ? 'bg-brand/10' : 'bg-white/5')}>
        <Icon className={cn('w-4 h-4', checked ? 'text-brand' : 'text-white/30')} />
      </div>
      <div className="flex-1">
        <div className="text-white text-sm">{label}</div>
        <div className="text-white/30 text-[11px]">{description}</div>
      </div>
      <div className={cn('w-10 h-6 rounded-full transition-colors relative', checked ? 'bg-brand/30' : 'bg-white/10')}>
        <div className={cn('absolute top-1 w-4 h-4 rounded-full transition-all', checked ? 'left-5 bg-brand' : 'left-1 bg-white/30')} />
      </div>
    </button>
  )
}