import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, X, WifiOff, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/usePWA'
import { SpotlightCard } from '@/components/effects'

const DISMISS_KEY = 'statusads-pwa-prompt-dismissed-at'
const DISMISS_DAYS = 3

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return at > 0 && (Date.now() - at) < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

function rememberDismissal() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
}

/**
 * Banners de estado PWA (offline / actualização / instalar).
 * Um único contentor fixo empilha os banners activos — nunca se sobrepõem.
 * O fecho do banner "Instalar" fica guardado 3 dias (localStorage).
 */
export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOffline, isUpdateAvailable, installApp, updateApp } = usePWA()
  const [dismissed, setDismissed] = useState(() => dismissedRecently())
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const navigate = useNavigate()

  const dismissInstall = () => { rememberDismissal(); setDismissed(true) }

  const showOffline = isOffline && !offlineDismissed
  const showUpdate = isUpdateAvailable && !updateDismissed
  const showInstall = isInstallable && !dismissed

  if (!showOffline && !showUpdate && !showInstall) return null

  return (
    <div className="fixed bottom-36 lg:bottom-6 inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-md z-40 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {showOffline && (
          <motion.div
            key="offline"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="pointer-events-auto"
          >
            <SpotlightCard className="border-amber-500/20">
              <div className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 shrink-0">
                <WifiOff className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-400">Modo Offline Activo</p>
                <p className="text-[11px] text-white/30 mt-0.5">Dados em cache. O rastreamento BLE continua activo.</p>
              </div>
              <button onClick={() => setOfflineDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
                <X className="h-4 w-4 text-white/30" />
              </button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {showUpdate && (
          <motion.div
            key="update"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="pointer-events-auto"
          >
            <SpotlightCard className="border-brand/20">
              <div className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/15 shrink-0 animate-glow-pulse">
                <RefreshCw className="h-5 w-5 text-brand" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand">Actualizacao Disponivel</p>
                <p className="text-[11px] text-white/30 mt-0.5">Nova versao do app pronta para instalar.</p>
              </div>
              <Button
                onClick={updateApp}
                size="sm"
                className="shrink-0 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Actualizar
              </Button>
              <button onClick={() => setUpdateDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
                <X className="h-4 w-4 text-white/30" />
              </button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {showInstall && (
          <motion.div
            key="install"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="pointer-events-auto"
          >
            <SpotlightCard className="border-brand/20">
              <div className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/15 shrink-0">
                <Shield className="h-5 w-5 text-brand" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Instalar StatusAds</p>
                <p className="text-[11px] text-white/30 mt-0.5">Acesso rapido, modo offline e alertas em segundo plano.</p>
              </div>
              <Button
                onClick={() => navigate('/instalar')}
                size="sm"
                className="shrink-0 bg-brand hover:bg-brand-dark text-black rounded-xl text-xs gap-1.5 hover:shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)] transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Escolher forma
              </Button>
              <button onClick={dismissInstall} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
                <X className="h-4 w-4 text-white/30" />
              </button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
