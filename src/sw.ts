/**
 * Service Worker — StatusAds Connect
 *
 * Handles:
 *   1. Push notification events (emergency alerts in background)
 *   2. Notification click → navigate to correct page
 *   3. Message from main app (SKIP_WAITING, queue queries)
 *
 * Workbox handles precaching + runtime caching (configured in vite.config.ts)
 * This file only adds custom event handlers on top of Workbox.
 *
 * NOTE: The `self.__WB_MANIFEST` injection point is required by VitePWA injectManifest.
 * It gets replaced at build time with the precache manifest array.
 */

/// <reference lib="webworker" />

// eslint-disable-next-line no-restricted-globals
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any[]
}

import { precacheAndRoute } from 'workbox-precaching'
precacheAndRoute(self.__WB_MANIFEST)

// ============================================
// TYPES
// ============================================

interface PushData {
  emergency?: boolean
  alertId?: string
  latitude?: number
  longitude?: number
  url?: string
}

// Extended notification options (vibrate/actions not in standard TS types)
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
  actions?: { action: string; title: string; icon?: string }[]
  renotify?: boolean
}

// ============================================
// PUSH EVENT — received from push service
// ============================================

self.addEventListener('push', (event: PushEvent) => {
  let data: PushData = {}
  let title = 'StatusAds Connect'
  let body = 'Nova notificacao'

  if (event.data) {
    try {
      const parsed = event.data.json()
      data = parsed.data || parsed
      title = parsed.title || title
      body = parsed.body || body
    } catch {
      body = event.data.text()
    }
  }

  const isEmergency = data.emergency || title.includes('EMERGENCIA')

  const options: ExtendedNotificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.emergency ? `emergency-${data.alertId || Date.now()}` : `statusad-${Date.now()}`,
    vibrate: isEmergency ? [200, 100, 200, 100, 200] : [100],
    requireInteraction: isEmergency,
    renotify: isEmergency,
    data: {
      ...data,
      timestamp: Date.now(),
    },
  }

  // Emergency notifications get action buttons
  if (isEmergency) {
    options.actions = [
      { action: 'view', title: 'Ver no Mapa' },
      { action: 'dismiss', title: 'Dispensar' },
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )

  // Also vibrate device on emergency (works even if notification is silent)
  if (isEmergency && 'vibrate' in self) {
    ;(self as any).vibrate([200, 100, 200, 100, 200, 300, 200, 100, 200])
  }
})

// ============================================
// NOTIFICATION CLICK — user taps the notification
// ============================================

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const data = (event.notification.data as PushData) || {}
  const action = event.action

  // Handle action buttons
  if (action === 'dismiss') {
    return
  }

  // Determine URL to open
  let urlToOpen = '/'

  if (data.emergency) {
    urlToOpen = data.url || '/dashboard/emergency'
  } else if (data.url) {
    urlToOpen = data.url
  }

  // Ensure URL is same-origin
  const url = new URL(urlToOpen, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
  )
})

// ============================================
// NOTIFICATION CLOSE — reserved for analytics
// ============================================

self.addEventListener('notificationclose', () => {
  // Reserved for future analytics logging
})

// ============================================
// MESSAGE EVENT — from the main app
// ============================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { data } = event
  if (!data || !data.type) return

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
  }
})
