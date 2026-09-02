/**
 * FakeCall — Página de configuração da Chamada Falsa.
 *
 * Escapatório realista: agenda uma "chamada" (agora ou em X minutos)
 * que toca com ringtone sintetizado + vibração, com nome/número/
 * operadora configuráveis. O overlay global (useFakeCall) aparece
 * sobre qualquer página do app — inclusive sobre a camuflagem.
 *
 * 100% offline, sem API, sem rede.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PhoneIncoming, Phone, User, Hash, Play, Ban, BellRing,
  Vibrate, ShieldQuestion, Info, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useFakeCall, CARRIER_LABELS, CARRIER_COLORS,
  type Carrier, type CallDelay,
} from '@/hooks/useFakeCall'
import { SpotlightCard } from '@/components/effects'
import { toast } from 'sonner'

const CARRIERS: Carrier[] = ['vodacom', 'tmcel', 'movitel', 'generico']

const DELAY_OPTIONS: { value: CallDelay; label: string }[] = [
  { value: 0, label: 'Agora' },
  { value: 10, label: '10 seg' },
  { value: 30, label: '30 seg' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
]

const SUGGESTED_CALLERS = [
  { name: 'Chefe', number: '+258 84 111 2222', carrier: 'vodacom' as Carrier },
  { name: 'Mãe', number: '+258 82 333 4444', carrier: 'tmcel' as Carrier },
  { name: 'Segurança Casa', number: '+258 86 555 6666', carrier: 'movitel' as Carrier },
  { name: 'Polícia', number: '119', carrier: 'generico' as Carrier },
]

export default function FakeCall() {
  const {
    config, phase, secondsUntilCall,
    startCall, cancelScheduled, updateConfig,
  } = useFakeCall()

  const [name, setName] = useState(config.callerName)
  const [number, setNumber] = useState(config.callerNumber)

  const isScheduled = phase === 'scheduled'

  const handleSaveAndStart = (delay?: CallDelay) => {
    updateConfig({ callerName: name, callerNumber: number })
    startCall({
      callerName: name,
      callerNumber: number,
      delaySeconds: delay ?? config.delaySeconds,
    })
    toast.success(
      delay === 0 || delay === undefined
        ? 'Chamada a entrar!'
        : `Chamada agendada em ${DELAY_OPTIONS.find((d) => d.value === (delay ?? config.delaySeconds))?.label}`,
      { description: 'Navega para outra página — a chamada aparece sobre qualquer ecrã.' }
    )
  }

  const applySuggested = (s: (typeof SUGGESTED_CALLERS)[number]) => {
    setName(s.name)
    setNumber(s.number)
    updateConfig({ callerName: s.name, callerNumber: s.number, carrier: s.carrier })
  }

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <PhoneIncoming className="w-6 h-6 text-[#D4AF37]" />
          Chamada Falsa
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Um telefonema realista para sair com elegância de situações desconfortáveis
        </p>
      </div>

      {/* Agendada */}
      {isScheduled && secondsUntilCall > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 text-[#D4AF37] animate-pulse" />
            <div>
              <p className="text-[#D4AF37] font-semibold text-sm">Chamada agendada</p>
              <p className="text-white/40 text-xs">A tocar em {secondsUntilCall}s</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={cancelScheduled}
            className="border-red-500/30 text-red-300 hover:bg-red-500/10 h-8"
          >
            <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
        </motion.div>
      )}

      {/* Contacto */}
      <SpotlightCard className="p-5 bg-[#14120D] border border-white/[0.06] rounded-2xl space-y-5">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <User className="h-4 w-4 text-[#D4AF37]" /> Quem "liga"?
        </h3>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: Chefe, Mãe, Polícia)"
              className="pl-10 h-12 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
              maxLength={30}
            />
          </div>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="+258 84 000 0000"
              className="pl-10 h-12 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 font-mono"
              maxLength={20}
            />
          </div>
        </div>

        {/* Operadora */}
        <div>
          <p className="text-white/60 text-xs font-medium mb-2">Operadora exibida</p>
          <div className="grid grid-cols-4 gap-2">
            {CARRIERS.map((c) => (
              <button
                key={c}
                onClick={() => updateConfig({ carrier: c })}
                className={cn(
                  'rounded-xl border py-2.5 text-xs font-semibold transition-all',
                  config.carrier === c
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.05]'
                )}
              >
                {CARRIER_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Sugestões */}
        <div>
          <p className="text-white/60 text-xs font-medium mb-2">Sugestões credíveis</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CALLERS.map((s) => (
              <button
                key={s.name}
                onClick={() => applySuggested(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors',
                  'border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/90'
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Efeitos */}
      <SpotlightCard className="p-5 bg-[#14120D] border border-white/[0.06] rounded-2xl space-y-5">
        <h3 className="text-white font-semibold text-[15px]">Efeitos da chamada</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BellRing className="h-4 w-4 text-white/40" />
            <div>
              <p className="text-white/70 text-sm font-medium">Toque realista</p>
              <p className="text-white/30 text-xs">Ringtone sintetizado (padrão internacional)</p>
            </div>
          </div>
          <Switch
            checked={config.ringtone}
            onCheckedChange={(v) => updateConfig({ ringtone: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Vibrate className="h-4 w-4 text-white/40" />
            <div>
              <p className="text-white/70 text-sm font-medium">Vibração</p>
              <p className="text-white/30 text-xs">Vibra como uma chamada verdadeira</p>
            </div>
          </div>
          <Switch
            checked={config.vibration}
            onCheckedChange={(v) => updateConfig({ vibration: v })}
          />
        </div>
      </SpotlightCard>

      {/* Agendamento + iniciar */}
      <SpotlightCard className="p-5 bg-[#14120D] border border-white/[0.06] rounded-2xl">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <Play className="h-4 w-4 text-[#D4AF37]" /> Iniciar chamada
        </h3>
        <p className="text-white/40 text-xs mt-1 mb-4">
          Escolhe quando queres receber o telefonema.
        </p>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {DELAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => updateConfig({ delaySeconds: d.value })}
              className={cn(
                'rounded-xl border py-2.5 text-xs font-semibold transition-all',
                config.delaySeconds === d.value
                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.05]'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <Button
          onClick={() => handleSaveAndStart()}
          disabled={phase !== 'idle'}
          className="w-full h-13 h-[52px] bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold text-base"
        >
          <Phone className="h-5 w-5 mr-2" />
          {config.delaySeconds === 0 ? 'Chamar-me agora' : `Chamar em ${DELAY_OPTIONS.find((d) => d.value === config.delaySeconds)?.label}`}
        </Button>

        {phase === 'ringing' && (
          <p className="text-center text-emerald-400 text-xs mt-3 font-medium">
            A tocar… desliza para o overlay da chamada (aparece sobre qualquer página)
          </p>
        )}
      </SpotlightCard>

      {/* Preview */}
      <SpotlightCard className="p-5 bg-[#14120D] border border-white/[0.06] rounded-2xl">
        <h3 className="text-white font-semibold text-[15px] mb-3">Pré-visualização</h3>
        <div className="mx-auto max-w-[220px] rounded-[2rem] border-4 border-white/10 bg-black overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-b from-neutral-900 to-black p-5 flex flex-col items-center gap-2 py-8">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-lg font-semibold text-white/95">
                {name.trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'C'}
              </span>
            </div>
            <p className="text-white text-lg font-light">{name || 'Chefe'}</p>
            <p className={cn('text-[10px] font-medium', CARRIER_COLORS[config.carrier])}>
              {CARRIER_LABELS[config.carrier]} · {number || '+258 84 000 0000'}
            </p>
            <p className="text-white/40 text-[10px] mt-1">Chamada a entrar…</p>
            <div className="flex gap-10 mt-4">
              <div className="h-10 w-10 rounded-full bg-red-500/90 flex items-center justify-center">
                <PhoneIncoming className="h-4 w-4 text-white rotate-135" />
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/90 flex items-center justify-center">
                <Phone className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Nota */}
      <div className="flex items-start gap-2.5 px-1 text-xs text-white/30 leading-relaxed">
        <ShieldQuestion className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong className="text-white/50">Dica de uso:</strong> combina com a Camuflagem —
          disfarça o app, agenda a chamada em 1 minuto, e quando ela tocar basta "atender" e
          sair com naturalidade. Tudo funciona sem internet e sem deixar rasto: nenhum som é
          descarregado, o toque é gerado pelo próprio telemóvel.
        </p>
      </div>
      <div className="flex items-start gap-2.5 px-1 text-xs text-white/30 leading-relaxed">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Para o toque soar com o ecrã bloqueado, instala a app nativa em <span className="text-[#D4AF37]">/instalar</span>.
        </p>
      </div>
    </div>
  )
}
