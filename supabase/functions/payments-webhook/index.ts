// ============================================================
// payments-webhook — Recebe confirmações dos providers
// (M-Pesa C2B, e-Mola, mKesh, PayPal) e do fluxo de
// demonstração. Actualiza o pagamento; a assinatura é
// activada pelo trigger trg_payment_confirmed na DB.
//
// SEGURANÇA (hardening — auto-confirmação de pagamentos):
//  1. PAYMENT_WEBHOOK_SECRET definido → exige o header
//     x-webhook-secret (ou ?secret=) em TODAS as chamadas.
//  2. Sem secret configurado:
//     · confirmação "demo" → exige JWT de utilizador e o pagamento
//       tem de pertencer ao próprio utilizador;
//     · provider real activo → REJEITA tudo (503) até o dono
//       definir PAYMENT_WEBHOOK_SECRET — nunca aceita confirmações
//       anónimas de dinheiro.
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handlePreflight, json, authenticateUser, isServiceRole } from '../_shared/security.ts'

const MPESA_API_KEY = Deno.env.get('MPESA_API_KEY') ?? ''
const EMOLA_API_KEY = Deno.env.get('EMOLA_API_KEY') ?? ''
const MKESH_API_KEY = Deno.env.get('MKESH_API_KEY') ?? ''
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? ''

const hasAnyProvider = !!(MPESA_API_KEY || EMOLA_API_KEY || MKESH_API_KEY || PAYPAL_CLIENT_ID)
const demoAllowed = Deno.env.get('PAYMENT_DEMO_MODE') === 'true' || !hasAnyProvider

function json2(body: unknown, status = 200) {
  return json(body, status, {})
}

// Normaliza o payload de vários providers para { reference, status, provider_ref }
function normalize(body: any): { reference?: string; status: 'confirmed' | 'failed' | 'pending'; provider_ref?: string } {
  // Formato genérico (demo, e-Mola, mKesh, admin manual)
  if (body.reference && body.status) {
    const map: Record<string, 'confirmed' | 'failed' | 'pending'> = {
      confirmed: 'confirmed', paid: 'confirmed', success: 'confirmed',
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
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const norm = normalize(body)
    if (!norm.reference || typeof norm.reference !== 'string' || norm.reference.length > 64) {
      return json({ error: 'Referência ausente' }, 400)
    }

    const service = isServiceRole(req)

    // ── Camada 1: segredo do webhook (obrigatório quando configurado) ──
    if (WEBHOOK_SECRET) {
      const url = new URL(req.url)
      const given = req.headers.get('x-webhook-secret') ?? url.searchParams.get('secret') ?? ''
      if (given !== WEBHOOK_SECRET) return json({ error: 'Webhook não autorizado' }, 401)
    } else {
      // ── Camada 2 (sem secret): chamada anónima só aceita demo autenticada ──
      if (!demoAllowed) {
        // Provider real activo sem secret configurado → recusa anónimas
        // (evita auto-confirmação de pagamentos; o dono deve definir
        //  PAYMENT_WEBHOOK_SECRET nos secrets das edge functions)
        console.error('[WEBHOOK] PAYMENT_WEBHOOK_SECRET não definido com provider real activo — recusando chamada anónima')
        return json({ error: 'Webhook secret obrigatório (definir PAYMENT_WEBHOOK_SECRET)' }, 503)
      }
      if (!service) {
        // Demo: exige JWT e o pagamento tem de pertencer ao utilizador
        const userId = await authenticateUser(req)
        if (!userId) return json({ error: 'Não autenticado' }, 401)
        if (body.demo !== true) {
          return json({ error: 'Só confirmações demo são aceites por utilizadores' }, 403)
        }
        // Guarda o userId para verificação de ownership abaixo
        body.__callerUserId = userId
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: payment } = await supabase
      .from('payments').select('*').eq('reference', norm.reference).single()
    if (!payment) return json({ error: 'Pagamento não encontrado' }, 404)

    // ── Camada 3: ownership para confirmações demo de utilizadores ──
    const callerUserId: string | undefined = body.__callerUserId
    if (callerUserId && payment.user_id !== callerUserId) {
      return json({ error: 'Pagamento não pertence ao utilizador' }, 403)
    }

    // ── Bloqueia confirmação demo se um provider real está activo ──
    if (body.demo === true && !demoAllowed) {
      return json({ error: 'Modo demo desactivado' }, 403)
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
