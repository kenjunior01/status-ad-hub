import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, MailWarning } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AnimatedGrid, NoiseTexture, FloatingOrbs, MorphingBlob, RippleButton, MagneticButton } from "@/components/effects";
import { useDuressLogin } from "@/components/DuressPinLogin";
import { useAntiCoercion } from "@/hooks/useAntiCoercion";
import * as api from "@/lib/api";

const loginSchema = z.object({
  email: z.string().min(1, "O email e obrigatorio").email("Insira um email valido"),
  password: z.string().min(1, "A senha e obrigatoria").min(6, "A senha deve ter pelo menos 6 caracteres"),
});
type LoginValues = z.infer<typeof loginSchema>;

const DURESS_TAPS = 5;
const DURESS_TAP_WINDOW = 2000;

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Duress login mechanism
  const { isDuressArmed, armDuress, disarmDuress } = useDuressLogin();
  const { isPanicPassword, activateCoercionMode, isConfigured: isAntiCoercionConfigured } = useAntiCoercion();
  const tapTimesRef = useRef<number[]>([]);
  const [tapFlash, setTapFlash] = useState(false);

  const handleShieldTap = useCallback(() => {
    const now = Date.now();
    tapTimesRef.current = tapTimesRef.current.filter(t => now - t < DURESS_TAP_WINDOW);
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= DURESS_TAPS) {
      tapTimesRef.current = [];
      if (isDuressArmed) disarmDuress(); else armDuress();
      setTapFlash(true);
      setTimeout(() => setTapFlash(false), 300);
    }
  }, [isDuressArmed, armDuress, disarmDuress]);

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    setLoading(false);

    // === ANTI-COERCION CHECK ===
    // If Supabase login FAILS, check if the password is the panic password.
    // This is the core mechanism: the panic password is NOT the real Supabase password.
    // The login fails → we fake success → show fake dashboard.
    if (error) {
      const isPanic = await isPanicPassword(values.password);
      if (isPanic) {
        // Show FAKE success — identical to normal login toast
        toast.success("Bem-vindo de volta!");
        // Activate coercion mode (this triggers silent SOS internally)
        activateCoercionMode();
        // Navigate to dashboard — the App will show FakeDashboard instead
        navigate("/dashboard");
        return;
      }
      // Normal login error
      toast.error("Falha na autenticacao", { description: error.message });
      return;
    }

    toast.success("Bem-vindo de volta!");

    // Duress: if armed, silently trigger SOS in background
    if (isDuressArmed) {
      disarmDuress();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        // Fire silently — no await, no toast, no visual feedback
        navigator.geolocation?.getCurrentPosition(
          (pos) => api.triggerEmergency(userId, pos.coords.latitude, pos.coords.longitude).catch(() => {}),
          () => api.triggerEmergency(userId, -25.9692, 32.5732).catch(() => {}),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }

    navigate("/dashboard");
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) { toast.error("Insira o seu email"); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    setResetLoading(false);
    if (error) { toast.error("Erro ao enviar email", { description: error.message }); return; }
    toast.success("Email enviado!", { description: "Verifique a sua caixa de entrada." });
    setResetMode(false);
  };

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-xl border ${hasError ? 'border-red-500/40 focus-visible:ring-red-500/30' : 'border-white/[0.08] focus-visible:ring-[#D4AF37]/30 focus-visible:border-[#D4AF37]/30'} bg-white/[0.03] pl-10 pr-4 text-white placeholder:text-white/20 text-sm outline-none focus-visible:ring-2 transition-all duration-200 backdrop-blur-sm`

  return (
    <div className="dark flex min-h-screen bg-[#0C0B08]">
      {/* LEFT SIDE */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <AnimatedGrid opacity={0.3} />
        <FloatingOrbs />
        <NoiseTexture opacity={0.02} />
        <MorphingBlob className="-left-20 top-1/3" color="rgba(212, 175, 55, 0.05)" size={350} />
        <MorphingBlob className="-bottom-20 right-1/3" color="rgba(212, 175, 55, 0.04)" size={300} />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }} className="relative z-10 flex flex-col items-center px-8 text-center">
          {/* Duress armed indicator — tiny green dot */}
          {isDuressArmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 z-50"
              aria-hidden="true"
            >
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.6)] animate-pulse" />
            </motion.div>
          )}
          <motion.div
            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="mb-8 relative cursor-pointer select-none"
            onClick={handleShieldTap}
            role="button" tabIndex={-1} aria-hidden="true"
          >
            <div className={`flex h-28 w-28 items-center justify-center rounded-3xl border backdrop-blur-md shadow-[0_0_60px_-15px_rgba(212,175,55,0.15)] transition-all duration-200 ${tapFlash ? 'border-[#D4AF37]/50 bg-[#D4AF37]/[0.12]' : 'border-[#D4AF37]/20 bg-[#D4AF37]/[0.06]'}`}>
              <Shield className={`h-14 w-14 text-[#D4AF37] transition-transform duration-150 ${tapFlash ? 'scale-110' : ''}`} strokeWidth={1} />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-[#D4AF37]/5 blur-2xl" />
          </motion.div>
          <h2 className="font-display text-3xl font-bold text-white">A Sua <span className="bg-gradient-to-r from-[#D4AF37] to-amber-300 bg-clip-text text-transparent">Seguranca</span> Comeca Aqui</h2>
          <p className="mt-4 max-w-sm text-sm text-white/35 leading-relaxed">Entre na sua conta para aceder ao painel de monitorizacao, gerir dispositivos e configurar alertas.</p>
        </motion.div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 relative">
        <NoiseTexture opacity={0.015} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }} className="relative z-10 w-full max-w-md">
          <motion.div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer select-none ${tapFlash ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40' : 'bg-[#D4AF37]/10 border-[#D4AF37]/20'}`} onClick={handleShieldTap} role="button" tabIndex={-1} aria-hidden="true">
              <Shield className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <span className="font-display text-xl font-bold text-white">Status<span className="text-[#D4AF37]">Ads</span></span>
          </motion.div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-2xl shadow-2xl shadow-black/20">
            <h1 className="font-display text-2xl font-bold text-white">Entrar na Conta</h1>
            <p className="mt-2 text-sm text-white/35">Insira as suas credenciais para continuar.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-medium text-white/50">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <input id="email" type="email" placeholder="seu@email.com" className={inputCls(!!errors.email)} {...register("email")} />
                </div>
                {errors.email && <p className="text-xs text-red-400/80">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-xs font-medium text-white/50">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={inputCls(!!errors.password)} {...register("password")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 transition hover:text-white/50" aria-label="Toggle password">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400/80">{errors.password.message}</p>}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setResetMode(true)} className="text-xs text-[#D4AF37]/70 transition hover:text-[#D4AF37]">Esqueceu a senha?</button>
              </div>
              <MagneticButton strength={0.15}>
                <RippleButton disabled={loading} className={`h-11 w-full text-sm font-semibold ${loading ? 'opacity-60' : ''}`}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
                </RippleButton>
              </MagneticButton>
            </form>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider">ou continue com</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="flex gap-3">
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm transition-all hover:bg-white/[0.06] hover:text-white/80 hover:border-white/15" onClick={() => toast.info("Login com Google em breve.")}>
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Google
              </button>
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm transition-all hover:bg-white/[0.06] hover:text-white/80 hover:border-white/15" onClick={() => toast.info("Login com Apple em breve.")}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                Apple
              </button>
            </div>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center text-sm text-white/30">
            Nao tem conta? <Link to="/ativar" className="font-medium text-[#D4AF37]/70 transition hover:text-[#D4AF37]">Activar Dispositivo</Link>
          </motion.p>

          {/* PASSWORD RESET MODAL */}
          {resetMode && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setResetMode(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.08] bg-[#0D1321] p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/15">
                    <MailWarning className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">Redefinir Senha</h3>
                    <p className="text-[11px] text-white/25 mt-0.5">Enviaremos um link de recuperacao para o seu email.</p>
                  </div>
                </div>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-4 pr-4 text-white text-sm placeholder:text-white/20 outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/30 focus-visible:border-[#D4AF37]/30 transition-all duration-200 mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setResetMode(false)} className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition">Cancelar</button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="flex-1 h-11 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-white text-sm font-semibold disabled:opacity-50 transition gap-2 flex items-center justify-center"
                  >
                    {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Link'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
