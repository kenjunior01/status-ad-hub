import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

/**
 * useNotifications
 *
 * Manages browser notification permissions and sends local notifications.
 * For a production app, you'd also register a push subscription with
 * a server (e.g. Supabase Edge Function) to send remote push notifications.
 *
 * Features:
 * - Permission request with explain-then-ask pattern
 * - Local notification display (works with Service Worker for background)
 * - Emergency-priority notifications that bypass DND on some platforms
 * - Notification click handler to navigate back to the app
 */

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unavailable'

export interface NotificationState {
  permission: NotificationPermission
  isSupported: boolean
}

interface NotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<boolean>
  notify: (options: NotifyOptions) => void
  notifyEmergency: (title: string, body: string, data?: Record<string, unknown>) => void
}

export interface NotifyOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string          // prevents duplicate notifications
  requireInteraction?: boolean
  data?: Record<string, unknown>
  onClick?: () => void
}

const NotificationContext = createContext<NotificationContextType>({
  permission: 'default',
  isSupported: false,
  requestPermission: async () => false,
  notify: () => {},
  notifyEmergency: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  // Read current permission on mount
  useEffect(() => {
    if (!isSupported) {
      setPermission('unavailable')
      return
    }
    setPermission(Notification.permission as NotificationPermission)

    // Listen for permission changes (e.g. user changes in browser settings)
    if ('permissions' in navigator) {
      (navigator.permissions as any).query({ name: 'notifications' }).then((result: any) => {
        result.onchange = () => {
          setPermission(result.state as NotificationPermission)
        }
      }).catch(() => {})
    }
  }, [isSupported])

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
    // 'default' — ask the user
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

  /** Send a local notification (works even via Service Worker in background) */
  const notify = useCallback((options: NotifyOptions) => {
    if (!isSupported || Notification.permission !== 'granted') return

    // If Service Worker is registered, use it for background delivery
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
        // Fallback to regular Notification API
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
    <NotificationContext.Provider value={{ permission, isSupported, requestPermission, notify, notifyEmergency }}>
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

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data
    if (data?.type === 'NOTIFICATION_CLICK') {
      // Handle notification click from SW
      window.focus()
      if (data.url) {
        window.location.href = data.url
      }
    }
  })
}
