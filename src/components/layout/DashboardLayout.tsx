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

/**
 * NativeSplash — splash animada da APK (v3.19.0).
 * Aparece SÓ na app nativa, cobrindo o arranque com a identidade
 * dourada da app enquanto o WebView monta — faz a APK parecer
 * verdadeiramente nativa em vez de "página a carregar".
 */
function NativeSplash() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!isNative()) return
    const t = setTimeout(() => setDone(true), 1500)
    return () => clearTimeout(t)
  }, [])
  if (!isNative() || done) return null
  return (
    <div className="aegis-splash">
      <div className="aegis-splash-logo">
        <span className="aegis-splash-ring" />
        <span className="aegis-splash-ring" />
        <Shield className="h-10 w-10 text-[#d4af37]" strokeWidth={1.6} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-bold text-white tracking-wide">Status<span className="text-[#d4af37]">Ads</span> Connect</p>
        <p className="text-[9px] text-white/30 tracking-[0.3em] uppercase mt-1">Segurança pessoal</p>
      </div>
      <div className="aegis-splash-bar"><div /></div>
    </div>
  )
}

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

  // v3.19.0 — háptica leve sempre que muda de ecrã (só nativo; web usa vibrate)
  useEffect(() => {
    void haptic('light')
  }, [location.pathname])

  // Mantém o motor de queda activo se o utilizador o tiver ligado
  useFallDetectionKeepAlive()

  return (
    <div className="min-h-screen bg-background relative">
      <NoiseTexture opacity={0.01} />
      <NativeSplash />

      {/* ── MOBILE SIDEBAR OVERLAY ── componente partilhado (usado também pela página Dashboard) ── */}
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex flex-col min-h-screen">
        {/* Top Header Bar - Mobile First (safe-area para a status bar da APK) */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04] pt-[env(safe-area-inset-top,0px)]">
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

        {/* Page Content — transição nativa entre ecrãs (v3.19.0) */}
        <main className="flex-1 pb-28 lg:pb-6">
          <div key={location.pathname} className="screen-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── DOCK FLUTUANTE NATIVO (v3.19.0) ── pill flutuante com blur, SOS elevado e pílula dourada activa.
           Escondida na página /dashboard (ela tem a sua própria barra de acções + menu próprio). ── */}
      {location.pathname !== '/dashboard' && (
      <nav className="aegis-dock lg:hidden" aria-label="Navegação principal">
        <div className="aegis-dock-inner">
          {bottomNav.map((item) => {
            const IconComp = item.icon
            const active = isActive(item.to)
            if (item.isSOS) {
              return (
                <NavLink key={item.to} to={item.to} className="aegis-dock-sos">
                  <div className="aegis-dock-sos-btn">
                    {/* anel de emissão contínuo — o SOS nunca passa despercebido */}
                    <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-500/60 sos-ring" />
                    <ShieldAlert className="h-6 w-6 text-white" strokeWidth={2.2} />
                  </div>
                  <span className={cn('text-[9px] font-bold tracking-widest mt-1', active ? 'text-red-400' : 'text-red-400/70')}>SOS</span>
                </NavLink>
              )
            }
            return (
              <NavLink key={item.to} to={item.to} className="aegis-dock-item">
                {active && <span className="aegis-dock-pill" />}
                <IconComp
                  className={cn('h-[22px] w-[22px] transition-colors duration-200', active ? 'text-brand gold-glow' : 'text-white/30')}
                  strokeWidth={active ? 2.1 : 1.6}
                />
                <span className={cn('text-[9.5px] font-medium transition-colors', active ? 'text-brand' : 'text-white/30')}>{item.label}</span>
              </NavLink>
            )
          })}
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