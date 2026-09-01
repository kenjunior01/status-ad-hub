/**
 * Supabase Edge Function: notify-contacts
 *
 * Orchestrates notification delivery to all emergency contacts when
 * an emergency is triggered. Called from:
 *   1. Frontend after trigger_emergency RPC succeeds
 *   2. Database trigger via pg_net (automatic)
 *
 * For each contact it attempts:
 *   - SMS via Twilio (if phone available)
 *   - Web Push (if the contact is also a registered user)
 *
 * Environment secrets:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyContactsPayload {
  userId: string
  alertId: string
  latitude: number
  longitude: number
  contactPhones?: string[]  // Pre-fetched phones (avoids extra DB call)
}

interface ContactRow {
  phone: string
  name: string
  email: string
  alert_enabled: boolean
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, alertId, latitude, longitude, contactPhones } = await req.json() as NotifyContactsPayload

    if (!userId || !alertId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or alertId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // 1. Fetch emergency contacts (if not pre-fetched)
    let phones: string[] = contactPhones || []
    let contactNames: Map<string, string> = new Map()

    if (phones.length === 0) {
      const { data: contacts, error } = await admin
        .from('emergency_contacts')
        .select('phone, name, email, alert_enabled')
        .eq('user_id', userId)
        .eq('alert_enabled', true)

      if (error) {
        console.error('[NOTIFY] Failed to fetch contacts:', error.message)
      } else if (contacts) {
        for (const c of contacts as ContactRow[]) {
          if (c.phone && c.phone.trim()) {
            phones.push(c.phone.trim())
            contactNames.set(c.phone.trim(), c.name)
          }
        }
      }
    }

    // 2. Build SMS message
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    const trackUrl = `${supabaseUrl.replace('/rest/v1', '').replace('/auth/v1', '')}/track/${alertId}`

    const smsBody =
      `EMERGENCIA - StatusAds Connect\n` +
      `Uma emergencia foi activada!\n` +
      `Localizacao: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\n` +
      `Mapa: ${googleMapsUrl}\n` +
      `Acompanhe: ${trackUrl}\n` +
      `Receba alertas silenciosos.`

    // 3. Send SMS to all contacts in parallel
    const smsResults = await Promise.allSettled(
      phones.map(async (phone) => {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: phone,
              body: smsBody,
              emergencyId: alertId,
            }),
          })
          const result = await response.json()
          return { phone, success: response.ok, ...result }
        } catch (err) {
          return { phone, success: false, error: String(err) }
        }
      })
    )

    const sent = smsResults.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = smsResults.length - sent

    console.log(`[NOTIFY] ${sent}/${phones.length} SMS sent for alert ${alertId.slice(0, 8)}`)

    // 4. Send Web Push to the user's own devices
    try {
      const { data: pushSubs } = await admin
        .from('push_subscriptions')
        .select('endpoint, keys_p256dh, keys_auth')
        .eq('user_id', userId)

      if (pushSubs && pushSubs.length > 0) {
        const webpush = await import('https://esm.sh/web-push@3.6.7')
        const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')

        if (privateKey && publicKey) {
          webpush.setVapidDetails('mailto:support@statusmonetize.com', publicKey, privateKey)

          await Promise.allSettled(
            pushSubs.map(async (sub: any) => {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
                  JSON.stringify({
                    title: 'EMERGENCIA ACTIVADA',
                    body: `${phones.length} contactos notificados via SMS. Clique para ver mapa.`,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    data: {
                      emergency: true,
                      alertId,
                      latitude,
                      longitude,
                      url: '/dashboard/emergency',
                    },
                    tag: `emergency-${alertId}`,
                    vibrate: [200, 100, 200, 100, 200],
                    requireInteraction: true,
                    urgency: 'high',
                    actions: [
                      { action: 'view', title: 'Ver no Mapa' },
                      { action: 'dismiss', title: 'Dispensar' },
                    ],
                  }),
                  { TTL: 0, urgency: 'high' }
                )
              } catch (err: any) {
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                  await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                }
              }
            })
          )
        }
      }
    } catch (pushErr) {
      console.error('[NOTIFY] Push notification error:', pushErr)
      // Non-critical — SMS is the primary delivery
    }

    return new Response(
      JSON.stringify({ sent, failed, total: phones.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[NOTIFY] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', sent: 0, failed: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
