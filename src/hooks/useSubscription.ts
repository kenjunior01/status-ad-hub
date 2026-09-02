// ============================================================
// useSubscription — Planos, assinatura activa e limites do
// plano (gating de features). Com fallback demo.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  fetchPlans, fetchMyPayments, fetchMySubscriptions,
  isDemoMode, getDemoPlanOverride, daysLeft,
  FALLBACK_PLANS, cancelSubscription as cancelSubApi,
  type Plan, type Payment, type Subscription, type PlanSlug,
} from '@/lib/payments'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'

export function useDemoMode() {
  return useQuery<boolean>({
    queryKey: ['payments-demo-mode'],
    queryFn: isDemoMode,
    staleTime: 60_000,
  })
}

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 5 * 60_000,
  })
}

export function useMyPayments() {
  const demo = useDemoMode()
  return useQuery<Payment[]>({
    queryKey: ['my-payments', demo.data],
    queryFn: fetchMyPayments,
    enabled: demo.isSuccess,
    // Enquanto houver pagamentos pendentes, repete a cada 4s
    refetchInterval: (query) => {
      const rows = query.state.data ?? []
      return rows.some((p) => p.status === 'pending' || p.status === 'processing') ? 4000 : false
    },
  })
}

export function useMySubscriptions() {
  const demo = useDemoMode()
  return useQuery<Subscription[]>({
    queryKey: ['my-subscriptions', demo.data],
    queryFn: fetchMySubscriptions,
    enabled: demo.isSuccess,
  })
}

export interface PlanState {
  plan: Plan
  status: 'free' | 'active' | 'cancelled' | 'expired'
  subscription?: Subscription
  daysRemaining: number
  isPaid: boolean
  isAdmin: boolean
  maxContacts: number
  maxDevices: number
}

const EMPTY_SUBS: Subscription[] = []

/** Plano efectivo: assinatura activa > override demo > profiles.plan */
export function usePlanState(): {
  state?: PlanState
  loading: boolean
  reload: () => void
} {
  const qc = useQueryClient()
  const demo = useDemoMode()
  const { profile } = useProfile()
  const { data: subs = EMPTY_SUBS, isLoading: subsLoading } = useMySubscriptions()
  const { data: plans = FALLBACK_PLANS, isLoading: plansLoading } = usePlans()

  // No modo demo, ouve a confirmação simulada para recarregar
  useEffect(() => {
    if (!demo.data) return
    const handler = () => qc.invalidateQueries({ queryKey: ['my-payments'] })
    window.addEventListener('statusads-demo-payment-confirmed', handler)
    return () => window.removeEventListener('statusads-demo-payment-confirmed', handler)
  }, [demo.data, qc])

  // Em modo demo refresca a assinatura periodicamente (confirmação simulada)
  useEffect(() => {
    if (!demo.data) return
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }), 4000)
    return () => clearInterval(t)
  }, [demo.data, qc])

  const activeSub = subs.find((s) => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date()))
  const cancelledSub = subs.find((s) => s.status === 'cancelled')

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['my-subscriptions'] })
    qc.invalidateQueries({ queryKey: ['my-payments'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
  }

  if (subsLoading || plansLoading || !profile) {
    return { state: undefined, loading: true, reload }
  }
  const planRow = profile as any

  const demoOverride: PlanSlug | null = demo.data ? getDemoPlanOverride() : null
  const profilePlan = (activeSub?.plan_slug ?? demoOverride ?? (planRow.plan as PlanSlug) ?? 'free') as PlanSlug
  const plan = plans.find((p) => p.slug === profilePlan) ?? FALLBACK_PLANS.find((p) => p.slug === profilePlan) ?? FALLBACK_PLANS[0]

  const state: PlanState = {
    plan,
    status: activeSub ? 'active' : cancelledSub ? 'cancelled' : profilePlan === 'free' ? 'free' : 'expired',
    subscription: activeSub,
    daysRemaining: activeSub ? daysLeft(activeSub.expires_at) : 0,
    isPaid: profilePlan !== 'free',
    isAdmin: false,
    maxContacts: plan.max_contacts,
    maxDevices: plan.max_devices,
  }

  return { state, loading: false, reload }
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelSubApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

/** Helper: verifica se o utilizador pode executar uma acção limitada pelo plano */
export function canAddContact(state?: PlanState, currentCount = 0): boolean {
  if (!state) return true
  return currentCount < state.plan.max_contacts
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
