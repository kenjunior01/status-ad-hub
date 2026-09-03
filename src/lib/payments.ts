// ============================================================
// payments.ts — Tipos, planos e API de pagamentos/assinaturas.
// Funciona em dois modos:
//  • REAL: tabelas plans/payments/subscriptions no Supabase
//    (executar supabase/migrations/009_payments_subscriptions.sql)
//  • DEMO: fallback automático em localStorage quando as tabelas
//    ainda não existem — todo o fluxo funciona de imediato.
// ============================================================
import { supabase } from '@/lib/supabase'

// ── Tipos ──
export type PlanSlug = 'free' | 'familia' | 'bellvion' | 'premium'
export type PaymentMethod = 'mpesa' | 'emola' | 'mkesh' | 'paypal' | 'manual' | 'bank'
export type PaymentStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled' | 'refunded'

export interface Plan {
  id?: string
  slug: PlanSlug
  name: string
  description?: string
  price_mzn: number
  price_usd: number
  max_contacts: number
  max_devices: number
  features: string[]
  is_active?: boolean
  popular?: boolean
}

export interface Payment {
  id: string
  reference: string
  amount: number
  currency: string
  method: PaymentMethod
  phone?: string | null
  status: PaymentStatus
  plan_slug?: string | null
  provider_ref?: string | null
  note?: string | null
  payer_name?: string | null
  promo_code?: string | null
  created_at: string
  confirmed_at?: string | null
}

export interface Subscription {
  id: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  plan_slug?: PlanSlug | null
  plan_id?: string | null
  provider?: string | null
  starts_at: string
  expires_at?: string | null
  auto_renew: boolean
}

// ── Planos de fallback (espelham o seed da migration 009) ──
export const FALLBACK_PLANS: Plan[] = [
  {
    slug: 'free',
    name: 'Grátis',
    description: 'O essencial para a sua segurança diária',
    price_mzn: 0,
    price_usd: 0,
    max_contacts: 2,
    max_devices: 1,
    features: [
      'Botão SOS instantâneo',
      '2 contactos de emergência',
      'Check-in programado',
      'Histórico de 7 dias',
      '1 dispositivo BLE',
      'Notificações push',
    ],
  },
  {
    slug: 'familia',
    name: 'Família',
    description: 'Protecção completa para toda a família',
    price_mzn: 249,
    price_usd: 3.99,
    max_contacts: 6,
    max_devices: 3,
    popular: true,
    features: [
      'Tudo do plano Grátis',
      '6 contactos de emergência',
      'Rastreamento de viagens',
      'Modo discreto (3 disfarces)',
      'Alertas por SMS aos contactos',
      'Rota segura com GPS',
      '3 dispositivos BLE',
      'Suporte prioritário',
    ],
  },
  {
    slug: 'bellvion',
    name: 'Bellvion',
    description: 'Preço exclusivo para quem tem um dispositivo BELLVION',
    price_mzn: 99,
    price_usd: 1.59,
    max_contacts: 6,
    max_devices: 5,
    features: [
      'Tudo do plano Família',
      'Preço reduzido — 60% de desconto para sempre',
      'SOS pelo botão do dispositivo BELLVION',
      'Detecção de queda do BELLVION Watch',
      'Gravação de evidências pelos BELLVION Glasses',
      '6 contactos de emergência',
      '5 dispositivos BLE (da marca ou outros)',
      'Suporte prioritário da marca',
    ],
  },
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Segurança máxima, sem limites',
    price_mzn: 499,
    price_usd: 7.99,
    max_contacts: 99,
    max_devices: 10,
    features: [
      'Tudo do plano Família',
      'Contactos ilimitados',
      '11 disfarces de camuflagem',
      'Gravação automática de evidências',
      'Óculos e anéis inteligentes',
      'Radar comunitário',
      'Anti-coerção com PIN falso',
      '10 dispositivos BLE',
      'Resposta 24/7',
    ],
  },
]

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  mkesh: 'mKesh',
  paypal: 'PayPal',
  manual: 'Manual (admin)',
  bank: 'Transferência Bancária',
}

// ── Deteccão de modo demo (cache com promise) ──
let demoCheck: Promise<boolean> | null = null

export function isDemoMode(): Promise<boolean> {
  if (!demoCheck) {
    demoCheck = (async () => {
      try {
        const { error } = await supabase.from('plans').select('id').limit(1)
        if (!error) return false
        // 42P01 = tabela não existe; PGRST205 = ausente do schema cache;
        // qualquer falha estrutural → opera em modo demo
        const code = (error as any).code ?? ''
        const msg = (error as any).message ?? ''
        return (
          code === '42P01' ||
          code === 'PGRST205' ||
          /does not exist|schema cache|Could not find the table/i.test(msg)
        )
      } catch {
        return true
      }
    })()
  }
  return demoCheck
}

export function resetDemoCache() {
  demoCheck = null
}

// ── Demo storage (localStorage) ──
const LS_PAYMENTS = 'statusads-demo-payments'
const LS_SUBS = 'statusads-demo-subscriptions'

function lsGet<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}
function lsSet(key: string, rows: unknown[]) {
  localStorage.setItem(key, JSON.stringify(rows))
}

export function genDemoReference(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `SA-DEMO-${ymd}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function genManualReference(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `SA-MAN-${ymd}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

// Pagamentos manuais guardados localmente (modo demo) — visíveis
// no painel admin demo via getLocalDemoPayments()
export function getLocalDemoPayments(): Payment[] {
  return lsGet<Payment>(LS_PAYMENTS)
}

// Actualiza um pagamento do modo demo (ex: admin confirma/rejeita)
export function patchLocalDemoPayment(id: string, patch: Partial<Payment>): void {
  const rows = lsGet<Payment>(LS_PAYMENTS)
  const idx = rows.findIndex((p) => p.id === id)
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...patch }
    lsSet(LS_PAYMENTS, rows)
  }
}

/**
 * Confirma um pagamento manual local (modo demo) e activa a
 * subscrição do utilizador actual — espelha o trigger SQL do
 * modo real (activate_or_extend_subscription).
 * Devolve o pagamento confirmado, ou null se o id não for
 * um pagamento local do utilizador actual.
 */
export function confirmLocalDemoPayment(id: string): Payment | null {
  const rows = lsGet<Payment>(LS_PAYMENTS)
  const row = rows.find((p) => p.id === id && p.status !== 'confirmed')
  if (!row) return null
  row.status = 'confirmed'
  row.confirmed_at = new Date().toISOString()
  lsSet(LS_PAYMENTS, rows)
  const plan = FALLBACK_PLANS.find((p) => p.slug === (row.plan_slug ?? 'free'))
  if (plan && plan.slug !== 'free') activateDemoSubscription(plan)
  return row
}

export interface ManualPaymentOpts {
  plan: Plan
  method: PaymentMethod
  txnRef: string      // ID da transacção que o utilizador copiou do SMS/app
  phone?: string
  payerName?: string
  promo?: PromoInfo   // promoção já validada no checkout (aplica o desconto ao montante)
}

// ── Promoções ──
export interface PromoInfo {
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  description?: string
}

/** Desconto em número (percentagem sobre a base, ou valor fixo) — nunca negativo */
export function applyDiscount(base: number, promo: Pick<PromoInfo, 'discount_type' | 'discount_value'>): number {
  const v = promo.discount_type === 'percent'
    ? base * (1 - Math.min(100, promo.discount_value) / 100)
    : base - promo.discount_value
  return Math.max(0, Math.round(v * 100) / 100)
}

/** Promoções de demonstração (só existem em modo demo — sem servidor) */
export const DEMO_PROMOS: PromoInfo[] = [
  { code: 'BEMVINDO10', discount_type: 'percent', discount_value: 10, description: 'Bónus de boas-vindas (demo)' },
  { code: 'STATUSADS50', discount_type: 'fixed', discount_value: 50, description: '−50 MT (demo)' },
]

export function findDemoPromo(code: string): PromoInfo | null {
  const c = code.trim().toUpperCase().replace(/\s/g, '')
  return DEMO_PROMOS.find((p) => p.code === c) ?? null
}

/**
 * Valida um código promocional. No servidor real usa a RPC validate_promo
 * (migration 014). Em modo demo usa a lista local DEMO_PROMOS.
 */
export interface PromoResult {
  ok: boolean
  promo?: PromoInfo
  message?: string
}

export async function validatePromo(code: string, planSlug: string): Promise<PromoResult> {
  const demo = await isDemoMode()
  if (demo) {
    const p = findDemoPromo(code)
    return p ? { ok: true, promo: p } : { ok: false, message: 'Código promocional inválido (demo).' }
  }
  try {
    const { data, error } = await supabase.rpc('validate_promo', { p_code: code, p_plan: planSlug })
    if (error) {
      if ((error as { code?: string }).code === 'PGRST202' || error.message.includes('Could not find the function')) {
        return { ok: false, message: 'O servidor ainda não tem promoções — aplique a migration 014 (TUDO.sql) no SQL Editor.' }
      }
      return { ok: false, message: 'Não foi possível validar o código agora. Tente novamente.' }
    }
    const res = data as { valid: boolean; message: string; discount_type?: 'percent' | 'fixed'; discount_value?: number; code?: string; description?: string }
    if (res?.valid && res.code && res.discount_type && res.discount_value != null) {
      return { ok: true, promo: { code: res.code, discount_type: res.discount_type, discount_value: Number(res.discount_value), description: res.description } }
    }
    return { ok: false, message: res?.message ?? 'Código inválido ou expirado.' }
  } catch {
    return { ok: false, message: 'Erro de ligação ao servidor. Tente novamente.' }
  }
}

/**
 * Pagamento 100% MANUAL — sem nenhuma API externa.
 * O utilizador pagou para o número do dono e submete o ID da
 * transacção. Fica 'pending' até o admin confirmar em
 * Admin → Pagamentos, o que activa a assinatura automaticamente
 * (trigger trg_payment_confirmed, migration 009).
 */
export async function submitManualPayment(opts: ManualPaymentOpts): Promise<Payment> {
  const base = opts.method === 'paypal' ? opts.plan.price_usd : opts.plan.price_mzn
  // Desconto promocional (validado antes no checkout) — nunca negativo
  const amount = opts.promo ? applyDiscount(base, opts.promo) : base
  const currency = opts.method === 'paypal' ? 'USD' : 'MZN'
  const demo = await isDemoMode()

  if (demo) {
    const payment: Payment = {
      id: crypto.randomUUID(),
      reference: genManualReference(),
      amount,
      currency,
      method: opts.method,
      phone: opts.phone ?? null,
      status: 'pending',
      plan_slug: opts.plan.slug,
      provider_ref: opts.txnRef,
      note: 'manual',
      payer_name: opts.payerName ?? null,
      promo_code: opts.promo?.code ?? null,
      created_at: new Date().toISOString(),
      confirmed_at: null,
    }
    const rows = lsGet<Payment>(LS_PAYMENTS)
    rows.unshift(payment)
    lsSet(LS_PAYMENTS, rows)
    return payment
  }

  // Real: resolve plan_id (necessário para o trigger activar a assinatura)
  const { data: planRow } = await supabase
    .from('plans').select('id').eq('slug', opts.plan.slug).single()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — entra novamente.')

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      plan_id: planRow?.id ?? null,
      plan_slug: opts.plan.slug,
      amount,
      currency,
      method: opts.method,
      phone: opts.phone ?? null,
      reference: genManualReference(),
      provider_ref: opts.txnRef,
      status: 'pending',
      note: 'manual',
      payer_name: opts.payerName ?? null,
      promo_code: opts.promo?.code ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Payment
}

function createDemoPayment(plan: Plan, method: PaymentMethod, phone: string | null): Payment {
  return {
    id: crypto.randomUUID(),
    reference: genDemoReference(),
    amount: method === 'paypal' ? plan.price_usd : plan.price_mzn,
    currency: method === 'paypal' ? 'USD' : 'MZN',
    method,
    phone,
    status: 'pending',
    plan_slug: plan.slug,
    note: 'demo',
    created_at: new Date().toISOString(),
    confirmed_at: null,
  }
}

function activateDemoSubscription(plan: Plan) {
  const subs = lsGet<Subscription>(LS_SUBS)
  const now = new Date()
  const expires = new Date(now.getTime() + 31 * 24 * 3600 * 1000)
  const filtered = subs.filter((s) => s.status === 'active' || s.status === 'trial')
  filtered.forEach((s) => (s.status = 'cancelled'))
  subs.unshift({
    id: crypto.randomUUID(),
    status: 'active',
    plan_slug: plan.slug,
    provider: 'demo',
    starts_at: now.toISOString(),
    expires_at: expires.toISOString(),
    auto_renew: true,
  })
  lsSet(LS_SUBS, subs)
  // sincroniza plan no localStorage do perfil demo
  localStorage.setItem('statusads-demo-plan', plan.slug)
}

export function getDemoPlanOverride(): PlanSlug | null {
  return (localStorage.getItem('statusads-demo-plan') as PlanSlug) || null
}

export function resetDemoPayments() {
  localStorage.removeItem(LS_PAYMENTS)
  localStorage.removeItem(LS_SUBS)
  localStorage.removeItem('statusads-demo-plan')
}

// ── API real ──
export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error || !data?.length) return FALLBACK_PLANS
  return data.map((p: any) => ({ ...p, popular: p.sort_order === 1 }))
}

export async function fetchMyPayments(): Promise<Payment[]> {
  const demo = await isDemoMode()
  if (demo) {
    return lsGet<Payment>(LS_PAYMENTS).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as Payment[]
}

export async function fetchMySubscriptions(): Promise<Subscription[]> {
  const demo = await isDemoMode()
  if (demo) {
    return lsGet<Subscription>(LS_SUBS).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  }
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return (data ?? []) as Subscription[]
}

export interface CheckoutResult {
  mode: 'demo' | 'real' | 'paypal'
  payment?: Payment
  message: string
  approve_url?: string
}

export async function startCheckout(opts: {
  plan: Plan
  method: PaymentMethod
  phone?: string
}): Promise<CheckoutResult> {
  const demo = await isDemoMode()

  if (demo) {
    // Simulação completa em localStorage
    const payment = createDemoPayment(opts.plan, opts.method, opts.phone ?? null)
    const payments = lsGet<Payment>(LS_PAYMENTS)
    payments.unshift(payment)
    lsSet(LS_PAYMENTS, payments)

    // Confirma automaticamente após 8s (simulando o prompt no telefone)
    setTimeout(() => {
      const rows = lsGet<Payment>(LS_PAYMENTS)
      const row = rows.find((p) => p.id === payment.id && p.status === 'pending')
      if (row) {
        row.status = 'confirmed'
        row.confirmed_at = new Date().toISOString()
        row.provider_ref = `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
        lsSet(LS_PAYMENTS, rows)
        activateDemoSubscription(opts.plan)
        window.dispatchEvent(new CustomEvent('statusads-demo-payment-confirmed', { detail: payment.id }))
      }
    }, 8000)

    return {
      mode: 'demo',
      payment,
      message: `Modo demonstração: prompt ${opts.method.toUpperCase()} simulado para ${opts.phone ?? '—'}. A confirmação chegará em ~8 segundos.`,
    }
  }

  // Real: chama a edge function (o JWT é anexado automaticamente)
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: {
      planSlug: opts.plan.slug,
      method: opts.method,
      phone: opts.phone ?? '',
      origin: window.location.origin,
    },
  })
  if (error) throw new Error(error.message)
  if ((data as any)?.error) throw new Error((data as any).error)
  return data as CheckoutResult
}

export async function confirmDemoPayment(reference: string): Promise<void> {
  // No modo demo a confirmação é local (evita chamadas desnecessárias)
  const demo = await isDemoMode()
  if (demo) return
  await supabase.functions.invoke('payments-webhook', {
    body: { reference, status: 'confirmed', demo: true, provider_ref: `DEMO-${Date.now()}` },
  })
}

export async function capturePaypal(reference: string, providerRef: string): Promise<void> {
  const demo = await isDemoMode()
  if (demo) return
  await supabase.functions.invoke('create-payment', {
    body: { action: 'capture', reference, provider_ref: providerRef },
  })
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const demo = await isDemoMode()
  if (demo) {
    const subs = lsGet<Subscription>(LS_SUBS)
    const sub = subs.find((s) => s.id === subscriptionId)
    if (sub) {
      sub.auto_renew = false
      sub.status = 'cancelled'
      lsSet(LS_SUBS, subs)
    }
    localStorage.setItem('statusads-demo-plan', 'free')
    return
  }
  const { error } = await supabase
    .from('subscriptions')
    .update({ auto_renew: false, status: 'cancelled' })
    .eq('id', subscriptionId)
  if (error) throw error
  // Rebaixa o perfil para free imediatamente
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ plan: 'free' }).eq('user_id', user.id)
  }
}

// ── Helpers de formato ──
export function formatMzn(v: number): string {
  return `${Number(v).toLocaleString('pt-MZ', { maximumFractionDigits: 0 })} MT`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function daysLeft(expiresAt?: string | null): number {
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
}

// ── Validador de telefone Moçambique ──
export function isValidMzPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '')
  const local = digits.startsWith('258') ? digits.slice(3) : digits
  return /^8[2-7]\d{7}$/.test(local)
}

export function normalizeMzPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  return digits.startsWith('258') ? digits.slice(3) : digits
}
