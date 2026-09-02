// ============================================================
// useAdmin — Dados do painel administrativo. Modo real via RLS
// (is_admin), modo demo com dados semeados em localStorage.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDemoMode } from '@/hooks/useSubscription'
import type { Payment, Subscription, PlanSlug, PaymentMethod } from '@/lib/payments'

export interface AdminUser {
  id: string
  user_id: string
  full_name: string
  phone: string | null
  plan: PlanSlug
  role: 'user' | 'admin'
  created_at: string
  email?: string
  sos_events?: number
}

export interface AdminStats {
  totalUsers: number
  newUsers7d: number
  activeSubs: number
  mrrMzn: number
  paymentsToday: number
  revenue30dMzn: number
  pendingPayments: number
  activeEmergencies: number
  planBreakdown: Record<string, number>
  methodBreakdown: Record<string, number>
}

// ── DEMO SEED ──
const LS_SEED = 'statusads-demo-admin-seed-v1'

const DEMO_NAMES = [
  ['Ana Machava', '84 512 3390'], ['Carlos Tembe', '82 903 1145'], ['Rosa Chirindza', '86 771 2208'],
  ['Jorge Mabjaia', '87 340 9921'], ['Lúcia Nhaca', '84 118 7745'], ['Paulo Sitoe', '85 662 0138'],
  ['Esperança Mondlane', '82 447 5510'], ['Tomás Cuna', '86 909 3327'], ['Fátima Abdul', '87 221 8046'],
  ['Nelson Chissano', '84 780 2259'], ['Isabel Macuácua', '85 103 9977'], ['Américo Bilale', '82 556 4183'],
  ['Sara Mutemba', '86 318 6620'], ['Domingos Paíco', '87 994 1075'], ['Rita Chiziane', '84 635 8812'],
]

function planFor(i: number): PlanSlug { return i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'familia' : 'free' }

function seedDemo(): { users: AdminUser[]; payments: Payment[]; subs: Subscription[] } {
  const cached = localStorage.getItem(LS_SEED)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* reseed */ }
  }
  const now = Date.now()
  const users: AdminUser[] = DEMO_NAMES.map(([name, phone], i) => ({
    id: `demo-${i}`, user_id: `demo-uid-${i}`,
    full_name: name, phone,
    plan: planFor(i),
    role: i === 0 ? 'admin' : 'user',
    created_at: new Date(now - (i * 3 + 2) * 86400000).toISOString(),
    email: `${name.split(' ')[0].toLowerCase()}${i}@exemplo.mz`,
    sos_events: i % 4 === 0 ? 1 + (i % 3) : 0,
  }))

  const methods: PaymentMethod[] = ['mpesa', 'mpesa', 'mpesa', 'emola', 'mkesh', 'paypal']
  const payments: Payment[] = []
  let seq = 1
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    if (u.plan === 'free') continue
    const n = 1 + (i % 2)
    for (let k = 0; k < n; k++) {
      const method = methods[(i + k) % methods.length]
      const amount = method === 'paypal'
        ? (u.plan === 'premium' ? 7.99 : 3.99)
        : (u.plan === 'premium' ? 499 : 249)
      const age = 2 + ((i * 3 + k * 7) % 28)
      const created = new Date(now - age * 86400000 - (k + 1) * 3600000).toISOString()
      const status: Payment['status'] = age < 1 ? 'pending' : (i + k) % 7 === 0 ? 'failed' : 'confirmed'
      payments.push({
        id: `demo-pay-${seq}`, reference: `SA-DEMO-${String(seq).padStart(4, '0')}`,
        amount, currency: method === 'paypal' ? 'USD' : 'MZN',
        method, phone: u.phone?.replace(/\s/g, ''), status,
        plan_slug: u.plan, note: 'demo',
        created_at: created,
        confirmed_at: status === 'confirmed' ? created : null,
      })
      seq++
    }
  }
  // alguns pagamentos de hoje
  payments.unshift(
    { id: 'demo-pay-t1', reference: 'SA-DEMO-TODAY-1', amount: 499, currency: 'MZN', method: 'mpesa', phone: '845123390', status: 'pending', plan_slug: 'premium', note: 'demo', created_at: new Date(now - 3600000).toISOString(), confirmed_at: null },
    { id: 'demo-pay-t2', reference: 'SA-DEMO-TODAY-2', amount: 249, currency: 'MZN', method: 'emola', phone: '829031145', status: 'confirmed', plan_slug: 'familia', note: 'demo', created_at: new Date(now - 7200000).toISOString(), confirmed_at: new Date(now - 7000000).toISOString() },
  )

  const subs: Subscription[] = users
    .filter((u) => u.plan !== 'free')
    .map((u, i) => ({
      id: `demo-sub-${i}`, status: 'active' as const,
      plan_slug: u.plan, provider: ['mpesa', 'emola', 'paypal'][i % 3],
      starts_at: new Date(now - (20 - i) * 86400000).toISOString(),
      expires_at: new Date(now + (3 + i * 2) * 86400000).toISOString(),
      auto_renew: true,
    }))

  const seed = { users, payments, subs }
  localStorage.setItem(LS_SEED, JSON.stringify(seed))
  return seed
}

export function resetAdminDemoSeed() {
  localStorage.removeItem(LS_SEED)
}

// ── useIsAdmin ──
export function useIsAdmin(): { isAdmin: boolean; loading: boolean; isDemo: boolean } {
  const { user } = useAuth()
  const demo = useDemoMode()
  const q = useQuery<'user' | 'admin'>({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('role').eq('user_id', user!.id).single()
      if (error) return 'user'
      return (data as any)?.role ?? 'user'
    },
    enabled: !!user,
    staleTime: 60_000,
  })
  if (demo.data) return { isAdmin: true, loading: false, isDemo: true }
  return { isAdmin: q.data === 'admin', loading: q.isLoading || demo.isLoading, isDemo: false }
}

function logAdminAction(action: string, targetType: string, targetId: string, details?: unknown) {
  supabase.from('admin_logs').insert({
    action, target_type: targetType, target_id: targetId, details: details ?? {},
  }).then(() => { /* best effort */ })
}

// ── Stats ──
export function useAdminStats() {
  const demo = useDemoMode()
  return useQuery<AdminStats>({
    queryKey: ['admin-stats', demo.data],
    queryFn: async () => {
      if (demo.data) {
        const { users, payments } = seedDemo()
        const today = new Date().toDateString()
        const dayMs = 86400000
        return {
          totalUsers: users.length,
          newUsers7d: users.filter((u) => now_() - new Date(u.created_at).getTime() < 7 * dayMs).length,
          activeSubs: users.filter((u) => u.plan !== 'free').length,
          mrrMzn: users.reduce((acc, u) => acc + (u.plan === 'premium' ? 499 : u.plan === 'familia' ? 249 : 0), 0),
          paymentsToday: payments.filter((p) => new Date(p.created_at).toDateString() === today).length,
          revenue30dMzn: payments
            .filter((p) => p.status === 'confirmed' && now_() - new Date(p.created_at).getTime() < 30 * dayMs)
            .reduce((acc, p) => acc + (p.currency === 'MZN' ? p.amount : p.amount * 260), 0),
          pendingPayments: payments.filter((p) => p.status === 'pending').length,
          activeEmergencies: 1,
          planBreakdown: countBy(users.map((u) => u.plan)),
          methodBreakdown: countBy(payments.filter((p) => p.status === 'confirmed').map((p) => p.method)),
        }
      }
      // REAL
      const [usersRes, subsRes, paysRes, alertsRes] = await Promise.all([
        supabase.from('profiles').select('plan, created_at, role'),
        supabase.from('subscriptions').select('status, expires_at, plan_id, plans(slug, price_mzn)').eq('status', 'active'),
        supabase.from('payments').select('amount, currency, status, method, created_at').gte(
          'created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('emergency_alerts').select('status').eq('status', 'active'),
      ])
      const users = (usersRes.data ?? []) as any[]
      const pays = (paysRes.data ?? []) as any[]
      const today = new Date().toDateString()
      const dayMs = 86400000
      return {
        totalUsers: users.length,
        newUsers7d: users.filter((u) => now_() - new Date(u.created_at).getTime() < 7 * dayMs).length,
        activeSubs: (subsRes.data ?? []).length,
        mrrMzn: (subsRes.data ?? []).reduce((acc: number, s: any) => acc + (s.plans?.price_mzn ?? 0), 0),
        paymentsToday: pays.filter((p) => new Date(p.created_at).toDateString() === today).length,
        revenue30dMzn: pays
          .filter((p) => p.status === 'confirmed')
          .reduce((acc: number, p: any) => acc + (p.currency === 'MZN' ? Number(p.amount) : Number(p.amount) * 260), 0),
        pendingPayments: pays.filter((p) => p.status === 'pending').length,
        activeEmergencies: (alertsRes.data ?? []).length,
        planBreakdown: countBy(users.map((u) => u.plan ?? 'free')),
        methodBreakdown: countBy(pays.filter((p) => p.status === 'confirmed').map((p) => p.method)),
      }
    },
    refetchInterval: 60_000,
  })
}

function now_() { return Date.now() }
function countBy(arr: string[]): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc }, {})
}

// ── Utilizadores ──
export function useAdminUsers(search: string) {
  const demo = useDemoMode()
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users', demo.data, search],
    queryFn: async () => {
      if (demo.data) {
        const { users } = seedDemo()
        const s = search.trim().toLowerCase()
        return s
          ? users.filter((u) => u.full_name.toLowerCase().includes(s) || (u.email ?? '').includes(s) || (u.phone ?? '').includes(s))
          : users
      }
      let q = supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, plan, role, created_at')
        .order('created_at', { ascending: false })
        .limit(200)
      if (search.trim()) q = q.ilike('full_name', `%${search.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as AdminUser[]
    },
  })
}

export function useUpdateUserPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: PlanSlug }) => {
      const { error } = await supabase.from('profiles').update({ plan }).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      logAdminAction('change_plan', 'profile', vars.userId, { plan: vars.plan })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      logAdminAction('change_role', 'profile', vars.userId, { role: vars.role })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

// ── Pagamentos ──
export function useAdminPayments(filter?: { status?: string; method?: string }) {
  const demo = useDemoMode()
  return useQuery<Payment[]>({
    queryKey: ['admin-payments', demo.data, filter?.status ?? '', filter?.method ?? ''],
    queryFn: async () => {
      if (demo.data) {
        const { payments } = seedDemo()
        return payments.filter((p) =>
          (!filter?.status || p.status === filter.status) &&
          (!filter?.method || p.method === filter.method))
      }
      let q = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (filter?.status) q = q.eq('status', filter.status)
      if (filter?.method) q = q.eq('method', filter.method)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Payment[]
    },
  })
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Payment['status'] }) => {
      const { error } = await supabase.from('payments').update({
        status,
        confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      logAdminAction(`payment_${vars.status}`, 'payment', vars.id, {})
      qc.invalidateQueries({ queryKey: ['admin-payments'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

// ── Assinaturas ──
export function useAdminSubscriptions() {
  const demo = useDemoMode()
  return useQuery<(Subscription & { user_name?: string })[]>({
    queryKey: ['admin-subs', demo.data],
    queryFn: async () => {
      if (demo.data) {
        const { users, subs } = seedDemo()
        return subs.map((s, i) => ({ ...s, user_name: users[i + 1]?.full_name ?? 'Utilizador' }))
      }
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, profiles(full_name), plans(slug, name, price_mzn)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []).map((s: any) => ({ ...s, user_name: s.profiles?.full_name }))
    },
  })
}

export function useExtendSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const { data: sub } = await supabase.from('subscriptions').select('expires_at').eq('id', id).single()
      const base = sub?.expires_at && new Date(sub.expires_at) > new Date() ? new Date(sub.expires_at) : new Date()
      const expires = new Date(base.getTime() + days * 86400000).toISOString()
      const { error } = await supabase.from('subscriptions')
        .update({ expires_at: expires, status: 'active' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      logAdminAction('extend_subscription', 'subscription', vars.id, { days: vars.days })
      qc.invalidateQueries({ queryKey: ['admin-subs'] })
    },
  })
}

// ── Eventos SOS (monitorização) ──
export interface AdminEvent {
  id: string
  status: string
  created_at: string
  user_name?: string
  trigger?: string
}

export function useAdminEvents() {
  const demo = useDemoMode()
  return useQuery<AdminEvent[]>({
    queryKey: ['admin-events', demo.data],
    queryFn: async () => {
      if (demo.data) {
        const now = Date.now()
        return [
          { id: 'demo-ev-1', status: 'resolved', created_at: new Date(now - 86400000 * 2).toISOString(), user_name: 'Ana Machava', trigger: 'Botão SOS' },
          { id: 'demo-ev-2', status: 'active', created_at: new Date(now - 1800000).toISOString(), user_name: 'Jorge Mabjaia', trigger: 'Check-in falhado' },
          { id: 'demo-ev-3', status: 'resolved', created_at: new Date(now - 86400000 * 6).toISOString(), user_name: 'Rosa Chirindza', trigger: 'Oculos' },
        ]
      }
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('id, status, created_at, trigger, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []).map((e: any) => ({ ...e, user_name: e.profiles?.full_name }))
    },
    refetchInterval: 30_000,
  })
}

export function useResolveEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'resolved' | 'false_alarm' }) => {
      const { error } = await supabase.from('emergency_alerts').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

// ── Planos (edição admin) ──
export interface EditablePlan {
  id: string
  slug: PlanSlug
  name: string
  price_mzn: number
  price_usd: number
  max_contacts: number
  max_devices: number
  is_active: boolean
  features: string[]
}

export function useAdminPlans() {
  const demo = useDemoMode()
  return useQuery<EditablePlan[]>({
    queryKey: ['admin-plans', demo.data],
    queryFn: async () => {
      if (demo.data) {
        const { FALLBACK_PLANS } = await import('@/lib/payments')
        return FALLBACK_PLANS.map((p, i) => ({
          id: `demo-plan-${i}`, slug: p.slug, name: p.name,
          price_mzn: p.price_mzn, price_usd: p.price_usd,
          max_contacts: p.max_contacts, max_devices: p.max_devices,
          is_active: true, features: p.features,
        }))
      }
      const { data, error } = await supabase.from('plans').select('*').order('sort_order')
      if (error) throw error
      return (data ?? []).map((p: any) => ({
        id: p.id, slug: p.slug, name: p.name,
        price_mzn: Number(p.price_mzn), price_usd: Number(p.price_usd),
        max_contacts: p.max_contacts, max_devices: p.max_devices,
        is_active: p.is_active, features: p.features ?? [],
      }))
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plan: EditablePlan) => {
      const { error } = await supabase.from('plans').update({
        name: plan.name,
        price_mzn: plan.price_mzn,
        price_usd: plan.price_usd,
        max_contacts: plan.max_contacts,
        max_devices: plan.max_devices,
        is_active: plan.is_active,
        features: plan.features,
      }).eq('id', plan.id)
      if (error) throw error
    },
    onSuccess: () => {
      logAdminAction('update_plan', 'plan', '—', {})
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}
