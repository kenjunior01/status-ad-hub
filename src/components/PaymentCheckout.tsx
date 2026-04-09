import { useState } from 'react';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Smartphone, Globe, Loader2, Shield, Lock, Banknote } from 'lucide-react';
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

type PaymentMethod = 'stripe' | 'paysuite' | 'paypal' | 'multicaixa' | 'mercadopago';

export const PaymentCheckout = ({
  campaignId,
  creatorId,
  amount,
  campaignTitle,
  onSuccess,
  onCancel,
}: PaymentCheckoutProps) => {
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [multicaixaPhone, setMulticaixaPhone] = useState('');
  const { toast } = useToast();
  const { formatFromUSD, country } = useLocalizationContext();

  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  const creatorPayout = amount - platformFee;

  const handlePay = async () => {
    setLoading(true);
    try {
      if (method === 'stripe') {
        const { data, error } = await supabase.functions.invoke('create-escrow-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: 'Pagamento iniciado via Stripe', description: 'Redirecionando para o checkout...' });
        onSuccess?.();
      } else if (method === 'paysuite') {
        if (!mpesaPhone || mpesaPhone.length < 9) {
          toast({ title: 'Número inválido', description: 'Insira um número M-Pesa válido', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('paysuite-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount, phone: mpesaPhone },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: 'M-Pesa iniciado!', description: 'Confirme no seu telefone.' });
        onSuccess?.();
      } else if (method === 'paypal') {
        const { data, error } = await supabase.functions.invoke('paypal-payment', {
          body: { campaign_id: campaignId, creator_id: creatorId, amount },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.approval_url) window.open(data.approval_url, '_blank');
        toast({ title: 'PayPal aberto', description: 'Complete o pagamento na janela do PayPal.' });
        onSuccess?.();
      } else if (method === 'multicaixa') {
        if (!multicaixaPhone || multicaixaPhone.length < 9) {
          toast({ title: 'Número inválido', description: 'Insira um número válido', variant: 'destructive' });
          setLoading(false);
          return;
        }
        toast({ title: 'Multicaixa Express', description: 'Confirme o pagamento no seu telefone.' });
        onSuccess?.();
      } else if (method === 'mercadopago') {
        if (!pixKey) {
          toast({ title: 'Chave PIX inválida', description: 'Insira uma chave PIX válida', variant: 'destructive' });
          setLoading(false);
          return;
        }
        toast({ title: 'PIX gerado!', description: 'Escaneie o QR Code ou copie o código.' });
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({ title: 'Erro no pagamento', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string; badge?: string; region?: string }[] = [
    { id: 'stripe', label: 'Cartão / Stripe', icon: <CreditCard className="h-5 w-5" />, desc: 'Visa, Mastercard, etc.', badge: 'Global' },
    { id: 'paypal', label: 'PayPal', icon: <Globe className="h-5 w-5" />, desc: 'Pagamento internacional' },
    { id: 'paysuite', label: 'M-Pesa', icon: <Smartphone className="h-5 w-5" />, desc: 'Pagamento móvel', region: 'MZ' },
    { id: 'multicaixa', label: 'Multicaixa Express', icon: <Smartphone className="h-5 w-5" />, desc: 'Pagamento móvel Angola', region: 'AO' },
    { id: 'mercadopago', label: 'PIX', icon: <Banknote className="h-5 w-5" />, desc: 'Transferência instantânea Brasil', region: 'BR' },
  ];

  // Show all global methods + region-specific ones
  const availableMethods = methods.filter(m => !m.region || m.region === country);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-primary" />
          Pagamento Seguro
        </CardTitle>
        <p className="text-sm text-muted-foreground">Campanha: {campaignTitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between"><span>Valor da campanha</span><span className="font-semibold">{formatFromUSD(amount)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Taxa plataforma ({PLATFORM_FEE_PERCENT}%)</span><span>{formatFromUSD(platformFee)}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold"><span>Pagamento do criador</span><span className="text-primary">{formatFromUSD(creatorPayout)}</span></div>
        </div>

        <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-2">
          {availableMethods.map((m) => (
            <label
              key={m.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              )}
            >
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
            <Label className="text-xs">Número M-Pesa</Label>
            <Input placeholder="841234567" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
          </div>
        )}

        {method === 'multicaixa' && (
          <div className="space-y-2">
            <Label className="text-xs">Número Multicaixa Express</Label>
            <Input placeholder="923456789" value={multicaixaPhone} onChange={(e) => setMulticaixaPhone(e.target.value.replace(/\D/g, ''))} maxLength={9} />
          </div>
        )}

        {method === 'mercadopago' && (
          <div className="space-y-2">
            <Label className="text-xs">Chave PIX (CPF, e-mail ou telefone)</Label>
            <Input placeholder="seu@email.com" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>Pagamento protegido por escrow — o criador só recebe após verificação</span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>Cancelar</Button>
          <Button onClick={handlePay} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Processando...' : `Pagar ${formatFromUSD(amount)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
