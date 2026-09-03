import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useDemoMode } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Ticket, Package, Plus, Copy, Download, Trash2, Sparkles, RefreshCw,
  Loader2, Ban, Tag, CheckCircle2, Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/**
 * AdminCodigos — Códigos de activação de dispositivos + Promoções.
 * Real: RLS de admin (migration 014) + RPC admin_generate_codes.
 * Demo: geração/lista local (localStorage) para poder demonstrar tudo.
 */

type Tab = 'codes' | 'promos'

interface ActivationCode {
  id?: string
  code: string
  device_type: string
  used: boolean
  activated_by?: string | null
  activated_at?: string | null
  created_at?: string
}

interface Promo {
  id: string
  code: string
  description: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  applies_to: 'any' | 'familia' | 'bellvion' | 'premium'
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at?: string
}

const MODELS: { id: string; label: string; prefix: string; desc: string }[] = [
  { id: 'glasses', label: 'Bellvion Glasses', prefix: 'BVG-', desc: 'Óculos inteligentes' },
  { id: 'watch', label: 'Bellvion Watch', prefix: 'BVW-', desc: 'Relógio SOS' },
  { id: 'earbuds', label: 'Bellvion Earbuds', prefix: 'BVB-', desc: 'Auscultadores' },
  { id: 'tracker', label: 'Bellvion Tracker', prefix: 'BVT-', desc: 'Rastreador' },
]

const CODE_LS = 'statusads-demo-admin-codes'
const PROMO_LS = 'statusads-demo-admin-promos'

function lsGet<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] }
}
function lsSet<T>(k: string, v: T[]): void {
  localStorage.setItem(k, JSON.stringify(v))
}

function randomCode(prefix: string): string {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n: number) => Array.from({ length: n }, () => cs[Math.floor(Math.random() * cs.length)]).join('')
  return `${prefix}${seg(4)}-${seg(4)}`
}

function suggestPromoCode(): string {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = Array.from({ length: 5 }, () => cs[Math.floor(Math.random() * cs.length)]).join('')
  return `PROMO-${seg}`
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const TYPE_LABELS: Record<string, string> = {
  glasses: 'Glasses', watch: 'Watch', earbuds: 'Earbuds', tracker: 'Tracker',
  bellvion: 'Bellvion', panic_button: 'Botão SOS', band: 'Band',
}
const PLAN_LABELS: Record<string, string> = {
  any: 'Qualquer plano', familia: 'Família', bellvion: 'Bellvion', premium: 'Premium',
}

export default function AdminCodigos() {
  const demo = useDemoMode()
  const [tab, setTab] = useState<Tab>('codes')
  const [loading, setLoading] = useState(false)

  // ── Códigos ──
  const [model, setModel] = useState('glasses')
  const [qty, setQty] = useState(10)
  const [generated, setGenerated] = useState<string[]>([])
  const [codes, setCodes] = useState<ActivationCode[]>([])
  const [filter, setFilter] = useState<'all' | 'free' | 'used'>('all')
  const [generating, setGenerating] = useState(false)

  // ── Promoções ──
  const [promos, setPromos] = useState<Promo[]>([])
  const [pCode, setPCode] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pType, setPType] = useState<'percent' | 'fixed'>('percent')
  const [pValue, setPValue] = useState('10')
  const [pPlan, setPPlan] = useState<Promo['applies_to']>('any')
  const [pMax, setPMax] = useState('')
  const [pExpiry, setPExpiry] = useState('')
  const [creating, setCreating] = useState(false)

  const loadCodes = useCallback(async () => {
    if (demo) { setCodes(lsGet<ActivationCode>(CODE_LS)); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('device_activation_codes')
      .select('id, code, device_type, used, activated_by, activated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      toast.error('Não foi possível carregar os códigos', { description: 'Aplique a migration 014 (TUDO.sql) no SQL Editor — cria as permissões de admin.' })
    } else {
      setCodes((data ?? []) as ActivationCode[])
    }
    setLoading(false)
  }, [demo])

  const loadPromos = useCallback(async () => {
    if (demo) { setPromos(lsGet<Promo>(PROMO_LS)); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      toast.error('Não foi possível carregar promoções', { description: 'Aplique a migration 014 (TUDO.sql) no SQL Editor.' })
    } else {
      setPromos((data ?? []) as Promo[])
    }
    setLoading(false)
  }, [demo])

  useEffect(() => { void loadCodes(); void loadPromos() }, [loadCodes, loadPromos])

  const filteredCodes = useMemo(() => {
    if (filter === 'free') return codes.filter((c) => !c.used)
    if (filter === 'used') return codes.filter((c) => c.used)
    return codes
  }, [codes, filter])

  const stats = useMemo(() => ({
    total: codes.length,
    free: codes.filter((c) => !c.used).length,
    used: codes.filter((c) => c.used).length,
  }), [codes])

  async function generate() {
    setGenerating(true)
    const m = MODELS.find((x) => x.id === model)!
    try {
      if (demo) {
        const fresh: ActivationCode[] = Array.from({ length: qty }, () => ({
          id: crypto.randomUUID(), code: randomCode(m.prefix), device_type: model, used: false,
          created_at: new Date().toISOString(),
        }))
        lsSet(CODE_LS, [...fresh, ...lsGet<ActivationCode>(CODE_LS)].slice(0, 2000))
        setCodes(lsGet<ActivationCode>(CODE_LS))
        setGenerated(fresh.map((f) => f.code))
        toast.success(`${qty} códigos gerados (demo local)`)
        setGenerating(false)
        return
      }
      const { data, error } = await supabase.rpc('admin_generate_codes', { p_model: model, p_quantity: qty })
      if (error) {
        const c = (error as { code?: string }).code ?? ''
        if (c === 'PGRST202' || error.message.includes('Could not find the function')) {
          toast.error('Servidor sem o gerador de códigos', { description: 'Aplique a migration 014 (TUDO.sql) no SQL Editor do Supabase.' })
        } else if (error.message.includes('Not authorized')) {
          toast.error('Apenas administradores geram códigos.')
        } else {
          toast.error('Erro ao gerar códigos', { description: error.message })
        }
        setGenerating(false)
        return
      }
      const rows = (data ?? []) as { code: string; device_type: string }[]
      setGenerated(rows.map((r) => r.code))
      toast.success(`${rows.length} códigos gerados e guardados no servidor`)
      await loadCodes()
    } finally {
      setGenerating(false)
    }
  }

  async function revokeCode(code: string) {
    if (!confirm(`Revogar o código ${code}? Quem o tiver deixará de o conseguir usar.`)) return
    if (demo) {
      lsSet(CODE_LS, lsGet<ActivationCode>(CODE_LS).filter((c) => c.code !== code))
      setCodes(lsGet<ActivationCode>(CODE_LS))
      setGenerated((g) => g.filter((x) => x !== code))
      toast.success('Código revogado (demo)')
      return
    }
    const { error } = await supabase.from('device_activation_codes').delete().eq('code', code).eq('used', false)
    if (error) {
      toast.error('Não foi possível revogar', { description: error.message })
    } else {
      toast.success(`Código ${code} revogado`)
      await loadCodes()
    }
  }

  async function createPromo() {
    const value = parseFloat(pValue.replace(',', '.'))
    const code = pCode.trim().toUpperCase().replace(/\s/g, '')
    if (code.length < 3) { toast.error('Código demasiado curto (mín. 3 caracteres)'); return }
    if (!value || value <= 0) { toast.error('Indique o valor do desconto'); return }
    if (pType === 'percent' && value > 100) { toast.error('Percentagem não pode passar de 100'); return }
    setCreating(true)
    const row = {
      code,
      description: pDesc.trim(),
      discount_type: pType,
      discount_value: value,
      applies_to: pPlan,
      max_uses: pMax.trim() ? parseInt(pMax, 10) : null,
      expires_at: pExpiry ? new Date(`${pExpiry}T23:59:59`).toISOString() : null,
      is_active: true,
    }
    try {
      if (demo) {
        const rec: Promo = { id: crypto.randomUUID(), used_count: 0, ...row } as Promo
        lsSet(PROMO_LS, [rec, ...lsGet<Promo>(PROMO_LS)])
        setPromos(lsGet<Promo>(PROMO_LS))
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('promo_codes').insert({ ...row, created_by: user?.id ?? null })
        if (error) {
          if (error.code === '42501') {
            toast.error('Sem permissão de admin no servidor', { description: 'Confirme que a sua conta tem role admin e que a migration 014 foi aplicada.' })
          } else if (error.code === '23505') {
            toast.error('Já existe uma promoção com esse código')
          } else {
            toast.error('Erro ao criar promoção', { description: error.message })
          }
          setCreating(false)
          return
        }
        await loadPromos()
      }
      toast.success(`Promoção ${code} criada — já pode ser usada no checkout`)
      setPCode(''); setPDesc(''); setPMax(''); setPExpiry('')
    } finally {
      setCreating(false)
    }
  }

  async function togglePromo(p: Promo) {
    if (demo) {
      const all = lsGet<Promo>(PROMO_LS).map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      lsSet(PROMO_LS, all); setPromos(all)
      return
    }
    const { error } = await supabase.from('promo_codes').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) toast.error('Erro ao actualizar', { description: error.message })
    else await loadPromos()
  }

  async function deletePromo(p: Promo) {
    if (!confirm(`Eliminar a promoção ${p.code}? Os utilizadores deixarão de a poder usar.`)) return
    if (demo) {
      lsSet(PROMO_LS, lsGet<Promo>(PROMO_LS).filter((x) => x.id !== p.id))
      setPromos(lsGet<Promo>(PROMO_LS))
      toast.success('Promoção eliminada (demo)')
      return
    }
    const { error } = await supabase.from('promo_codes').delete().eq('id', p.id)
    if (error) toast.error('Erro ao eliminar', { description: error.message })
    else { toast.success('Promoção eliminada'); await loadPromos() }
  }

  function copyAll(list: string[]) {
    navigator.clipboard.writeText(list.join('\n')).then(
      () => toast.success(`${list.length} códigos copiados`),
      () => toast.error('Erro ao copiar'),
    )
  }

  const modelObj = MODELS.find((m) => m.id === model)!

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-white">Códigos & Promoções</h2>
          <p className="text-[11px] text-white/40 mt-0.5">
            Gere códigos para as caixas dos dispositivos BELLVION e crie campanhas de desconto.
          </p>
        </div>
        {/* Tabs internas */}
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
          {([['codes', 'Códigos', Package], ['promos', 'Promoções', Tag]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                tab === id ? 'bg-brand/[0.15] text-brand' : 'text-white/40 hover:text-white/70',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {demo && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Modo demo — os dados ficam apenas neste dispositivo. Aplique a migration 014
            (<span className="font-mono text-brand">TUDO.sql</span>) para gerir códigos reais no servidor.
          </p>
        </div>
      )}

      {/* ══════════ TAB: CÓDIGOS DE DISPOSITIVO ══════════ */}
      {tab === 'codes' && (
        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-3">
            {([['Total', stats.total], ['Livres', stats.free], ['Usados', stats.used]] as const).map(([label, v], i) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <p className={cn('font-display font-bold text-xl', i === 1 ? 'text-emerald-400' : i === 2 ? 'text-white/50' : 'text-brand')}>{v}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Gerador */}
          <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/[0.05] to-transparent p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-white">Gerar códigos de activação</p>
                <p className="text-[10px] text-white/40">Um código por caixa — activa o plano Bellvion em /ativar</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Modelo do dispositivo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={cn(
                        'rounded-lg border px-2.5 py-2 text-left transition',
                        model === m.id
                          ? 'border-brand/40 bg-brand/[0.1]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20',
                      )}
                    >
                      <p className={cn('text-[11px] font-semibold', model === m.id ? 'text-brand' : 'text-white/70')}>{m.label}</p>
                      <p className="text-[9px] font-mono text-white/30">{m.prefix}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Quantidade</label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 20, 50, 100, 200].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQty(n)}
                      className={cn(
                        'h-9 min-w-11 px-2 rounded-lg border text-xs font-semibold transition',
                        qty === n ? 'border-brand/40 bg-brand/[0.12] text-brand' : 'border-white/[0.07] bg-white/[0.02] text-white/50 hover:text-white',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => void generate()}
              disabled={generating}
              className="w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-black font-bold text-sm gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? 'A gerar…' : `Gerar ${qty} códigos ${modelObj.prefix}`}
            </Button>

            {/* Códigos recém-gerados */}
            {generated.length > 0 && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {generated.length} novos códigos — imprima e cole nas caixas
                  </p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => copyAll(generated)} className="h-7 px-2.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10 gap-1">
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => downloadCsv(`codigos-${model}-${Date.now()}.csv`, [['codigo', 'modelo'], ...generated.map((c) => [c, model])])}
                      className="h-7 px-2.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10 gap-1"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto">
                  {generated.map((c) => (
                    <span key={c} className="font-mono text-[11px] text-white/80 bg-black/30 border border-white/[0.06] rounded-lg px-2 py-1.5 text-center">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista de códigos existentes */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <p className="font-display font-bold text-sm text-white">Códigos existentes</p>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-lg bg-black/30 border border-white/[0.06] p-0.5">
                  {([['all', 'Todos'], ['free', 'Livres'], ['used', 'Usados']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setFilter(id)}
                      className={cn('px-2.5 py-1 rounded-md text-[10px] font-medium transition', filter === id ? 'bg-brand/[0.15] text-brand' : 'text-white/35 hover:text-white/60')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => void loadCodes()} className="h-7 w-7 p-0 text-white/40 hover:text-brand">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center"><Loader2 className="h-5 w-5 text-brand animate-spin mx-auto" /></div>
            ) : filteredCodes.length === 0 ? (
              <p className="text-xs text-white/30 py-8 text-center">Sem códigos neste filtro — gere os primeiros acima.</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {filteredCodes.map((c) => (
                  <div key={c.code} className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                    <span className="font-mono text-xs text-white/85 flex-1 min-w-0 truncate">{c.code}</span>
                    <Badge variant="outline" className="text-[9px] text-white/40 border-white/10 shrink-0">
                      {TYPE_LABELS[c.device_type] ?? c.device_type}
                    </Badge>
                    {c.used ? (
                      <Badge className="bg-white/[0.06] text-white/40 border border-white/[0.08] text-[9px] shrink-0">USADO</Badge>
                    ) : (
                      <>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] shrink-0">LIVRE</Badge>
                        <button onClick={() => void revokeCode(c.code)} className="h-6 w-6 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 shrink-0" title="Revogar código">
                          <Ban className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TAB: PROMOÇÕES ══════════ */}
      {tab === 'promos' && (
        <div className="space-y-4">
          {/* Criar promoção */}
          <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/[0.05] to-transparent p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Ticket className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-white">Criar promoção</p>
                <p className="text-[10px] text-white/40">Aparece no checkout — o utilizador insere o código antes de pagar</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Código *</label>
                <div className="flex gap-1.5">
                  <Input
                    value={pCode}
                    onChange={(e) => setPCode(e.target.value.toUpperCase())}
                    placeholder="EX: VERAO2026"
                    className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10 flex-1"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setPCode(suggestPromoCode())} className="h-10 px-2.5 text-white/40 hover:text-brand" title="Sugerir código">
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Descrição (interna)</label>
                <Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Ex: Campanha de Janeiro" className="bg-black/30 border-white/[0.08] text-white text-xs h-10" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Tipo de desconto *</label>
                <div className="flex gap-1.5">
                  {([['percent', 'Percentagem %'], ['fixed', 'Valor fixo (MT)']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setPType(id)}
                      className={cn(
                        'flex-1 h-10 rounded-lg border text-xs font-medium transition',
                        pType === id ? 'border-brand/40 bg-brand/[0.1] text-brand' : 'border-white/[0.07] bg-white/[0.02] text-white/50 hover:text-white',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Valor do desconto * {pType === 'percent' ? '(0–100)' : '(em MT)'}</label>
                <Input
                  value={pValue}
                  onChange={(e) => setPValue(e.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Aplica-se a</label>
                <select
                  value={pPlan}
                  onChange={(e) => setPPlan(e.target.value as Promo['applies_to'])}
                  className="w-full h-10 rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2.5 outline-none focus:border-brand/40"
                >
                  <option value="any">Qualquer plano</option>
                  <option value="familia">Família</option>
                  <option value="bellvion">Bellvion (99 MT)</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Usos máximos (opcional)</label>
                <Input value={pMax} onChange={(e) => setPMax(e.target.value.replace(/\D/g, ''))} placeholder="Ex: 100" inputMode="numeric" className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50">Validade (opcional)</label>
                <Input type="date" value={pExpiry} onChange={(e) => setPExpiry(e.target.value)} className="bg-black/30 border-white/[0.08] text-white text-xs h-10 [color-scheme:dark]" />
              </div>
            </div>

            <Button
              onClick={() => void createPromo()}
              disabled={creating || !pCode.trim() || !pValue}
              className="w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-black font-bold text-sm gap-2 disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar promoção
            </Button>
          </div>

          {/* Lista de promoções */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-bold text-sm text-white">Promoções ({promos.length})</p>
              <Button size="sm" variant="ghost" onClick={() => void loadPromos()} className="h-7 w-7 p-0 text-white/40 hover:text-brand">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {promos.length === 0 ? (
              <p className="text-xs text-white/30 py-8 text-center">Sem promoções criadas — crie a primeira acima.</p>
            ) : (
              <div className="space-y-2">
                {promos.map((p) => {
                  const expired = p.expires_at && new Date(p.expires_at) < new Date()
                  const exhausted = p.max_uses != null && p.used_count >= p.max_uses
                  const dead = expired || exhausted
                  return (
                    <div key={p.id} className={cn(
                      'rounded-xl border px-4 py-3 space-y-2',
                      p.is_active && !dead ? 'border-brand/20 bg-brand/[0.04]' : 'border-white/[0.06] bg-black/20 opacity-70',
                    )}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-brand">{p.code}</span>
                        <Badge className={cn('text-[9px] border', p.is_active && !dead
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-white/[0.05] text-white/40 border-white/10')}>
                          {dead ? (expired ? 'EXPIRADA' : 'ESGOTADA') : p.is_active ? 'ACTIVA' : 'PAUSADA'}
                        </Badge>
                        <span className="flex-1" />
                        <span className="text-[11px] text-white/50">
                          {p.discount_type === 'percent' ? `−${p.discount_value}%` : `−${p.discount_value} MT`}
                          {' · '}{PLAN_LABELS[p.applies_to] ?? p.applies_to}
                        </span>
                      </div>
                      {p.description && <p className="text-[10px] text-white/35">{p.description}</p>}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-32">
                          <div className="h-1.5 rounded-full bg-white/[0.06] flex-1 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${p.max_uses ? Math.min(100, (p.used_count / p.max_uses) * 100) : p.used_count > 0 ? 12 : 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-white/40 font-mono">{p.used_count}/{p.max_uses ?? '∞'}</span>
                        </div>
                        {p.expires_at && (
                          <span className={cn('text-[10px]', expired ? 'text-red-400' : 'text-white/30')}>
                            até {new Date(p.expires_at).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => void togglePromo(p)} className={cn('text-[10px] px-2.5 py-1 rounded-lg border transition font-medium', p.is_active ? 'border-white/10 text-white/50 hover:text-white' : 'border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10')}>
                            {p.is_active ? 'Pausar' : 'Reactivar'}
                          </button>
                          <button onClick={() => void deletePromo(p)} className="h-6 w-6 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10" title="Eliminar">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
