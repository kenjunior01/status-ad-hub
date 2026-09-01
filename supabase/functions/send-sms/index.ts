/**
 * Supabase Edge Function: send-sms
 *
 * Sends an SMS message via Twilio to a single phone number.
 * Called by notify-contacts or directly from the frontend.
 *
 * Environment secrets (set in Supabase Dashboard > Edge Functions > Secrets):
 *   TWILIO_ACCOUNT_SID  — Your Twilio account SID
 *   TWILIO_AUTH_TOKEN   — Your Twilio auth token
 *   TWILIO_PHONE_NUMBER — Your Twilio phone number (e.g. +15551234567)
 *
 * For production in Mozambique, consider:
 *   - Twilio (global, reliable)
 *   - Africa's Talking (local, cheaper for MZ numbers)
 *   - M-Pesa SMS API (Vodacom Mozambique)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendSmsPayload {
  to: string       // E.164 format: +258841234567
  body: string
  emergencyId?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, body, emergencyId } = await req.json() as SendSmsPayload

    if (!to || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" or "body" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[SMS] Twilio credentials not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured', sent: false }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone number format (basic E.164 check)
    const e164Regex = /^\+[1-9]\d{1,14}$/
    if (!e164Regex.test(to)) {
      console.warn(`[SMS] Invalid phone format: ${to}`)
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use E.164 (e.g. +258841234567)', sent: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Encode credentials for Twilio API
    const credentials = btoa(`${accountSid}:${authToken}`)

    const twilioBody = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: body.length > 160
        ? body.substring(0, 157) + '...'
        : body,
    })

    // Add emergency metadata in status callback if emergencyId provided
    if (emergencyId) {
      // We'll log this for tracking purposes
      console.log(`[SMS] Emergency ${emergencyId} -> ${to}`)
    }

    console.log(`[SMS] Sending to ${to.slice(-4)}: "${body.slice(0, 50)}..."`)

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
      return new Response(
        JSON.stringify({ error: `Twilio API error: ${twilioResponse.status}`, sent: false }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await twilioResponse.json()
    console.log(`[SMS] Sent successfully, SID: ${result.sid}`)

    return new Response(
      JSON.stringify({
        sent: true,
        sid: result.sid,
        to: result.to,
        status: result.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[SMS] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', sent: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
