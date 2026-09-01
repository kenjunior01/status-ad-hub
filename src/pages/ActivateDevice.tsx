import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Shield, Glasses, Watch, Headphones, Smartphone, ArrowRight, Loader2, CheckCircle2, QrCode, Package, ChevronLeft, Sparkles } from 'lucide-react'
import { AnimatedGrid, NoiseTexture, FloatingOrbs, MorphingBlob, RippleButton } from '@/components/effects'
import { supabase } from '@/lib/supabase'
import * as api from '@/lib/api'

type Step = 'intro' | 'enter-code' | 'create-account' | 'success'

const DEVICES = [
  { id: 'glasses', name: 'StatusAds Glasses', desc: 'Oculos inteligentes com SOS integrado, camera oculta e gravacao de audio', icon: Glasses, color: '#25D366' },
  { id: 'watch', name: 'StatusAds Watch', desc: 'Relogio com botao de panico, GPS e monitoramento de batimentos', icon: Watch, color: '#3B82F6' },
  { id: 'earbuds', name: 'StatusAds Buds', desc: 'Fones com deteccao de palavras-chave e gravacao ambiental', icon: Headphones, color: '#F59E0B' },
  { id: 'tracker', name: 'StatusAds Tracker', desc: 'Rastreador portatil com botao SOS e GPS de alta precisao', icon: Smartphone, color: '#EF4444' },
]

export default function ActivateDevice() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('intro')
  const [activationCode, setActivationCode] = useState('')
  const [deviceType, setDeviceType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '+258', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleCodeSubmit = useCallback(async () => {
    if (!activationCode.trim()) {
      toast.error('Insira o codigo de activacao')
      return
    }
    setLoading(true)
    try {
      // Verify activation code with Supabase
      const { data, error } = await supabase
        .from('device_activation_codes')
        .select('id, device_type, product_id, used')
        .eq('code', activationCode.trim().toUpperCase())
        .eq('used', false)
        .single()

      if (error || !data) {
        toast.error('Codigo invalido', { description: 'Verifique o codigo no seu dispositivo ou contacte o suporte.' })
        setLoading(false)
        return
      }

      setDeviceType(data.device_type || 'tracker')
      setStep('create-account')
    } catch {
      toast.error('Erro ao validar codigo', { description: 'Tente novamente ou contacte o suporte.' })
    }
    setLoading(false)
  }, [activationCode])

  const handleCreateAccount = useCallback(async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password.trim()) {
      toast.error('Preencha todos os campos')
      return
    }
    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas nao coincidem')
      return
    }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name, phone: formData.phone, role: 'pessoal' } },
      })
      if (authError) { toast.error('Erro ao criar conta', { description: authError.message }); setLoading(false); return }
      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: authData.user.id,
          full_name: formData.name,
          phone: formData.phone,
        })
        if (profileError) console.error(profileError)
        // Mark activation code as used
        const { error: codeError } = await supabase
          .from('device_activation_codes')
          .update({ used: true, activated_by: authData.user.id, activated_at: new Date().toISOString() })
          .eq('code', activationCode.trim().toUpperCase())
        if (codeError) console.error(codeError)
        setStep('success')
      }
    } catch {
      toast.error('Erro inesperado', { description: 'Tente novamente.' })
    }
    setLoading(false)
  }, [formData, activationCode])

  const selectedDevice = DEVICES.find(d => d.id === deviceType)

  return (
    <div className="dark min-h-screen bg-[#0A0F1A] relative overflow-hidden">
      <AnimatedGrid opacity={0.2} />
      <FloatingOrbs />
      <NoiseTexture opacity={0.015} />
      <MorphingBlob className="-left-20 top-1/4" color="rgba(37, 211, 102, 0.04)" size={300} />
      <MorphingBlob className="-right-20 bottom-1/4" color="rgba(59, 130, 246, 0.03)" size={250} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => step === 'intro' ? navigate('/') : step === 'enter-code' ? setStep('intro') : step === 'create-account' ? setStep('enter-code') : {}} className="p-2 rounded-xl hover:bg-white/5 transition">
            <ChevronLeft className="h-5 w-5 text-white/50" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-[#25D366]" />
            </div>
            <span className="font-display text-sm font-bold text-white">Status<span className="text-[#25D366]">Ads</span></span>
          </div>
        </header>

        {/* Steps indicator */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2">
            {['intro', 'enter-code', 'create-account', 'success'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  ['intro', 'enter-code', 'create-account', 'success'].indexOf(step) >= i ? 'bg-[#25D366]' : 'bg-white/[0.06]'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 pb-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: Intro - Select Device Type */}
            {step === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#25D366]/[0.08] border border-[#25D366]/20">
                    <Package className="h-8 w-8 text-[#25D366]" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">Activar Dispositivo</h1>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                    Para usar o StatusAds Connect, precisa de um dos nossos dispositivos. Seleccione o tipo de dispositivo que adquiriu.
                  </p>
                </div>

                <div className="space-y-3">
                  {DEVICES.map((device) => (
                    <motion.button
                      key={device.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setDeviceType(device.id); setStep('enter-code') }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-left"
                    >
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${device.color}15`, borderColor: `${device.color}30` }} >
                        <device.icon className="h-6 w-6" style={{ color: device.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{device.name}</p>
                        <p className="text-[11px] text-white/30 mt-0.5 line-clamp-2">{device.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/20 shrink-0" />
                    </motion.button>
                  ))}
                </div>

                <p className="text-center text-xs text-white/20">
                  Nao tem um dispositivo? <a href="#" className="text-[#25D366]/60 hover:text-[#25D366]">Compre aqui</a>
                </p>
              </motion.div>
            )}

            {/* STEP 2: Enter Activation Code */}
            {step === 'enter-code' && (
              <motion.div key="enter-code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="text-center space-y-3">
                  {selectedDevice && (
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl" style={{ backgroundColor: `${selectedDevice.color}15`, borderColor: `${selectedDevice.color}30` }} >
                      <selectedDevice.icon className="h-8 w-8" style={{ color: selectedDevice.color }} />
                    </div>
                  )}
                  <h1 className="text-2xl font-bold text-white">Codigo de Activacao</h1>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                    Encontre o codigo de activacao na embalagem do seu {selectedDevice?.name || 'dispositivo'} ou no manual de instrucoes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                    <input
                      type="text"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                      className="w-full h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-12 pr-4 text-white text-lg font-mono tracking-wider text-center placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 focus-visible:border-[#25D366]/30 transition-all uppercase"
                      autoFocus
                    />
                  </div>
                  <p className="text-center text-[11px] text-white/20">
                    O codigo tem 12 caracteres alfanumericos
                  </p>

                  <RippleButton
                    onClick={handleCodeSubmit}
                    disabled={loading || activationCode.length < 4}
                    className="w-full h-12 rounded-2xl text-sm font-semibold disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Validar Codigo <ArrowRight className="h-4 w-4 ml-2" /></>}
                  </RippleButton>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/10">
                  <Sparkles className="h-5 w-5 text-amber-400/60 shrink-0" />
                  <p className="text-[11px] text-amber-300/50 leading-relaxed">
                    Cada codigo so pode ser usado uma vez. Se perdeu o codigo, contacte o suporte com o numero de serie do dispositivo.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Create Account */}
            {step === 'create-account' && (
              <motion.div key="create-account" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20">
                    <CheckCircle2 className="h-7 w-7 text-[#25D366]" />
                  </div>
                  <h1 className="text-xl font-bold text-white">Codigo Validado!</h1>
                  <p className="text-sm text-white/40">Crie a sua conta para comecar a usar o {selectedDevice?.name || 'dispositivo'}.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1.5 block">Nome Completo</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-white text-sm placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1.5 block">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-white text-sm placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1.5 block">Telefone (+258)</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+258840000000" className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-white text-sm placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/40 mb-1.5 block">Senha</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min. 6 chars" className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 pr-10 text-white text-sm placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 transition-all" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                          {showPassword ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/40 mb-1.5 block">Confirmar</label>
                      <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Repetir" className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-white text-sm placeholder:text-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 transition-all" />
                    </div>
                  </div>

                  <RippleButton onClick={handleCreateAccount} disabled={loading} className="w-full h-12 rounded-2xl text-sm font-semibold disabled:opacity-40 mt-2">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Criar Conta e Activar <ArrowRight className="h-4 w-4 ml-2" /></>}
                  </RippleButton>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Success */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="h-20 w-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366]/30 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-[#25D366]" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white">Conta Criada!</h1>
                  <p className="text-sm text-white/40 max-w-xs">
                    O seu {selectedDevice?.name || 'dispositivo'} foi activado com sucesso. Verifique o seu email para confirmar a conta.
                  </p>
                </div>
                <RippleButton onClick={() => navigate('/login')} className="h-12 px-8 rounded-2xl text-sm font-semibold">
                  Ir para Login <ArrowRight className="h-4 w-4 ml-2" />
                </RippleButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer link */}
        {step !== 'success' && (
          <div className="px-6 pb-6">
            <p className="text-center text-sm text-white/25">
              Ja tem conta? <Link to="/login" className="font-medium text-[#25D366]/60 hover:text-[#25D366]">Entrar</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}