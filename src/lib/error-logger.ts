/**
 * error-logger.ts — Structured error logging service for StatusAds Connect
 *
 * Persists error logs to IndexedDB for durability.
 * Captures rich context: user, network, device, timestamp.
 * Provides query/clear/export capabilities for the Settings diagnostic viewer.
 */

// ---------- Types ----------

export interface ErrorLogEntry {
  id?: number
  timestamp: string
  context: string            // 'global' | 'emergency' | 'dashboard' | 'unhandled-rejection' | 'window-error' | custom
  source: 'boundary' | 'global-handler' | 'react-query' | 'manual'
  message: string
  stack?: string             // trimmed to 500 chars
  componentStack?: string    // React-only, trimmed to 500 chars
  userId?: string
  networkOnline?: boolean
  userAgent?: string
  url?: string
  severity: 'fatal' | 'error' | 'warning'
  extra?: Record<string, unknown>
}

const DB_NAME = 'statusads-error-logs'
const DB_VERSION = 1
const STORE = 'logs'
const MAX_ENTRIES = 50

// ---------- DB helpers ----------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('severity', 'severity', { unique: false })
        store.createIndex('context', 'context', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB()
  const tx = db.transaction(STORE, mode)
  return tx.objectStore(STORE)
}

// ---------- Public API ----------

/**
 * Log a structured error. Safe to call from anywhere.
 */
export async function logError(entry: Omit<ErrorLogEntry, 'id'>): Promise<void> {
  try {
    const store = await getStore('readwrite')
    const enriched: ErrorLogEntry = {
      ...entry,
      userAgent: entry.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
      url: entry.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      networkOnline: entry.networkOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true),
    }
    store.add(enriched)

    // Prune old entries beyond MAX_ENTRIES
    const countReq = store.count()
    countReq.onsuccess = () => {
      const count = countReq.result as number
      if (count > MAX_ENTRIES) {
        // Read all, sort by timestamp desc, delete oldest
        const allReq = store.getAll()
        allReq.onsuccess = () => {
          const all = (allReq.result as ErrorLogEntry[])
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          const toDelete = all.slice(0, count - MAX_ENTRIES)
          const delStore = store // same transaction if still active; otherwise we need new
          toDelete.forEach(e => {
            if (e.id !== undefined) {
              try { delStore.delete(e.id) } catch { /* noop */ }
            }
          })
        }
      }
    }

    // Also keep last 5 in localStorage as fast-access cache for the ErrorBoundary fallback UI
    try {
      const cache: Partial<ErrorLogEntry>[] = JSON.parse(localStorage.getItem('statusads_error_cache') || '[]')
      cache.unshift({ timestamp: enriched.timestamp, context: enriched.context, message: enriched.message, severity: enriched.severity })
      if (cache.length > 5) cache.length = 5
      localStorage.setItem('statusads_error_cache', JSON.stringify(cache))
    } catch { /* noop */ }
  } catch (e) {
    // Last resort: console only
    console.error('[ErrorLogger] Failed to persist error:', e)
  }
}

/**
 * Retrieve all error logs, newest first.
 */
export async function getErrorLogs(): Promise<ErrorLogEntry[]> {
  try {
    const store = await getStore('readonly')
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        const logs = (req.result as ErrorLogEntry[])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(logs)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

/**
 * Clear all error logs.
 */
export async function clearErrorLogs(): Promise<void> {
  try {
    const store = await getStore('readwrite')
    store.clear()
    localStorage.removeItem('statusads_error_cache')
    // Also clear legacy key
    localStorage.removeItem('statusads_error_log')
  } catch { /* noop */ }
}

/**
 * Export error logs as JSON string (for clipboard / download).
 */
export async function exportErrorLogs(): Promise<string> {
  const logs = await getErrorLogs()
  return JSON.stringify({
    app: 'StatusAds Connect',
    version: '2.9.0',
    exportedAt: new Date().toISOString(),
    count: logs.length,
    logs,
  }, null, 2)
}

/**
 * Get a quick summary for the Settings page.
 */
export async function getErrorSummary(): Promise<{ total: number; fatal: number; lastError: string | null; lastTimestamp: string | null }> {
  try {
    const logs = await getErrorLogs()
    const fatal = logs.filter(l => l.severity === 'fatal').length
    return {
      total: logs.length,
      fatal,
      lastError: logs[0]?.message ?? null,
      lastTimestamp: logs[0]?.timestamp ?? null,
    }
  } catch {
    return { total: 0, fatal: 0, lastError: null, lastTimestamp: null }
  }
}

/**
 * Build a context string from the current auth user (lazy, no import).
 * Called from ErrorBoundary and global handlers.
 */
export function getUserId(): string | undefined {
  try {
    // Try to get from Supabase localStorage key
    const authData = localStorage.getItem('sb-localhost-auth-token')
      || localStorage.getItem('sb-statusmonetize-auth-token')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed?.user?.id
    }
  } catch { /* noop */ }
  return undefined
}
