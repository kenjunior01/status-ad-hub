import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import * as push from '@/lib/web-push'

/**
 * useNotifications
 *
 * Manages browser notification permissions, local notifications,
 * and Web Push subscription lifecycle.
 *
 * Features:
 * - Permission request with explain-then-ask pattern
 * - Local notification display (works with Service Worker for background)
 * - Emergency-priority notifications that bypass DND on some platforms
 * - Web Push subscription management (VAPID)
 * - Notification click handler to navigate back to the app
 */

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unavailable'

export interface NotificationState {
  permission: NotificationPermission
  isSupported: boolean
  isPushSubscribed: boolean
  isPushSupported: boolean
}

interface NotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
  isPushSubscribed: boolean
  isPushSupported: boolean
  requestPermission: () => Promise<boolean>
  notify: (options: NotifyOptions) => void
  notifyEmergency: (title: string, body: string, data?: Record<string, unknown>) => void
  subscribePush: () => Promise<boolean>
  unsubscribePush: () => Promise<void>
}

export interface NotifyOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: Record<string, unknown>
  onClick?: () => void
}

const NotificationContext = createContext<NotificationContextType>({
  permission: 'default',
  isSupported: false,
  isPushSubscribed: false,
  isPushSupported: false,
  requestPermission: async () => false,
  notify: () => {},
  notifyEmergency: () => {},
  subscribePush: async () => false,
  unsubscribePush: async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const isSupported = typeof window !== 'undefined' && 'Notification' in window
  const isPushSupported = push.isPushSupported()

  // Read current permission on mount
  useEffect(() => {
    if (!isSupported) {
      setPermission('unavailable')
      return
    }
    setPermission(Notification.permission as NotificationPermission)

    if ('permissions' in navigator) {
      (navigator.permissions as any).query({ name: 'notifications' }).then((result: any) => {
        result.onchange = () => {
          setPermission(result.state as NotificationPermission)
        }
      }).catch(() => {})
    }
  }, [isSupported])

  // Check push subscription status when user is available
  useEffect(() => {
    if (!user?.id || !isPushSupported || permission !== 'granted') {
      setIsPushSubscribed(false)
      return
    }
    push.hasPushSubscription(user.id).then(setIsPushSubscribed).catch(() => setIsPushSubscribed(false))
  }, [user?.id, isPushSupported, permission])

  // Auto-subscribe to push when permission is granted
  useEffect(() => {
    if (permission === 'granted' && user?.id && isPushSupported && !isPushSubscribed) {
      push.subscribeToPush(user.id).then((ok) => {
        if (ok) {
          setIsPushSubscribed(true)
          console.log('[NOTIF] Auto-subscribed to Web Push')
        }
      }).catch(() => {})
    }
  }, [permission, user?.id, isPushSupported, isPushSubscribed])

  /** Request notification permission from the user */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notificacoes nao suportadas neste navegador')
      return false
    }
    if (Notification.permission === 'granted') {
      setPermission('granted')
      return true
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      toast.error('Notificacoes bloqueadas. Active nas definicoes do navegador.')
      return false
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermission)
      if (result === 'granted') {
        toast.success('Notificacoes activadas')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [isSupported])

  /** Manually subscribe to Web Push */
  const subscribePush = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return false
    }
    const ok = await push.subscribeToPush(user.id)
    if (ok) {
      setIsPushSubscribed(true)
      toast.success('Notificacoes push activadas')
    } else {
      toast.error('Falha ao activar notificacoes push')
    }
    return ok
  }, [user?.id, permission, requestPermission])

  /** Unsubscribe from Web Push */
  const unsubscribePush = useCallback(async () => {
    if (!user?.id) return
    await push.unsubscribeFromPush(user.id)
    setIsPushSubscribed(false)
    toast.info('Notificacoes push desactivadas')
  }, [user?.id])

  /** Send a local notification (works even via Service Worker in background) */
  const notify = useCallback((options: NotifyOptions) => {
    if (!isSupported || Notification.permission !== 'granted') return

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
          badge: options.badge || '/pwa-192x192.png',
          tag: options.tag || `statusad-${Date.now()}`,
          requireInteraction: options.requireInteraction ?? false,
          data: options.data || {},
          vibrate: options.requireInteraction ? [200, 100, 200, 100, 200] : [100],
          actions: options.requireInteraction ? [
            { action: 'view', title: 'Ver no Mapa' },
            { action: 'dismiss', title: 'Dispensar' },
          ] : [],
        })
      }).catch(() => {
        showFallbackNotification(options)
      })
    } else {
      showFallbackNotification(options)
    }
  }, [isSupported])

  /** Emergency notification — high priority, requires interaction */
  const notifyEmergency = useCallback((title: string, body: string, data?: Record<string, unknown>) => {
    notify({
      title,
      body,
      requireInteraction: true,
      tag: 'statusad-emergency',
      data: { emergency: true, timestamp: Date.now(), ...data },
    })
  }, [notify])

  return (
    <NotificationContext.Provider value={{
      permission, isSupported, isPushSubscribed, isPushSupported,
      requestPermission, notify, notifyEmergency, subscribePush, unsubscribePush,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

// ============================================
// Helpers
// ============================================

function showFallbackNotification(options: NotifyOptions) {
  try {
    const n = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/pwa-192x192.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction,
    })
    if (options.onClick) {
      n.onclick = () => { window.focus(); options.onClick?.() }
    }
  } catch {
    // Notification API might fail in some contexts
  }
}

/**
 * Set up notification click handlers on the Service Worker.
 * Call this once at app init to handle notification taps.
 */
export function setupServiceWorkerNotifications() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data
    if (data?.type === 'NOTIFICATION_CLICK') {
      window.focus()
      if (data.url) {
        window.location.href = data.url
      }
    }
  })
}
