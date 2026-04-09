import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Eye, EyeOff, Save, CreditCard, Smartphone, Globe, Banknote } from 'lucide-react';

interface GatewayConfig {
  id: string;
  setting_key: string;
  setting_value: Record<string, string>;
  is_active: boolean;
  description: string;
}

const GATEWAY_ICONS: Record<string, React.ReactNode> = {
  gateway_stripe: <CreditCard className="h-5 w-5" />,
  gateway_paysuite: <Smartphone className="h-5 w-5" />,
  gateway_paypal: <Globe className="h-5 w-5" />,
  gateway_multicaixa: <Smartphone className="h-5 w-5" />,
  gateway_mercadopago: <Banknote className="h-5 w-5" />,
};

const GATEWAY_LABELS: Record<string, string> = {
  gateway_stripe: 'Stripe',
  gateway_paysuite: 'PaySuite / M-Pesa',
  gateway_paypal: 'PayPal',
  gateway_multicaixa: 'Multicaixa Express',
  gateway_mercadopago: 'Mercado Pago / PIX',
};

const GATEWAY_REGIONS: Record<string, string> = {
  gateway_stripe: 'Global',
  gateway_paysuite: '🇲🇿 Moçambique',
  gateway_paypal: '🌍 Internacional',
  gateway_multicaixa: '🇦🇴 Angola',
  gateway_mercadopago: '🇧🇷 Brasil',
};

const FIELD_LABELS: Record<string, string> = {
  api_key: 'API Key',
  client_id: 'Client ID',
  client_secret: 'Client Secret',
  secret_key: 'Secret Key',
  publishable_key: 'Publishable Key',
  access_token: 'Access Token',
  public_key: 'Public Key',
  merchant_id: 'Merchant ID',
};

export const AdminPaymentSettings = () => {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('category', 'payment')
        .order('setting_key');

      if (error) throw error;

      const configs = (data || []).map(d => ({
        id: d.id,
        setting_key: d.setting_key,
        setting_value: d.setting_value as Record<string, string>,
        is_active: d.is_active,
        description: d.description || '',
      }));

      setGateways(configs);
      
      const initialEdits: Record<string, Record<string, string>> = {};
      configs.forEach(g => {
        initialEdits[g.setting_key] = { ...g.setting_value };
      });
      setEditValues(initialEdits);
    } catch (err) {
      console.error('Error fetching gateways:', err);
      toast({ title: 'Erro', description: 'Falha ao carregar configurações de pagamento', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (gateway: GatewayConfig) => {
    setSaving(gateway.setting_key);
    try {
      const values = editValues[gateway.setting_key] || {};
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: values as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gateway.id);

      if (error) throw error;

      toast({ title: 'Salvo!', description: `Configuração de ${GATEWAY_LABELS[gateway.setting_key]} actualizada.` });
      fetchGateways();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (gateway: GatewayConfig) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ is_active: !gateway.is_active, updated_at: new Date().toISOString() })
        .eq('id', gateway.id);

      if (error) throw error;
      
      setGateways(prev => prev.map(g => g.id === gateway.id ? { ...g, is_active: !g.is_active } : g));
      toast({ title: gateway.is_active ? 'Desactivado' : 'Activado', description: GATEWAY_LABELS[gateway.setting_key] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const updateField = (gatewayKey: string, field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [gatewayKey]: { ...(prev[gatewayKey] || {}), [field]: value },
    }));
  };

  const maskValue = (val: string) => {
    if (!val || val.length < 8) return '••••••••';
    return val.substring(0, 4) + '••••' + val.substring(val.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Gateways de Pagamento</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure as APIs dos métodos de pagamento. As chaves são armazenadas de forma segura e só podem ser visualizadas por administradores.
      </p>

      <div className="grid gap-4">
        {gateways.map((gateway) => (
          <Card key={gateway.id} className={`transition-all ${gateway.is_active ? 'border-primary/30 bg-primary/5' : 'opacity-75'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${gateway.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {GATEWAY_ICONS[gateway.setting_key]}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {GATEWAY_LABELS[gateway.setting_key]}
                      <Badge variant={gateway.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {gateway.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {GATEWAY_REGIONS[gateway.setting_key]} — {gateway.description}
                    </CardDescription>
                  </div>
                </div>
                <Switch checked={gateway.is_active} onCheckedChange={() => handleToggle(gateway)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(gateway.setting_value).map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs font-medium">{FIELD_LABELS[field] || field}</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecrets[`${gateway.setting_key}_${field}`] ? 'text' : 'password'}
                      value={editValues[gateway.setting_key]?.[field] || ''}
                      onChange={(e) => updateField(gateway.setting_key, field, e.target.value)}
                      placeholder={`Insira o ${FIELD_LABELS[field] || field}...`}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSecrets(prev => ({
                        ...prev,
                        [`${gateway.setting_key}_${field}`]: !prev[`${gateway.setting_key}_${field}`],
                      }))}
                    >
                      {showSecrets[`${gateway.setting_key}_${field}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => handleSave(gateway)}
                disabled={saving === gateway.setting_key}
                className="w-full mt-2"
                size="sm"
              >
                {saving === gateway.setting_key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
