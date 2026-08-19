import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  Users,
  UserCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

/* ------------------------------------------------------------------ */
/*  Schema & Types                                                     */
/* ------------------------------------------------------------------ */

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'O nome é obrigatório')
      .min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z
      .string()
      .min(1, 'O email é obrigatório')
      .email('Insira um email válido'),
    phone: z
      .string()
      .min(1, 'O telefone é obrigatório')
      .regex(/^\d{9}$/, 'Insira 9 dígitos válidos (ex: 84XXXXXXX)'),
    password: z
      .string()
      .min(1, 'A senha é obrigatória')
      .min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirme a senha'),
    role: z.enum(['pessoal', 'familia'], {
      required_error: 'Selecione o tipo de conta',
    }),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'Você deve aceitar os termos para continuar' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

type AccountRole = 'pessoal' | 'familia';

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const floatVariant = {
  animate: (i: number) => ({
    y: [0, -18, 0],
    x: [0, (i % 2 === 0 ? 8 : -8), 0],
    rotate: [0, (i % 2 === 0 ? 4 : -4), 0],
    transition: {
      duration: 4 + i * 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

const shieldPulse = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.95, 1.05, 0.95],
    opacity: 1,
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

/* ------------------------------------------------------------------ */
/*  Floating Background Shapes                                         */
/* ------------------------------------------------------------------ */

const floatingShapes = [
  { size: 110, top: '10%', left: '15%', blur: 40 },
  { size: 75, top: '60%', left: '10%', blur: 30 },
  { size: 55, top: '28%', left: '68%', blur: 35 },
  { size: 90, top: '78%', left: '60%', blur: 45 },
];

/* ------------------------------------------------------------------ */
/*  Role Toggle Cards                                                  */
/* ------------------------------------------------------------------ */

function RoleCard({
  value,
  selected,
  onSelect,
}: {
  value: AccountRole;
  selected: boolean;
  onSelect: () => void;
}) {
  const isPessoal = value === 'pessoal';

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex-1 relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        selected
          ? 'border-[#25D366]/60 bg-[#25D366]/10 shadow-lg shadow-[#25D366]/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      )}
      whileTap={{ scale: 0.97 }}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200',
          selected
            ? 'bg-[#25D366]/20 text-[#25D366]'
            : 'bg-white/5 text-white/40'
        )}
      >
        {isPessoal ? <UserCircle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
      </div>
      <span
        className={cn(
          'text-sm font-medium transition-colors duration-200',
          selected ? 'text-[#25D366]' : 'text-white/50'
        )}
      >
        {isPessoal ? 'Pessoal' : 'Família'}
      </span>
      <span className="text-[10px] text-white/25 leading-tight text-center">
        {isPessoal
          ? 'Proteção individual para você'
          : 'Segurança para toda a família'}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Register() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole>('pessoal');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'pessoal',
      terms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: `+258${data.phone}`,
            role: data.role,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está registrado');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Insert into profiles table
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: data.fullName,
          email: data.email,
          phone: `+258${data.phone}`,
          role: data.role,
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Still proceed — the auth user was created
        }
      }

      toast.success('Conta criada com sucesso! Bem-vindo ao StatusAds Connect.');
      navigate('/dashboard');
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: AccountRole) => {
    setSelectedRole(role);
    setValue('role', role, { shouldValidate: true });
  };

  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked);
    setValue('terms', checked as unknown as true, { shouldValidate: true });
  };

  return (
    <div className="dark min-h-screen flex bg-[#0A0F1A] text-white">
      {/* ===================== LEFT PANEL ===================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#0A0F1A] via-[#0D1B2A] to-[#0A0F1A]">
        {/* Floating shapes */}
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: shape.size,
              height: shape.size,
              top: shape.top,
              left: shape.left,
              filter: `blur(${shape.blur}px)`,
              background:
                `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(37,211,102,0.15)' : 'rgba(56,189,248,0.1)'}, transparent)`,
            }}
            variants={floatVariant}
            animate="animate"
            custom={i}
          />
        ))}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center justify-center w-full px-12"
          variants={slideInLeft}
          initial="hidden"
          animate="visible"
        >
          {/* Animated Shield */}
          <motion.div
            className="relative mb-10"
            variants={shieldPulse}
            initial="initial"
            animate="animate"
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-[#25D366]/20 blur-xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-[#25D366]/30 to-[#25D366]/5 border border-[#25D366]/30 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-16 h-16 text-[#25D366]" strokeWidth={1.5} />
              </div>
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-[#25D366]"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{ top: -6, left: '50%', transformOrigin: '0 70px' }}
              />
              <motion.div
                className="absolute w-2 h-2 rounded-full bg-sky-400"
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ bottom: -4, left: '50%', transformOrigin: '0 70px' }}
              />
            </div>
          </motion.div>

          {/* Brand */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-3xl xl:text-4xl font-bold mb-3 tracking-tight">
              <span className="text-[#25D366]">StatusAds</span> Connect
            </h1>
            <p className="text-lg xl:text-xl text-white/60 max-w-md leading-relaxed">
              Crie sua conta e proteja<br />o que mais importa.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap gap-3 mt-10 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {['Rastreamento em Tempo Real', 'Modo Família', 'Alerta de Emergência'].map(
              (feature, i) => (
                <motion.span
                  key={feature}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/70 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
                >
                  {feature}
                </motion.span>
              )
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ===================== RIGHT PANEL ===================== */}
      <div className="flex-1 flex items-center justify-center relative px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
        {/* Mobile background blobs */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-64 h-64 rounded-full top-[-10%] right-[-20%]"
            style={{
              filter: 'blur(60px)',
              background: 'radial-gradient(circle, rgba(37,211,102,0.1), transparent)',
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-48 h-48 rounded-full bottom-[-5%] left-[-15%]"
            style={{
              filter: 'blur(50px)',
              background: 'radial-gradient(circle, rgba(56,189,248,0.08), transparent)',
            }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          className="w-full max-w-md relative z-10"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo */}
          <motion.div
            variants={staggerItem}
            className="lg:hidden flex items-center justify-center gap-2 mb-6"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#1a9e4d] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-[#25D366]">StatusAds</span> Connect
            </span>
          </motion.div>

          {/* Header */}
          <motion.div variants={staggerItem} className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Criar conta
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Comece a sua jornada de segurança pessoal
            </p>
          </motion.div>

          {/* Form Card — Glass morphism */}
          <motion.div
            variants={staggerItem}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/20"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-white/80 text-sm">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="João da Silva"
                    className={cn(
                      'pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl focus-visible:ring-[#25D366]/40 focus-visible:border-[#25D366]/40',
                      errors.fullName &&
                        'border-red-500/50 focus-visible:ring-red-500/40 focus-visible:border-red-500/40'
                    )}
                    {...register('fullName')}
                  />
                </div>
                <AnimatePresence>
                  {errors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.fullName.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/80 text-sm">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className={cn(
                      'pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl focus-visible:ring-[#25D366]/40 focus-visible:border-[#25D366]/40',
                      errors.email &&
                        'border-red-500/50 focus-visible:ring-red-500/40 focus-visible:border-red-500/40'
                    )}
                    {...register('email')}
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-white/80 text-sm">
                  Telefone
                </Label>
                <div className="flex">
                  <div className="flex items-center gap-1 px-3 bg-white/[0.04] border border-white/10 border-r-0 rounded-l-xl text-sm text-white/50 select-none">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+258</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="84XXXXXXX"
                    maxLength={9}
                    className={cn(
                      'bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11 rounded-r-xl rounded-l-none focus-visible:ring-[#25D366]/40 focus-visible:border-[#25D366]/40',
                      errors.phone &&
                        'border-red-500/50 focus-visible:ring-red-500/40 focus-visible:border-red-500/40'
                    )}
                    {...register('phone')}
                  />
                </div>
                <AnimatePresence>
                  {errors.phone && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.phone.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80 text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    className={cn(
                      'pl-10 pr-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl focus-visible:ring-[#25D366]/40 focus-visible:border-[#25D366]/40',
                      errors.password &&
                        'border-red-500/50 focus-visible:ring-red-500/40 focus-visible:border-red-500/40'
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-white/80 text-sm">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    className={cn(
                      'pl-10 pr-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl focus-visible:ring-[#25D366]/40 focus-visible:border-[#25D366]/40',
                      errors.confirmPassword &&
                        'border-red-500/50 focus-visible:ring-red-500/40 focus-visible:border-red-500/40'
                    )}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.confirmPassword.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Role Selector */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-sm">
                  Tipo de Conta
                </Label>
                <input type="hidden" {...register('role')} />
                <div className="flex gap-3">
                  <RoleCard
                    value="pessoal"
                    selected={selectedRole === 'pessoal'}
                    onSelect={() => handleRoleSelect('pessoal')}
                  />
                  <RoleCard
                    value="familia"
                    selected={selectedRole === 'familia'}
                    onSelect={() => handleRoleSelect('familia')}
                  />
                </div>
                <AnimatePresence>
                  {errors.role && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.role.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-3">
                  <input type="hidden" {...register('terms')} />
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      handleTermsChange(checked === true)
                    }
                    className={cn(
                      'mt-0.5 data-[state=checked]:bg-[#25D366] data-[state=checked]:border-[#25D366] border-white/20'
                    )}
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-white/40 leading-relaxed cursor-pointer select-none"
                  >
                    Aceito os{' '}
                    <a
                      href="#"
                      className="text-[#25D366] hover:text-[#25D366]/80 underline underline-offset-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      Termos de Uso
                    </a>{' '}
                    e{' '}
                    <a
                      href="#"
                      className="text-[#25D366] hover:text-[#25D366]/80 underline underline-offset-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      Política de Privacidade
                    </a>
                  </label>
                </div>
                <AnimatePresence>
                  {errors.terms && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-400"
                    >
                      {errors.terms.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full h-12 rounded-xl text-base font-semibold mt-2',
                  'bg-gradient-to-r from-[#1a9e4d] via-[#25D366] to-[#1a9e4d]',
                  'bg-[length:200%_100%] hover:bg-right',
                  'text-white shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/30',
                  'transition-all duration-300 disabled:opacity-60',
                  'border-0'
                )}
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Criando conta...</span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span>Criar Conta</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>
          </motion.div>

          {/* Login Link */}
          <motion.p
            variants={staggerItem}
            className="mt-6 text-center text-sm text-white/40"
          >
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="text-[#25D366] font-medium hover:text-[#25D366]/80 transition-colors"
            >
              Entrar
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
