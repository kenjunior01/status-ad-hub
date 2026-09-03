import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Phone, Mail, Edit3, Trash2, Copy, Check, Link2, AlertCircle, Star, Loader2, Users, Briefcase, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useContacts } from '@/hooks/useContacts'
import { usePlanState, usePlans } from '@/hooks/useSubscription'
import { CheckoutDialog } from '@/components/CheckoutDialog'
import { SpotlightCard, BeamBorder, Shimmer } from '@/components/effects'
import type { ContactRelation } from '@/lib/types'
import { toast } from 'sonner'

const relationLabels: Record<string, string> = {
  parente: 'Parente', conjuge: 'Conjuge', amigo: 'Amigo', colega: 'Colega', outro: 'Outro',
}

type ContactGroup = 'todos' | 'familia' | 'trabalho' | 'amigos'

const groupFilters: { key: ContactGroup; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'familia', label: 'Familia' },
  { key: 'trabalho', label: 'Trabalho' },
  { key: 'amigos', label: 'Amigos' },
]

const groupConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  familia: { label: 'Familia', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  trabalho: { label: 'Trabalho', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  amigos: { label: 'Amigos', color: 'text-amber-300', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
}

const groupOptions: { value: string; label: string }[] = [
  { value: 'familia', label: 'Familia' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'amigos', label: 'Amigos' },
]

export default function EmergencyContacts() {
  const { user } = useAuth()
  const { contacts, loading, addContact, updateContact, toggleAlert, deleteContact, isAdding } = useContacts()
  const { state } = usePlanState()
  const { data: plans = [] } = usePlans()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<ContactGroup>('todos')
  const [form, setForm] = useState({ name: '', phone: '', email: '', relation: 'parente' as ContactRelation, group: 'familia', primary: false })

  const handleToggleAlert = (id: string, current: boolean) => {
    toggleAlert({ id, enabled: !current })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText('https://statusad.co/emergency/share/' + (user?.id || 'a1b2c3d4e5'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => setForm({ name: '', phone: '', email: '', relation: 'parente', group: 'familia', primary: false })

  const handleAdd = () => {
    if (!form.name.trim() || !form.phone.trim()) return
    // Gating por plano: limite de contactos
    const max = state?.plan.max_contacts ?? 2
    if (contacts.length >= max) {
      toast.error(`Limite do plano ${state?.plan.name} atingido`, {
        description: `O plano ${state?.plan.name} permite ${max >= 99 ? 'contactos ilimitados' : `${max} contactos`}. Faz upgrade para adicionar mais.`,
        action: { label: 'Ver planos', onClick: () => setUpgradeOpen(true) },
      })
      return
    }
    addContact({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      relation: form.relation,
      group: form.group,
      is_primary: form.primary,
    }, {
      onSuccess: () => { resetForm(); setShowAdd(false) },
    })
  }

  const handleDelete = (id: string) => {
    deleteContact(id)
  }

  const handleEdit = (contact: typeof contacts[0]) => {
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relation: contact.relation,
      group: contact.group || 'familia',
      primary: contact.is_primary,
    })
    setEditId(contact.id)
    setShowAdd(true)
  }

  const handleSaveEdit = () => {
    if (!form.name.trim() || !form.phone.trim() || !editId) return
    updateContact({
      id: editId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      relation: form.relation,
      group: form.group,
      is_primary: form.primary,
    }, {
      onSuccess: () => {
        setEditId(null)
        resetForm()
        setShowAdd(false)
      },
    })
  }

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (activeGroup === 'todos') return contacts
    return contacts.filter(c => (c as any).group === activeGroup || (!c.group && activeGroup === 'familia'))
  }, [contacts, activeGroup])

  // Grouped contacts for "todos" view
  const groupedContacts = useMemo(() => {
    if (activeGroup !== 'todos') return { groups: [] as { key: string; config: typeof groupConfig[string]; contacts: typeof contacts }[], ungrouped: [] as typeof contacts }
    const groups: { key: string; config: typeof groupConfig[string]; contacts: typeof contacts }[] = []
    const ungrouped: typeof contacts = []
    const seen = new Set<string>()
    for (const g of ['familia', 'trabalho', 'amigos'] as const) {
      const members = contacts.filter(c => (c as any).group === g)
      if (members.length > 0) {
        groups.push({ key: g, config: groupConfig[g], contacts: members })
        members.forEach(c => seen.add(c.id))
      }
    }
    contacts.forEach(c => {
      if (!seen.has(c.id)) ungrouped.push(c)
    })
    return { groups, ungrouped }
  }, [contacts, activeGroup])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div><h1 className="font-display text-2xl font-bold text-white">Contactos de Emergencia</h1><p className="text-sm text-white/30 mt-1">Pessoas notificadas em caso de emergencia</p></div>
        <Button onClick={() => { resetForm(); setEditId(null); setShowAdd(!showAdd) }} className="gap-2 bg-brand hover:bg-brand-dark text-white hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.3)] transition-all rounded-xl">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand/[0.05] border border-brand/15">
          <Shield className="h-5 w-5 text-brand shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-brand/70">Estes contactos serao notificados automaticamente quando activar o modo de emergencia.</p>
        </div>
      </motion.div>

      {/* Group Filter Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {groupFilters.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
              activeGroup === g.key
                ? 'bg-brand/10 border-brand/25 text-brand'
                : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <SpotlightCard className="p-6">
              <h3 className="font-display text-base font-semibold text-white mb-4">{editId ? 'Editar Contacto' : 'Novo Contacto'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {[{ k: 'name', l: 'Nome Completo', p: 'Nome completo' }, { k: 'phone', l: 'Telefone', p: '+258 8X XXX XXXX' }, { k: 'email', l: 'Email', p: 'email@exemplo.com' }].map(f => (
                  <div key={f.k} className="space-y-1.5"><Label className="text-white/40 text-xs">{f.l}</Label><Input value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p} className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 rounded-xl" /></div>
                ))}
                <div className="space-y-1.5"><Label className="text-white/40 text-xs">Relacao</Label>
                  <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value as ContactRelation })} className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 outline-none focus:border-brand/30">
                    {Object.entries(relationLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#0D1321]">{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-white/40 text-xs">Grupo</Label>
                  <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 outline-none focus:border-brand/30">
                    {groupOptions.map(g => <option key={g.value} value={g.value} className="bg-[#0D1321]">{g.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition', form.primary ? 'bg-brand border-brand' : 'border-white/15')} onClick={() => setForm({ ...form, primary: !form.primary })}>
                  {form.primary && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm text-white/50">Definir como contacto principal</span>
              </label>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowAdd(false); setEditId(null); resetForm() }} className="text-white/30 hover:text-white hover:bg-white/[0.04] rounded-xl">Cancelar</Button>
                <Button onClick={editId ? handleSaveEdit : handleAdd} disabled={isAdding} className="bg-brand hover:bg-brand-dark text-white rounded-xl gap-2">
                  {(isAdding || (editId)) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editId ? 'Guardar' : 'Adicionar'}
                </Button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Shimmer className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-4 w-36 rounded-lg" />
                <Shimmer className="h-3 w-24 rounded-lg" />
              </div>
              <Shimmer className="h-5 w-10 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="h-12 w-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum contacto de emergencia</p>
          <p className="text-xs text-white/15 mt-1">Adicione contactos para serem notificados em emergencias</p>
        </div>
      ) : (
      <div className="space-y-3 mb-8">
        {activeGroup === 'todos' ? (
          <>
            {groupedContacts.groups.map(group => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                  <div className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium', group.config.bg, group.config.border, group.config.color)}>
                    {group.config.label}
                  </div>
                  <div className="flex-1 h-px bg-white/[0.04]" />\n                  <span className="text-[10px] text-white/15">{group.contacts.length}</span>
                </div>
                {group.contacts.map((c, i) => (
                  <ContactCard key={c.id} contact={c} index={i} onToggleAlert={handleToggleAlert} onEdit={handleEdit} onDelete={handleDelete} editId={editId} />
                ))}
              </div>
            ))}
            {groupedContacts.ungrouped.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <div className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/30">
                    Sem grupo
                  </div>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-[10px] text-white/15">{groupedContacts.ungrouped.length}</span>
                </div>
                {groupedContacts.ungrouped.map((c, i) => (
                  <ContactCard key={c.id} contact={c} index={i} onToggleAlert={handleToggleAlert} onEdit={handleEdit} onDelete={handleDelete} editId={editId} />
                ))}
              </div>
            )}
          </>
        ) : (
          filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-white/20">Nenhum contacto neste grupo</p>
            </div>
          ) : (
            filteredContacts.map((c, i) => (
              <ContactCard key={c.id} contact={c} index={i} onToggleAlert={handleToggleAlert} onEdit={handleEdit} onDelete={handleDelete} editId={editId} />
            ))
          )
        )}
      </div>
      )}

      {!loading && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <BeamBorder color="#3B82F6">
        <SpotlightCard spotlightColor="rgba(212, 175, 55, 0.06)" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/15"><AlertCircle className="h-5 w-5 text-blue-400" strokeWidth={1.5} /></div>
            <div><h3 className="font-display text-base font-semibold text-white">Partilha com Autoridades</h3><p className="text-[11px] text-white/25 mt-0.5">Gere um link temporario para a policia.</p></div>
          </div>
          <Button variant="outline" onClick={handleCopy} className="gap-2 border-blue-500/20 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/[0.06] rounded-xl">
            {copied ? <><Check className="h-4 w-4" />Link Copiado!</> : <><Link2 className="h-4 w-4" />Gerar Link de Acesso</>}
          </Button>
        </SpotlightCard>
        </BeamBorder>
      </motion.div>
      )}
      <CheckoutDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} plan={plans.find((p) => p.slug === 'familia') ?? null} />
    </div>
  )
}

// ============================================
// CONTACT CARD COMPONENT
// ============================================
function ContactCard({
  contact,
  index,
  onToggleAlert,
  onEdit,
  onDelete,
  editId,
}: {
  contact: any
  index: number
  onToggleAlert: (id: string, current: boolean) => void
  onEdit: (contact: any) => void
  onDelete: (id: string) => void
  editId: string | null
}) {
  const c = contact as any
  const gConf = c.group ? groupConfig[c.group] : null

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
      <SpotlightCard className="p-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand/10 to-amber-500/10 border border-brand/15 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand font-display">{c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-semibold text-sm truncate text-white">{c.name}</p>
            {c.is_primary && <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/15 font-medium"><Star className="h-2.5 w-2.5" />Principal</span>}
            {gConf && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md border font-medium', gConf.bg, gConf.border, gConf.color)}>
                {gConf.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/25 mt-0.5">{relationLabels[c.relation] || c.relation}</p>
          <span className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{c.phone}</span>
        </div>
        <button onClick={() => onToggleAlert(c.id, c.alert_enabled)} className="shrink-0">
          <div className={cn('w-10 h-5 rounded-full relative transition-colors duration-300', c.alert_enabled ? 'bg-brand' : 'bg-white/10')}>
            <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: c.alert_enabled ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onEdit(c)} disabled={editId === c.id} className="p-2 rounded-lg hover:bg-white/[0.04] transition disabled:opacity-30"><Edit3 className="h-3.5 w-3.5 text-white/20 hover:text-white/60" /></button>
          <button onClick={() => onDelete(c.id)} className="p-2 rounded-lg hover:bg-red-500/[0.06] transition"><Trash2 className="h-3.5 w-3.5 text-white/20 hover:text-red-400" /></button>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}