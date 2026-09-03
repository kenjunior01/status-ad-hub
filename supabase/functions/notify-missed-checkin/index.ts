// ============================================================
// notify-missed-checkin — Notifica contactos quando um check-in
// agendado não é confirmado. Chamado EXCLUSIVAMENTE por pg_net
// (trigger da base de dados) com a service_role key.
//
// SEGURANÇA (hardening):
//  - Exige Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.
//    Chamadas sem a chave do serviço são rejeitadas (401) — impede
//    usar a função como SMS bomber para números arbitrários.
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRole, isUuid, safeText } from '../_shared/security.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''

serve(async (req) => {
  try {
    // ── Apenas o servidor (pg_net) pode chamar ──
    if (!isServiceRole(req)) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { user_id, checkin_id, contacts, missed_at } = await req.json()

    if (!isUuid(user_id)) {
      return new Response(JSON.stringify({ error: 'user_id inválido' }), { status: 400 })
    }
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }
    // Números vindos da DB (confiável), mas limitados por defesa em profundidade
    const phones = contacts.slice(0, 20).map((p: unknown) => safeText(p, 20)).filter(Boolean)

    // Get user info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', user_id)
      .single()

    const userName = profile?.full_name || 'Utilizador'
    const missedTime = missed_at ? new Date(missed_at).toLocaleString('pt-MZ') : 'desconhecido'

    // Send SMS to each contact
    const results = await Promise.allSettled(
      phones.map(async (phone: string) => {
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
          return { phone, status: 'skipped', reason: 'Twilio not configured' }
        }

        const message = `[StatusAds Connect] ALERTA: ${userName} falhou o check-in de seguranca agendado para ${missedTime}. Tente contactar imediatamente.`

        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: TWILIO_PHONE_NUMBER,
              To: phone,
              Body: message.slice(0, 160),
            }),
          }
        )

        if (!resp.ok) {
          const err = await resp.text()
          return { phone, status: 'failed', error: err }
        }
        return { phone, status: 'sent' }
      })
    )

    const summary = results.map((r, i) => ({
      phone: phones[i],
      ...('value' in r ? r.value : { status: 'error' }),
    }))

    // Log the notification event
    await supabase.from('location_events').insert({
      user_id,
      type: 'alert',
      description: `Check-in falhado notificado para ${phones.length} contacto(s)`,
      metadata: { checkin_id, notification_results: summary },
    })

    return new Response(JSON.stringify({ success: true, notified: summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
