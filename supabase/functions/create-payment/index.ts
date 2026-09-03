// ============================================================
// create-payment — Inicia um pagamento (M-Pesa, e-Mola, mKesh,
// PayPal) ou devolve fluxo de demonstração se nenhum provider
// estiver configurado.
// Valida o JWT do chamador (obrigatório).
// SEGURANÇA: CORS com allowlist + validação do origin
// (usado no return_url do PayPal — impede open redirect).
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handlePreflight } from '../_shared/security.ts'

const ORIGIN_ALLOWLIST = [
  'https://statusmonetize.com',
  'https://www.statusmonetize.com',
  'https://statusads-connect.lovable.app',
  'https://preview--statusads-connect.lovable.app',
  'http://localhost:8080',
  'http://localhost:8090',
  'http://localhost:8091',
  'http://localhost:8092',
  'http://localhost:8093',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://localhost',
  'capacitor://localhost',
]

function resolveOrigin(candidate: string | null | undefined, fallbackOrigin: string | null): string {
  const pick = (o: string | null | undefined) => (o && ORIGIN_ALLOWLIST.includes(o) ? o : null)
  return pick(candidate) ?? pick(fallbackOrigin) ?? 'https://statusmonetize.com'
}

// ── Env: M-Pesa (Vodacom Moçambique) ──
const MPESA_API_KEY = Deno.env.get('MPESA_API_KEY') ?? ''
const MPESA_PUBLIC_KEY = Deno.env.get('MPESA_PUBLIC_KEY') ?? ''
const MPESA_SP_CODE = Deno.env.get('MPESA_SP_CODE') ?? ''
const MPESA_ENV = Deno.env.get('MPESA_ENV') ?? 'sandbox' // sandbox | live
const MPESA_PORT = Deno.env.get('MPESA_PORT') ?? '18352'

// ── Env: e-Mola (Movitel) — API genérica configurável ──
const EMOLA_PUSH_URL = Deno.env.get('EMOLA_PUSH_URL') ?? ''
const EMOLA_API_KEY = Deno.env.get('EMOLA_API_KEY') ?? ''
const EMOLA_MERCHANT = Deno.env.get('EMOLA_MERCHANT_ID') ?? ''

// ── Env: mKesh (Tmcel) — API genérica configurável ──
const MKESH_PUSH_URL = Deno.env.get('MKESH_PUSH_URL') ?? ''
const MKESH_API_KEY = Deno.env.get('MKESH_API_KEY') ?? ''

// ── Env: PayPal ──
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? ''
const PAYPAL_ENV = Deno.env.get('PAYPAL_ENV') ?? 'sandbox' // sandbox | live

const hasMpesa = !!(MPESA_API_KEY && MPESA_PUBLIC_KEY && MPESA_SP_CODE)
const hasEmola = !!(EMOLA_PUSH_URL && EMOLA_API_KEY)
const hasMkesh = !!(MKESH_PUSH_URL && MKESH_API_KEY)
const hasPaypal = !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET)
// Modo demo implícito quando nenhum provider real está configurado
const demoAllowed = Deno.env.get('PAYMENT_DEMO_MODE') === 'true' ||
  (!hasMpesa && !hasEmola && !hasMkesh && !hasPaypal)

// CORS headers do request corrente (preenchido no início de serve())
let currentCors: Record<string, string> = {}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...currentCors, 'Content-Type': 'application/json' },
  })
}

function genReference(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SA-${ymd}-${rnd}`
}

// M-Pesa MZ: Bearer token = base64( RSA-PKCS1v1.5( api_key, public_key ) )
async function mpesaToken(): Promise<string> {
  const { default: KJUR } = await import('https://esm.sh/jsrsasign@11.0.0')
  const publicKey = KJUR.KEYUTIL.getKey(MPESA_PUBLIC_KEY)
  const hex = KJUR.crypto.Cipher.encrypt(MPESA_API_KEY, publicKey, 'RSAES-PKCS1-V1_5')
  return KJUR.hextob64(hex)
}

async function mpesaPush(payment: any, plan: any): Promise<{ ok: boolean; provider_ref?: string; error?: string }> {
  try {
    const token = await mpesaToken()
    const host = MPESA_ENV === 'live' ? 'api.vm.co.mz' : 'api.sandbox.vm.co.mz'
    const url = `https://${host}:${MPESA_PORT}/ipg/v1x/c2bPayment/`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'developer.mpesa.vm.co.mz',
      },
      body: JSON.stringify({
        input_TransactionReference: payment.reference,
        input_CustomerMSISDN: (payment.phone ?? '').replace(/\D/g, ''),
        input_Amount: String(payment.amount),
        input_TransactionDescription: `StatusAds ${plan.name}`,
        input_ServiceProviderCode: MPESA_SP_CODE,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && (data.output_ResponseCode === 'INS-0' || data.output_TransactionID)) {
      return { ok: true, provider_ref: data.output_TransactionID }
    }
    return { ok: false, error: data.output_ResponseDesc ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function genericPush(url: string, apiKey: string, extra: Record<string, string>, payment: any, planName: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), ...extra },
      body: JSON.stringify({
        msisdn: payment.phone,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        description: `StatusAds ${planName}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payments-webhook`,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, provider_ref: data.transaction_id ?? data.id ?? undefined }
    return { ok: false, error: data.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function paypalOrder(payment: any, plan: any, origin: string): Promise<{ ok: boolean; approve_url?: string; error?: string }> {
  try {
    const base = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    const tok = await tokenRes.json()
    if (!tok.access_token) return { ok: false, error: 'PayPal auth falhou' }

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: payment.reference,
          description: `StatusAds ${plan.name} — 1 mês`,
          amount: { currency_code: 'USD', value: Number(payment.amount).toFixed(2) },
          custom_id: payment.reference,
        }],
        application_context: {
          brand_name: 'StatusAds Connect',
          return_url: `${origin}/dashboard/assinatura?paypal=return&ref=${payment.reference}`,
          cancel_url: `${origin}/dashboard/assinatura?paypal=cancel&ref=${payment.reference}`,
        },
      }),
    })
    const order = await orderRes.json()
    const approve = order.links?.find((l: any) => l.rel === 'approve')?.href
    if (approve) return { ok: true, approve_url: approve }
    return { ok: false, error: order.message ?? 'Sem approve link' }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  currentCors = corsHeaders(req)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // ── 1. Valida JWT do usuário ──
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Token inválido' }, 401)
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const planSlug: string = body.planSlug ?? ''
    const method: string = body.method ?? ''
    const phone: string = body.phone ?? ''
    // Origin só é aceite se estiver na allowlist (return_url PayPal)
    const origin = resolveOrigin(body.origin, req.headers.get('origin'))
    const action: string = body.action ?? 'create'

    // ── Capture PayPal (retorno do approval) ──
    if (action === 'capture' && body.provider_ref && hasPaypal) {
      const base = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
      const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
      const tok = await (await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      })).json()
      const cap = await (await fetch(`${base}/v2/checkout/orders/${body.provider_ref}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
      })).json()
      const ref = body.reference
      if (cap.status === 'COMPLETED') {
        await supabase.from('payments').update({
          status: 'confirmed', confirmed_at: new Date().toISOString(),
          provider_payload: cap,
        }).eq('reference', ref).eq('user_id', userId)
        return json({ success: true, status: 'confirmed' })
      }
      await supabase.from('payments').update({ status: 'failed', provider_payload: cap })
        .eq('reference', ref).eq('user_id', userId)
      return json({ success: false, status: 'failed', error: cap.message })
    }

    // ── 2. Valida plano ──
    const { data: plan } = await supabase
      .from('plans').select('*').eq('slug', planSlug).eq('is_active', true).single()
    if (!plan) return json({ error: 'Plano não encontrado' }, 404)
    if (planSlug === 'free') return json({ error: 'O plano Grátis não requer pagamento' }, 400)

    const validMethods = ['mpesa', 'emola', 'mkesh', 'paypal']
    if (!validMethods.includes(method)) return json({ error: 'Método inválido' }, 400)
    if (method !== 'paypal') {
      const digits = phone.replace(/\D/g, '')
      const local = digits.startsWith('258') ? digits.slice(3) : digits
      if (!/^8[2-7]\d{7}$/.test(local)) {
        return json({ error: 'Número inválido. Use um número Vodacom/Movitel/Tmcel (9 dígitos, ex: 84xxxxxxx)' }, 400)
      }
    }

    const amount = method === 'paypal' ? Number(plan.price_usd) : Number(plan.price_mzn)
    const currency = method === 'paypal' ? 'USD' : 'MZN'
    const reference = genReference()

    // ── 3. Cria registo do pagamento ──
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_slug: plan.slug,
        amount,
        currency,
        method,
        phone: method === 'paypal' ? null : phone.replace(/\D/g, ''),
        reference,
        status: 'pending',
      })
      .select()
      .single()
    if (payErr) return json({ error: payErr.message }, 500)

    // ── 4. Despacha pelo provider ──
    if (method === 'mpesa' && hasMpesa) {
      const r = await mpesaPush(payment, plan)
      if (!r.ok) {
        await supabase.from('payments').update({ status: 'failed', note: r.error }).eq('id', payment.id)
        return json({ error: `M-Pesa: ${r.error}` }, 502)
      }
      if (r.provider_ref) await supabase.from('payments').update({ provider_ref: r.provider_ref }).eq('id', payment.id)
      return json({ mode: 'real', payment: { ...payment, provider_ref: r.provider_ref }, message: 'Verifique o seu telefone e confirme o pagamento M-Pesa (PIN).' })
    }

    if (method === 'emola') {
      if (!hasEmola) return json({ mode: 'demo', payment, message: 'e-Mola não configurado — modo demonstração activo.' })
      const r = await genericPush(EMOLA_PUSH_URL, EMOLA_API_KEY, { 'x-merchant': EMOLA_MERCHANT }, payment, plan.name)
      if (!r.ok) {
        await supabase.from('payments').update({ status: 'failed', note: r.error }).eq('id', payment.id)
        return json({ error: `e-Mola: ${r.error}` }, 502)
      }
      return json({ mode: 'real', payment, message: 'Verifique o seu telefone e confirme o pagamento e-Mola.' })
    }

    if (method === 'mkesh') {
      if (!hasMkesh) return json({ mode: 'demo', payment, message: 'mKesh não configurado — modo demonstração activo.' })
      const r = await genericPush(MKESH_PUSH_URL, MKESH_API_KEY, {}, payment, plan.name)
      if (!r.ok) {
        await supabase.from('payments').update({ status: 'failed', note: r.error }).eq('id', payment.id)
        return json({ error: `mKesh: ${r.error}` }, 502)
      }
      return json({ mode: 'real', payment, message: 'Verifique o seu telefone e confirme o pagamento mKesh.' })
    }

    if (method === 'paypal') {
      if (!hasPaypal) return json({ mode: 'demo', payment, message: 'PayPal não configurado — modo demonstração activo.' })
      const r = await paypalOrder(payment, plan, origin)
      if (!r.ok) {
        await supabase.from('payments').update({ status: 'failed', note: r.error }).eq('id', payment.id)
        return json({ error: `PayPal: ${r.error}` }, 502)
      }
      return json({ mode: 'paypal', payment, approve_url: r.approve_url, message: 'Redirecione para o PayPal para aprovar o pagamento.' })
    }

    // ── 5. Sem provider configurado → demonstração ──
    if (demoAllowed) {
      return json({
        mode: 'demo',
        payment,
        message: `Modo demonstração: pagamento ${reference} de ${amount} ${currency} via ${method.toUpperCase()}. A confirmação será simulada.`,
      })
    }

    return json({ error: `Provider ${method} não configurado no servidor` }, 501)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
