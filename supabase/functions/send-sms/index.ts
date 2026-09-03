/**
 * Supabase Edge Function: send-sms
 *
 * Envia SMS via Twilio para um número em formato E.164.
 *
 * SEGURANÇA (hardening anti-abuso — SMS bombing / phishing):
 *  - Chamada com SUPABASE_SERVICE_ROLE_KEY (servidor↔servidor, pg_net):
 *    texto arbitrário permitido (fluxo de emergência).
 *  - Chamada com JWT de utilizador autenticado:
 *    · body.dryRun = true  → valida apenas a configuração, NÃO envia SMS.
 *    · caso contrário      → envia APENAS um SMS de teste com TEXTO FIXO
 *      definido no servidor (o campo body/message do cliente é ignorado),
 *      limitado a 3 envios por hora por utilizador.
 *  - Sem credenciais válidas → 401.
 *
 * Environment secrets (Supabase Dashboard > Edge Functions > Secrets):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders, handlePreflight, json, isServiceRole, authenticateUser, rateLimit, safeText,
} from '../_shared/security.ts'

const E164_RE = /^\+[1-9]\d{1,14}$/

serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  const cors = corsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed', sent: false }, 405, cors)

  try {
    const body = await req.json().catch(() => ({} as any))
    const dryRun = body?.dryRun === true
    const to = safeText(body?.to ?? body?.phone, 20).trim()

    if (!to || !E164_RE.test(to)) {
      return json({ error: 'Invalid phone number format. Use E.164 (e.g. +258841234567)', sent: false }, 400, cors)
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
    const configured = !!(accountSid && authToken && fromNumber)

    // ── Autenticação ──
    const service = isServiceRole(req)
    let callerId: string | null = null
    if (!service) {
      callerId = await authenticateUser(req)
      if (!callerId) return json({ error: 'Não autenticado', sent: false }, 401, cors)
    }

    // dryRun → não envia nada, só informa a configuração
    if (dryRun) {
      return json({ dryRun: true, configured, sent: false }, 200, cors)
    }

    if (!configured) {
      console.error('[SMS] Twilio credentials not configured')
      return json({ error: 'SMS service not configured', sent: false }, 503, cors)
    }

    // ── Utilizadores autenticados: só SMS de teste, texto fixo, rate limited ──
    let smsBody: string
    if (service) {
      smsBody = safeText(body?.body ?? body?.message, 160)
      if (!smsBody) return json({ error: 'Missing "body" parameter', sent: false }, 400, cors)
    } else {
      const rl = rateLimit(`sms:${callerId}`, 3, 60 * 60 * 1000)
      if (!rl.ok) {
        return json({ error: `Limite de SMS de teste atingido. Tente dentro de ${rl.retryAfter}s`, sent: false }, 429, cors)
      }
      smsBody = '[StatusAds Connect] Teste de integracao SMS. Se recebeu esta mensagem, a integracao esta correcta.'
    }

    const credentials = btoa(`${accountSid}:${authToken}`)
    const twilioBody = new URLSearchParams({
      To: to,
      From: fromNumber!,
      Body: smsBody.length > 160 ? smsBody.slice(0, 157) + '...' : smsBody,
    })

    console.log(`[SMS] Sending to ${to.slice(-4)} (caller: ${service ? 'service' : callerId?.slice(0, 8)})`)

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
      }
    )

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text()
      console.error(`[SMS] Twilio error ${twilioResponse.status}:`, errorData)
      return json({ error: `Twilio API error: ${twilioResponse.status}`, sent: false }, 502, cors)
    }

    const result = await twilioResponse.json()
    console.log(`[SMS] Sent successfully, SID: ${result.sid}`)

    return json({ sent: true, sid: result.sid, to: result.to, status: result.status }, 200, cors)
  } catch (err) {
    console.error('[SMS] Unexpected error:', err)
    return json({ error: 'Internal server error', sent: false }, 500, cors)
  }
})
