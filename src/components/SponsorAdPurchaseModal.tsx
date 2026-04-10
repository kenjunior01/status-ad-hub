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

type Step = 'details' | 'payment' | 'confirm';

export const SponsorAdPurchaseModal = ({ open, onOpenChange }: SponsorAdPurchaseModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatFromUSD, country } = useLocalizationContext();

  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('🏢');
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [multicaixaPhone, setMulticaixaPhone] = useState('');
  const [pixKey, setPixKey] = useState('');

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string; region?: string }[] = [
    { id: 'stripe', label: 'Card / Stripe', icon: <CreditCard className="h-4 w-4" />, desc: 'Visa, Mastercard' },
    { id: 'paypal', label: 'PayPal', icon: <Globe className="h-4 w-4" />, desc: 'International' },
    { id: 'paysuite', label: 'M-Pesa / e-Mola', icon: <Smartphone className="h-4 w-4" />, desc: 'Moçambique', region: 'MZ' },
    { id: 'multicaixa', label: 'Multicaixa Express', icon: <Smartphone className="h-4 w-4" />, desc: 'Angola', region: 'AO' },
    { id: 'mercadopago', label: 'PIX', icon: <Banknote className="h-4 w-4" />, desc: 'Brasil', region: 'BR' },
  ];

  const availableMethods = methods.filter(m => !m.region || m.region === country);
  const emojiOptions = ['🏢', '🚀', '💼', '🎯', '⚡', '🌟', '📱', '🎨', '💎', '🔥'];

  const handleNext = () => {
    if (!brandName.trim()) {
      toast({ title: 'Required', description: 'Enter your brand name', variant: 'destructive' });
      return;
    }
    setStep('payment');
  };

  const handlePay = async () => {
    setLoading(true);
    try {
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
      toast({ title: 'Payment initiated!' });
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {step === 'details' && 'Advertise on StatusAds'}
            {step === 'payment' && 'Choose Payment'}
            {step === 'confirm' && 'Success!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Get your brand in front of thousands of creators and advertisers.'}
            {step === 'payment' && `Total: ${formatFromUSD(MONTHLY_PRICE_USD)}/month`}
            {step === 'confirm' && 'Your ad will go live once payment is confirmed.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Details */}
        {step === 'details' && (
          <div className="space-y-4 mt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{formatFromUSD(MONTHLY_PRICE_USD)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> 10K+ views</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Premium</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 24/7</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Logo / Icon</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {emojiOptions.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setLogoEmoji(e)}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                      logoEmoji === e ? "bg-primary/20 border-2 border-primary scale-110" : "bg-muted border border-border hover:scale-105"
                    )}
                  >{e}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Brand Name *</Label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Company" maxLength={30} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-semibold">Tagline</Label>
              <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short catchy phrase" maxLength={40} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-semibold">Website URL</Label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" className="mt-1" />
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted border border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg">{logoEmoji}</div>
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  {brandName || 'Your Brand'} <ExternalLink className="h-3 w-3 opacity-40" />
                </p>
                <p className="text-xs text-muted-foreground">{tagline || 'Your tagline here'}</p>
              </div>
            </div>

            <Button onClick={handleNext} className="w-full gap-2">
              Continue to Payment <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && (
          <div className="space-y-4 mt-2">
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
              {availableMethods.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <RadioGroupItem value={m.id} />
                  <div className={cn('p-2 rounded-lg', method === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-foreground">{m.label}</span>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {method === 'paysuite' && (
              <div>
                <Label className="text-xs font-semibold">M-Pesa / e-Mola Number</Label>
                <Input placeholder="841234567" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} className="mt-1" />
              </div>
            )}
            {method === 'multicaixa' && (
              <div>
                <Label className="text-xs font-semibold">Multicaixa Express</Label>
                <Input placeholder="923456789" value={multicaixaPhone} onChange={e => setMulticaixaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} className="mt-1" />
              </div>
            )}
            {method === 'mercadopago' && (
              <div>
                <Label className="text-xs font-semibold">PIX Key</Label>
                <Input placeholder="email@example.com" value={pixKey} onChange={e => setPixKey(e.target.value)} className="mt-1" />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Shield className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Secure payment · Cancel anytime</span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">Back</Button>
              <Button onClick={handlePay} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {loading ? 'Processing...' : 'Pay Now'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Thank you!</h3>
            <p className="text-sm text-muted-foreground">Your sponsor card will be live once payment is confirmed.</p>
            <Button onClick={resetAndClose} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
