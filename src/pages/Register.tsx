import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Shield, Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Users, Check } from "lucide-react";
import { AnimatedGrid, NoiseTexture, FloatingOrbs, MorphingBlob, RippleButton, MagneticButton, SpotlightCard } from "@/components/effects";

const registerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(60, "O nome e demasiado longo"),
  email: z.string().min(1, "O email e obrigatorio").email("Insira um email valido"),
  phone: z.string().min(1, "O telefone e obrigatorio").regex(/^\+258\d{9}$/, "Formato: +258 seguido de 9 digitos"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").regex(/[A-Z]/, "A senha deve conter uma maiuscula").regex(/[0-9]/, "A senha deve conter um numero"),
  confirmPassword: z.string().min(1, "Confirme a sua senha"),
  role: z.enum(["pessoal", "familia"], { required_error: "Selecione um plano" }),
  terms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas nao coincidem" });
type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: prefillEmail, phone: "+258", role: "pessoal", name: "", password: "", confirmPassword: "", terms: undefined as unknown as true },
  });
  const selectedRole = watch("role");

  async function onSubmit(values: RegisterValues) {
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: values.email, password: values.password,
      options: { data: { full_name: values.name, phone: values.phone, role: values.role } },
    });
    if (authError) { setLoading(false); toast.error("Erro ao criar conta", { description: authError.message }); return; }
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({ user_id: authData.user.id, full_name: values.name, phone: values.phone });
      if (profileError) console.error('[Register] Profile insert error:', profileError.message);
    }
    setLoading(false); toast.success("Conta criada!", { description: "Verifique o seu email para confirmar." }); navigate("/login");
  }

  const inputCls = (hasError: boolean) =>
    `h-11 border ${hasError ? 'border-red-500/40 focus-visible:ring-red-500/30' : 'border-white/[0.08] focus-visible:ring-brand/30 focus-visible:border-brand/30'} bg-white/[0.03] text-white placeholder:text-white/20 text-sm outline-none focus-visible:ring-2 transition-all duration-200 backdrop-blur-sm rounded-xl pl-10 pr-4 w-full`

  return (
    <div className="dark flex min-h-screen bg-background">
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <AnimatedGrid opacity={0.3} />
        <FloatingOrbs />
        <NoiseTexture opacity={0.02} />
        <MorphingBlob className="-left-20 top-1/3" color="rgba(212, 175, 55, 0.05)" size={350} />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative z-10 flex flex-col items-center text-center px-8">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="mb-8 relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-brand/20 bg-brand/[0.06] backdrop-blur-md shadow-[0_0_60px_-15px_rgba(212,175,55,0.15)]">
              <Shield className="h-14 w-14 text-brand" strokeWidth={1} />
            </div>
          </motion.div>
          <h2 className="font-display text-3xl font-bold text-white">Junte-se a <span className="bg-gradient-to-r from-brand to-amber-300 bg-clip-text text-transparent">2 Milhoes</span> de Pessoas</h2>
          <p className="mt-4 max-w-sm text-sm text-white/35 leading-relaxed">Crie a sua conta em segundos e comece a proteger quem mais importa.</p>
        </motion.div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12 relative">
        <NoiseTexture opacity={0.015} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 w-full max-w-md">
          <motion.div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
              <Shield className="h-5 w-5 text-brand" />
            </div>
            <span className="font-display text-xl font-bold text-white">Status<span className="text-brand">Ads</span></span>
          </motion.div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-2xl shadow-2xl shadow-black/20">
            <h1 className="font-display text-2xl font-bold text-white">Criar Conta</h1>
            <p className="mt-2 text-sm text-white/35">Preencha os dados abaixo para comecar.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Nome Completo</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" /><Input id="name" placeholder="Joao Silva" className={inputCls(!!errors.name)} {...register("name")} /></div>
                {errors.name && <p className="text-xs text-red-400/80">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Email</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" /><Input id="email" type="email" placeholder="seu@email.com" className={inputCls(!!errors.email)} {...register("email")} /></div>
                {errors.email && <p className="text-xs text-red-400/80">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Telefone</Label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" /><Input id="phone" type="tel" placeholder="+258840000000" className={inputCls(!!errors.phone)} {...register("phone")} /></div>
                {errors.phone && <p className="text-xs text-red-400/80">{errors.phone.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={cn(inputCls(!!errors.password), 'pr-10')} {...register("password")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400/80">{errors.password.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" className={cn(inputCls(!!errors.confirmPassword), 'pr-10')} {...register("confirmPassword")} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400/80">{errors.confirmPassword.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-white/50">Tipo de Conta</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ val: 'pessoal', Icon: User, label: 'Pessoal' }, { val: 'familia', Icon: Users, label: 'Familia' }].map(r => (
                    <button key={r.val} type="button" onClick={() => setValue("role", r.val as any)} className={cn(
                      'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-300',
                      selectedRole === r.val ? 'border-brand/40 bg-brand/[0.06] shadow-[0_0_20px_-5px_rgba(212,175,55,0.1)]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15'
                    )}>
                      {selectedRole === r.val && <motion.div layoutId="role-ind" className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand shadow-[0_0_10px_rgba(212,175,55,0.4)]"><Check className="h-3 w-3 text-white" /></motion.div>}
                      <r.Icon className={cn('h-5 w-5', selectedRole === r.val ? 'text-brand' : 'text-white/25')} strokeWidth={1.5} />
                      <span className={cn('text-xs font-medium', selectedRole === r.val ? 'text-white' : 'text-white/35')}>{r.label}</span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-xs text-red-400/80">{errors.role.message}</p>}
              </div>
              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input id="terms" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/15 bg-white/5 accent-brand" {...register("terms")} />
                <Label htmlFor="terms" className="text-[11px] leading-relaxed text-white/30">Aceito os <a href="#" className="text-brand/70 hover:text-brand hover:underline">Termos de Uso</a> e a <a href="#" className="text-brand/70 hover:text-brand hover:underline">Politica de Privacidade</a>, incluindo o processamento dos meus dados conforme a LGPD.</Label>
              </label>
              {errors.terms && <p className="text-xs text-red-400/80">{errors.terms.message}</p>}
              <MagneticButton strength={0.15}>
                <RippleButton disabled={loading} className={`h-11 w-full text-sm font-semibold ${loading ? 'opacity-60' : ''}`}>
                  {loading ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>A criar conta...</span> : <>Criar Conta <ArrowRight className="h-4 w-4" /></>}
                </RippleButton>
              </MagneticButton>
            </form>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center text-sm text-white/30">
            Ja tem conta? <Link to="/login" className="font-medium text-brand/70 hover:text-brand">Entrar</Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
