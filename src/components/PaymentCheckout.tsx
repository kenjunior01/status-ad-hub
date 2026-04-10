import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Smartphone, Globe, Loader2, Shield, Lock, Banknote, Upload, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentCheckoutProps {
  campaignId: string;
  creatorId: string;
  amount: number;
  campaignTitle: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PLATFORM_FEE_PERCENT = 18;

type PaymentMethod = 'stripe' | 'paysuite' | 'paypal' | 'multicaixa' | 'mercadopago' | 'offline';

export const PaymentCheckout = ({
  campaignId, creatorId, amount, campaignTitle, onSuccess, onCancel,
}: PaymentCheckoutProps) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [multicaixaPhone, setMulticaixaPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { formatFromUSD, country } = useLocalizationContext();

  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  const creatorPayout = amount - platformFee;

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      if (method === 'stripe') {
        const { data, error } = await supabase.functions.invoke('create-escrow-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: t("payment.cardStripe"), description: t("payment.processing") });
        onSuccess?.();
      } else if (method === 'paysuite') {
        if (!mpesaPhone || mpesaPhone.length < 9) {
          toast({ title: t("payment.invalidNumber"), description: t("payment.enterValidNumber"), variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('paysuite-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount, phone: mpesaPhone },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: t("payment.mpesa"), description: t("payment.processing") });
        onSuccess?.();
      } else if (method === 'paypal') {
        const { data, error } = await supabase.functions.invoke('paypal-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.approval_url) window.open(data.approval_url, '_blank');
        toast({ title: t("payment.paypalLabel"), description: t("payment.processing") });
        onSuccess?.();
      } else if (method === 'multicaixa') {
        if (!multicaixaPhone || multicaixaPhone.length < 9) {
          toast({ title: t("payment.invalidNumber"), description: t("payment.enterValidNumber"), variant: 'destructive' });
          setLoading(false);
          return;
        }
        toast({ title: t("payment.multicaixa"), description: t("payment.processing") });
        onSuccess?.();
      } else if (method === 'mercadopago') {
        if (!pixKey) {
          toast({ title: t("payment.invalidPixKey"), description: t("payment.enterValidPixKey"), variant: 'destructive' });
          setLoading(false);
          return;
        }
        toast({ title: t("payment.pix"), description: t("payment.processing") });
        onSuccess?.();
      } else if (method === 'offline') {
        if (!receiptFile) {
          toast({ title: t("payment.receiptRequired"), variant: 'destructive' });
          setLoading(false);
          return;
        }
        // Upload receipt to storage
        const fileExt = receiptFile.name.split('.').pop();
        const filePath = `receipts/${campaignId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        
        toast({ title: t("payment.receiptUploaded"), description: t("payment.receiptUploadedDesc") });
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({ title: t("common.error"), description: err?.message || t("common.error"), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string; badge?: string; region?: string }[] = [
    { id: 'stripe', label: t("payment.cardStripe"), icon: <CreditCard className="h-5 w-5" />, desc: t("payment.visaMastercard"), badge: t("payment.global") },
    { id: 'paypal', label: t("payment.paypalLabel"), icon: <Globe className="h-5 w-5" />, desc: t("payment.internationalPayment") },
    { id: 'offline', label: t("payment.offlinePayment"), icon: <Upload className="h-5 w-5" />, desc: t("payment.offlineDesc"), badge: t("payment.global") },
    { id: 'paysuite', label: t("payment.mpesa"), icon: <Smartphone className="h-5 w-5" />, desc: t("payment.mobilePayment"), region: 'MZ' },
    { id: 'multicaixa', label: t("payment.multicaixa"), icon: <Smartphone className="h-5 w-5" />, desc: t("payment.multicaixaDesc"), region: 'AO' },
    { id: 'mercadopago', label: t("payment.pix"), icon: <Banknote className="h-5 w-5" />, desc: t("payment.pixDesc"), region: 'BR' },
  ];

  const availableMethods = methods.filter(m => !m.region || m.region === country);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-primary" />
          {t("payment.securePayment")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("payment.campaign")}: {campaignTitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between"><span>{t("payment.campaignValue")}</span><span className="font-semibold">{formatFromUSD(amount)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("payment.platformFee")} ({PLATFORM_FEE_PERCENT}%)</span><span>{formatFromUSD(platformFee)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold"><span>{t("payment.creatorPayout")}</span><span className="text-primary">{formatFromUSD(creatorPayout)}</span></div>
        </div>

        <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
          {availableMethods.map((m) => (
            <label key={m.id} className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
              method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            )}>
              <RadioGroupItem value={m.id} className="sr-only" />
              <div className={cn('p-2 rounded-lg', method === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{m.label}</span>
                  {m.badge && <Badge variant="secondary" className="text-[10px]">{m.badge}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        {method === 'paysuite' && (
          <div className="space-y-2">
            <Label className="text-xs">{t("payment.mpesaNumber")}</Label>
            <Input placeholder="841234567" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
          </div>
        )}

        {method === 'multicaixa' && (
          <div className="space-y-2">
            <Label className="text-xs">{t("payment.multicaixaNumber")}</Label>
            <Input placeholder="923456789" value={multicaixaPhone} onChange={(e) => setMulticaixaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
          </div>
        )}

        {method === 'mercadopago' && (
          <div className="space-y-2">
            <Label className="text-xs">{t("payment.pixKeyLabel")}</Label>
            <Input placeholder="seu@email.com" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
          </div>
        )}

        {method === 'offline' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("payment.offlineInstructions")}</p>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleReceiptSelect} />
            {receiptPreview ? (
              <div className="relative">
                <img src={receiptPreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border" />
                <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                  <FileCheck className="h-4 w-4" />
                  <span>{receiptFile?.name}</span>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t("payment.selectReceipt")}
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>{t("payment.escrowProtected")}</span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>{t("common.cancel")}</Button>
          <Button onClick={handlePay} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? t("payment.processing") : `${t("payment.pay")} ${formatFromUSD(amount)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};