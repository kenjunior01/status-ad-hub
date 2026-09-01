/**
 * useGlobalErrorHandlers — Catches errors outside React's error boundary.
 *
 * - window.onerror: synchronous / script errors
 * - unhandledrejection: uncaught async Promise rejections
 * - React Query: global mutation onError callback
 *
 * All feed into error-logger.ts for structured persistence.
 * Returns a cleanup function (call on unmount).
 */

import { useEffect, useCallback } from 'react'
import { logError, getUserId } from '@/lib/error-logger'
import type { ErrorLogEntry } from '@/lib/error-logger'

// Dedup: don't log the same message within 2 seconds
const recentMessages = new Map<string, number>()
const DEDUP_MS = 2_000

function isDuplicate(message: string): boolean {
  const now = Date.now()
  const last = recentMessages.get(message)
  if (last && now - last < DEDUP_MS) return true
  recentMessages.set(message, now)
  // Prune old entries
  if (recentMessages.size > 50) {
    for (const [key, ts] of recentMessages) {
      if (now - ts > 10_000) recentMessages.delete(key)
    }
  }
  return false
}

// ---------- React Query default mutation error callback ----------

export function getReactQueryDefaults() {
  return {
    mutations: {
      onError: (error: Error) => {
        const msg = error?.message || 'Mutation error'
        if (isDuplicate(msg)) return
        logError({
          timestamp: new Date().toISOString(),
          context: 'react-query',
          source: 'react-query',
          message: msg,
          stack: error?.stack?.slice(0, 500),
          userId: getUserId(),
          severity: 'error',
        })
      },
    },
    queries: {
      // Don't log query errors by default (too noisy, handled by individual hooks)
      // But retry is configured here for consistency
      retry: 2,
      staleTime: 30_000,
    },
  }
}

// ---------- Hook ----------

export function useGlobalErrorHandlers(): void {
  const handleOnError = useCallback((
    event: ErrorEvent | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => {
    // Ignore script-load errors from browser extensions / 3rd party
    if (source && (source.includes('extension') || source.includes('chrome-extension') || source.includes('moz-extension'))) {
      return
    }
    const message = typeof event === 'string' ? event : (event.message || 'Unknown error')
    if (isDuplicate(message)) return

    logError({
      timestamp: new Date().toISOString(),
      context: 'window-error',
      source: 'global-handler',
      message,
      stack: error?.stack?.slice(0, 500),
      userId: getUserId(),
      severity: 'error',
      extra: source ? { source, lineno, colno } : undefined,
    })
  }, [])

  const handleRejection = useCallback((event: PromiseRejectionEvent) => {
    const reason = event?.reason
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'Unhandled promise rejection'
    if (isDuplicate(message)) return

    logError({
      timestamp: new Date().toISOString(),
      context: 'unhandled-rejection',
      source: 'global-handler',
      message,
      stack: reason instanceof Error ? reason.stack?.slice(0, 500) : undefined,
      userId: getUserId(),
      severity: 'warning',
      extra: { reasonType: typeof reason },
    })

    // Prevent default browser console unhandled rejection warning
    // (we're handling it ourselves)
    event.preventDefault?.()
  }, [])

  useEffect(() => {
    window.addEventListener('error', handleOnError as EventListener)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleOnError as EventListener)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [handleOnError, handleRejection])
}
