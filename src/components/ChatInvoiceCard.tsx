import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Check, X, Clock, Loader2, Receipt } from 'lucide-react';

interface QuotationCardProps {
  type: 'quotation';
  quotationId?: string;
  conversationId?: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  isMine: boolean;
  onStatusChange?: () => void;
}

interface InvoiceCardProps {
  type: 'invoice';
  invoiceNumber: string;
  total: number;
  currency: string;
  status: string;
  pdfUrl?: string;
  isMine: boolean;
}

interface PaymentCardProps {
  type: 'payment';
  content: string;
  isMine: boolean;
}

type ChatSpecialCardProps = QuotationCardProps | InvoiceCardProps | PaymentCardProps;

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  accepted: { label: 'Aceite', variant: 'default', icon: <Check className="h-3 w-3" /> },
  rejected: { label: 'Recusada', variant: 'destructive', icon: <X className="h-3 w-3" /> },
  paid: { label: 'Pago', variant: 'default', icon: <Check className="h-3 w-3" /> },
};

export const ChatSpecialCard = (props: ChatSpecialCardProps) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  if (props.type === 'payment') {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <Check className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">COMPROVATIVO</span>
        </div>
        <p className="text-sm">{props.content}</p>
      </div>
    );
  }

  const handleAcceptQuotation = async () => {
    if (props.type !== 'quotation' || !props.quotationId || !props.conversationId) return;
    setActionLoading('accept');
    try {
      // Update quotation status
      const { error } = await supabase
        .from('chat_quotations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', props.quotationId);

      if (error) throw error;

      // Generate invoice from accepted quotation
      const { data, error: invError } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { quotation_id: props.quotationId, conversation_id: props.conversationId },
      });

      if (invError) throw invError;

      toast({ title: '✅ Cotação aceite!', description: `Factura #${data?.invoice?.invoice_number} gerada automaticamente.` });
      props.onStatusChange?.();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || 'Falha ao aceitar cotação', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectQuotation = async () => {
    if (props.type !== 'quotation' || !props.quotationId) return;
    setActionLoading('reject');
    try {
      const { error } = await supabase
        .from('chat_quotations')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', props.quotationId);

      if (error) throw error;

      // Send rejection message
      const { data: { user } } = await supabase.auth.getUser();
      if (user && props.conversationId) {
        await supabase.from('messages').insert({
          conversation_id: props.conversationId,
          sender_id: user.id,
          content: `❌ Cotação recusada: ${props.title}`,
          status: 'sent',
        });
      }

      toast({ title: 'Cotação recusada' });
      props.onStatusChange?.();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (props.type === 'quotation') {
    const statusCfg = STATUS_CONFIG[props.status] || STATUS_CONFIG.pending;
    return (
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3 min-w-[220px] max-w-[280px]">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">COTAÇÃO</span>
          <Badge variant={statusCfg.variant} className="ml-auto text-[10px] gap-1">
            {statusCfg.icon} {statusCfg.label}
          </Badge>
        </div>
        <p className="font-medium text-sm mb-1">{props.title}</p>
        {props.description && (
          <p className="text-xs text-muted-foreground mb-2">{props.description}</p>
        )}
        <div className="text-lg font-bold text-primary mb-2">
          {props.currency} {props.amount.toFixed(2)}
        </div>
        {props.status === 'pending' && !props.isMine && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 h-7 text-xs" 
              onClick={handleAcceptQuotation}
              disabled={!!actionLoading}
            >
              {actionLoading === 'accept' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Aceitar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-7 text-xs" 
              onClick={handleRejectQuotation}
              disabled={!!actionLoading}
            >
              {actionLoading === 'reject' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
              Recusar
            </Button>
          </div>
        )}
        {props.status === 'accepted' && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Receipt className="h-3 w-3" />
            Factura gerada automaticamente
          </div>
        )}
      </div>
    );
  }

  // Invoice card
  const statusCfg = STATUS_CONFIG[props.status] || STATUS_CONFIG.pending;
  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-3 min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-green-600" />
        <span className="text-xs font-semibold text-green-600">FACTURA</span>
        <Badge variant={statusCfg.variant} className="ml-auto text-[10px] gap-1">
          {statusCfg.icon} {statusCfg.label}
        </Badge>
      </div>
      <p className="font-medium text-sm mb-1">#{props.invoiceNumber}</p>
      <div className="text-lg font-bold text-green-600 mb-2">
        {props.currency} {props.total.toFixed(2)}
      </div>
      {props.pdfUrl && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" asChild>
          <a href={props.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-3 w-3 mr-1" /> Baixar PDF
          </a>
        </Button>
      )}
    </div>
  );
};
