import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  ExternalLink
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
      // Validate method-specific fields
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

      // Invoke payment based on method
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

      // Show success
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-hero text-primary-foreground p-5 pb-4 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5" />
              {t('sponsors.form.title', 'Advertise on StatusAds')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-primary-foreground/70 text-xs mt-1">
            {t('sponsors.form.subtitle', 'Get your brand in front of thousands of creators and advertisers')}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  step === s ? "bg-primary-foreground text-primary scale-110" :
                  steps.indexOf(step) > i ? "bg-primary-foreground/60 text-primary" : "bg-primary-foreground/20 text-primary-foreground/60"
                )}>
                  {steps.indexOf(step) > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={cn("w-8 h-0.5 rounded", steps.indexOf(step) > i ? "bg-primary-foreground/60" : "bg-primary-foreground/20")} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Details */}
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* Pricing card */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Sponsor Card</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{formatFromUSD(MONTHLY_PRICE_USD)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-[10px] text-muted-foreground mt-1">CPV: {formatFromUSD(CPV_RATE)} · {t('sponsors.form.visibleToAll', 'Visible to all users')}</p>
                </div>

                {/* Logo emoji picker */}
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">{t('sponsors.form.logo', 'Logo / Icon')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {emojiOptions.map(e => (
                      <button
                        key={e}
                        onClick={() => setLogoEmoji(e)}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                          logoEmoji === e ? "bg-primary/20 border-2 border-primary scale-110" : "bg-muted hover:bg-muted/80 border border-transparent"
                        )}
                      >{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">{t('sponsors.form.brandName', 'Brand Name')} *</Label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Company" maxLength={30} className="mt-1" />
                </div>

                <div>
                  <Label className="text-xs font-medium">{t('sponsors.form.tagline', 'Tagline')}</Label>
                  <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short catchy phrase" maxLength={40} className="mt-1" />
                </div>

                <div>
                  <Label className="text-xs font-medium">{t('sponsors.form.website', 'Website URL')}</Label>
                  <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" className="mt-1" />
                </div>

                {/* Preview */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preview</Label>
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background border border-primary/30 shadow-sm w-fit"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base">{logoEmoji}</div>
                    <div>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        {brandName || 'Your Brand'} <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tagline || 'Your tagline here'}</p>
                    </div>
                  </motion.div>
                </div>

                <Button onClick={handleNext} className="w-full gap-2">
                  {t('sponsors.form.continue', 'Continue to Payment')} <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {step === 'payment' && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium">{t('sponsors.form.choosePayment', 'Choose payment method')}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{formatFromUSD(MONTHLY_PRICE_USD)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                </div>

                <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-1.5">
                  {availableMethods.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all',
                        method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <RadioGroupItem value={m.id} className="sr-only" />
                      <div className={cn('p-1.5 rounded-md', method === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{m.label}</span>
                          {m.badge && <Badge variant="secondary" className="text-[9px] px-1.5">{m.badge}</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                {method === 'paysuite' && (
                  <div className="space-y-1">
                    <Label className="text-xs">M-Pesa / e-Mola</Label>
                    <Input placeholder="841234567" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
                  </div>
                )}
                {method === 'multicaixa' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Multicaixa Express</Label>
                    <Input placeholder="923456789" value={multicaixaPhone} onChange={e => setMulticaixaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
                  </div>
                )}
                {method === 'mercadopago' && (
                  <div className="space-y-1">
                    <Label className="text-xs">PIX Key</Label>
                    <Input placeholder="email@example.com" value={pixKey} onChange={e => setPixKey(e.target.value)} />
                  </div>
                )}

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Shield className="h-3 w-3 text-primary" />
                  <span>{t('sponsors.form.secure', 'Secure payment · Cancel anytime')}</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('details')} className="flex-1" size="sm">
                    {t('common.back', 'Back')}
                  </Button>
                  <Button onClick={handlePay} disabled={loading} className="flex-1" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {loading ? t('common.loading', 'Processing...') : t('sponsors.form.pay', 'Pay Now')}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </motion.div>
                <h3 className="text-lg font-bold text-foreground">{t('sponsors.form.thankYou', 'Thank you!')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('sponsors.form.confirmMsg', 'Your sponsor card will be live once payment is confirmed. You\'ll be notified.')}
                </p>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted border border-border w-fit mx-auto">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-base">{logoEmoji}</div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{brandName}</p>
                    <p className="text-[10px] text-muted-foreground">{tagline || 'Your tagline'}</p>
                  </div>
                </div>
                <Button onClick={resetAndClose} className="w-full">{t('common.close', 'Close')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
