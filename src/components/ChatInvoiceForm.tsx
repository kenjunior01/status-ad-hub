import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { FileText, Loader2, X, Send, Plus, Trash2 } from 'lucide-react';

interface ChatInvoiceFormProps {
  conversationId: string;
  onClose: () => void;
  onCreated: () => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export const ChatInvoiceForm = ({ conversationId, onClose, onCreated }: ChatInvoiceFormProps) => {
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { formatFromUSD } = useLocalizationContext();

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = 0; // Can be configured
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.description && i.unit_price > 0);
    if (validItems.length === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { data: invoice, error } = await supabase
        .from('chat_invoices')
        .insert({
          conversation_id: conversationId,
          created_by: user.id,
          invoice_number: invoiceNumber,
          items: validItems as any,
          subtotal,
          tax_amount: taxAmount,
          total,
          currency: 'USD',
        })
        .select()
        .single();

      if (error) throw error;

      // Send as message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `🧾 Factura: #${invoiceNumber} — USD ${total.toFixed(2)}`,
        status: 'sent',
      });

      toast({ title: '🧾 Factura criada!', description: `#${invoiceNumber} — ${formatFromUSD(total)}` });
      onCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-green-500/20 animate-in slide-in-from-bottom-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          Nova Factura
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-[10px]">Descrição</Label>
              <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Serviço..." className="h-8 text-xs" />
            </div>
            <div className="w-14">
              <Label className="text-[10px]">Qtd</Label>
              <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-xs" />
            </div>
            <div className="w-20">
              <Label className="text-[10px]">Preço ($)</Label>
              <Input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
            </div>
            {items.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addItem}>
          <Plus className="h-3 w-3" /> Adicionar item
        </Button>

        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatFromUSD(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Imposto</span>
              <span>{formatFromUSD(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Total</span>
            <span className="text-green-600">{formatFromUSD(total)}</span>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading || items.every(i => !i.description || i.unit_price <= 0)} className="w-full gap-2" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar Factura
        </Button>
      </CardContent>
    </Card>
  );
};
