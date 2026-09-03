import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Lock, CreditCard, Bluetooth, MapPin, Info, ChevronDown, ChevronUp,
  Camera, Trash2, ExternalLink, Smartphone, Headphones, Watch, Shield, Loader2,
  Crosshair, Navigation, Key, MessageSquare, Wifi, AlertTriangle, CheckCircle2,
  XCircle, Copy, Eye, EyeOff, RefreshCw, Globe, Server, Send, Radio, ClipboardList,
  Bug, Download, ChevronRight, BatteryLow, BatteryWarning, Zap, Monitor, Glasses,
  ShieldAlert, KeyRound, Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDevices } from '@/hooks/useDevices'
import { useGeofenceMonitor } from '@/hooks/useGeofenceMonitor'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import { supabase } from '@/lib/supabase'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useNetworkStatus, formatOfflineDuration } from '@/hooks/useNetworkStatus'
import { useSessions } from '@/hooks/useSessions'
import { SpotlightCard, BeamBorder, Shimmer } from '@/components/effects'
import { toast } from 'sonner'
import { getErrorLogs, clearErrorLogs, exportErrorLogs, getErrorSummary } from '@/lib/error-logger'
import type { ErrorLogEntry } from '@/lib/error-logger'
import * as api from '@/lib/api'
import { useBluetooth } from '@/hooks/useBluetooth'
import { useSmartGlasses } from '@/hooks/useSmartGlasses'
import { useAntiCoercion } from '@/hooks/useAntiCoercion'
import { useTheme, THEMES } from '@/hooks/useTheme'
import { useNavigate } from 'react-router-dom'

type SectionId = 'perfil' | 'aparencia' | 'notificacoes' | 'integracoes' | 'privacidade' | 'plano' | 'dispositivos' | 'zona' | 'sessoes' | 'offline' | 'erros' | 'oculos' | 'anti-coercao' | 'sobre'

const sections: { id: SectionId; title: string; icon: React.ElementType }[] = [
  { id: 'perfil', title: 'Perfil', icon: User },
  { id: 'aparencia', title: 'Aparencia', icon: Palette },
  { id: 'notificacoes', title: 'Notificacoes', icon: Bell },
  { id: 'integracoes', title: 'Integracoes', icon: Key },
  { id: 'privacidade', title: 'Privacidade', icon: Lock },
  { id: 'plano', title: 'Plano', icon: CreditCard },
  { id: 'dispositivos', title: 'Dispositivos Pareados', icon: Bluetooth },
  { id: 'zona', title: 'Zona de Emergencia', icon: MapPin },
  { id: 'sessoes', title: 'Sessoes Activas', icon: Monitor },
  { id: 'offline', title: 'Dados Offline', icon: Wifi },
  { id: 'erros', title: 'Erros e Diagnostico', icon: Bug },
  { id: 'oculos', title: 'Oculos Inteligentes', icon: Glasses },
  { id: 'anti-coercao', title: 'Senha Anti-Coercao', icon: ShieldAlert },
  { id: 'sobre', title: 'Sobre', icon: Info },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="shrink-0">
      <div className={cn('w-10 h-5 rounded-full relative transition-colors duration-300', enabled ? 'bg-brand' : 'bg-white/10')}>
        <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: enabled ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      </div>
    </button>
  )
}

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'loading' | 'idle' }) {
  const colors = { ok: 'bg-brand', warn: 'bg-amber-400', error: 'bg-red-400', loading: 'bg-blue-400 animate-pulse', idle: 'bg-white/15' }
  return <div className={cn('w-2 h-2 rounded-full', colors[status])} />
}

// ============================================
// INTEGRATION CHECK WIDGET
// ============================================
function IntegrationCheck({
  icon: Icon,
  label,
  description,
  status,
  onConfigure,
  isChecking,
}: {
  icon: React.ElementType
  label: string
  description: string
  status: 'ok' | 'warn' | 'error' | 'loading' | 'idle'
  onConfigure?: () => void
  isChecking?: boolean
}) {
  const statusLabels: Record<string, { text: string; color: string }> = {
    ok: { text: 'Configurado', color: 'text-brand' },
    warn: { text: 'Parcial', color: 'text-amber-400' },
    error: { text: 'Nao configurado', color: 'text-red-400/70' },
    loading: { text: 'A verificar...', color: 'text-blue-400' },
    idle: { text: 'Nao verificado', color: 'text-white/20' },
  }
  const st = statusLabels[status]

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className={cn(
        'p-2 rounded-lg shrink-0',
        status === 'ok' ? 'bg-brand/[0.08] border border-brand/15' :
        status === 'error' ? 'bg-red-500/[0.06] border border-red-500/10' :
        'bg-white/[0.03] border border-white/[0.06]'
      )}>
        <Icon className={cn(
          'h-4 w-4',
          status === 'ok' ? 'text-brand' : status === 'error' ? 'text-red-400/60' : 'text-white/40'
        )} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white/80">{label}</p>
          {isChecking && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
        </div>
        <p className="text-[11px] text-white/25 mt-0.5 leading-relaxed">{description}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <StatusDot status={status} />
          <span className={cn('text-[10px] font-medium', st.color)}>{st.text}</span>
        </div>
      </div>
      {onConfigure && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfigure}
          className="shrink-0 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg"
        >
          Configurar
        </Button>
      )}
    </div>
  )
}

// ============================================
// TEST SMS MODAL
// ============================================
function TestSmsModal({
  open,
  onClose,
  onSend,
  isSending,
}: {
  open: boolean
  onClose: () => void
  onSend: (phone: string) => void
  isSending: boolean
}) {
  const [phone, setPhone] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-[#0D1321] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10 border border-brand/15">
              <Send className="h-4 w-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Testar SMS</p>
              <p className="text-[10px] text-white/25">Envie uma mensagem de teste para verificar a integracao</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
            <XCircle className="h-4 w-4 text-white/30" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">Numero de telefone (E.164)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+258841234567"
              className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl font-mono text-sm"
            />
            <p className="text-[10px] text-white/15">Formato: +codigo_pais seguido do numero</p>
          </div>
          <Button
            onClick={() => onSend(phone)}
            disabled={isSending || phone.length < 8}
            className="w-full bg-brand hover:bg-brand-dark text-white rounded-xl gap-2 h-11"
          >
            {isSending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A enviar...</> : <><Send className="h-3.5 w-3.5" /> Enviar SMS de Teste</>}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// DELETE ACCOUNT MODAL
// ============================================
function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  if (!open) return null

  const handleDelete = () => {
    if (step === 1 && confirmText === 'ELIMINAR') {
      setStep(2)
    } else if (step === 2) {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-[#0D1321] border border-red-500/15 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/15">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-300">Eliminar Conta</p>
            <p className="text-[10px] text-white/25">Esta accao e irreversivel</p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/[0.04] border border-red-500/10 space-y-2">
              <p className="text-xs text-white/50 leading-relaxed">
                Ao eliminar a sua conta, os seguintes dados serao permanentemente removidos:
              </p>
              <ul className="text-[11px] text-white/35 space-y-1 pl-3">
                <li className="list-disc">Perfil e informacoes pessoais</li>
                <li className="list-disc">Todos os dispositivos registados</li>
                <li className="list-disc">Contactos de emergencia</li>
                <li className="list-disc">Historico de localizacoes e eventos</li>
                <li className="list-disc">Alertas de emergencia</li>
                <li className="list-disc">Subscricoes push</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/40 text-xs">Digite <span className="font-mono text-red-400">ELIMINAR</span> para confirmar</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl font-mono text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl text-white/40 hover:text-white/60">
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={confirmText !== 'ELIMINAR'}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" /> Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/15">
              <p className="text-xs text-red-300 font-medium">Ultima oportunidade!</p>
              <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                Clique abaixo para eliminar permanentemente a sua conta e todos os dados associados.
                Esta operacao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl text-white/40 hover:text-white/60">
                Voltar atras
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl gap-2"
              >
                {isDeleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A eliminar...</> : <><Trash2 className="h-3.5 w-3.5" /> Eliminar Definitivamente</>}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ============================================
// ANTI-COERCION PASSWORD SETTINGS
// ============================================

function AntiCoercionSettings() {
  const { isConfigured, setPanicPassword, removePanicPassword, verifyPanicPassword } = useAntiCoercion()
  const [step, setStep] = useState<'idle' | 'setting' | 'confirming' | 'removing' | 'testing'>('idle')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'match' | 'no-match'>('idle')
  const [testPassword, setTestPassword] = useState('')

  const handleSetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem')
      return
    }
    setIsSaving(true)
    await setPanicPassword(newPassword)
    setIsSaving(false)
    setStep('idle')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Senha anti-coercao configurada com sucesso!')
  }

  const handleRemove = async () => {
    setIsSaving(true)
    removePanicPassword()
    setIsSaving(false)
    setStep('idle')
    toast.success('Senha anti-coercao removida')
  }

  const handleTestPassword = async () => {
    if (!testPassword) return
    const match = await verifyPanicPassword(testPassword)
    setTestResult(match ? 'match' : 'no-match')
    setTimeout(() => setTestResult('idle'), 3000)
    setTestPassword('')
  }

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-300">O que e a Senha Anti-Coercao?</p>
            <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed">
              Uma senha separada que, ao ser usada no login, mostra uma versao fake do app
              (parece um app de financas) enquanto dispara um SOS silencioso aos seus contactos
              de emergencia. Ideal para situacoes onde e forcado a desbloquear o telefone.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <p className="text-xs font-medium text-white/60 mb-3">Como funciona:</p>
        <div className="space-y-2">
          {[
            'Configure uma senha DIFERENTE da sua senha real',
            'Se for forcado a desbloquear, use esta senha no login',
            'O app mostrara um dashboard falso (app de financias)',
            'Um SOS silencioso e enviado aos seus contactos',
            'O coactor nao suspeita de nada — parece um login normal',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-blue-400">{i + 1}</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <KeyRound className="h-4 w-4 text-white/30" />
          <div>
            <p className="text-xs text-white/60">Status</p>
            <p className={cn('text-[11px] font-medium', isConfigured ? 'text-brand' : 'text-white/25')}>
              {isConfigured ? 'Configurada' : 'Nao configurada'}
            </p>
          </div>
        </div>
        <div className={cn('h-2 w-2 rounded-full', isConfigured ? 'bg-brand shadow-[0_0_6px_rgba(212,175,55,0.5)]' : 'bg-white/10')} />
      </div>

      {/* SET PASSWORD */}
      {step === 'setting' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs font-medium text-white/60">Definir Senha Anti-Coercao</p>
          <p className="text-[10px] text-amber-400/70">
            IMPORTANTE: Use uma senha DIFERENTE da sua senha real do Supabase.
            Esta senha NAO faz login real — ela activa o modo de coercao.
          </p>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha anti-coercao"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-9 text-white text-xs placeholder:text-white/20 outline-none focus:ring-1 focus:ring-brand/30"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 text-white text-xs placeholder:text-white/20 outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setStep('idle'); setNewPassword(''); setConfirmPassword('') }} className="flex-1 rounded-lg text-xs text-white/40">
              Cancelar
            </Button>
            <Button onClick={handleSetPassword} disabled={isSaving || !newPassword || !confirmPassword} className="flex-1 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs gap-1.5">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Guardar
            </Button>
          </div>
        </motion.div>
      )}

      {/* TEST PASSWORD */}
      {step === 'testing' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs font-medium text-white/60">Testar Senha Anti-Coercao</p>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              type="password"
              placeholder="Digite a senha anti-coercao"
              value={testPassword}
              onChange={(e) => { setTestPassword(e.target.value); setTestResult('idle') }}
              onKeyDown={(e) => e.key === 'Enter' && handleTestPassword()}
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 text-white text-xs placeholder:text-white/20 outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>
          {testResult === 'match' && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-brand/[0.06] border border-brand/15">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
              <span className="text-[11px] text-brand">Senha correcta! O modo de coercao seria activado.</span>
            </div>
          )}
          {testResult === 'no-match' && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/[0.06] border border-red-500/15">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[11px] text-red-400">Senha incorrecta. Tente novamente.</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setStep('idle'); setTestPassword(''); setTestResult('idle') }} className="flex-1 rounded-lg text-xs text-white/40">
              Cancelar
            </Button>
            <Button onClick={handleTestPassword} disabled={!testPassword} className="flex-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 text-xs gap-1.5">
              Testar
            </Button>
          </div>
        </motion.div>
      )}

      {/* ACTION BUTTONS (when idle) */}
      {step === 'idle' && (
        <div className="flex gap-2">
          {!isConfigured ? (
            <Button onClick={() => setStep('setting')} className="flex-1 gap-2 bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 h-10 rounded-xl text-xs">
              <KeyRound className="h-3.5 w-3.5" /> Configurar Senha
            </Button>
          ) : (
            <>
              <Button onClick={() => setStep('testing')} className="flex-1 gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 h-10 rounded-xl text-xs">
                <Eye className="h-3.5 w-3.5" /> Testar
              </Button>
              <Button onClick={() => setStep('removing')} className="flex-1 gap-2 bg-red-500/10 text-red-400/60 border border-red-500/15 hover:bg-red-500/20 h-10 rounded-xl text-xs">
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            </>
          )}
        </div>
      )}

      {/* REMOVE CONFIRMATION */}
      {step === 'removing' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15 space-y-3">
          <p className="text-xs font-medium text-red-300">Remover Senha Anti-Coercao?</p>
          <p className="text-[11px] text-white/40">Esta accao remove a sua senha de pânico. O sistema de coercao ficara desactivado.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('idle')} className="flex-1 rounded-lg text-xs text-white/40">
              Cancelar
            </Button>
            <Button onClick={handleRemove} disabled={isSaving} className="flex-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 text-xs gap-1.5">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remover
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ============================================
// MAIN SETTINGS PAGE
// ============================================

/** Secção Aparência — temas seleccionáveis (estilo Calorist Themes) */
function ThemeSection() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-white/80">Cor de destaque</p>
        <p className="text-xs text-white/25 mt-0.5">
          Escolhe a cor que combina contigo — muda botões, alertas e destaques em toda a app.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const active = theme === t.slug
          return (
            <button
              key={t.slug}
              onClick={() => setTheme(t.slug)}
              className={cn(
                'relative p-4 rounded-2xl border text-left transition-all active:scale-[0.97]',
                active
                  ? 'border-transparent ring-2'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
              style={active ? ({ background: `${t.swatch}14`, boxShadow: `0 0 0 2px ${t.swatch}` } as React.CSSProperties) : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="inline-block h-8 w-8 rounded-full shadow-inner"
                  style={{ background: t.swatch, boxShadow: `0 0 14px -2px ${t.swatch}66` }}
                />
                {active && <CheckCircle2 className="h-4 w-4" style={{ color: t.swatch }} />}
              </div>
              <p className="text-sm font-semibold text-white/85">{t.name}</p>
              <p className="text-[11px] text-white/30 mt-0.5">{t.description}</p>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-white/20 flex items-center gap-1.5">
        <Palette className="h-3 w-3" />
        A tua escolha fica guardada neste dispositivo.
      </p>
    </div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const { profile, loading: profileLoading, updateProfile, isUpdating } = useProfile()
  const { devices } = useDevices()
  const { zoneState, distance, zone: geoZone, setZoneFromCurrentPosition, isMonitoring: geoMonitoring } = useGeofenceMonitor()
  const { position: geoPosition, permissionState: geoPermission } = useGeolocation()
  const { permission: notifPermission, isPushSubscribed, isPushSupported, requestPermission, subscribePush, unsubscribePush } = useNotifications()
  const network = useNetworkStatus(false)
  const queue = useOfflineQueue()
  const { sessions, isLoading: sessionsLoading, revokeOtherSessions } = useSessions()
  const ble = useBluetooth()
  const { state: glassesState, config: glassesConfig } = useSmartGlasses()
  const navigate = useNavigate()

  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['perfil']))
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [notifToggles, setNotifToggles] = useState({ alerts: true, location: true, battery: true, tips: false, sound: true, vibration: true })
  const [privToggles, setPrivToggles] = useState({ shareLocation: true, anonymous: false, dataRetention: true })
  const [autoActivate, setAutoActivate] = useState(true)
  const [zoneRadius, setZoneRadius] = useState(500)
  const [settingZone, setSettingZone] = useState(false)
  const [loading, setLoading] = useState(true)

  // Integration check states
  const [twilioStatus, setTwilioStatus] = useState<'ok' | 'warn' | 'error' | 'loading' | 'idle'>('idle')
  const [pushStatus, setPushStatus] = useState<'ok' | 'warn' | 'error' | 'loading' | 'idle'>('idle')
  const [pgNetStatus, setPgNetStatus] = useState<'ok' | 'warn' | 'error' | 'loading' | 'idle'>('idle')
  const [checkingIntegrations, setCheckingIntegrations] = useState(false)
  const [showTestSms, setShowTestSms] = useState(false)
  const [sendingTestSms, setSendingTestSms] = useState(false)
  // Battery alert settings (localStorage-persisted)
  const [batteryAlertEnabled, setBatteryAlertEnabled] = useState(() => {
    return localStorage.getItem('sa_battery_alert_enabled') !== 'false'
  })
  const [batteryThreshold, setBatteryThreshold] = useState(() => {
    const stored = localStorage.getItem('sa_battery_threshold')
    return stored ? parseInt(stored, 10) : 20
  })

  useEffect(() => {
    localStorage.setItem('sa_battery_alert_enabled', String(batteryAlertEnabled))
  }, [batteryAlertEnabled])
  useEffect(() => {
    localStorage.setItem('sa_battery_threshold', String(batteryThreshold))
  }, [batteryThreshold])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)

  // VAPID display
  const [vapidPublicKey, setVapidPublicKey] = useState('')
  const [showVapid, setShowVapid] = useState(false)

  // Error log viewer
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([])
  const [errorSummary, setErrorSummary] = useState({ total: 0, fatal: 0, lastError: null as string | null, lastTimestamp: null as string | null })
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null)

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '')
      setProfilePhone(profile.phone || '')
      setAutoActivate(profile.auto_activate_emergency ?? true)
      setZoneRadius(profile.emergency_zone_radius ?? 500)
      // Restore notification preferences from profile metadata
      const prefs = (profile as any).notification_prefs
      if (prefs) {
        setNotifToggles(prev => ({ ...prev, ...prefs }))
      }
    }
  }, [profile])

  // Fallback to auth metadata if profile hasn't loaded
  useEffect(() => {
    if (!profile && !profileLoading) {
      setProfileName((user?.user_metadata as any)?.full_name || 'Utilizador')
    }
  }, [profile, profileLoading, user])

  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t) }, [])

  // Load error logs when section opens
  useEffect(() => {
    if (openSections.has('erros')) {
      getErrorLogs().then(setErrorLogs).catch(() => {})
      getErrorSummary().then(setErrorSummary).catch(() => {})
    }
  }, [openSections])

  // Check VAPID key availability
  useEffect(() => {
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (key) {
      setVapidPublicKey(key)
      setPushStatus(isPushSupported ? 'ok' : 'warn')
    } else {
      setPushStatus('error')
    }
  }, [isPushSupported])

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSaveProfile = () => {
    updateProfile({
      full_name: profileName.trim(),
      phone: profilePhone.trim(),
      auto_activate_emergency: autoActivate,
    })
    // Also persist notification prefs
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ notification_prefs: notifToggles } as any)
        .eq('user_id', user.id)
        .then(() => {})
    }
  }

  // ---- Integration checks ----
  const checkIntegrations = useCallback(async () => {
    setCheckingIntegrations(true)
    setTwilioStatus('loading')
    setPgNetStatus('loading')

    // Check Twilio by invoking send-sms with a dry-run flag (nunca envia SMS)
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: '+258000000000', message: 'TEST_CHECK', dryRun: true },
      })
      if (error) {
        const msg = (error as any).message || ''
        setTwilioStatus(msg.includes('not found') || msg.includes('404') ? 'error' : 'warn')
      } else {
        // dryRun devolve { dryRun: true, configured } — 'ok' só se Twilio configurado
        setTwilioStatus((data as any)?.configured ? 'ok' : 'warn')
      }
    } catch {
      setTwilioStatus('error') // Function doesn't exist
    }

    // Check pg_net: a função está protegida — 400/401/403 significa que existe
    // e está a rejeitar correctamente chamadas inválidas (comportamento desejado)
    try {
      const { error } = await supabase.functions.invoke('notify-contacts', {
        body: { userId: 'test', alertId: 'test', lat: 0, lng: 0, contactPhones: [] },
      })
      if (error) {
        const ctx = (error as any).context?.status ?? (error as any).status ?? 0
        const msg = (error as any).message || ''
        if (msg.includes('not found') || msg.includes('404') || ctx === 404) {
          setPgNetStatus('error')
        } else if ([400, 401, 403].includes(ctx)) {
          setPgNetStatus('ok') // protegida e activa
        } else {
          setPgNetStatus('warn')
        }
      } else {
        setPgNetStatus('ok')
      }
    } catch {
      setPgNetStatus('error')
    }

    setCheckingIntegrations(false)
  }, [])

  // Auto-check integrations when section opens
  useEffect(() => {
    if (openSections.has('integracoes') && twilioStatus === 'idle') {
      checkIntegrations()
    }
  }, [openSections.has('integracoes')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Test SMS ----
  const handleTestSms = async (phone: string) => {
    setSendingTestSms(true)
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { phone, message: '[StatusAds Connect] Teste de integracao SMS. Se recebeu esta mensagem, a integracao esta correcta.' },
      })
      if (error) throw error
      toast.success('SMS de teste enviado com sucesso!')
      setShowTestSms(false)
    } catch (err) {
      toast.error('Falha ao enviar SMS. Verifique as credenciais Twilio.')
    } finally {
      setSendingTestSms(false)
    }
  }

  // ---- Account deletion ----
  const handleDeleteAccount = async () => {
    if (!user) return
    setIsDeleting(true)
    try {
      // Delete profile data first
      await supabase.from('profiles').delete().eq('user_id', user.id)
      await supabase.from('devices').delete().eq('user_id', user.id)
      await supabase.from('emergency_contacts').delete().eq('user_id', user.id)
      await supabase.from('location_events').delete().eq('user_id', user.id)
      await supabase.from('emergency_alerts').delete().eq('user_id', user.id)
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
      // Delete auth user
      let rpcError: any = null
      try {
        const result = await supabase.rpc('delete_user_account', { p_user_id: user.id })
        rpcError = result.error
      } catch {
        // Fallback: sign out
        await signOut()
      }
      if (rpcError) console.warn('RPC delete_user_account not available, signing out')
      await signOut()
      toast.success('Conta eliminada com sucesso')
      setShowDeleteModal(false)
    } catch {
      toast.error('Erro ao eliminar conta. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // ---- GDPR Full Data Export ----
  const handleExportAllData = useCallback(async () => {
    if (!user?.id) return
    setIsExportingData(true)
    try {
      const [profileData, devicesData, contactsData, eventsData, emergencyData, checkInsData] = await Promise.all([
        api.getProfile(user.id).catch(() => null),
        api.getDevices(user.id).catch(() => []),
        api.getContacts(user.id).catch(() => []),
        api.getEvents(user.id, '30dias').catch(() => []),
        api.getEmergencyHistory(user.id, 100).catch(() => []),
        api.getCheckIns(user.id, 100).catch(() => []),
      ])
      const exportData = {
        exportado_em: new Date().toISOString(),
        plataforma: 'StatusAds Connect',
        versao: '2.9.0',
        utilizador: {
          id: user.id,
          email: user.email,
          criado_em: user.created_at,
        },
        perfil: profileData,
        dispositivos: devicesData,
        contactos_emergencia: contactsData,
        eventos_localizacao_30dias: eventsData,
        historico_emergencias: emergencyData,
        historico_checkins: checkInsData,
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statusads-dados-completos-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Dados exportados com sucesso')
    } catch {
      toast.error('Erro ao exportar dados. Tente novamente.')
    } finally {
      setIsExportingData(false)
    }
  }, [user])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado!')).catch(() => toast.error('Falha ao copiar'))
  }

  const deviceIconMap: Record<string, React.ElementType> = { phone: Smartphone, airpods: Headphones, smartwatch: Watch }
  const pairedDevices = devices.length > 0
    ? devices.map(d => ({ name: d.name, icon: deviceIconMap[d.type] || Bluetooth, color: d.color || '#D4AF37' }))
    : []

  const notifItems = [
    { key: 'alerts' as const, label: 'Alertas de emergencia', desc: 'Receber notificacoes quando um alerta for activado' },
    { key: 'location' as const, label: 'Actualizacoes de localizacao', desc: 'Notificar quando dispositivos partilharem localizacao' },
    { key: 'battery' as const, label: 'Alertas de bateria baixa', desc: 'Avisar quando a bateria estiver baixa' },
    { key: 'tips' as const, label: 'Dicas de seguranca', desc: 'Receber dicas semanais sobre seguranca pessoal' },
    { key: 'sound' as const, label: 'Som de emergencia', desc: 'Reproduzir sirene ao activar emergencia' },
    { key: 'vibration' as const, label: 'Vibracao', desc: 'Vibrar o dispositivo em caso de emergencia' },
  ]
  const privItems = [
    { key: 'shareLocation' as const, label: 'Partilha de localizacao', desc: 'Permitir que contactos vejam a sua localizacao' },
    { key: 'anonymous' as const, label: 'Modo anonimo', desc: 'Ocultar identidade ao partilhar localizacao' },
    { key: 'dataRetention' as const, label: 'Retencao de dados', desc: 'Manter historico de localizacoes por 90 dias' },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Configuracoes</h1>
        <p className="text-sm text-white/30 mt-1">Gerir a sua conta e preferencias</p>
      </motion.div>

      {loading ? (
        <div className="space-y-3 max-w-3xl">
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <Shimmer className="h-14 w-full rounded-2xl" />
            </div>
          ))}
          <Shimmer className="h-12 w-full rounded-xl" />
        </div>
      ) : (
      <div className="space-y-3 max-w-3xl">
        {sections.map((section, si) => {
          const isOpen = openSections.has(section.id)
          const IconComp = section.icon
          return (
            <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
              {section.id === 'plano' ? (
                <BeamBorder color="#D4AF37">
                  <SpotlightCard className="overflow-hidden">
                    <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand/[0.08] border border-brand/15"><IconComp className="h-4 w-4 text-brand" strokeWidth={1.5} /></div>
                        <span className="font-medium text-sm text-brand">{section.title}</span>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-white/20" /> : <ChevronDown className="h-4 w-4 text-white/20" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-4 pb-5 border-t border-brand/10 pt-5">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 rounded-xl bg-brand/[0.05] border border-brand/15">
                                <div>
                                  <p className="font-display font-semibold text-brand text-sm">Plano {profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'familia' ? 'Familia' : 'Gratuito'}</p>
                                  <p className="text-[11px] text-white/25 mt-0.5">
                                    {profile?.plan === 'premium' ? 'Dispositivos ilimitados - Suporte 24/7' : profile?.plan === 'familia' ? 'Ate 5 dispositivos - Suporte prioritario' : 'Ate 2 dispositivos - Suporte basico'}
                                  </p>
                                </div>
                                <span className="text-sm font-display font-bold text-white">
                                  {profile?.plan === 'premium' ? '499 MT/mes' : profile?.plan === 'familia' ? '249 MT/mes' : 'Gratuito'}
                                </span>
                              </div>
                              {profile?.plan === 'free' ? (
                                <Button onClick={() => navigate('/dashboard/assinatura')} className="bg-brand hover:bg-brand-dark text-black gap-2 rounded-xl font-semibold"><Shield className="h-4 w-4" />Ver planos e fazer upgrade</Button>
                              ) : (
                                <Button variant="outline" onClick={() => navigate('/dashboard/assinatura')} className="border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 gap-2 rounded-xl"><Shield className="h-4 w-4" />Gerir assinatura e pagamentos</Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SpotlightCard>
                </BeamBorder>
              ) : (
              <SpotlightCard className="overflow-hidden">
                <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"><IconComp className="h-4 w-4 text-white/40" strokeWidth={1.5} /></div>
                    <span className="font-medium text-sm text-white/80">{section.title}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-white/20" /> : <ChevronDown className="h-4 w-4 text-white/20" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-5 border-t border-white/[0.04] pt-5">
                        {section.id === 'perfil' && (
                          <div className="space-y-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-amber-500 flex items-center justify-center text-xl font-display font-bold text-white shadow-[0_0_30px_-5px_rgba(212,175,55,0.2)]">
                                  {profileName.charAt(0).toUpperCase()}
                                </div>
                                <button className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] transition"><Camera className="h-3 w-3 text-white/50" /></button>
                              </div>
                              <div className="text-xs text-white/25">Foto de perfil</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5"><Label className="text-white/40 text-xs">Nome</Label><Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl" /></div>
                              <div className="space-y-1.5"><Label className="text-white/40 text-xs">Email</Label><Input value={user?.email || ''} readOnly className="bg-white/[0.02] border-white/[0.06] text-white/30 cursor-not-allowed rounded-xl" /></div>
                              <div className="space-y-1.5 md:col-span-2"><Label className="text-white/40 text-xs">Telefone</Label><Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl" /></div>
                            </div>
                            <Button onClick={handleSaveProfile} disabled={isUpdating} className="bg-brand hover:bg-brand-dark text-white hover:shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)] rounded-xl gap-2">
                              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Guardar Alteracoes
                            </Button>
                          </div>
                        )}
                        {section.id === 'aparencia' && (
                          <ThemeSection />
                        )}
                        {section.id === 'notificacoes' && (
                          <div className="space-y-4">
                            {/* Web Push status card */}
                            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white/80">Notificacoes Push</p>
                                  <p className="text-xs text-white/25 mt-0.5">Receba alertas mesmo com a app em fundo</p>
                                </div>
                                <div className={cn(
                                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border',
                                  isPushSubscribed
                                    ? 'bg-brand/10 border-brand/20 text-brand'
                                    : notifPermission === 'granted'
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                      : 'bg-white/[0.04] border-white/[0.06] text-white/30'
                                )}>
                                  <div className={cn('w-1.5 h-1.5 rounded-full', isPushSubscribed ? 'bg-brand' : 'bg-white/20')} />
                                  {isPushSubscribed ? 'Activo' : notifPermission === 'granted' ? 'Nao inscrito' : 'Desactivado'}
                                </div>
                              </div>
                              {isPushSupported ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={isPushSubscribed ? unsubscribePush : subscribePush}
                                  className={cn(
                                    'w-full rounded-xl text-xs gap-2 border',
                                    isPushSubscribed
                                      ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                                      : 'border-brand/20 text-brand hover:bg-brand/10'
                                  )}
                                >
                                  {isPushSubscribed ? 'Desactivar Push' : 'Activar Notificacoes Push'}
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-amber-400/70 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3" />
                                    Push nao disponivel. Falta a chave VAPID publica no ambiente.
                                  </p>
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                    <code className="text-[10px] text-white/20 font-mono flex-1 truncate">
                                      VITE_VAPID_PUBLIC_KEY={vapidPublicKey ? '***' + vapidPublicKey.slice(-8) : '(nao definida)'}
                                    </code>
                                    <button onClick={() => toggleSection('integracoes')} className="text-[9px] text-brand/70 hover:underline">Abrir Integracoes</button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {notifItems.map(item => (
                              <div key={item.key} className="flex items-center justify-between gap-4">
                                <div><p className="text-sm font-medium text-white/80">{item.label}</p><p className="text-xs text-white/25 mt-0.5">{item.desc}</p></div>
                                <Toggle enabled={notifToggles[item.key]} onToggle={() => setNotifToggles(p => ({ ...p, [item.key]: !p[item.key] }))} />
                              </div>
                            ))}

                            {/* Battery Low Alert subsection */}
                            <div className="pt-3 mt-1 border-t border-white/[0.04]">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/15">
                                  <BatteryLow className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-medium text-white/80">Alerta de Bateria Baixa</p>
                              </div>
                              <div className="space-y-3 pl-1">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs text-white/60">Activar monitoramento</p>
                                    <p className="text-[11px] text-white/20 mt-0.5">Avisar quando bateria do BLE estiver baixa</p>
                                  </div>
                                  <Toggle enabled={batteryAlertEnabled} onToggle={() => setBatteryAlertEnabled(v => !v)} />
                                </div>
                                {batteryAlertEnabled && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs text-white/40">Limiar de alerta</p>
                                      <span className="text-xs font-mono text-amber-400 font-medium">{batteryThreshold}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={5}
                                      max={30}
                                      step={5}
                                      value={batteryThreshold}
                                      onChange={(e) => setBatteryThreshold(Number(e.target.value))}
                                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                                        bg-white/[0.08] [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
                                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.3)]
                                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300/30
                                        [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400
                                        [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-300/30"
                                      />
                                    <div className="flex justify-between text-[9px] text-white/15">
                                      <span>5%</span>
                                      <span>15%</span>
                                      <span>30%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {section.id === 'integracoes' && (
                          <div className="space-y-4">
                            {/* Integration status header */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white/70">Estado das Integracoes</p>
                                <p className="text-[10px] text-white/20 mt-0.5">Verifique se os servicos de notificacao estao configurados</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={checkIntegrations}
                                disabled={checkingIntegrations}
                                className="text-[10px] text-white/30 hover:text-white/50 gap-1.5 rounded-lg"
                              >
                                <RefreshCw className={cn('h-3 w-3', checkingIntegrations && 'animate-spin')} />
                                Verificar
                              </Button>
                            </div>

                            {/* Twilio SMS */}
                            <IntegrationCheck
                              icon={MessageSquare}
                              label="Twilio SMS"
                              description="Envio de mensagens SMS para contactos de emergencia via Twilio API. Requer TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER configurados como segredos no Supabase."
                              status={twilioStatus}
                              isChecking={checkingIntegrations}
                              onConfigure={() => setShowTestSms(true)}
                            />

                            {/* Web Push / VAPID */}
                            <IntegrationCheck
                              icon={Radio}
                              label="Web Push (VAPID)"
                              description="Notificacoes push no navegador via VAPID. Requer VITE_VAPID_PUBLIC_KEY no env do frontend e VAPID_PRIVATE_KEY como segredo no Supabase."
                              status={pushStatus}
                              onConfigure={vapidPublicKey ? undefined : () => {}}
                            />

                            {/* pg_net trigger */}
                            <IntegrationCheck
                              icon={Server}
                              label="pg_net Auto-Notificacao"
                              description="Gatilho automatico que notifica contactos quando uma emergencia e criada. Usa a extensao pg_net para chamar Edge Functions directamente do PostgreSQL."
                              status={pgNetStatus}
                              isChecking={checkingIntegrations}
                            />

                            {/* VAPID Key info */}
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                              <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-white/30" />
                                <span className="text-xs font-medium text-white/50">Chave VAPID Publica</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] font-mono text-[10px] text-white/30 truncate">
                                  {showVapid ? (vapidPublicKey || '(nao definida)') : (vapidPublicKey ? '••••••••' + vapidPublicKey.slice(-12) : '(nao definida)')}
                                </div>
                                <button onClick={() => setShowVapid(!showVapid)} className="p-2 rounded-lg hover:bg-white/[0.04] transition">
                                  {showVapid ? <EyeOff className="h-3.5 w-3.5 text-white/30" /> : <Eye className="h-3.5 w-3.5 text-white/30" />}
                                </button>
                                <button onClick={() => vapidPublicKey && copyToClipboard(vapidPublicKey)} className="p-2 rounded-lg hover:bg-white/[0.04] transition">
                                  <Copy className="h-3.5 w-3.5 text-white/30" />
                                </button>
                              </div>
                              {vapidPublicKey ? (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 text-brand" />
                                  <span className="text-[10px] text-brand">Chave VAPID configurada no frontend</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <XCircle className="h-3 w-3 text-red-400/70" />
                                    <span className="text-[10px] text-red-400/70">Chave VAPID nao configurada</span>
                                  </div>
                                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                                    <p className="text-[10px] text-white/30 font-medium">Para configurar:</p>
                                    <ol className="text-[10px] text-white/20 space-y-0.5 pl-3 list-decimal">
                                      <li>Execute: <code className="bg-white/[0.04] px-1 rounded text-[9px]">npx web-push generate-vapid-keys</code></li>
                                      <li>Adicione <code className="bg-white/[0.04] px-1 rounded text-[9px]">VITE_VAPID_PUBLIC_KEY</code> ao <code className="bg-white/[0.04] px-1 rounded text-[9px]">.env</code></li>
                                      <li>Adicione <code className="bg-white/[0.04] px-1 rounded text-[9px]">VAPID_PRIVATE_KEY</code> aos segredos do Supabase</li>
                                    </ol>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Environment variables guide */}
                            <div className="p-4 rounded-xl bg-brand/[0.03] border border-brand/10 space-y-3">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-brand/60" />
                                <span className="text-xs font-medium text-brand/80">Variaveis de Ambiente Necessarias</span>
                              </div>
                              <div className="space-y-2 text-[10px]">
                                <div className="flex items-start gap-2">
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono text-[9px]">.env</span>
                                  <div className="space-y-0.5 text-white/30">
                                    <p><code className="text-white/40">VITE_SUPABASE_URL</code></p>
                                    <p><code className="text-white/40">VITE_SUPABASE_ANON_KEY</code></p>
                                    <p><code className="text-white/40">VITE_VAPID_PUBLIC_KEY</code></p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[9px]">segredos</span>
                                  <div className="space-y-0.5 text-white/30">
                                    <p><code className="text-white/40">TWILIO_ACCOUNT_SID</code></p>
                                    <p><code className="text-white/40">TWILIO_AUTH_TOKEN</code></p>
                                    <p><code className="text-white/40">TWILIO_PHONE_NUMBER</code></p>
                                    <p><code className="text-white/40">VAPID_PRIVATE_KEY</code></p>
                                    <p><code className="text-white/40">app.supabase_url</code> (param)</p>
                                    <p><code className="text-white/40">app.service_role_key</code> (param)</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Deploy edge functions button */}
                            <Button
                              variant="outline"
                              className="w-full gap-2 border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.03] rounded-xl text-xs"
                              onClick={() => {
                                toast.info('Execute: supabase functions deploy send-sms notify-contacts web-push/send')
                              }}
                            >
                              <Wifi className="h-3.5 w-3.5" />
                              Ver Comandos de Deploy
                            </Button>
                          </div>
                        )}
                        {section.id === 'privacidade' && <div className="space-y-4">
                          {privItems.map(item => (
                            <div key={item.key} className="flex items-center justify-between gap-4">
                              <div><p className="text-sm font-medium text-white/80">{item.label}</p><p className="text-xs text-white/25 mt-0.5">{item.desc}</p></div>
                              <Toggle enabled={privToggles[item.key]} onToggle={() => setPrivToggles(p => ({ ...p, [item.key]: !p[item.key] }))} />
                            </div>
                          ))}
                          <div className="pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center gap-2 mb-2">
                              <Download className="h-3.5 w-3.5 text-white/30" />
                              <span className="text-xs font-medium text-white/50">Exportacao de Dados (RGPD)</span>
                            </div>
                            <p className="text-[11px] text-white/25 mb-3 leading-relaxed">
                              Descarregue uma copia completa de todos os seus dados armazenados na plataforma, incluindo perfil, dispositivos, contactos, historico de eventos, emergencias e check-ins.
                            </p>
                            <Button
                              onClick={handleExportAllData}
                              disabled={isExportingData}
                              className="w-full gap-2 bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70 rounded-xl text-xs"
                            >
                              {isExportingData
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A exportar dados...</>
                                : <><Download className="h-3.5 w-3.5" /> Exportar Dados Completos</>
                              }
                            </Button>
                          </div>
                        </div>}
                        {section.id === 'dispositivos' && (
                          <div className="space-y-2">
                            {pairedDevices.length === 0 ? (
                              <p className="text-sm text-white/25 py-4 text-center">Nenhum dispositivo pareado</p>
                            ) : pairedDevices.map(d => {
                              const DIcon = d.icon
                              return (
                                <div key={d.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition">
                                  <div className="p-2 rounded-lg border border-white/[0.06]" style={{ backgroundColor: d.color + '10' }}><DIcon className="h-4 w-4" style={{ color: d.color }} /></div>
                                  <div><p className="text-sm font-medium text-white/80">{d.name}</p><p className="text-[10px] text-white/20">Pareado</p></div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {section.id === 'zona' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div><p className="text-sm font-medium text-white/80">Activar automaticamente</p><p className="text-xs text-white/25 mt-0.5">Activar o modo de emergencia ao sair da zona</p></div>
                              <Toggle enabled={autoActivate} onToggle={() => setAutoActivate(!autoActivate)} />
                            </div>

                            {geoMonitoring && (
                              <div className={cn(
                                'p-4 rounded-xl border transition-colors',
                                zoneState === 'inside'
                                  ? 'bg-brand/[0.05] border-brand/15'
                                  : zoneState === 'outside'
                                    ? 'bg-red-500/[0.05] border-red-500/15'
                                    : 'bg-white/[0.02] border-white/[0.06]'
                              )}>
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    'p-2 rounded-lg',
                                    zoneState === 'inside' ? 'bg-brand/10' : zoneState === 'outside' ? 'bg-red-500/10' : 'bg-white/[0.04]'
                                  )}>
                                    <Navigation className={cn(
                                      'h-4 w-4',
                                      zoneState === 'inside' ? 'text-brand' : zoneState === 'outside' ? 'text-red-400' : 'text-white/30'
                                    )} />
                                  </div>
                                  <div className="flex-1">
                                    <p className={cn(
                                      'text-sm font-medium',
                                      zoneState === 'inside' ? 'text-brand' : zoneState === 'outside' ? 'text-red-400' : 'text-white/40'
                                    )}>
                                      {zoneState === 'inside' ? 'Dentro da zona' : zoneState === 'outside' ? 'FORA DA ZONA' : 'A aguardar GPS...'}
                                    </p>
                                    {distance !== null && (
                                      <p className="text-[11px] text-white/25 mt-0.5">
                                        A {Math.round(distance)}m do centro | Precisao: {geoPosition ? Math.round(geoPosition.accuracy) : '?'}m
                                      </p>
                                    )}
                                  </div>
                                  <div className={cn(
                                    'w-2.5 h-2.5 rounded-full',
                                    zoneState === 'inside' ? 'bg-brand animate-pulse' : zoneState === 'outside' ? 'bg-red-500 animate-pulse' : 'bg-white/20'
                                  )} />
                                </div>
                              </div>
                            )}

                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <div className="flex items-center gap-2 mb-3">
                                <MapPin className="h-4 w-4 text-brand" />
                                <span className="text-sm font-medium text-white/70">Zona Configurada</span>
                              </div>
                              <p className="text-[11px] text-white/20 font-mono mb-3">
                                Centro: {geoZone?.lat?.toFixed(5) ?? profile?.emergency_zone_lat?.toFixed(4) ?? '---'}, {geoZone?.lng?.toFixed(5) ?? profile?.emergency_zone_lng?.toFixed(4) ?? '---'}
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-white/30">Raio da zona</span>
                                  <span className="text-[11px] font-mono text-white/60">{zoneRadius}m</span>
                                </div>
                                <input
                                  type="range" min={100} max={5000} step={50} value={zoneRadius}
                                  onChange={(e) => setZoneRadius(Number(e.target.value))}
                                  className="w-full h-1 rounded-full appearance-none bg-white/[0.08] accent-brand cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-white/15">
                                  <span>100m</span><span>5km</span>
                                </div>
                              </div>
                            </div>

                            <Button
                              onClick={async () => {
                                setSettingZone(true)
                                await setZoneFromCurrentPosition(zoneRadius)
                                setSettingZone(false)
                              }}
                              disabled={settingZone || geoPermission === 'denied'}
                              className={cn(
                                'w-full gap-2 rounded-xl h-11 transition-all',
                                geoPermission === 'denied'
                                  ? 'bg-white/[0.03] border border-white/[0.08] text-white/20 cursor-not-allowed'
                                  : 'bg-brand hover:bg-brand-dark text-white hover:shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)]'
                              )}
                            >
                              {settingZone
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> A definir zona...</>
                                : <><Crosshair className="h-4 w-4" /> Definir Zona Aqui (GPS Actual)</>
                              }
                            </Button>

                            {geoPermission === 'denied' && (
                              <p className="text-[11px] text-amber-400/70 text-center">
                                Permissao de localizacao negada. Active nas definicoes do navegador.
                              </p>
                            )}
                          </div>
                        )}
                        {section.id === 'offline' && (
                          <div className="space-y-4">
                            {/* Network Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={cn('w-2 h-2 rounded-full', network.isOnline ? 'bg-brand' : 'bg-amber-400 animate-pulse')} />
                                <span className="text-sm text-white/60">Estado da conexao</span>
                              </div>
                              <span className={cn('text-xs font-medium', network.isOnline ? 'text-brand' : 'text-amber-400')}>
                                {network.isOnline ? 'Online' : network.offlineDuration ? `Offline ha ${formatOfflineDuration(network.offlineDuration)}` : 'Offline'}
                              </span>
                            </div>

                            {/* Queue Stats */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Emergencias na fila</p>
                                <p className={cn('text-lg font-bold', queue.emergencyPending > 0 ? 'text-red-400' : 'text-white/50')}>{queue.emergencyPending}</p>
                              </div>
                              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Eventos na fila</p>
                                <p className={cn('text-lg font-bold', queue.eventPending > 0 ? 'text-blue-400' : 'text-white/50')}>{queue.eventPending}</p>
                              </div>
                            </div>

                            {/* Last Sync */}
                            {queue.lastSyncAt && (
                              <p className="text-[11px] text-white/25">
                                Ultima sincronizacao: {new Date(queue.lastSyncAt).toLocaleTimeString('pt-BR')}
                              </p>
                            )}

                            {/* Error */}
                            {queue.lastError && (
                              <p className="text-[11px] text-red-400/70">Erro: {queue.lastError}</p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => queue.syncQueue()}
                                disabled={!network.isOnline || queue.isSyncing || queue.pendingCount === 0}
                                className="flex-1 gap-1.5 bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 h-9 rounded-lg text-xs"
                              >
                                <RefreshCw className={cn('h-3.5 w-3.5', queue.isSyncing && 'animate-spin')} />
                                {queue.isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                              </Button>
                              {queue.pendingCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => queue.clearQueue()}
                                  className="gap-1.5 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] h-9 rounded-lg text-xs"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Limpar
                                </Button>
                              )}
                            </div>

                            <div className="rounded-lg bg-blue-500/[0.04] border border-blue-500/10 p-3">
                              <p className="text-[11px] text-white/40 leading-relaxed">
                                <span className="text-blue-400/80 font-medium">Como funciona:</span> Se perder conexao enquanto activa uma emergencia, o pedido e guardado localmente no seu dispositivo e enviado automaticamente quando a conexao e restabelecida. As emergencias tem prioridade maxima.
                              </p>
                            </div>
                          </div>
                        )}
                        {section.id === 'erros' && (
                          <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total de erros</p>
                                <p className={cn('text-lg font-bold', errorSummary.total > 0 ? 'text-amber-400' : 'text-white/50')}>{errorSummary.total}</p>
                              </div>
                              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Erros fatais</p>
                                <p className={cn('text-lg font-bold', errorSummary.fatal > 0 ? 'text-red-400' : 'text-white/50')}>{errorSummary.fatal}</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  const json = await exportErrorLogs()
                                  try {
                                    const blob = new Blob([json], { type: 'application/json' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = 'statusads-erros.json'
                                    a.click()
                                    URL.revokeObjectURL(url)
                                    toast.success('Ficheiro descarregado')
                                  } catch { toast.error('Erro ao exportar') }
                                }}
                                disabled={errorSummary.total === 0}
                                className="flex-1 gap-1.5 bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70 h-9 rounded-lg text-xs"
                              >
                                <Download className="h-3.5 w-3.5" /> Exportar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await clearErrorLogs()
                                  setErrorLogs([])
                                  setErrorSummary({ total: 0, fatal: 0, lastError: null, lastTimestamp: null })
                                  toast.success('Registos de erros limpos')
                                }}
                                disabled={errorSummary.total === 0}
                                className="gap-1.5 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] h-9 rounded-lg text-xs"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Limpar
                              </Button>
                            </div>

                            {/* Log list */}
                            {errorLogs.length === 0 ? (
                              <div className="text-center py-6">
                                <CheckCircle2 className="h-8 w-8 text-brand/40 mx-auto mb-2" />
                                <p className="text-xs text-white/30">Sem erros registados</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {errorLogs.slice(0, 20).map(entry => (
                                  <div
                                    key={entry.id ?? entry.timestamp}
                                    className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                                  >
                                    <button
                                      onClick={() => setExpandedErrorId(prev => prev === entry.id ? null : (entry.id ?? null))}
                                      className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.02] transition-colors"
                                    >
                                      <div className={cn(
                                        'mt-0.5 w-1.5 h-1.5 rounded-full shrink-0',
                                        entry.severity === 'fatal' ? 'bg-red-400' : entry.severity === 'error' ? 'bg-amber-400' : 'bg-blue-400'
                                      )} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            'text-[10px] font-medium px-1.5 py-0.5 rounded',
                                            entry.severity === 'fatal' ? 'bg-red-500/10 text-red-400' : entry.severity === 'error' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                                          )}>{entry.severity}</span>
                                          <span className="text-[10px] text-white/20">{entry.source}</span>
                                        </div>
                                        <p className="text-[11px] text-white/50 mt-1 truncate">{entry.message}</p>
                                        <p className="text-[9px] text-white/15 mt-0.5">
                                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                                          {entry.context !== 'global' && <span className="ml-1.5">· {entry.context}</span>}
                                        </p>
                                      </div>
                                      <ChevronRight className={cn(
                                        'h-3.5 w-3.5 text-white/15 shrink-0 mt-1 transition-transform',
                                        expandedErrorId === entry.id && 'rotate-90'
                                      )} />
                                    </button>

                                    <AnimatePresence>
                                      {expandedErrorId === entry.id && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/[0.03]">
                                            {entry.stack && (
                                              <div>
                                                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Stack</p>
                                                <pre className="text-[9px] font-mono text-white/20 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{entry.stack}</pre>
                                              </div>
                                            )}
                                            {entry.componentStack && (
                                              <div>
                                                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Component Stack</p>
                                                <pre className="text-[9px] font-mono text-white/20 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{entry.componentStack}</pre>
                                              </div>
                                            )}
                                            {entry.url && (
                                              <p className="text-[9px] text-white/15 font-mono truncate">URL: {entry.url}</p>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="rounded-lg bg-amber-500/[0.04] border border-amber-500/10 p-3">
                              <p className="text-[11px] text-white/40 leading-relaxed">
                                <span className="text-amber-400/80 font-medium">Nota:</span> Os erros sao guardados localmente no seu dispositivo (max. 50). Esta informacao ajuda a diagnosticar problemas. Nenhum dado e enviado a servidores de terceiros.
                              </p>
                            </div>
                          </div>
                        )}
                        {section.id === 'sessoes' && (
                          <div className="space-y-4">
                            {sessionsLoading ? (
                              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>
                            ) : sessions.length === 0 ? (
                              <div className="text-center py-6">
                                <Monitor className="h-8 w-8 text-white/10 mx-auto mb-2" />
                                <p className="text-xs text-white/30">Sem sessoes registadas</p>
                              </div>
                            ) : (
                              <>
                                {sessions.map((s) => {
                                  const deviceIcon: Record<string, React.ElementType> = { iPhone: Smartphone, iPad: Smartphone, Android: Smartphone, Desktop: Monitor, 'Windows PC': Monitor, Linux: Monitor }
                                  const Icon = deviceIcon[s.device] || Monitor
                                  const ago = (() => {
                                    const diff = Date.now() - new Date(s.lastActivity).getTime()
                                    const mins = Math.floor(diff / 60_000)
                                    if (mins < 1) return 'agora'
                                    if (mins < 60) return `ha ${mins} min`
                                    const hours = Math.floor(mins / 60)
                                    if (hours < 24) return `ha ${hours}h`
                                    const days = Math.floor(hours / 24)
                                    return `ha ${days}d`
                                  })()
                                  return (
                                    <div key={s.id} className={cn(
                                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                                      s.isCurrent
                                        ? 'bg-brand/[0.04] border-brand/15'
                                        : 'bg-white/[0.02] border-white/[0.05]'
                                    )}>
                                      <div className={cn(
                                        'p-2 rounded-lg shrink-0',
                                        s.isCurrent
                                          ? 'bg-brand/10 border border-brand/15'
                                          : 'bg-white/[0.04] border border-white/[0.06]'
                                      )}>
                                        <Icon className={cn('h-4 w-4', s.isCurrent ? 'text-brand' : 'text-white/30')} strokeWidth={1.5} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-white/80 truncate">{s.browser}</p>
                                          {s.isCurrent && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">Actual</span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-white/30 mt-0.5">{s.device} · {s.os}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-[11px] text-white/25">{ago}</p>
                                        <p className="text-[9px] text-white/10 mt-0.5 font-mono truncate max-w-[80px]">{s.id}</p>
                                      </div>
                                    </div>
                                  )
                                })}

                                {sessions.length > 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={revokeOtherSessions}
                                    className="w-full gap-2 border-red-500/15 text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] rounded-xl text-xs"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Terminar outras sessoes
                                  </Button>
                                )}
                              </>
                            )}

                            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                              <p className="text-[11px] text-white/30 leading-relaxed">
                                As sessoes sao actualizadas automaticamente a cada 5 minutos. Sessoes inactivas por mais de 7 dias sao removidas. Terminar outras sessoes nao invalida tokens existentes — utilize as definicoes do Supabase Auth para revogacao completa.
                              </p>
                            </div>
                          </div>
                        )}
                        {section.id === 'oculos' && (
                          <div className="space-y-4">
                            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-3">
                              <p className="text-xs text-white/50 leading-relaxed">
                                Configure os seus oculos inteligentes para activacao discreta de SOS, gravacao de audio e deteccao de remocao forcada.
                              </p>
                              <Button
                                onClick={() => navigate('/dashboard/oculos')}
                                className="w-full gap-2 bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 rounded-xl text-sm"
                                variant="outline"
                              >
                                <Glasses className="h-4 w-4" /> Gerir Oculos Inteligentes
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                                <p className="text-[10px] text-white/30 mb-1">Conexao BLE</p>
                                <StatusDot status={glassesState.connectedGlassesDeviceId ? 'ok' : 'idle'} />
                                <span className="text-xs text-white/60 ml-1.5">
                                  {glassesState.connectedGlassesDeviceId ? 'Conectado' : 'Desconectado'}
                                </span>
                              </div>
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                                <p className="text-[10px] text-white/30 mb-1">HID Activo</p>
                                <span className={cn('text-xs font-medium', glassesState.isHIDActive ? 'text-brand' : 'text-white/30')}>
                                  {glassesState.isHIDActive ? 'Sim' : 'Nao'}
                                </span>
                              </div>
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                                <p className="text-[10px] text-white/30 mb-1">Toques Detectados</p>
                                <span className="text-xs text-white/60 font-mono">{glassesState.tapCount}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {section.id === 'anti-coercao' && (
                          <AntiCoercionSettings />
                        )}
                        {section.id === 'sobre' && (
                          <div className="space-y-3">
                            {[{ l: 'Versao', r: '2.9.0', link: false }, { l: 'Termos de Servico', link: true }, { l: 'Politica de Privacidade', link: true }, { l: 'Licenca', r: 'MIT', link: false }].map(item => (
                              <div key={item.l} className="flex items-center justify-between py-1">
                                <span className="text-sm text-white/40">{item.l}</span>
                                {item.link ? <button className="text-sm text-brand/70 flex items-center gap-1 hover:text-brand hover:underline"><span>Ver</span><ExternalLink className="h-3 w-3" /></button> : <span className="text-sm text-white/60 font-mono">{item.r}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SpotlightCard>
              )}
            </motion.div>
          )
        })}

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sections.length * 0.04 }} className="pt-6">
          <Button variant="outline" onClick={() => setShowDeleteModal(true)} className="w-full gap-2 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] h-12 rounded-xl transition-all">
            <Trash2 className="h-4 w-4" /> Eliminar Conta
          </Button>
          <p className="text-[10px] text-white/15 text-center mt-2">Esta accao e irreversivel. Todos os dados serao apagados.</p>
        </motion.div>
      </div>
      )}

      {/* Test SMS Modal */}
      <TestSmsModal
        open={showTestSms}
        onClose={() => setShowTestSms(false)}
        onSend={handleTestSms}
        isSending={sendingTestSms}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false) }}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </div>
  )
}
