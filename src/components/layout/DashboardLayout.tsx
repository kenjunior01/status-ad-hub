import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Bell, Menu, ChevronRight, ShieldAlert,
  WifiOff, RefreshCw, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoiseTexture } from '@/components/effects'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking'
import { useNetworkStatus, formatOfflineDuration } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { useDashboardStats } from '@/hooks/useHistory'
import { FallDetectionOverlay, useFallDetectionKeepAlive, registerFallSosHandler } from '@/hooks/useFallDetection'
import { geoGetCurrent, haptic, initNativeChrome, isNative } from '@/lib/native'
import { FakeCallOverlay } from '@/hooks/useFakeCall'
import { FeatureTour } from '@/components/FeatureTour'
import { useEmergency } from '@/hooks/useEmergency'
import { bottomNav } from '@/lib/dashboard-nav'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'

/* ── Navigation Config ── movida para src/lib/dashboard-nav.ts (partilhada com o Dashboard) ── */

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isActive = (path: string) => location.pathname === path
  const { activeEmergency } = useEmergencyAlerts()
  useBackgroundTracking()
  const { data: stats } = useDashboardStats()
  const alertCount = (stats?.active_emergencies ?? 0) + (stats?.alerts_today ?? 0)
  const network = useNetworkStatus(true)
  const offlineQueue = useOfflineQueue()
  const hasAlerts = alertCount > 0
  const hasActiveEmergency = activeEmergency?.status === 'active'

  // Liga a deteção de queda ao motor de emergência global.
  // A queda dispara SOS real (GPS + SMS + push) exactamente como o botão.
  // Na APK usa o plugin nativo de GPS (mais fiável) + háptico SOS.
  const { triggerEmergency } = useEmergency()
  useEffect(() => {
    registerFallSosHandler((reason) => {
      void haptic('sos')
      geoGetCurrent(6000).then((pos) => {
        if (pos) {
          triggerEmergency({ latitude: pos.latitude, longitude: pos.longitude })
        } else {
          // fallback web ou Maputo
          navigator.geolocation?.getCurrentPosition(
            (p) => triggerEmergency({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
            () => triggerEmergency({ latitude: -25.9692, longitude: 32.5732 }),
            { enableHighAccuracy: true, timeout: 6000 }
          )
        }
      })
      void reason
    })
    return () => registerFallSosHandler(null)
  }, [triggerEmergency])

  // Chrome nativo dourado (status bar + splash) — no-op em web
  useEffect(() => {
    void initNativeChrome()
    if (isNative()) {
      document.addEventListener('deviceready', () => void initNativeChrome(), { once: true })
    }
  }, [])

  // Mantém o motor de queda activo se o utilizador o tiver ligado
  useFallDetectionKeepAlive()

  return (
    <div className="min-h-screen bg-background relative">
      <NoiseTexture opacity={0.01} />

      {/* ── MOBILE SIDEBAR OVERLAY ── componente partilhado (usado também pela página Dashboard) ── */}
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex flex-col min-h-screen">
        {/* Top Header Bar - Mobile First */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition">
              <Menu className="h-5 w-5 text-white/60" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand" />
              <span className="text-sm font-bold text-white">Status<span className="text-brand">Ads</span></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Offline indicator */}
            <AnimatePresence>
              {!network.isOnline && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <WifiOff className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-amber-400 hidden sm:inline">
                    {network.offlineDuration ? formatOfflineDuration(network.offlineDuration) : 'Offline'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Queue indicator */}
            <AnimatePresence>
              {offlineQueue.pendingCount > 0 && network.isOnline && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => offlineQueue.syncQueue()}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors',
                    offlineQueue.emergencyPending > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'
                  )}
                >
                  {offlineQueue.isSyncing ? (
                    <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                  ) : (
                    <Database className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className={cn('text-[10px] font-medium hidden sm:inline', offlineQueue.emergencyPending > 0 ? 'text-red-400' : 'text-blue-400')}>
                    {offlineQueue.pendingCount}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Alerts bell */}
            <button onClick={() => navigate('/dashboard/emergency')} className="relative p-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition">
              <Bell className="h-[18px] w-[18px] text-white/50" />
              {hasAlerts && (
                <span className={cn(
                  'absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white',
                  hasActiveEmergency
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-amber-500/80'
                )}>{alertCount > 9 ? '9+' : alertCount}</span>
              )}
            </button>
          </div>
        </header>

        {/* Active Emergency Banner */}
        <AnimatePresence>
          {hasActiveEmergency && location.pathname !== '/dashboard/emergency' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <button
                onClick={() => navigate('/dashboard/emergency')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-950/80 border-b border-red-500/15 active:bg-red-950 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold text-red-300">Emergencia Activa</p>
                  <p className="text-[11px] text-red-400/60">Toque para ver detalhes</p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-400/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── escondida na página /dashboard (ela tem a sua própria barra de acções + menu próprio) ── */}
      {location.pathname !== '/dashboard' && (
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {/* Safe area spacer for iOS */}
        <div className="bg-background/95 backdrop-blur-2xl border-t border-white/[0.06]">
          <div className="flex items-center justify-around h-[68px] px-1 pb-[env(safe-area-inset-bottom,0px)]">
            {bottomNav.map((item) => {
              const IconComp = item.icon
              const active = isActive(item.to)
              if (item.isSOS) {
                return (
                  <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center gap-0.5 -mt-4">
                    <div className="relative">
                      {/* anel de emissão contínuo — o SOS nunca passa despercebido */}
                      <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-500/60 sos-ring" />
                      <div className={cn(
                        'relative h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                        active
                          ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.55)]'
                          : 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_18px_rgba(239,68,68,0.35)] active:scale-95'
                      )}>
                        <ShieldAlert className="h-5 w-5 text-white" strokeWidth={2} />
                      </div>
                    </div>
                    <span className={cn('text-[9px] font-bold tracking-widest', active ? 'text-red-400' : 'text-red-400/70')}>SOS</span>
                  </NavLink>
                )
              }
              return (
                <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-1.5 px-3 transition-all duration-150">
                  <div className="relative">
                    <IconComp className={cn('h-5 w-5 transition-colors', active ? 'text-brand gold-glow' : 'text-white/25')} strokeWidth={active ? 2 : 1.5} />
                    {active && (
                      <motion.div layoutId="bottom-nav-dot" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-brand shadow-[0_0_8px_rgba(212,175,55,0.7)]" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    )}
                  </div>
                  <span className={cn('text-[10px] font-medium', active ? 'text-brand' : 'text-white/25')}>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>
      )}

      <OnboardingWizard />
      <FeatureTour />
      <PWAInstallPrompt />
      <FallDetectionOverlay />
      <FakeCallOverlay />
    </div>
  )
}