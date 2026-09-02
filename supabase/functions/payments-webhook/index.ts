// ============================================================
// payments-webhook — Recebe confirmações dos providers
// (M-Pesa C2B, e-Mola, mKesh, PayPal) e do fluxo de
// demonstração. Actualiza o pagamento; a assinatura é
// activada pelo trigger trg_payment_confirmed na DB.
//
// Segurança:
//  - Se PAYMENT_WEBHOOK_SECRET estiver definido, exige o header
//    x-webhook-secret (providers devem chamar
//    .../payments-webhook?secret=XXX ou enviar o header).
//  - Confirmação "demo" só é aceite quando nenhum provider real
//    está configurado (ou PAYMENT_DEMO_MODE=true).
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

const MPESA_API_KEY = Deno.env.get('MPESA_API_KEY') ?? ''
const EMOLA_API_KEY = Deno.env.get('EMOLA_API_KEY') ?? ''
const MKESH_API_KEY = Deno.env.get('MKESH_API_KEY') ?? ''
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? ''

const hasAnyProvider = !!(MPESA_API_KEY || EMOLA_API_KEY || MKESH_API_KEY || PAYPAL_CLIENT_ID)
const demoAllowed = Deno.env.get('PAYMENT_DEMO_MODE') === 'true' || !hasAnyProvider

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Normaliza o payload de vários providers para { reference, status, provider_ref, raw }
function normalize(body: any): { reference?: string; status: 'confirmed' | 'failed' | 'pending'; provider_ref?: string } {
  // Formato genérico (demo, e-Mola, mKesh, admin manual)
  if (body.reference && body.status) {
    const map: Record<string, 'confirmed' | 'failed' | 'pending'> = {
      confirmed: 'confirmed', paid: 'confirmed', success: 'confirmed', successs: 'confirmed',
      failed: 'failed', error: 'failed', cancelled: 'failed', canceled: 'failed',
      pending: 'pending', processing: 'pending',
    }
    return { reference: body.reference, status: map[body.status] ?? 'pending', provider_ref: body.provider_ref }
  }

  // M-Pesa C2B confirmation (Vodacom MZ)
  if (body.input_ThirdPartyReference || body.output_ThirdPartyReference) {
    const ok = body.output_ResponseCode === 'INS-0'
    return {
      reference: body.input_ThirdPartyReference ?? body.output_ThirdPartyReference,
      status: ok ? 'confirmed' : 'failed',
      provider_ref: body.output_TransactionID ?? body.input_TransactionID,
    }
  }

  // PayPal webhook (CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED)
  if (body.event_type && body.resource?.custom_id) {
    const ok = ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'].includes(body.event_type)
    return {
      reference: body.resource.custom_id,
      status: ok ? 'confirmed' : 'failed',
      provider_ref: body.resource.id,
    }
  }

  return { status: 'pending' }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // ── Segredo do webhook ──
    if (WEBHOOK_SECRET) {
      const url = new URL(req.url)
      const given = req.headers.get('x-webhook-secret') ?? url.searchParams.get('secret') ?? ''
      if (given !== WEBHOOK_SECRET) return json({ error: 'Webhook não autorizado' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const norm = normalize(body)
    if (!norm.reference) return json({ error: 'Referência ausente' }, 400)

    // ── Bloqueia confirmação demo se um provider real está activo ──
    if (body.demo === true && !demoAllowed) {
      return json({ error: 'Modo demo desactivado' }, 403)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: payment } = await supabase
      .from('payments').select('*').eq('reference', norm.reference).single()
    if (!payment) return json({ error: 'Pagamento não encontrado' }, 404)

    if (payment.status === 'confirmed') {
      return json({ success: true, status: 'confirmed', already: true })
    }

    const patch: any = { status: norm.status }
    if (norm.status === 'confirmed') {
      patch.confirmed_at = new Date().toISOString()
      patch.provider_ref = norm.provider_ref ?? payment.provider_ref
      patch.provider_payload = body
    } else if (norm.provider_ref) {
      patch.provider_ref = norm.provider_ref
    }
    if (body.demo === true) patch.note = 'demo'

    const { error: updErr } = await supabase.from('payments').update(patch).eq('id', payment.id)
    if (updErr) return json({ error: updErr.message }, 500)

    return json({ success: true, status: norm.status, reference: norm.reference })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
