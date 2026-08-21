import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Phone, Mail, Edit3, Trash2, Copy, Check, Link2, AlertCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SpotlightCard, BeamBorder, Shimmer } from '@/components/effects'

type Contact = { id: string; name: string; relation: string; phone: string; email: string; primary: boolean; alertEnabled: boolean }

const initialContacts: Contact[] = [
  { id: '1', name: 'Maria Silva', relation: 'Mae', phone: '+258 84 123 4567', email: 'maria@email.com', primary: true, alertEnabled: true },
  { id: '2', name: 'Joao Silva', relation: 'Irmao', phone: '+258 85 234 5678', email: 'joao@email.com', primary: false, alertEnabled: true },
  { id: '3', name: 'Ana Silva', relation: 'Esposa', phone: '+258 86 345 6789', email: 'ana@email.com', primary: false, alertEnabled: true },
  { id: '4', name: 'Pedro Santos', relation: 'Amigo', phone: '+258 87 456 7890', email: 'pedro@email.com', primary: false, alertEnabled: false },
]

export default function EmergencyContacts() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', relation: 'parente', primary: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t) }, [])

  const toggleAlert = (id: string) => setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, alertEnabled: !c.alertEnabled } : c)))
  const handleCopy = () => { navigator.clipboard.writeText('https://statusad.co/emergency/share/a1b2c3d4e5'); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handleAdd = () => {
    const relationMap: Record<string, string> = { parente: 'Parente', conjuge: 'Conjuge', amigo: 'Amigo', colega: 'Colega', outro: 'Outro' }
    setContacts((prev) => [...prev, { id: Date.now().toString(), ...form, relation: relationMap[form.relation] || form.relation, alertEnabled: true }])
    setForm({ name: '', phone: '', email: '', relation: 'parente', primary: false }); setShowAdd(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div><h1 className="font-display text-2xl font-bold text-white">Contactos de Emergencia</h1><p className="text-sm text-white/30 mt-1">Pessoas notificadas em caso de emergencia</p></div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white hover:shadow-[0_0_30px_-5px_rgba(37,211,102,0.3)] transition-all rounded-xl">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#25D366]/[0.05] border border-[#25D366]/15">
          <Shield className="h-5 w-5 text-[#25D366] shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-[#25D366]/70">Estes contactos serao notificados automaticamente quando activar o modo de emergencia.</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <SpotlightCard className="p-6">
              <h3 className="font-display text-base font-semibold text-white mb-4">Novo Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {[{ k: 'name', l: 'Nome Completo', p: 'Nome completo' }, { k: 'phone', l: 'Telefone', p: '+258 8X XXX XXXX' }, { k: 'email', l: 'Email', p: 'email@exemplo.com' }].map(f => (
                  <div key={f.k} className="space-y-1.5"><Label className="text-white/40 text-xs">{f.l}</Label><Input value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p} className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 rounded-xl" /></div>
                ))}
                <div className="space-y-1.5"><Label className="text-white/40 text-xs">Relacao</Label>
                  <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm px-3 outline-none focus:border-[#25D366]/30">
                    {[{ v: 'parente', l: 'Parente' }, { v: 'conjuge', l: 'Conjuge' }, { v: 'amigo', l: 'Amigo' }, { v: 'colega', l: 'Colega' }, { v: 'outro', l: 'Outro' }].map(o => <option key={o.v} value={o.v} className="bg-[#0D1321]">{o.l}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition', form.primary ? 'bg-[#25D366] border-[#25D366]' : 'border-white/15')} onClick={() => setForm({ ...form, primary: !form.primary })}>
                  {form.primary && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm text-white/50">Definir como contacto principal</span>
              </label>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white hover:bg-white/[0.04] rounded-xl">Cancelar</Button>
                <Button onClick={handleAdd} className="bg-[#25D366] hover:bg-[#1fb855] text-white rounded-xl">Guardar</Button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3 mb-8">
          {initialContacts.map((_, i) => (
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
      ) : (
      <div className="space-y-3 mb-8">
        {contacts.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            <SpotlightCard className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#25D366]/10 to-emerald-600/10 border border-[#25D366]/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#25D366] font-display">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-sm truncate text-white">{c.name}</p>
                  {c.primary && <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/15 font-medium"><Star className="h-2.5 w-2.5" />Principal</span>}
                </div>
                <p className="text-[11px] text-white/25 mt-0.5">{c.relation}</p>
                <span className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{c.phone}</span>
              </div>
              <button onClick={() => toggleAlert(c.id)} className="shrink-0">
                <div className={cn('w-10 h-5 rounded-full relative transition-colors duration-300', c.alertEnabled ? 'bg-[#25D366]' : 'bg-white/10')}>
                  <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: c.alertEnabled ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                </div>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button className="p-2 rounded-lg hover:bg-white/[0.04] transition"><Edit3 className="h-3.5 w-3.5 text-white/20 hover:text-white/60" /></button>
                <button className="p-2 rounded-lg hover:bg-red-500/[0.06] transition"><Trash2 className="h-3.5 w-3.5 text-white/20 hover:text-red-400" /></button>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
      )}

      {!loading && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <BeamBorder color="#3B82F6">
        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.06)" className="p-6">
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
    </div>
  )
}
