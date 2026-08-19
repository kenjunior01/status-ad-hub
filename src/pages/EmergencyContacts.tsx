import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Shield,
  ShieldCheck,
  Pencil,
  Trash2,
  Link2,
  Copy,
  Check,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relation: string;
  isPrimary: boolean;
  receivesAlerts: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '+258 84 123 4567',
    email: 'maria@email.com',
    relation: 'Mãe',
    isPrimary: true,
    receivesAlerts: true,
  },
  {
    id: '2',
    name: 'João Silva',
    phone: '+258 85 987 6543',
    email: 'joao@email.com',
    relation: 'Irmão',
    isPrimary: false,
    receivesAlerts: true,
  },
  {
    id: '3',
    name: 'Ana Silva',
    phone: '+258 86 555 1234',
    email: 'ana@email.com',
    relation: 'Esposa',
    isPrimary: false,
    receivesAlerts: true,
  },
  {
    id: '4',
    name: 'Pedro Machava',
    phone: '+258 82 777 8899',
    email: 'pedro@email.com',
    relation: 'Amigo',
    isPrimary: false,
    receivesAlerts: false,
  },
];

// ─── Stagger Animation ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// ─── Avatar Colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-[#25D366]/20 text-[#25D366]',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRelation, setFormRelation] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);

  const toggleAlerts = (id: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, receivesAlerts: !c.receivesAlerts } : c
      )
    );
  };

  const handleDelete = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddContact = () => {
    if (!formName || !formPhone) return;
    const newContact: Contact = {
      id: String(Date.now()),
      name: formName,
      phone: formPhone,
      email: formEmail,
      relation: formRelation,
      isPrimary: formIsPrimary,
      receivesAlerts: true,
    };
    if (formIsPrimary) {
      setContacts((prev) =>
        [newContact, ...prev.map((c) => ({ ...c, isPrimary: false }))]
      );
    } else {
      setContacts((prev) => [...prev, newContact]);
    }
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormRelation('');
    setFormIsPrimary(false);
    setShowAddForm(false);
  };

  const handleGenerateLink = () => {
    const fakeId = Math.random().toString(36).slice(2, 10);
    setGeneratedLink(
      `${window.location.origin}/police-access/${fakeId}?expires=24h`
    );
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#0A0F1A] text-white">
      {/* ═══ INLINE STYLES ═══ */}
      <style>{`
        .glass {
          background: rgba(10, 15, 26, 0.75);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-hover:hover {
          background: rgba(10, 15, 26, 0.85);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header className="glass fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">
            Contactos de Emergência
          </h1>
        </div>
        <Button
          variant="safe"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar Contacto
        </Button>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-12 md:px-6">
        {/* ─── Info Banner ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="glass border-[#25D366]/20 bg-[#25D366]/[0.04]">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15">
                <Shield className="h-5 w-5 text-[#25D366]" />
              </div>
              <p className="text-sm leading-relaxed text-white/70">
                Estes contactos serão notificados automaticamente em caso de
                emergência. Pode activar ou desactivar alertas individuais para
                cada contacto.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Add Contact Form ─── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <Card className="glass border-[#25D366]/15">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Novo Contacto de Emergência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm text-white/60">Nome</Label>
                      <Input
                        placeholder="Nome completo"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-[#25D366]/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-white/60">
                        Telefone
                      </Label>
                      <Input
                        placeholder="+258 84 XXX XXXX"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-[#25D366]/40"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm text-white/60">Email</Label>
                      <Input
                        placeholder="email@exemplo.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-[#25D366]/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-white/60">
                        Relação
                      </Label>
                      <select
                        value={formRelation}
                        onChange={(e) => setFormRelation(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40"
                      >
                        <option value="" className="bg-[#0A0F1A]">
                          Seleccionar...
                        </option>
                        <option value="Mãe" className="bg-[#0A0F1A]">
                          Mãe
                        </option>
                        <option value="Pai" className="bg-[#0A0F1A]">
                          Pai
                        </option>
                        <option value="Irmão" className="bg-[#0A0F1A]">
                          Irmão
                        </option>
                        <option value="Irmã" className="bg-[#0A0F1A]">
                          Irmã
                        </option>
                        <option value="Esposa" className="bg-[#0A0F1A]">
                          Esposa
                        </option>
                        <option value="Marido" className="bg-[#0A0F1A]">
                          Marido
                        </option>
                        <option value="Amigo" className="bg-[#0A0F1A]">
                          Amigo
                        </option>
                        <option value="Outro" className="bg-[#0A0F1A]">
                          Outro
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsPrimary(!formIsPrimary)}
                      className={cn(
                        'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                        formIsPrimary ? 'bg-[#25D366]' : 'bg-white/15'
                      )}
                    >
                      <motion.div
                        className="h-4 w-4 rounded-full bg-white shadow"
                        animate={{ x: formIsPrimary ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                    <Label className="text-sm text-white/60">
                      Contacto Principal
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      className="text-white/50 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button variant="safe" size="sm" onClick={handleAddContact}>
                      Guardar Contacto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Contact List ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {contacts.map((contact, idx) => (
            <motion.div key={contact.id} variants={item}>
              <Card className="glass glass-hover border-white/[0.06] transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      AVATAR_COLORS[idx % AVATAR_COLORS.length]
                    )}
                  >
                    {getInitials(contact.name)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-white">
                        {contact.name}
                      </span>
                      {contact.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-semibold text-[#25D366]">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-white/40">
                      {contact.phone}
                    </p>
                    <p className="text-[11px] text-white/25">
                      {contact.relation}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Toggle alerts */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-white/30">
                        Recebe alertas
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAlerts(contact.id)}
                        className={cn(
                          'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                          contact.receivesAlerts
                            ? 'bg-[#25D366]'
                            : 'bg-white/15'
                        )}
                      >
                        <motion.div
                          className="h-4 w-4 rounded-full bg-white shadow"
                          animate={{
                            x: contact.receivesAlerts ? 16 : 0,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      </button>
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex gap-1">
                      <button className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="rounded-lg p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {contacts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 flex flex-col items-center gap-3 text-center"
          >
            <User className="h-12 w-12 text-white/10" />
            <p className="text-sm text-white/30">
              Nenhum contacto de emergência
            </p>
          </motion.div>
        )}

        {/* ─── Police Share Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10"
        >
          <Card className="glass overflow-hidden border-blue-500/20 bg-blue-500/[0.03]">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                  <ShieldCheck className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      Partilha Policial
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">
                      Gere um link temporário para partilhar com as autoridades.
                      O link expira automaticamente após 24 horas e concede
                      acesso apenas à sua localização actual e histórico recente.
                    </p>
                  </div>

                  {generatedLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.05] px-3 py-2">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                        <p className="truncate text-xs text-blue-300/70">
                          {generatedLink}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyLink}
                          className="h-8 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                        >
                          {copied ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              Copiar Link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setGeneratedLink(null)}
                          className="h-8 text-xs text-white/30 hover:text-white/60"
                        >
                          Gerar novo link
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleGenerateLink}
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      <ShieldCheck className="mr-1.5 h-4 w-4" />
                      Gerar Link de Acesso
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
