import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Megaphone, CreditCard, Smartphone, Globe, Banknote,
  Loader2, Shield, CheckCircle2, ArrowRight, Sparkles,
  ExternalLink, Star, Eye, Zap
} from 'lucide-react';

type PaymentMethod = 'stripe' | 'paypal' | 'paysuite' | 'multicaixa' | 'mercadopago';

interface SponsorAdPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHLY_PRICE_USD = 50;
const CPV_RATE = 0.65;

const steps = ['details', 'payment', 'confirm'] as const;
type Step = typeof steps[number];

export const SponsorAdPurchaseModal = ({ open, onOpenChange }: SponsorAdPurchaseModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatFromUSD, country } = useLocalizationContext();

  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('🏢');
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [multicaixaPhone, setMulticaixaPhone] = useState('');
  const [pixKey, setPixKey] = useState('');

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string; badge?: string; region?: string }[] = [
    { id: 'stripe', label: 'Card / Stripe', icon: <CreditCard className="h-4 w-4" />, desc: 'Visa, Mastercard', badge: 'Global' },
    { id: 'paypal', label: 'PayPal', icon: <Globe className="h-4 w-4" />, desc: 'International' },
    { id: 'paysuite', label: 'M-Pesa / e-Mola', icon: <Smartphone className="h-4 w-4" />, desc: 'Moçambique', region: 'MZ' },
    { id: 'multicaixa', label: 'Multicaixa Express', icon: <Smartphone className="h-4 w-4" />, desc: 'Angola', region: 'AO' },
    { id: 'mercadopago', label: 'PIX', icon: <Banknote className="h-4 w-4" />, desc: 'Brasil', region: 'BR' },
  ];

  const availableMethods = methods.filter(m => !m.region || m.region === country);

  const emojiOptions = ['🏢', '🚀', '💼', '🎯', '⚡', '🌟', '📱', '🎨', '💎', '🔥', '🌍', '📊'];

  const handleNext = () => {
    if (step === 'details') {
      if (!brandName.trim()) {
        toast({ title: t('sponsors.form.required', 'Required'), description: t('sponsors.form.brandRequired', 'Enter your brand name'), variant: 'destructive' });
        return;
      }
      setStep('payment');
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      if (method === 'paysuite' && (!mpesaPhone || mpesaPhone.length < 9)) {
        toast({ title: 'Invalid number', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (method === 'multicaixa' && (!multicaixaPhone || multicaixaPhone.length < 9)) {
        toast({ title: 'Invalid number', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (method === 'mercadopago' && !pixKey) {
        toast({ title: 'Invalid PIX key', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (method === 'paypal') {
        const { data, error } = await supabase.functions.invoke('paypal-payment', {
          body: { amount: MONTHLY_PRICE_USD, description: `Sponsor Ad: ${brandName}`, type: 'sponsor_ad' },
        });
        if (error) throw error;
        if (data?.approval_url) window.open(data.approval_url, '_blank');
      } else if (method === 'paysuite') {
        const { data, error } = await supabase.functions.invoke('paysuite-payment', {
          body: { amount: MONTHLY_PRICE_USD, phone: mpesaPhone, description: `Sponsor Ad: ${brandName}`, type: 'sponsor_ad' },
        });
        if (error) throw error;
      }

      setStep('confirm');
      toast({ title: t('sponsors.form.success', 'Payment initiated!') });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('details');
    setBrandName('');
    setTagline('');
    setWebsiteUrl('');
    setMethod('stripe');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border-primary/20 shadow-2xl dark:bg-card dark:border-primary/30">
        {/* Header with vivid gradient */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground p-6 pb-5 rounded-t-lg relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-primary-foreground flex items-center gap-2 text-lg font-bold">
              <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                <Megaphone className="h-5 w-5" />
              </div>
              {t('sponsors.form.title', 'Advertise on StatusAds')}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm mt-2">
              {t('sponsors.form.subtitle', 'Get your brand in front of thousands of creators and advertisers')}
            </DialogDescription>
          </DialogHeader>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-4 relative z-10">
            <div className="flex items-center gap-1.5 text-primary-foreground/80">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">10K+ views</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/80">
              <Star className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Premium</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/80">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">24/7</span>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-5 relative z-10">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  step === s ? "bg-white text-primary scale-110 shadow-lg" :
                  steps.indexOf(step) > i ? "bg-white/70 text-primary" : "bg-white/20 text-primary-foreground/60"
                )}>
                  {steps.indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "w-10 h-1 rounded-full transition-all duration-500",
                    steps.indexOf(step) > i ? "bg-white/70" : "bg-white/20"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Details */}
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Pricing card */}
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Sponsor Card</span>
                  </div>
                  <p className="text-4xl font-extrabold text-foreground">{formatFromUSD(MONTHLY_PRICE_USD)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-2">CPV: {formatFromUSD(CPV_RATE)} · {t('sponsors.form.visibleToAll', 'Visible to all users')}</p>
                </div>

                {/* Logo emoji picker */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block text-foreground">{t('sponsors.form.logo', 'Logo / Icon')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {emojiOptions.map(e => (
                      <button
                        key={e}
                        onClick={() => setLogoEmoji(e)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200",
                          logoEmoji === e ? "bg-primary/20 border-2 border-primary scale-110 shadow-md" : "bg-muted hover:bg-muted/80 border border-border hover:scale-105"
                        )}
                      >{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">{t('sponsors.form.brandName', 'Brand Name')} *</Label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Company" maxLength={30} className="mt-1.5 h-11" />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">{t('sponsors.form.tagline', 'Tagline')}</Label>
                  <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short catchy phrase" maxLength={40} className="mt-1.5 h-11" />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">{t('sponsors.form.website', 'Website URL')}</Label>
                  <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" className="mt-1.5 h-11" />
                </div>

                {/* Preview */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Preview</Label>
                  <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border-2 border-primary/30 shadow-md w-fit glow-primary"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-xl shadow-inner">{logoEmoji}</div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {brandName || 'Your Brand'} <ExternalLink className="h-3 w-3 opacity-40" />
                      </p>
                      <p className="text-xs text-muted-foreground">{tagline || 'Your tagline here'}</p>
                    </div>
                  </motion.div>
                </div>

                <Button onClick={handleNext} className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  {t('sponsors.form.continue', 'Continue to Payment')} <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {step === 'payment' && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t('sponsors.form.choosePayment', 'Choose payment method')}</p>
                  <p className="text-3xl font-extrabold text-primary mt-1">{formatFromUSD(MONTHLY_PRICE_USD)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>

                <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
                  {availableMethods.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        method === m.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      )}
                    >
                      <RadioGroupItem value={m.id} className="sr-only" />
                      <div className={cn('p-2 rounded-lg', method === m.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground')}>
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.label}</span>
                          {m.badge && <Badge variant="secondary" className="text-[10px] px-1.5">{m.badge}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      {method === m.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </label>
                  ))}
                </RadioGroup>

                {method === 'paysuite' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">M-Pesa / e-Mola</Label>
                    <Input placeholder="841234567" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} className="h-11" />
                  </div>
                )}
                {method === 'multicaixa' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Multicaixa Express</Label>
                    <Input placeholder="923456789" value={multicaixaPhone} onChange={e => setMulticaixaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} className="h-11" />
                  </div>
                )}
                {method === 'mercadopago' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">PIX Key</Label>
                    <Input placeholder="email@example.com" value={pixKey} onChange={e => setPixKey(e.target.value)} className="h-11" />
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{t('sponsors.form.secure', 'Secure payment · Cancel anytime')}</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('details')} className="flex-1 h-11 rounded-xl">
                    {t('common.back', 'Back')}
                  </Button>
                  <Button onClick={handlePay} disabled={loading} className="flex-1 h-11 rounded-xl font-semibold shadow-lg">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {loading ? t('common.loading', 'Processing...') : t('sponsors.form.pay', 'Pay Now')}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                  className="w-20 h-20 bg-gradient-to-br from-primary/20 to-success/20 rounded-full flex items-center justify-center mx-auto shadow-lg"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground">{t('sponsors.form.thankYou', 'Thank you!')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {t('sponsors.form.confirmMsg', 'Your sponsor card will be live once payment is confirmed. You\'ll be notified.')}
                </p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted border border-border w-fit mx-auto shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-xl shadow-inner">{logoEmoji}</div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{brandName}</p>
                    <p className="text-xs text-muted-foreground">{tagline || 'Your tagline'}</p>
                  </div>
                </div>
                <Button onClick={resetAndClose} className="w-full h-12 rounded-xl font-semibold">{t('common.close', 'Close')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};