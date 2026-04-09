import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { FileText, Loader2, X, Send } from 'lucide-react';

interface ChatQuotationFormProps {
  conversationId: string;
  onClose: () => void;
  onCreated: () => void;
}

export const ChatQuotationForm = ({ conversationId, onClose, onCreated }: ChatQuotationFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currency } = useLocalizationContext();

  const handleSubmit = async () => {
    if (!title.trim() || !amount) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast({ title: 'Valor inválido', variant: 'destructive' });
        return;
      }

      // Create quotation
      const { data: quotation, error: qError } = await supabase
        .from('chat_quotations')
        .insert({
          conversation_id: conversationId,
          created_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          amount: amountNum,
          currency,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (qError) throw qError;

      // Send as special message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `💼 Cotação: ${title.trim()} — ${currency} ${amountNum.toFixed(2)}`,
          status: 'sent',
        });

      if (msgError) throw msgError;

      toast({ title: 'Cotação enviada!', description: 'O outro participante pode aceitar ou recusar.' });
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
    <Card className="border-primary/20 animate-in slide-in-from-bottom-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Nova Cotação
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Título</Label>
          <Input
            placeholder="Ex: Publicação no Status por 24h"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Descrição (opcional)</Label>
          <Textarea
            placeholder="Detalhes da proposta..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Valor ({currency})</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button onClick={handleSubmit} disabled={loading || !title.trim() || !amount} className="w-full" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Enviar Cotação
        </Button>
      </CardContent>
    </Card>
  );
};
