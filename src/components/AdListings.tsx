import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdListings } from '@/hooks/useAdListings';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import {
  Plus, Megaphone, Clock, Users, DollarSign, Send, Loader2,
  CheckCircle, XCircle, Star, MapPin, Eye, MessageSquare,
} from 'lucide-react';

const CATEGORIES = [
  'Tecnologia', 'Moda', 'Beleza', 'Saúde', 'Fitness', 'Gastronomia',
  'Viagens', 'Educação', 'Finanças', 'Negócios', 'Marketing',
  'Entretenimento', 'Música', 'Jogos', 'Esportes', 'Lifestyle',
];

// ─── Create Listing Form ─────────────────────────
export const CreateListingForm = ({ onCreated }: { onCreated?: () => void }) => {
  const { createListing } = useAdListings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', budget: '', category: '', duration_days: '7', requirements: '' });

  const handleSubmit = async () => {
    if (!form.title || !form.budget) return;
    setLoading(true);
    try {
      await createListing({
        title: form.title,
        description: form.description,
        budget: parseFloat(form.budget),
        category: form.category,
        duration_days: parseInt(form.duration_days) || 7,
        requirements: form.requirements,
      });
      setForm({ title: '', description: '', budget: '', category: '', duration_days: '7', requirements: '' });
      setOpen(false);
      onCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Publicar Anúncio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Novo Anúncio
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título do anúncio *</Label>
            <Input placeholder="Ex: Preciso de criador para campanha de moda" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea placeholder="Descreva o que procura..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Orçamento (USD) *</Label>
              <Input type="number" min="1" step="0.01" placeholder="50.00" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Duração (dias)</Label>
              <Input type="number" min="1" max="90" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Requisitos (opcional)</Label>
            <Textarea placeholder="Ex: Mínimo 1000 views, público feminino..." value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} className="min-h-[60px]" />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !form.title || !form.budget} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Publicar Anúncio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Ad Listing Card ────────────────────────────
interface ListingCardProps {
  listing: any;
  isCreator?: boolean;
  onApply?: (listingId: string) => void;
  onManage?: (listingId: string) => void;
}

export const AdListingCard = ({ listing, isCreator, onApply, onManage }: ListingCardProps) => {
  const { formatFromUSD } = useLocalizationContext();
  const hasApplied = listing.my_application;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm">{listing.title}</h3>
              {listing.category && <Badge variant="secondary" className="text-[10px]">{listing.category}</Badge>}
            </div>
            {listing.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{listing.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> {formatFromUSD(listing.budget)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {listing.duration_days}d
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                📅 {new Date(listing.created_at).toLocaleDateString()}
              </span>
            </div>
            {listing.requirements && (
              <p className="text-[10px] text-muted-foreground mt-1.5 bg-muted/50 px-2 py-1 rounded">
                📋 {listing.requirements}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-primary">{formatFromUSD(listing.budget)}</p>
            {isCreator && (
              hasApplied ? (
                <Badge variant={hasApplied.status === 'accepted' ? 'default' : hasApplied.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] mt-1">
                  {hasApplied.status === 'accepted' ? '✅ Aceite' : hasApplied.status === 'rejected' ? '❌ Recusado' : '⏳ Pendente'}
                </Badge>
              ) : (
                <Button size="sm" className="mt-1 gap-1 text-xs" onClick={() => onApply?.(listing.id)}>
                  <Send className="h-3 w-3" /> Candidatar
                </Button>
              )
            )}
            {!isCreator && (
              <Button size="sm" variant="outline" className="mt-1 text-xs" onClick={() => onManage?.(listing.id)}>
                <Users className="h-3 w-3 mr-1" /> Ver
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Application Form Dialog ────────────────────
export const ApplyToListingDialog = ({ listingId, listingTitle, onClose, onApplied }: {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onApplied: () => void;
}) => {
  const { applyToListing } = useAdListings();
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await applyToListing(listingId, message, price ? parseFloat(price) : undefined);
      onApplied();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Candidatar-se: {listingTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Mensagem ao anunciante</Label>
            <Textarea placeholder="Porque sou ideal para este anúncio..." value={message} onChange={e => setMessage(e.target.value)} className="min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs">Preço proposto (USD, opcional)</Label>
            <Input type="number" min="0" step="0.01" placeholder="Deixe vazio para aceitar o orçamento" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Candidatura
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Applications List (for advertiser) ─────────
export const ListingApplicationsList = ({ listingId, onStartChat }: { listingId: string; onStartChat?: (creatorId: string) => void }) => {
  const { getApplications, updateApplicationStatus } = useAdListings();
  const { formatFromUSD } = useLocalizationContext();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const apps = await getApplications(listingId);
      setApplications(apps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => { fetchApps(); });

  const handleAction = async (appId: string, status: 'accepted' | 'rejected') => {
    setActionLoading(appId);
    try {
      await updateApplicationStatus(appId, status);
      fetchApps();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" /> {applications.length} Candidatura(s)
      </h3>
      {applications.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma candidatura ainda</p>
        </Card>
      ) : (
        applications.map((app) => (
          <Card key={app.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  {(app.creator_profile?.display_name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{app.creator_profile?.display_name || 'Criador'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {app.creator_profile?.niche && <span>{app.creator_profile.niche}</span>}
                    {app.creator_profile?.rating > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-warning fill-warning" /> {app.creator_profile.rating}</span>}
                  </div>
                  {app.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{app.message}</p>}
                  {app.proposed_price && <p className="text-xs font-medium text-primary mt-0.5">Proposta: {formatFromUSD(app.proposed_price)}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                {app.status === 'pending' ? (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(app.id, 'accepted')} disabled={actionLoading === app.id}>
                      {actionLoading === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Aceitar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction(app.id, 'rejected')} disabled={actionLoading === app.id}>
                      <XCircle className="h-3 w-3" /> Recusar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onStartChat?.(app.creator_id)}>
                      <MessageSquare className="h-3 w-3" /> Chat
                    </Button>
                  </>
                ) : (
                  <Badge variant={app.status === 'accepted' ? 'default' : 'destructive'} className="text-[10px]">
                    {app.status === 'accepted' ? '✅ Aceite' : '❌ Recusado'}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
