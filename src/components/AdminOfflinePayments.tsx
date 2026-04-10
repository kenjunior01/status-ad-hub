import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { CheckCircle, XCircle, Loader2, FileText, Image, ExternalLink, Clock } from 'lucide-react';

interface OfflinePayment {
  id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  sender_id: string;
  conversation_id: string;
  status: string | null;
  senderName?: string;
}

export const AdminOfflinePayments = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<OfflinePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { formatFromUSD } = useLocalizationContext();

  useEffect(() => {
    fetchOfflinePayments();
  }, []);

  const fetchOfflinePayments = async () => {
    setLoading(true);
    try {
      // Find messages that are payment proofs (contain the payment proof marker)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .like('content', '%💳 Comprovativo de Pagamento%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Also search for English version
      const { data: dataEn } = await supabase
        .from('messages')
        .select('*')
        .like('content', '%💳 Payment Proof%')
        .order('created_at', { ascending: false })
        .limit(100);

      const allPayments = [...(data || []), ...(dataEn || [])];
      
      // Deduplicate by id
      const unique = Array.from(new Map(allPayments.map(p => [p.id, p])).values());

      // Get sender profiles
      const senderIds = [...new Set(unique.map(p => p.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setPayments(unique.map(p => ({
        ...p,
        senderName: profileMap.get(p.sender_id) || 'Unknown',
      })));
    } catch (err) {
      console.error(err);
      toast({ title: t('common.error'), description: 'Failed to load offline payments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (payment: OfflinePayment, approved: boolean) => {
    setProcessing(payment.id);
    try {
      // Update message status
      const newStatus = approved ? 'verified' : 'rejected';
      const { error } = await supabase
        .from('messages')
        .update({ status: newStatus })
        .eq('id', payment.id);

      if (error) throw error;

      // If approved and there's a note, send a system message in the conversation
      const noteText = notes[payment.id];
      if (noteText) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('messages').insert({
            conversation_id: payment.conversation_id,
            sender_id: user.id,
            content: `✅ ${approved ? 'Comprovativo verificado' : '❌ Comprovativo rejeitado'}: ${noteText}`,
          });
        }
      }

      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus } : p));
      toast({
        title: approved ? '✅ Verificado' : '❌ Rejeitado',
        description: approved ? 'Comprovativo de pagamento aprovado' : 'Comprovativo de pagamento rejeitado',
      });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'verified') return <Badge className="bg-green-500/20 text-green-600">✅ Verificado</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">❌ Rejeitado</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = payments.filter(p => !p.status || p.status === 'sent');
  const reviewed = payments.filter(p => p.status === 'verified' || p.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Comprovativos de Pagamento Offline
        </h2>
        <Badge variant="outline">{pending.length} pendentes</Badge>
      </div>

      {pending.length === 0 && reviewed.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum comprovativo de pagamento para verificar</p>
        </Card>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">⏳ Pendentes ({pending.length})</h3>
          {pending.map(payment => (
            <Card key={payment.id} className="border-warning/30 bg-warning/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{payment.senderName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-line">{payment.content}</p>

                {payment.attachment_url && (
                  <div className="border rounded-lg overflow-hidden">
                    {isImage(payment.attachment_type) ? (
                      <img
                        src={payment.attachment_url}
                        alt="Comprovativo"
                        className="max-h-64 w-full object-contain bg-muted/50"
                      />
                    ) : (
                      <a
                        href={payment.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm">{payment.attachment_name || 'Documento'}</span>
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                  </div>
                )}

                <Textarea
                  placeholder="Notas de verificação (opcional)..."
                  value={notes[payment.id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [payment.id]: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerify(payment, true)}
                    disabled={processing === payment.id}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    {processing === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleVerify(payment, false)}
                    disabled={processing === payment.id}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    {processing === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">📋 Histórico ({reviewed.length})</h3>
          {reviewed.map(payment => (
            <Card key={payment.id} className={payment.status === 'verified' ? 'border-green-500/20' : 'border-destructive/20'}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{payment.senderName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleString()}</p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
