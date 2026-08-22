import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, X, WifiOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/usePWA'
import { SpotlightCard } from '@/components/effects'

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOffline, isUpdateAvailable, installApp, updateApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
        >
          <SpotlightCard className="p-4 flex items-center gap-3 border-amber-500/20">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 shrink-0">
              <WifiOff className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-400">Modo Offline Activo</p>
              <p className="text-[11px] text-white/30 mt-0.5">Dados em cache. O rastreamento BLE continua activo.</p>
            </div>
            <button onClick={() => setDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
              <X className="h-4 w-4 text-white/30" />
            </button>
          </SpotlightCard>
        </motion.div>
      )}

      {isUpdateAvailable && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
        >
          <SpotlightCard className="p-4 flex items-center gap-3 border-[#25D366]/20">
            <div className="p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/15 shrink-0 animate-glow-pulse">
              <RefreshCw className="h-5 w-5 text-[#25D366]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#25D366]">Actualizacao Disponivel</p>
              <p className="text-[11px] text-white/30 mt-0.5">Nova versao do app pronta para instalar.</p>
            </div>
            <Button
              onClick={updateApp}
              size="sm"
              className="shrink-0 bg-[#25D366] hover:bg-[#1fb855] text-white rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </Button>
            <button onClick={() => setDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
              <X className="h-4 w-4 text-white/30" />
            </button>
          </SpotlightCard>
        </motion.div>
      )}

      {isInstallable && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
        >
          <SpotlightCard className="p-4 flex items-center gap-3 border-[#25D366]/20">
            <div className="p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/15 shrink-0">
              <Shield className="h-5 w-5 text-[#25D366]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Instalar StatusAds</p>
              <p className="text-[11px] text-white/30 mt-0.5">Acesso rapido, modo offline e alertas em segundo plano.</p>
            </div>
            <Button
              onClick={installApp}
              size="sm"
              className="shrink-0 bg-[#25D366] hover:bg-[#1fb855] text-white rounded-xl text-xs gap-1.5 hover:shadow-[0_0_20px_-5px_rgba(37,211,102,0.3)] transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Instalar
            </Button>
            <button onClick={() => setDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
              <X className="h-4 w-4 text-white/30" />
            </button>
          </SpotlightCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
