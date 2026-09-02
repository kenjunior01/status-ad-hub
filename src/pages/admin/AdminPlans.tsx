import { useEffect, useState } from 'react'
import { Loader2, Save, DollarSign, Users, Smartphone, Eye, EyeOff, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAdminPlans, useUpdatePlan, type EditablePlan } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminPlans() {
  const { data: plans = [], isLoading } = useAdminPlans()
  const updatePlan = useUpdatePlan()
  const [drafts, setDrafts] = useState<Record<string, EditablePlan>>({})

  useEffect(() => {
    const d: Record<string, EditablePlan> = {}
    plans.forEach((p) => (d[p.id] = { ...p }))
    setDrafts(d)
  }, [plans])

  if (isLoading) {
    return <div className="py-20 text-center"><Loader2 className="h-6 w-6 text-[#D4AF37] animate-spin mx-auto" /></div>
  }

  function patch(id: string, changes: Partial<EditablePlan>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }))
  }

  function save(plan: EditablePlan) {
    updatePlan.mutate(drafts[plan.id], {
      onSuccess: () => toast.success(`Plano ${plan.name} actualizado`),
      onError: (e: any) => toast.error('Erro ao guardar', { description: e?.message }),
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <p className="text-[11px] text-white/40">
          Edita preços e limites — as mudanças reflectem-se de imediato na página <span className="text-[#D4AF37]">/planos</span> e no checkout.
          Em modo demo as alterações não persistem.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const d = drafts[plan.id]
          if (!d) return null
          const dirty = JSON.stringify(d) !== JSON.stringify(plan)
          return (
            <div key={plan.id} className={cn(
              'rounded-2xl border p-5 space-y-3.5',
              d.is_active ? 'border-white/[0.08] bg-white/[0.02]' : 'border-white/[0.04] bg-white/[0.01] opacity-70',
            )}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white">{plan.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => patch(plan.id, { is_active: !d.is_active })}
                    className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition',
                      d.is_active ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07]' : 'text-white/30 border-white/10')}
                  >
                    {d.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {d.is_active ? 'Activo' : 'Oculto'}
                  </button>
                </div>
              </div>

              <Field label="Preço MZN / mês" icon={DollarSign}>
                <Input type="number" value={d.price_mzn} disabled={plan.slug === 'free'}
                  onChange={(e) => patch(plan.id, { price_mzn: Number(e.target.value) })}
                  className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-lg" />
              </Field>
              <Field label="Preço USD (PayPal)" icon={DollarSign}>
                <Input type="number" step="0.01" value={d.price_usd} disabled={plan.slug === 'free'}
                  onChange={(e) => patch(plan.id, { price_usd: Number(e.target.value) })}
                  className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-lg" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Máx. contactos" icon={Users}>
                  <Input type="number" value={d.max_contacts}
                    onChange={(e) => patch(plan.id, { max_contacts: Number(e.target.value) })}
                    className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-lg" />
                </Field>
                <Field label="Máx. dispositivos" icon={Smartphone}>
                  <Input type="number" value={d.max_devices}
                    onChange={(e) => patch(plan.id, { max_devices: Number(e.target.value) })}
                    className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-sm rounded-lg" />
                </Field>
              </div>

              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">Features ({d.features.length})</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {d.features.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] text-white/50 border-white/10 gap-1 pr-1">
                      {f}
                      <button onClick={() => patch(plan.id, { features: d.features.filter((_, j) => j !== i) })} className="hover:text-red-400">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <AddFeature onAdd={(f) => patch(plan.id, { features: [...d.features, f] })} />
              </div>

              <Button
                onClick={() => save(plan)}
                disabled={!dirty || updatePlan.isPending}
                className={cn('w-full h-9 rounded-xl text-xs font-semibold gap-1.5',
                  dirty ? 'bg-[#D4AF37] hover:bg-[#B8962E] text-black' : 'bg-white/[0.04] text-white/30')}
              >
                {updatePlan.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {dirty ? 'Guardar alterações' : 'Sem alterações'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-white/35 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3" /> {label}
      </label>
      {children}
    </div>
  )
}

function AddFeature({ onAdd }: { onAdd: (f: string) => void }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-1.5">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && v.trim()) { onAdd(v.trim()); setV('') }
        }}
        placeholder="Nova feature…"
        className="h-8 text-[11px] bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-lg"
      />
      <Button size="sm" variant="ghost" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV('') } }}
        className="h-8 w-8 p-0 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg shrink-0">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
