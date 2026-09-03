/**
 * Supabase Edge Function: web-push
 *
 * Envia Web Push (VAPID) para os dispositivos de um utilizador.
 *
 * SEGURANÇA (hardening — push spam / abuso de VAPID):
 *  - Exige autenticação: service_role (pg_net) OU JWT de utilizador.
 *  - Com JWT: as subscrições são SEMPRE lidas da base de dados por
 *    user_id = sub do token — o campo body.subscriptions é ignorado
 *    (impede enviar push para endpoints de terceiros).
 *  - title/body sanitizados e limitados.
 *  - Rate limit de 10 envios / minuto por utilizador.
 *
 * Environment secrets:
 *   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders, handlePreflight, json, isServiceRole, authenticateUser,
  rateLimit, isUuid, safeText,
} from '../_shared/security.ts'

interface PushPayload {
  title?: string
  body?: string
  data?: Record<string, unknown>
  urgency?: 'normal' | 'high' | 'critical'
  tag?: string
}

serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  const cors = corsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed', sent: 0, failed: 0 }, 405, cors)

  try {
    const payload = (await req.json().catch(() => ({} as any))) as {
      userId?: string
      payload?: PushPayload
    }

    const service = isServiceRole(req)

    // ── Autenticação ──
    let targetUserId: string | null = null
    if (service) {
      targetUserId = safeText(payload?.userId, 64) || null
      if (!targetUserId || !isUuid(targetUserId)) {
        return json({ error: 'userId inválido', sent: 0, failed: 0 }, 400, cors)
      }
    } else {
      targetUserId = await authenticateUser(req)
      if (!targetUserId) {
        return json({ error: 'Não autenticado', sent: 0, failed: 0 }, 401, cors)
      }
      const rl = rateLimit(`push:${targetUserId}`, 10, 60 * 1000)
      if (!rl.ok) {
        return json({ error: `Demasiados envios. Tente dentro de ${rl.retryAfter}s`, sent: 0, failed: 0 }, 429, cors)
      }
    }

    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:statusads@statusmonetize.com'

    if (!privateKey || !publicKey) {
      console.error('[PUSH] VAPID keys not set')
      return json({ error: 'Push service not configured', sent: 0, failed: 0 }, 503, cors)
    }

    // ── Subscrições: SEMPRE da BD, do próprio utilizador ──
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: pushSubs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', targetUserId)

    if (subsErr) {
      console.error('[PUSH] Failed to fetch subscriptions:', subsErr.message)
      return json({ error: 'Erro interno', sent: 0, failed: 0 }, 500, cors)
    }
    if (!pushSubs || pushSubs.length === 0) {
      return json({ sent: 0, failed: 0 }, 200, cors)
    }

    // ── Payload sanitizado (o cliente nunca controla HTML/tamanhos) ──
    const inner = payload?.payload ?? {}
    const title = safeText(inner.title, 80) || 'StatusAds Connect'
    const bodyText = safeText(inner.body, 200)
    const urgency = inner.urgency === 'critical' ? 'critical' : inner.urgency === 'normal' ? 'normal' : 'high'
    const tag = safeText(inner.tag, 60)
    const data = (inner.data && typeof inner.data === 'object' && !Array.isArray(inner.data))
      ? inner.data
      : {}

    const webpush = await import('https://esm.sh/web-push@3.6.7')
    webpush.setVapidDetails(subject, publicKey, privateKey)

    let sent = 0
    let failed = 0
    const failedEndpoints: string[] = []

    for (const sub of pushSubs as any[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          JSON.stringify({
            title,
            body: bodyText,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            data,
            tag: tag || undefined,
            vibrate: urgency === 'critical' ? [200, 100, 200, 100, 200] : [100],
            requireInteraction: urgency === 'critical',
            urgency: urgency === 'critical' ? 'high' : urgency,
            actions: urgency === 'critical' ? [
              { action: 'view', title: 'Ver no Mapa' },
              { action: 'dismiss', title: 'Dispensar' },
            ] : [],
          }),
          {
            TTL: urgency === 'critical' ? 0 : 86400,
            urgency: urgency === 'critical' ? 'high' : 'normal',
          }
        )
        sent++
      } catch (err: any) {
        console.error(`[PUSH] Failed for ${String(sub.endpoint).slice(-30)}:`, err?.message)
        failed++
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          failedEndpoints.push(sub.endpoint)
        }
      }
    }

    // Limpar subscrições mortas
    if (failedEndpoints.length > 0) {
      try {
        await admin.from('push_subscriptions').delete().in('endpoint', failedEndpoints)
        console.log(`[PUSH] Cleaned up ${failedEndpoints.length} stale subscriptions`)
      } catch (cleanupErr) {
        console.error('[PUSH] Failed to clean stale subs:', cleanupErr)
      }
    }

    return json({ sent, failed }, 200, cors)
  } catch (err) {
    console.error('[PUSH] Unexpected error:', err)
    return json({ error: 'Internal server error', sent: 0, failed: 0 }, 500, cors)
  }
})
