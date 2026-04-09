import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, EyeOff, ArrowLeft, ArrowRight, Check,
  MessageCircle, Megaphone, TrendingUp, DollarSign,
  Users, BarChart3, Shield, Sparkles, CircleDot, Globe, BarChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loginSchema, signupSchema, resetPasswordSchema, type LoginFormData, type SignupFormData } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";
import { countries, regions, getCountriesByRegion } from "@/lib/currencies";

const VIEW_RANGES = [
  { label: '0 - 50', min: 0, max: 50 },
  { label: '50 - 100', min: 50, max: 100 },
  { label: '100 - 300', min: 100, max: 300 },
  { label: '300 - 500', min: 300, max: 500 },
  { label: '500 - 1.000', min: 500, max: 1000 },
  { label: '1.000 - 3.000', min: 1000, max: 3000 },
  { label: '3.000 - 5.000', min: 3000, max: 5000 },
  { label: '5.000 - 10.000', min: 5000, max: 10000 },
  { label: '10.000+', min: 10000, max: 50000 },
];

interface LoginFormProps {
  onShowPassword: boolean;
  onTogglePassword: () => void;
  loading: boolean;
}

export const LoginForm = ({ onShowPassword, onTogglePassword, loading }: LoginFormProps) => {
  const { toast } = useToast();
  const [loginData, setLoginData] = useState<LoginFormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        toast({
          title: "Erro de login",
          description: error.message.includes('Invalid login credentials')
            ? "Email ou senha incorretos. Tente novamente."
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Login realizado!", description: "Bem-vindo de volta à plataforma." });
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="seu@email.com"
          value={loginData.email}
          onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
          className={cn("h-11 bg-muted/30 border-border/40 focus:border-primary/60 transition-colors", errors.email && 'border-destructive')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Senha</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={onShowPassword ? "text" : "password"}
            placeholder="Sua senha"
            value={loginData.password}
            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
            className={cn("h-11 pr-12 bg-muted/30 border-border/40 focus:border-primary/60 transition-colors", errors.password && 'border-destructive')}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onTogglePassword}
          >
            {onShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <Button 
        type="submit" 
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20" 
        disabled={isLoading || loading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Entrando...
          </span>
        ) : "Entrar"}
      </Button>
    </form>
  );
};

// ─── Role Selection Card ──────────────────────────────────────
const roleCards = [
  {
    id: "creator" as const,
    title: "Criador de Status",
    subtitle: "Monetize seu WhatsApp",
    icon: MessageCircle,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    activeRing: "ring-emerald-500/40",
    benefits: [
      { icon: DollarSign, text: "Ganhe dinheiro com seus Status" },
      { icon: TrendingUp, text: "Métricas de performance em tempo real" },
      { icon: Shield, text: "Pagamentos seguros via escrow" },
    ]
  },
  {
    id: "advertiser" as const,
    title: "Anunciante",
    subtitle: "Alcance milhares de pessoas",
    icon: Megaphone,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    activeRing: "ring-blue-500/40",
    benefits: [
      { icon: Users, text: "Acesse criadores verificados" },
      { icon: BarChart3, text: "ROI mensurável por campanha" },
      { icon: Sparkles, text: "IA para matching ideal" },
    ]
  }
];

export const SignupForm = ({ onShowPassword, onTogglePassword, loading }: LoginFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0: role, 1: details
  const [signupData, setSignupData] = useState<SignupFormData>({ name: '', role: 'creator', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const selectedRole = roleCards.find(r => r.id === signupData.role)!;

  const passwordChecks = [
    { label: "Mín. 6 caracteres", valid: signupData.password.length >= 6 },
    { label: "1 letra maiúscula", valid: /[A-Z]/.test(signupData.password) },
    { label: "1 número", valid: /[0-9]/.test(signupData.password) },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: signupData.name, role: signupData.role }
        }
      });

      if (error) {
        toast({
          title: error.message.includes('User already registered') ? "Usuário já existe" : "Erro no cadastro",
          description: error.message.includes('User already registered')
            ? "Este email já está registrado. Faça login."
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "🎉 Conta criada com sucesso!", 
          description: signupData.role === 'creator' 
            ? "Bem-vindo! Comece a monetizar seus Status."
            : "Bem-vindo! Encontre os melhores criadores."
        });
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground text-center mb-1">
              Como você quer usar o StatusAds?
            </p>

            {roleCards.map((role) => {
              const Icon = role.icon;
              const isSelected = signupData.role === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSignupData(prev => ({ ...prev, role: role.id }))}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    isSelected
                      ? `${role.borderColor} ${role.bgColor} ring-2 ${role.activeRing}`
                      : "border-border/40 hover:border-border/60 bg-muted/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
                      role.color
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-foreground">{role.title}</h3>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.subtitle}</p>
                      
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 space-y-1.5">
                              {role.benefits.map((b, i) => {
                                const BIcon = b.icon;
                                return (
                                  <div key={i} className="flex items-center gap-2 text-xs text-foreground/70">
                                    <BIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span>{b.text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              );
            })}

            <Button 
              onClick={() => setStep(1)} 
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 mt-2"
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Role indicator pill */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Alterar tipo
              </button>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                selectedRole.bgColor, "text-foreground"
              )}>
                <selectedRole.icon className="h-3 w-3" />
                {selectedRole.title}
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">
                  {signupData.role === 'creator' ? 'Nome artístico / público' : 'Nome ou empresa'}
                </Label>
                <Input
                  id="signup-name"
                  placeholder={signupData.role === 'creator' ? 'Ex: João Creator' : 'Ex: Empresa ABC'}
                  value={signupData.name}
                  onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                  className={cn("h-11 bg-muted/30 border-border/40 focus:border-primary/60", errors.name && 'border-destructive')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                  className={cn("h-11 bg-muted/30 border-border/40 focus:border-primary/60", errors.email && 'border-destructive')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={onShowPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    className={cn("h-11 pr-12 bg-muted/30 border-border/40 focus:border-primary/60", errors.password && 'border-destructive')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={onTogglePassword}
                  >
                    {onShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}

                {/* Live password strength */}
                {signupData.password.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="flex gap-3 pt-1"
                  >
                    {passwordChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors",
                          check.valid ? "bg-primary" : "bg-muted-foreground/20"
                        )}>
                          {check.valid && <Check className="h-2 w-2 text-primary-foreground" />}
                        </div>
                        <span className={cn(
                          "text-[10px]",
                          check.valid ? "text-primary" : "text-muted-foreground"
                        )}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 mt-1" 
                disabled={isLoading || loading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Criando conta...
                  </span>
                ) : (
                  <>
                    Criar minha conta <Sparkles className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 pt-1">
        {[0, 1].map(s => (
          <div
            key={s}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              s === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
    </div>
  );
};

interface ResetPasswordFormProps {
  onBack: () => void;
}

export const ResetPasswordForm = ({ onBack }: ResetPasswordFormProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#type=recovery`,
      });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setSent(true);
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Email enviado!</h3>
        <p className="text-sm text-muted-foreground">
          Verifique sua caixa de entrada e siga as instruções.
        </p>
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground">Esqueceu sua senha?</h3>
        <p className="text-sm text-muted-foreground">Digite seu email para receber um link de redefinição.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
        <Input
          id="reset-email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("h-11 bg-muted/30 border-border/40", errors.email && 'border-destructive')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
      <Button type="button" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Button>
    </form>
  );
};
