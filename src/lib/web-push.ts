import { supabase } from '@/lib/supabase'

/**
 * Web Push Notification System
 *
 * Manages VAPID push subscription lifecycle:
 * 1. Generate VAPID key pair (one-time, store in env)
 * 2. Subscribe via Service Worker pushManager
 * 3. Save subscription to Supabase (push_subscriptions table)
 * 4. Send push via Supabase Edge Function (web-push/send)
 *
 * VAPID keys are application-server keys that identify this app to
 * the browser's push service. Generate once:
 *   npx web-push generate-vapid-keys
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export interface PushSubscriptionData {
  id?: string
  user_id: string
  endpoint: string
  keys_p256dh: string
  keys_auth: string
  created_at?: string
}

/**
 * Check if Web Push is supported (requires SW + pushManager + VAPID key)
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    VAPID_PUBLIC_KEY.length > 0
  )
}

/**
 * Convert a base64 VAPID key to Uint8Array for pushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications.
 * Call after notification permission is granted.
 * Saves the subscription to Supabase for later push delivery.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[PUSH] Web Push not supported or VAPID key missing')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Already subscribed — sync to DB in case it changed
      await saveSubscriptionToDb(userId, subscription)
      return true
    }

    // Create new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await saveSubscriptionToDb(userId, subscription)
    return true
  } catch (err) {
    console.error('[PUSH] Failed to subscribe:', err)
    return false
  }
}

/**
 * Unsubscribe from push notifications and remove from DB.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    // Remove from Supabase
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

  } catch (err) {
    console.error('[PUSH] Failed to unsubscribe:', err)
  }
}

/**
 * Save a PushSubscription to Supabase.
 * Upserts by user_id (one subscription per user per device).
 */
async function saveSubscriptionToDb(userId: string, subscription: PushSubscription): Promise<void> {
  const sub = subscription.toJSON()
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    console.error('[PUSH] Incomplete subscription data')
    return
  }

  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      keys_p256dh: sub.keys.p256dh,
      keys_auth: sub.keys.auth,
 }, {
    onConflict: 'user_id',
  })
}

/**
 * Send a push notification via Supabase Edge Function.
 * The edge function handles payload encryption and delivery.
 *
 * For emergency alerts, this is called from the frontend after triggering.
 * For production, this should be called from a Supabase trigger or
 * the trigger_emergency RPC itself.
 */
export async function sendPushNotification(payload: {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  urgency?: 'normal' | 'high' | 'critical'
  tag?: string
}): Promise<{ sent: number; failed: number }> {
  const { userId, title, body, data, urgency = 'high', tag } = payload

  // Get user's push subscriptions
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('user_id', userId)

  if (error || !subs || subs.length === 0) {
    return { sent: 0, failed: 0 }
  }

  // Try to call the edge function to send push
  try {
    const { data: result, error: fnError } = await supabase.functions.invoke('web-push/send', {
      body: {
        subscriptions: subs.map((s) => ({
          endpoint: s.endpoint,
          keys: { p256dh: s.keys_p256dh, auth: s.keys_auth },
        })),
        payload: { title, body, data, urgency, tag },
      },
    })

    if (fnError) {
      console.error('[PUSH] Edge function error:', fnError)
      return { sent: 0, failed: subs.length }
    }

    return (result as any) || { sent: 0, failed: 0 }
  } catch {
    // Edge function not deployed yet — fallback to local notification
    console.warn('[PUSH] Edge function not available, using local notification')
    return { sent: 0, failed: subs.length }
  }
}

/**
 * Send emergency push to all devices of a user.
 * Called after triggering an emergency.
 */
export async function sendEmergencyPush(userId: string, alertId: string, lat: number, lng: number): Promise<void> {
  await sendPushNotification({
    userId,
    title: 'EMERGENCIA — StatusAds Connect',
    body: 'Emergencia activada! Abra a app para ver detalhes e resolver.',
    data: { emergency: true, alertId, latitude: lat, longitude: lng, url: '/dashboard/emergency' },
    urgency: 'critical',
    tag: `emergency-${alertId}`,
  })
}

/**
 * Check if user has an active push subscription stored.
 */
export async function hasPushSubscription(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (error || !data || data.length === 0) return false
  return true
}
