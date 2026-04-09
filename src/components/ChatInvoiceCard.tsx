import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Check, X, Clock } from 'lucide-react';
import { useLocalizationContext } from '@/contexts/LocalizationContext';

interface QuotationCardProps {
  type: 'quotation';
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  isMine: boolean;
  onAccept?: () => void;
  onReject?: () => void;
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

type ChatSpecialCardProps = QuotationCardProps | InvoiceCardProps;

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  accepted: { label: 'Aceite', variant: 'default', icon: <Check className="h-3 w-3" /> },
  rejected: { label: 'Recusada', variant: 'destructive', icon: <X className="h-3 w-3" /> },
  paid: { label: 'Pago', variant: 'default', icon: <Check className="h-3 w-3" /> },
};

export const ChatSpecialCard = (props: ChatSpecialCardProps) => {
  const { format } = useLocalizationContext();

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
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={props.onAccept}>
              <Check className="h-3 w-3 mr-1" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={props.onReject}>
              <X className="h-3 w-3 mr-1" /> Recusar
            </Button>
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
