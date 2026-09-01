/**
 * Supabase Edge Function: web-push/send
 *
 * Receives push subscription data and a payload, encrypts and delivers
 * Web Push notifications via the browser push service.
 *
 * Environment secrets (set in Supabase Dashboard > Edge Functions > Secrets):
 *   VAPID_PRIVATE_KEY  — Private VAPID key (generate with: npx web-push generate-vapid-keys)
 *   VAPID_SUBJECT     — mailto: or https: URL identifying the app
 *
 * Called from the frontend after triggering an emergency.
 * Also callable from database triggers via pg_net.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
  urgency?: 'normal' | 'high' | 'critical'
  tag?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscriptions, payload } = await req.json() as {
      subscriptions: PushSubscription[]
      payload: PushPayload
    }

    if (!subscriptions?.length || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing subscriptions or payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:statusads@statusmonetize.com'

    if (!privateKey) {
      console.error('[PUSH] VAPID_PRIVATE_KEY not set')
      return new Response(
        JSON.stringify({ error: 'VAPID private key not configured', sent: 0, failed: subscriptions.length }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0
    const failedEndpoints: string[] = []

    for (const sub of subscriptions) {
      try {
        // Use the Web Push API via web-push library
        // In Deno, we can use the web-push npm module via esm.sh
        const webpush = await import('https://esm.sh/web-push@3.6.7')

        // Configure VAPID
        webpush.setVapidDetails(subject, Deno.env.get('VAPID_PUBLIC_KEY')!, privateKey)

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            data: payload.data || {},
            tag: payload.tag,
            vibrate: payload.urgency === 'critical' ? [200, 100, 200, 100, 200] : [100],
            requireInteraction: payload.urgency === 'critical',
            urgency: payload.urgency || 'high',
            actions: payload.urgency === 'critical' ? [
              { action: 'view', title: 'Ver no Mapa' },
              { action: 'dismiss', title: 'Dispensar' },
            ] : [],
          }),
          {
            TTL: payload.urgency === 'critical' ? 0 : 86400,
            urgency: payload.urgency === 'critical' ? 'high' : 'normal',
          }
        )
        sent++
      } catch (err: any) {
        console.error(`[PUSH] Failed for ${sub.endpoint.slice(-30)}:`, err?.message)
        failed++
        // Track failed endpoints for cleanup (410/404 = stale subscription)
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          failedEndpoints.push(sub.endpoint)
        }
      }
    }

    // Clean up stale subscriptions
    if (failedEndpoints.length > 0) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const admin = createClient(supabaseUrl, supabaseKey)
        await admin.from('push_subscriptions').delete().in('endpoint', failedEndpoints)
        console.log(`[PUSH] Cleaned up ${failedEndpoints.length} stale subscriptions`)
      } catch (cleanupErr) {
        console.error('[PUSH] Failed to clean stale subs:', cleanupErr)
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[PUSH] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', sent: 0, failed: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
