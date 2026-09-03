import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initNativeChrome } from '@/lib/native'

/**
 * Install global error handlers at the EARLIEST possible moment —
 * before React mounts. These catch errors that occur during module
 * initialization, lazy-loading, or outside any React component.
 *
 * The useGlobalErrorHandlers hook in App.tsx will take over once
 * the React tree is ready (and remove these). But if an error
 * fires before that, we still capture it.
 */
const _earlyHandler = (msg: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
  // Will be properly logged once error-logger is imported
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      context: 'pre-mount',
      source: 'early-handler',
      message: typeof msg === 'string' ? msg : (msg instanceof ErrorEvent ? msg.message : 'Unknown error'),
      stack: error?.stack?.slice(0, 500),
      severity: 'error' as const,
    }
    // Try IndexedDB directly
    const req = indexedDB.open('statusads-error-logs', 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('logs')) {
        req.result.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('logs', 'readwrite')
        tx.objectStore('logs').add(entry)
      } catch { /* noop */ }
    }
  } catch { /* noop */ }
}

window.addEventListener('error', _earlyHandler as EventListener)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const msg = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled rejection'
  _earlyHandler(msg)
})

// ── Tema seleccionável (estilo Calorist) — aplica ANTES do mount para
//    não haver flash da cor errada. gold = default (sem data-theme). ──
try {
  const saved = localStorage.getItem('statusads-theme')
  if (saved && ['mint', 'lavanda', 'mono', 'coral'].includes(saved)) {
    document.documentElement.setAttribute('data-theme', saved)
    const metaColors: Record<string, string> = {
      mint: '#0B3B2E', lavanda: '#221A3F', mono: '#09090B', coral: '#3F0A16',
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColors[saved] ?? '#D4AF37')
  }
} catch { /* storage indisponível — fica gold */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Chrome nativo Capacitor (status bar dourada, splash com fade) — no-op em web
void initNativeChrome()