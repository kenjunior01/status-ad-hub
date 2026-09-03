/**
 * Supabase Edge Function: notify-contacts
 *
 * Orquestra a notificação dos contactos de emergência quando um alerta é
 * activado. Chamada por:
 *   1. Frontend após o RPC trigger_emergency (JWT de utilizador)
 *   2. Trigger da base de dados via pg_net (service_role key)
 *
 * SEGURANÇA (hardening):
 *  - Exige autenticação: service_role OU JWT de utilizador com
 *    body.userId == sub do token (impede disparar emergências alheias).
 *  - contactPhones do cliente é IGNORADO para utilizadores — os números são
 *    SEMPRE lidos da base de dados (impede usar a app como SMS bomber).
 *  - Validação estrita de UUIDs e coordenadas.
 *  - Rate limit de 5 chamadas / 10 min por utilizador.
 *
 * Environment secrets:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders, handlePreflight, json, isServiceRole, authenticateUser,
  rateLimit, isUuid, clampCoordinates, safeText,
} from '../_shared/security.ts'

interface ContactRow {
  phone: string
  name: string
  email: string
  alert_enabled: boolean
}

serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  const cors = corsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  try {
    const payload = await req.json().catch(() => ({} as any))
    const service = isServiceRole(req)

    // ── Autenticação ──
    let callerId: string | null = null
    if (!service) {
      callerId = await authenticateUser(req)
      if (!callerId) return json({ error: 'Não autenticado' }, 401, cors)
    }

    const userId = safeText(payload?.userId, 64)
    const alertId = safeText(payload?.alertId, 64)
    if (!isUuid(userId) || !isUuid(alertId)) {
      return json({ error: 'userId/alertId inválidos' }, 400, cors)
    }

    // Utilizador só pode notificar as próprias emergências
    if (!service && callerId !== userId) {
      return json({ error: 'Proibido' }, 403, cors)
    }

    // Rate limit por utilizador (service_role não se limita — vem da DB)
    if (!service) {
      const rl = rateLimit(`notify:${userId}`, 5, 10 * 60 * 1000)
      if (!rl.ok) {
        return json({ error: `Demasiadas chamadas. Tente dentro de ${rl.retryAfter}s` }, 429, cors)
      }
    }

    // Coordenadas: números finitos dentro dos limites geográficos
    const coords = clampCoordinates(payload?.latitude ?? 0, payload?.longitude ?? 0)
    if (!coords.ok) {
      return json({ error: 'Coordenadas inválidas' }, 400, cors)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Números de telefone: SEMPRE da base de dados para chamadas de
    //    utilizador; service_role (pg_net) pode pré-fornecer. ──
    let phones: string[] = service ? (Array.isArray(payload?.contactPhones) ? payload.contactPhones.slice(0, 20).map((p: unknown) => safeText(p, 20)).filter(Boolean) : []) : []
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

    if (phones.length === 0) {
      return json({ sent: 0, failed: 0, total: 0 }, 200, cors)
    }

    // ── Mensagem SMS (tudo derivado de valores validados/limitados) ──
    const googleMapsUrl = `https://www.google.com/maps?q=${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`
    const trackUrl = `${Deno.env.get('SUPABASE_URL')!.replace('/rest/v1', '').replace('/auth/v1', '')}/track/${alertId}`

    const smsBody =
      `EMERGENCIA - StatusAds Connect\n` +
      `Uma emergencia foi activada!\n` +
      `Localizacao: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\n` +
      `Mapa: ${googleMapsUrl}\n` +
      `Acompanhe: ${trackUrl}\n` +
      `Receba alertas silenciosos.`

    // ── Enviar SMS em paralelo ──
    const smsResults = await Promise.allSettled(
      phones.map(async (phone) => {
        try {
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: phone,
              body: smsBody,
              emergencyId: alertId,
            }),
          })
          const result = await response.json().catch(() => ({}))
          return { phone, success: response.ok, ...result }
        } catch (err) {
          return { phone, success: false, error: String(err) }
        }
      })
    )

    const sent = smsResults.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = smsResults.length - sent

    console.log(`[NOTIFY] ${sent}/${phones.length} SMS sent for alert ${alertId.slice(0, 8)} (caller: ${service ? 'service' : callerId?.slice(0, 8)})`)

    // ── Web Push para os dispositivos do próprio utilizador ──
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
                      latitude: coords.lat,
                      longitude: coords.lng,
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

    return json({ sent, failed, total: phones.length }, 200, cors)
  } catch (err) {
    console.error('[NOTIFY] Unexpected error:', err)
    return json({ error: 'Internal server error', sent: 0, failed: 0 }, 500, cors)
  }
})
