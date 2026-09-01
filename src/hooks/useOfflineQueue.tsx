import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkState } from '@/hooks/useNetworkStatus'
import * as api from '@/lib/api'
import { toast } from 'sonner'

/**
 * OfflineQueueProvider + useOfflineQueue
 *
 * Client-side offline queue backed by IndexedDB.
 * Emergencies/events triggered while offline are stored locally
 * and automatically retried when connectivity returns.
 *
 * Uses React Context so all components share the same queue state.
 */

const DB_NAME = 'statusads-offline-queue'
const DB_VERSION = 1
const STORE = 'requests'
const MAX_EMERGENCY_RETRIES = 15
const MAX_EVENT_RETRIES = 8
const RETRY_DELAY = 3000
const BATCH = 10

export interface QueuedItem {
  id?: number
  type: 'emergency' | 'event'
  payload: Record<string, unknown>
  createdAt: number
  retries: number
  maxRetries: number
  status: 'pending' | 'syncing' | 'failed'
}

export interface OfflineQueueState {
  pendingCount: number
  emergencyPending: number
  eventPending: number
  isSyncing: boolean
  lastSyncAt: string | null
  lastError: string | null
}

interface CtxType extends OfflineQueueState {
  syncQueue: () => Promise<void>
  queueEmergency: (lat: number, lng: number) => Promise<number>
  queueEvent: (p: { type: string; description: string; deviceId?: string; latitude?: number; longitude?: number }) => Promise<number>
  clearQueue: () => Promise<void>
  refreshCounts: () => Promise<void>
}

const Ctx = createContext<CtxType>({
  pendingCount: 0, emergencyPending: 0, eventPending: 0,
  isSyncing: false, lastSyncAt: null, lastError: null,
  syncQueue: async () => {}, queueEmergency: async () => 0,
  queueEvent: async () => 0, clearQueue: async () => {}, refreshCounts: async () => {},
})

// ---- IndexedDB helpers ----

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }) }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

async function getAllPending(): Promise<QueuedItem[]> {
  const d = await db()
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readonly'), s = tx.objectStore(STORE), r = s.getAll()
    r.onsuccess = () => { d.close(); res((r.result as QueuedItem[]).filter(i => i.status === 'pending')) }
    r.onerror = () => { d.close(); rej(r.error) }
  })
}

async function addQueued(item: Omit<QueuedItem, 'id'>): Promise<number> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = d.transaction(STORE, 'readwrite').objectStore(STORE).add(item)
    r.onsuccess = () => { d.close(); res(r.result as number) }
    r.onerror = () => { d.close(); rej(r.error) }
  })
}

async function updateQueued(item: QueuedItem): Promise<void> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = d.transaction(STORE, 'readwrite').objectStore(STORE).put(item)
    r.onsuccess = () => { d.close(); res() }
    r.onerror = () => { d.close(); rej(r.error) }
  })
}

async function deleteQueued(id: number): Promise<void> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    r.onsuccess = () => { d.close(); res() }
    r.onerror = () => { d.close(); rej(r.error) }
  })
}

// ---- Provider ----

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { isOnline, wasOffline } = useNetworkState()
  const userId = user?.id
  const [st, setSt] = useState<OfflineQueueState>({ pendingCount: 0, emergencyPending: 0, eventPending: 0, isSyncing: false, lastSyncAt: null, lastError: null })
  const syncing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const items = await getAllPending()
      setSt(s => ({ ...s, pendingCount: items.length, emergencyPending: items.filter(i => i.type === 'emergency').length, eventPending: items.filter(i => i.type === 'event').length }))
    } catch { /* ignore */ }
  }, [])

  const processItem = useCallback(async (item: QueuedItem): Promise<boolean> => {
    if (!userId) return false
    try {
      if (item.type === 'emergency') {
        const { latitude, longitude } = item.payload as { latitude: number; longitude: number }
        await api.triggerEmergency(userId, latitude, longitude)
      } else {
        const { type, description, deviceId, latitude, longitude } = item.payload as { type: string; description: string; deviceId?: string; latitude?: number; longitude?: number }
        await api.logEvent(userId, type as any, description, deviceId, latitude, longitude)
      }
      if (item.id != null) await deleteQueued(item.id)
      return true
    } catch {
      const nr = item.retries + 1
      if (nr >= item.maxRetries) { await updateQueued({ ...item, retries: nr, status: 'failed' }) }
      else { await updateQueued({ ...item, retries: nr }) }
      return false
    }
  }, [userId])

  const syncQueue = useCallback(async () => {
    if (!userId || syncing.current || !isOnline) return
    syncing.current = true
    setSt(s => ({ ...s, isSyncing: true, lastError: null }))
    try {
      const pending = await getAllPending()
      const ordered = [...pending.filter(i => i.type === 'emergency'), ...pending.filter(i => i.type === 'event')].slice(0, BATCH)
      let ok = 0, fail = 0
      for (const item of ordered) {
        if (await processItem(item)) { ok++ } else { fail++ }
        await new Promise(r => setTimeout(r, RETRY_DELAY))
      }
      setSt(s => ({ ...s, isSyncing: false, lastSyncAt: new Date().toISOString(), lastError: fail > 0 ? `${fail} falhou(s)` : null }))
      if (ok > 0) toast.success(`${ok} item(s) sincronizados`, { duration: 3000 })
    } catch (e) {
      setSt(s => ({ ...s, isSyncing: false, lastError: e instanceof Error ? e.message : 'Erro' }))
    } finally {
      syncing.current = false
      await refresh()
    }
  }, [userId, isOnline, processItem, refresh])

  const queueEmergency = useCallback(async (lat: number, lng: number) => {
    const id = await addQueued({ type: 'emergency', payload: { latitude: lat, longitude: lng }, createdAt: Date.now(), retries: 0, maxRetries: MAX_EMERGENCY_RETRIES, status: 'pending' })
    await refresh()
    return id
  }, [refresh])

  const queueEvent = useCallback(async (p: { type: string; description: string; deviceId?: string; latitude?: number; longitude?: number }) => {
    const id = await addQueued({ type: 'event', payload: p as Record<string, unknown>, createdAt: Date.now(), retries: 0, maxRetries: MAX_EVENT_RETRIES, status: 'pending' })
    await refresh()
    return id
  }, [refresh])

  const clearQueue = useCallback(async () => {
    const d = await db()
    return new Promise<void>((res, rej) => {
      const r = d.transaction(STORE, 'readwrite').objectStore(STORE).clear()
      r.onsuccess = () => { d.close(); setSt({ pendingCount: 0, emergencyPending: 0, eventPending: 0, isSyncing: false, lastSyncAt: new Date().toISOString(), lastError: null }); res() }
      r.onerror = () => { d.close(); rej(r.error) }
    })
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && st.pendingCount > 0) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(syncQueue, 1000)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [isOnline, wasOffline, st.pendingCount, syncQueue])

  // Initial count
  useEffect(() => { refresh() }, [refresh])

  return (
    <Ctx.Provider value={{ ...st, syncQueue, queueEmergency, queueEvent, clearQueue, refreshCounts: refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export const useOfflineQueue = () => useContext(Ctx)
