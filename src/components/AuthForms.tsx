import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, EyeOff, ArrowLeft, ArrowRight, Check,
  MessageCircle, Megaphone, TrendingUp, DollarSign,
  Users, BarChart3, Shield, Sparkles, Globe, BarChart,
  Camera, Upload, Loader2, Bot, CreditCard, User
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

const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not', label: 'Prefiro não dizer' },
];

const AVAILABLE_NICHES = [
  'Tecnologia', 'Moda', 'Beleza', 'Saúde', 'Fitness', 'Gastronomia', 
  'Viagens', 'Educação', 'Finanças', 'Negócios', 'Marketing', 
  'Entretenimento', 'Música', 'Jogos', 'Esportes', 'Automotivo', 
  'Imobiliário', 'Pets', 'Arte', 'Lifestyle'
];

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { id: 'emola', label: 'e-Mola', icon: '💳' },
  { id: 'pix', label: 'PIX', icon: '🇧🇷' },
  { id: 'paypal', label: 'PayPal', icon: '💰' },
  { id: 'bank_transfer', label: 'Transferência Bancária', icon: '🏦' },
  { id: 'crypto', label: 'Criptomoeda', icon: '₿' },
  { id: 'mobile_money', label: 'Mobile Money', icon: '📲' },
];

const SocialSignInButtons = () => {
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleOAuth = async (provider: "google" | "apple") => {
    const setLoading = provider === "google" ? setGoogleLoading : setAppleLoading;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: `Erro ao entrar com ${provider === "google" ? "Google" : "Apple"}`, description: String(result.error), variant: "destructive" });
        return;
      }
      if (result.redirected) return;
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">ou</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl border-border/40 hover:bg-muted/40 font-medium gap-2" onClick={() => handleOAuth("google")} disabled={googleLoading || appleLoading}>
          {googleLoading ? <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /> : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl border-border/40 hover:bg-muted/40 font-medium gap-2" onClick={() => handleOAuth("apple")} disabled={googleLoading || appleLoading}>
          {appleLoading ? <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /> : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          Apple
        </Button>
      </div>
    </>
  );
};

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
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
      if (error) {
        toast({ title: "Erro de login", description: error.message.includes('Invalid login credentials') ? "Email ou senha incorretos." : error.message, variant: "destructive" });
      } else {
        toast({ title: "Login realizado!", description: "Bem-vindo de volta." });
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
        <Input id="login-email" type="email" placeholder="seu@email.com" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} className={cn("h-11 bg-muted/30 border-border/40 focus:border-primary/60", errors.email && 'border-destructive')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Senha</Label>
        <div className="relative">
          <Input id="login-password" type={onShowPassword ? "text" : "password"} placeholder="Sua senha" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} className={cn("h-11 pr-12 bg-muted/30 border-border/40 focus:border-primary/60", errors.password && 'border-destructive')} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={onTogglePassword}>
            {onShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={isLoading || loading}>
        {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Entrando...</span> : "Entrar"}
      </Button>
      <SocialSignInButtons />
    </form>
  );
};

// ─── Role Cards ──────────────────────────────────────
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
      { icon: TrendingUp, text: "Preço definido por IA" },
      { icon: Shield, text: "Pagamentos seguros" },
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
      { icon: Users, text: "Criadores verificados" },
      { icon: BarChart3, text: "ROI mensurável" },
      { icon: Sparkles, text: "IA para matching ideal" },
    ]
  }
];

// ─── SIGNUP ──────────────────────────────────────
// Steps for Creator: 0=Role, 1=Personal Info (country, age, gender), 2=Habits + Niche + Views, 3=Screenshots, 4=Payment Methods, 5=Account (email/pass) + AI result
// Steps for Advertiser: 0=Role, 1=Company Info (country, contact), 2=Account (email/pass)

export const SignupForm = ({ onShowPassword, onTogglePassword, loading }: LoginFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [signupData, setSignupData] = useState<SignupFormData>({ name: '', role: 'creator', email: '', password: '' });
  const [country, setCountry] = useState('');
  const [viewRange, setViewRange] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [habits, setHabits] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<{ niches: string[]; suggested_price_usd: number; reasoning: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  // Advertiser-specific
  const [contactPhone, setContactPhone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreator = signupData.role === 'creator';
  const selectedRole = roleCards.find(r => r.id === signupData.role)!;
  const totalSteps = isCreator ? 6 : 3;

  const passwordChecks = [
    { label: "Mín. 6 caracteres", valid: signupData.password.length >= 6 },
    { label: "1 maiúscula", valid: /[A-Z]/.test(signupData.password) },
    { label: "1 número", valid: /[0-9]/.test(signupData.password) },
  ];

  const handleScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'));
    if (valid.length + screenshots.length > 5) {
      toast({ title: "Máximo 5 screenshots", variant: "destructive" });
      return;
    }
    const newScreenshots = [...screenshots, ...valid];
    setScreenshots(newScreenshots);
    // Generate previews
    const newPreviews = [...screenshotPreviews];
    valid.forEach(f => {
      const url = URL.createObjectURL(f);
      newPreviews.push(url);
    });
    setScreenshotPreviews(newPreviews);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const togglePayment = (id: string) => {
    setPaymentMethods(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const requestAINiches = async () => {
    setAiLoading(true);
    try {
      const selectedViewRange = VIEW_RANGES.find(v => `${v.min}-${v.max}` === viewRange);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-niche-selector`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          userData: {
            country,
            ageRange,
            gender,
            habits,
            selectedNiche,
            viewsMin: selectedViewRange?.min || 0,
            viewsMax: selectedViewRange?.max || 0,
            followers: 0,
          }
        }),
      });
      const data = await resp.json();
      if (data.niches) {
        setAiResult(data);
      }
    } catch (err) {
      console.error('AI niche error:', err);
      setAiResult({
        niches: [selectedNiche || 'Lifestyle', 'Entretenimento', 'Marketing'],
        suggested_price_usd: 10,
        reasoning: 'Atribuição padrão baseada no seu perfil.'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const selectedViewRange = VIEW_RANGES.find(v => `${v.min}-${v.max}` === viewRange);
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: signupData.name, role: signupData.role, country: country || null }
        }
      });

      if (error) {
        toast({ title: error.message.includes('User already registered') ? "Usuário já existe" : "Erro no cadastro", description: error.message.includes('User already registered') ? "Este email já está registrado." : error.message, variant: "destructive" });
      } else if (signUpData?.user) {
        // Update profile with all collected data
        const profileUpdate: Record<string, unknown> = {
          country: country || null,
          whatsapp_views_min: selectedViewRange?.min || 0,
          whatsapp_views_max: selectedViewRange?.max || 0,
          account_status: 'active',
        };
        if (isCreator) {
          profileUpdate.age_range = ageRange || null;
          profileUpdate.gender = gender || null;
          profileUpdate.habits = habits || null;
          profileUpdate.preferred_payment_methods = paymentMethods;
          profileUpdate.niche = aiResult?.niches?.[0] || selectedNiche || null;
          profileUpdate.ai_selected_niches = aiResult?.niches || [selectedNiche];
          profileUpdate.price_per_post = aiResult?.suggested_price_usd || 10;
        }

        await supabase.from('profiles').update(profileUpdate).eq('user_id', signUpData.user.id);

        // Process referral code if present
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
          await supabase.rpc('process_referral', {
            p_referral_code: refCode,
            p_referred_user_id: signUpData.user.id,
          });
        }

        // Upload screenshots
        if (screenshots.length > 0 && signUpData.user) {
          for (const file of screenshots) {
            const fileName = `${signUpData.user.id}/${Date.now()}-${file.name}`;
            await supabase.storage.from('campaign-proofs').upload(fileName, file);
          }
        }

        toast({ title: "🎉 Conta criada!", description: isCreator ? "A IA definiu seus nichos e preço!" : "Bem-vindo à plataforma!" });
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return true;
    if (isCreator) {
      if (step === 1) return !!country && !!ageRange && !!gender;
      if (step === 2) return !!viewRange && !!habits;
      if (step === 3) return screenshots.length >= 1;
      if (step === 4) return paymentMethods.length >= 1;
      if (step === 5) return !!signupData.name && !!signupData.email && passwordChecks.every(c => c.valid);
    } else {
      if (step === 1) return !!country && !!signupData.name;
      if (step === 2) return !!signupData.email && passwordChecks.every(c => c.valid);
    }
    return false;
  };

  const handleNext = async () => {
    if (isCreator && step === 4) {
      // Before going to final step, request AI niches
      await requestAINiches();
    }
    setStep(s => s + 1);
  };

  const renderStep = () => {
    // Step 0: Role Selection
    if (step === 0) {
      return (
        <motion.div key="role" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-1">Como quer usar o StatusAds?</p>
          {roleCards.map((role) => {
            const Icon = role.icon;
            const isSelected = signupData.role === role.id;
            return (
              <button key={role.id} type="button" onClick={() => setSignupData(prev => ({ ...prev, role: role.id }))}
                className={cn("w-full p-4 rounded-xl border-2 transition-all duration-200 text-left", isSelected ? `${role.borderColor} ${role.bgColor} ring-2 ${role.activeRing}` : "border-border/40 hover:border-border/60 bg-muted/20")}>
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0", role.color)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground">{role.title}</h3>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.subtitle}</p>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-3 space-y-1.5">
                            {role.benefits.map((b, i) => { const BIcon = b.icon; return (
                              <div key={i} className="flex items-center gap-2 text-xs text-foreground/70"><BIcon className="h-3.5 w-3.5 text-primary shrink-0" /><span>{b.text}</span></div>
                            ); })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            );
          })}
        </motion.div>
      );
    }

    // ─── CREATOR STEPS ───
    if (isCreator) {
      if (step === 1) {
        return (
          <motion.div key="creator-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <StepHeader title="Informações Pessoais" icon={User} step={step} total={totalSteps} onBack={() => setStep(0)} role={selectedRole} />
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">País</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="Selecione seu país" /></SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <div key={region.code}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{region.name}</div>
                      {getCountriesByRegion(region.code).map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Faixa Etária</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="Idade" /></SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a} anos</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Género</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="Género" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );
      }

      if (step === 2) {
        return (
          <motion.div key="creator-habits" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <StepHeader title="Seu Perfil & Audiência" icon={Globe} step={step} total={totalSteps} onBack={() => setStep(1)} role={selectedRole} />
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">
                <BarChart className="inline h-3.5 w-3.5 mr-1" /> Visualizações nos Status
              </Label>
              <Select value={viewRange} onValueChange={setViewRange}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="Intervalo de visualizações" /></SelectTrigger>
                <SelectContent>
                  {VIEW_RANGES.map(v => <SelectItem key={`${v.min}-${v.max}`} value={`${v.min}-${v.max}`}>{v.label} views</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Seus costumes & interesses</Label>
              <Textarea
                placeholder="Descreva seus hábitos, interesses, tipo de conteúdo que consome e partilha... Ex: Gosto de tecnologia, faço reviews de produtos, meus contatos são maioria jovens universitários..."
                value={habits}
                onChange={(e) => setHabits(e.target.value)}
                className="min-h-[80px] bg-muted/30 border-border/40 text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground">A IA usará estas informações para selecionar os nichos ideais</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Escolha 1 nicho principal (opcional)</Label>
              <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="A IA escolherá os outros 2" /></SelectTrigger>
                <SelectContent>
                  {AVAILABLE_NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        );
      }

      if (step === 3) {
        return (
          <motion.div key="creator-screenshots" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <StepHeader title="Comprovação de Views" icon={Camera} step={step} total={totalSteps} onBack={() => setStep(2)} role={selectedRole} />
            <p className="text-xs text-muted-foreground">
              Adicione screenshots que comprovem o intervalo de visualizações que selecionou. Mínimo 1, máximo 5.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshots} />
            
            {screenshotPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {screenshotPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-border/40 group">
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeScreenshot(i)} className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs">×</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" className="w-full h-14 border-dashed border-2 border-border/60 rounded-xl flex flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{screenshots.length}/5 screenshots</span>
            </Button>
          </motion.div>
        );
      }

      if (step === 4) {
        return (
          <motion.div key="creator-payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <StepHeader title="Métodos de Pagamento" icon={CreditCard} step={step} total={totalSteps} onBack={() => setStep(3)} role={selectedRole} />
            <p className="text-xs text-muted-foreground">Selecione como deseja receber seus pagamentos</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} type="button" onClick={() => togglePayment(pm.id)}
                  className={cn("p-3 rounded-xl border-2 text-left transition-all", paymentMethods.includes(pm.id) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/40 hover:border-border/60 bg-muted/20")}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{pm.icon}</span>
                    <span className="text-xs font-medium text-foreground">{pm.label}</span>
                    {paymentMethods.includes(pm.id) && <Check className="h-3 w-3 text-primary ml-auto" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );
      }

      // Step 5: Account + AI Result
      if (step === 5) {
        return (
          <motion.div key="creator-account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StepHeader title="Criar Conta" icon={Sparkles} step={step} total={totalSteps} onBack={() => setStep(4)} role={selectedRole} />

            {aiLoading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">A IA está analisando seu perfil...</p>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : aiResult ? (
              <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Bot className="h-4 w-4" /> Nichos selecionados pela IA
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.niches.map(n => (
                    <span key={n} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{n}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Preço sugerido:</span>
                  <span className="text-sm font-bold text-primary">${aiResult.suggested_price_usd}/post</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{aiResult.reasoning}</p>
              </div>
            ) : null}

            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Nome artístico / público</Label>
                <Input placeholder="Ex: João Creator" value={signupData.name} onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))} className={cn("h-10 bg-muted/30 border-border/40", errors.name && 'border-destructive')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input type="email" placeholder="seu@email.com" value={signupData.email} onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))} className={cn("h-10 bg-muted/30 border-border/40", errors.email && 'border-destructive')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input type={onShowPassword ? "text" : "password"} placeholder="Crie uma senha forte" value={signupData.password} onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))} className={cn("h-10 pr-12 bg-muted/30 border-border/40", errors.password && 'border-destructive')} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={onTogglePassword}>
                    {onShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                {signupData.password.length > 0 && (
                  <div className="flex gap-3 pt-1">
                    {passwordChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded-full flex items-center justify-center", check.valid ? "bg-primary" : "bg-muted-foreground/20")}>
                          {check.valid && <Check className="h-2 w-2 text-primary-foreground" />}
                        </div>
                        <span className={cn("text-[10px]", check.valid ? "text-primary" : "text-muted-foreground")}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={isLoading || loading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Criando...</span> : <><Sparkles className="h-4 w-4 mr-1" /> Criar minha conta</>}
              </Button>
              <SocialSignInButtons />
            </form>
          </motion.div>
        );
      }
    }

    // ─── ADVERTISER STEPS ───
    if (!isCreator) {
      if (step === 1) {
        return (
          <motion.div key="adv-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <StepHeader title="Dados da Empresa" icon={Megaphone} step={step} total={totalSteps} onBack={() => setStep(0)} role={selectedRole} />
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Nome ou empresa</Label>
              <Input placeholder="Ex: Empresa ABC" value={signupData.name} onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))} className="h-10 bg-muted/30 border-border/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">País</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <div key={region.code}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{region.name}</div>
                      {getCountriesByRegion(region.code).map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Telefone de contacto</Label>
              <Input placeholder="+258 84 000 0000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-10 bg-muted/30 border-border/40" />
              <p className="text-[10px] text-muted-foreground">Será avaliado pelo administrador antes de ativar</p>
            </div>
          </motion.div>
        );
      }

      if (step === 2) {
        return (
          <motion.div key="adv-account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StepHeader title="Criar Conta" icon={Sparkles} step={step} total={totalSteps} onBack={() => setStep(1)} role={selectedRole} />
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
                <Input type="email" placeholder="empresa@email.com" value={signupData.email} onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))} className={cn("h-10 bg-muted/30 border-border/40", errors.email && 'border-destructive')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input type={onShowPassword ? "text" : "password"} placeholder="Crie uma senha forte" value={signupData.password} onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))} className={cn("h-10 pr-12 bg-muted/30 border-border/40", errors.password && 'border-destructive')} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={onTogglePassword}>
                    {onShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                {signupData.password.length > 0 && (
                  <div className="flex gap-3 pt-1">
                    {passwordChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded-full flex items-center justify-center", check.valid ? "bg-primary" : "bg-muted-foreground/20")}>
                          {check.valid && <Check className="h-2 w-2 text-primary-foreground" />}
                        </div>
                        <span className={cn("text-[10px]", check.valid ? "text-primary" : "text-muted-foreground")}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={isLoading || loading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Criando...</span> : <><Sparkles className="h-4 w-4 mr-1" /> Criar conta</>}
              </Button>
              <SocialSignInButtons />
            </form>
          </motion.div>
        );
      }
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      
      {/* Navigation */}
      {step < (isCreator ? 5 : 2) && step > 0 && (
        <Button onClick={handleNext} disabled={!canAdvance() || aiLoading} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20">
          {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />IA a analisar...</> : <>Continuar <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      )}
      {step === 0 && (
        <Button onClick={() => setStep(1)} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20">
          Continuar <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      )}

      {/* Step dots */}
      <div className="flex justify-center gap-1.5 pt-1">
        {Array.from({ length: totalSteps }).map((_, s) => (
          <div key={s} className={cn("h-1 rounded-full transition-all duration-300", s === step ? "w-6 bg-primary" : s < step ? "w-2 bg-primary/40" : "w-2 bg-muted-foreground/20")} />
        ))}
      </div>
    </div>
  );
};

// ─── Step Header ──────────────────────────────────────
const StepHeader = ({ title, icon: Icon, step, total, onBack, role }: { title: string; icon: typeof User; step: number; total: number; onBack: () => void; role: typeof roleCards[0] }) => (
  <div className="flex items-center justify-between mb-3">
    <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar
    </button>
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground">{step}/{total - 1}</span>
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", role.bgColor, "text-foreground")}>
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{title}</span>
      </div>
    </div>
  </div>
);

// ─── Reset Password ──────────────────────────────────────
interface ResetPasswordFormProps { onBack: () => void; }

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
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#type=recovery` });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
      else { setSent(true); toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." }); }
    } catch { toast({ title: "Erro inesperado", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto"><Check className="h-7 w-7 text-primary" /></div>
        <h3 className="text-lg font-semibold text-foreground">Email enviado!</h3>
        <p className="text-sm text-muted-foreground">Verifique sua caixa de entrada.</p>
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground">Esqueceu sua senha?</h3>
        <p className="text-sm text-muted-foreground">Digite seu email para redefinir.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wider">Email</Label>
        <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("h-11 bg-muted/30 border-border/40", errors.email && 'border-destructive')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link"}
      </Button>
      <Button type="button" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
    </form>
  );
};
