// ============================================================
// app-settings.ts — Configurações globais da plataforma
// (números de pagamento manual, suporte). Guardadas na tabela
// app_settings; fallback automático em localStorage no modo
// demo (tabelas ainda não criadas).
// ============================================================
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/payments'

export interface PaymentNumbers {
  mpesa: string
  emola: string
  mkesh: string
  bank_name: string
  bank_holder: string
  bank_nib: string
  paypal_email: string
}

export interface SupportInfo {
  whatsapp: string
  email: string
}

export interface AppSettingsData {
  payment_numbers: PaymentNumbers
  support: SupportInfo
}

// Valores por omissão — o dono DEVE alterá-los em
// Admin → Configurações para os seus números reais.
export const DEFAULT_SETTINGS: AppSettingsData = {
  payment_numbers: {
    mpesa: '84 000 0000',
    emola: '86 000 0000',
    mkesh: '82 000 0000',
    bank_name: 'BCI',
    bank_holder: 'StatusAds, Lda',
    bank_nib: '0000000000000000000 000',
    paypal_email: 'pagamentos@statusmonetize.com',
  },
  support: {
    whatsapp: '+258 84 000 0000',
    email: 'suporte@statusmonetize.com',
  },
}

const LS_KEY = 'statusads-demo-settings'

function lsGet(): Partial<AppSettingsData> | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function lsSet(patch: Partial<AppSettingsData>) {
  const current = lsGet() ?? {}
  localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }))
}

function mergeSettings(rows: { key: string; value: unknown }[]): AppSettingsData {
  const out: AppSettingsData = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  for (const row of rows) {
    if (row.key === 'payment_numbers' && row.value) {
      out.payment_numbers = { ...out.payment_numbers, ...(row.value as PaymentNumbers) }
    }
    if (row.key === 'support' && row.value) {
      out.support = { ...out.support, ...(row.value as SupportInfo) }
    }
  }
  return out
}

export async function fetchAppSettings(): Promise<AppSettingsData> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
    if (error || !data) throw error
    if (data.length === 0) {
      // tabela existe mas vazia — devolve demo/local se houver
      const local = lsGet()
      if (local?.payment_numbers) return mergeSettings(
        Object.entries(local).map(([key, value]) => ({ key, value })),
      )
      return DEFAULT_SETTINGS
    }
    return mergeSettings(data)
  } catch {
    // Modo demo ou tabela inexistente → localStorage
    const local = lsGet()
    if (local) {
      return mergeSettings(Object.entries(local).map(([key, value]) => ({ key, value })))
    }
    return DEFAULT_SETTINGS
  }
}

export async function updateAppSetting(
  key: 'payment_numbers' | 'support',
  value: Record<string, string>,
): Promise<void> {
  const demo = await isDemoMode()
  if (demo) {
    lsSet({ [key]: value } as Partial<AppSettingsData>)
    return
  }
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}
