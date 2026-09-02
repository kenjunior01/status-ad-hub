import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Bluetooth, Users, History, Settings,
  Shield, Bell, LogOut, Menu, X, ChevronRight, ShieldAlert,
  WifiOff, CloudOff, RefreshCw, Database, Activity, ShieldCheck,
  Glasses, Zap, Radar, EyeOff, Fingerprint, Map, Clock, Navigation,
  MoreHorizontal, User, CircleDot, CreditCard, Crown, Archive, HeartPulse,
  PersonStanding, PhoneIncoming,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { NoiseTexture } from '@/components/effects'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking'
import { useNetworkStatus, formatOfflineDuration } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { useDashboardStats } from '@/hooks/useHistory'
import { useNavigate } from 'react-router-dom'
import { useIsAdmin } from '@/hooks/useAdmin'
import { FallDetectionOverlay, useFallDetectionKeepAlive, registerFallSosHandler } from '@/hooks/useFallDetection'
import { FakeCallOverlay } from '@/hooks/useFakeCall'
import { useEmergency } from '@/hooks/useEmergency'
import { useEffect } from 'react'

/* ── Navigation Config ── */
const sidebarSections = [
  {
    title: 'Principal',
    items: [
      { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
      { to: '/dashboard/accoes', label: 'Accoes Rapidas', icon: Zap },
      { to: '/dashboard/emergency', label: 'Emergencia', icon: ShieldAlert, badge: true },
    ],
  },
  {
    title: 'Dispositivos',
    items: [
      { to: '/dashboard/devices', label: 'Meus Dispositivos', icon: Bluetooth },
      { to: '/dashboard/oculos', label: 'Oculos Inteligentes', icon: Glasses },
      { to: '/dashboard/checkin', label: 'Check-in', icon: ShieldCheck },
    ],
  },
  {
    title: 'Seguranca',
    items: [
      { to: '/dashboard/contacts', label: 'Contactos de Emergencia', icon: Users },
      { to: '/dashboard/queda', label: 'Deteccao de Queda', icon: PersonStanding },
      { to: '/dashboard/evidencias', label: 'Cofre de Evidencias', icon: Archive },
      { to: '/dashboard/ficha-medica', label: 'Ficha Medica', icon: HeartPulse },
      { to: '/dashboard/radar', label: 'Radar Comunitario', icon: Radar },
      { to: '/dashboard/rota', label: 'Rota Segura', icon: Navigation },
      { to: '/dashboard/viagens', label: 'Rastreamento de Viagem', icon: Map },
    ],
  },
  {
    title: 'Privacidade',
    items: [
      { to: '/dashboard/discreto', label: 'Modo Discreto', icon: Fingerprint },
      { to: '/dashboard/camuflar', label: 'Camuflagem', icon: EyeOff },
      { to: '/dashboard/chamada-falsa', label: 'Chamada Falsa', icon: PhoneIncoming },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { to: '/dashboard/assinatura', label: 'Assinatura e Pagamentos', icon: CreditCard },
      { to: '/dashboard/history', label: 'Historico', icon: History },
      { to: '/dashboard/timeline', label: 'Timeline de Incidentes', icon: Clock },
      { to: '/dashboard/diagnostics', label: 'Diagnostico', icon: Activity },
      { to: '/dashboard/settings', label: 'Configuracoes', icon: Settings },
    ],
  },
]

/* Bottom nav: 5 items for quick access on mobile */
const bottomNav = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/dashboard/devices', label: 'Dispositivos', icon: Bluetooth },
  { to: '/dashboard/contacts', label: 'Contactos', icon: Users },
  { to: '/dashboard/emergency', label: 'SOS', icon: ShieldAlert, isSOS: true },
  { to: '/dashboard/settings', label: 'Mais', icon: MoreHorizontal },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAdmin } = useIsAdmin()
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
  const { triggerEmergency } = useEmergency()
  useEffect(() => {
    registerFallSosHandler((reason) => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => triggerEmergency({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => triggerEmergency({ latitude: -25.9692, longitude: 32.5732 }),
        { enableHighAccuracy: true, timeout: 6000 }
      )
      void reason
    })
    return () => registerFallSosHandler(null)
  }, [triggerEmergency])

  // Mantém o motor de queda activo se o utilizador o tiver ligado
  useFallDetectionKeepAlive()

  return (
    <div className="min-h-screen bg-[#0C0B08] relative">
      <NoiseTexture opacity={0.01} />

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-[#14120D] border-r border-white/[0.06] z-50 flex flex-col overflow-hidden"
            >
              {/* Sidebar Header with user info */}
              <div className="relative px-5 pt-5 pb-4">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#D4AF37]/[0.05] to-transparent" />
                <div className="relative flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-[#D4AF37]" />
                    </div>
                    <span className="font-display font-bold text-white text-base">Status<span className="text-[#D4AF37]">Ads</span></span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-white/10 transition">
                    <X className="h-5 w-5 text-white/50" />
                  </button>
                </div>
                <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(user?.user_metadata as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{(user?.user_metadata as any)?.full_name || 'Utilizador'}</p>
                    <p className="text-[11px] text-white/25 truncate font-mono">{user?.email || ''}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-[#D4AF37] shrink-0" />
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex-1 overflow-y-auto px-3 pb-3">
                {sidebarSections.map((section) => (
                  <div key={section.title} className="mb-3">
                    <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-wider">{section.title}</p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const IconComp = item.icon
                        const active = isActive(item.to)
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                              active
                                ? 'text-[#D4AF37] bg-[#D4AF37]/[0.08]'
                                : 'text-white/40 active:text-white/60 hover:text-white/60 hover:bg-white/[0.03]'
                            )}
                          >
                            <IconComp className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} />
                            <span className="flex-1">{item.label}</span>
                            {item.badge && hasAlerts && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">{alertCount}</span>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {isAdmin && (
                  <div className="mb-3">
                    <p className="px-3 mb-1.5 text-[10px] font-semibold text-[#D4AF37]/50 uppercase tracking-wider">Administração</p>
                    <div className="space-y-0.5">
                      <NavLink
                        to="/dashboard/admin"
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                          location.pathname.startsWith('/dashboard/admin')
                            ? 'text-[#D4AF37] bg-[#D4AF37]/[0.08]'
                            : 'text-white/40 active:text-white/60 hover:text-white/60 hover:bg-white/[0.03]'
                        )}
                      >
                        <Crown className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                        <span className="flex-1">Painel Admin</span>
                      </NavLink>
                    </div>
                  </div>
                )}
              </nav>

              {/* Sidebar Footer */}
              <div className="px-3 pb-4 border-t border-white/[0.04] pt-3">
                <button
                  onClick={() => { signOut(); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  Sair da Conta
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex flex-col min-h-screen">
        {/* Top Header Bar - Mobile First */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 backdrop-blur-2xl bg-[#0C0B08]/80 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition">
              <Menu className="h-5 w-5 text-white/60" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-sm font-bold text-white">Status<span className="text-[#D4AF37]">Ads</span></span>
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

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {/* Safe area spacer for iOS */}
        <div className="bg-[#0C0B08]/95 backdrop-blur-2xl border-t border-white/[0.06]">
          <div className="flex items-center justify-around h-[68px] px-1 pb-[env(safe-area-inset-bottom,0px)]">
            {bottomNav.map((item) => {
              const IconComp = item.icon
              const active = isActive(item.to)
              if (item.isSOS) {
                return (
                  <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center gap-0.5 -mt-4">
                    <div className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                      active
                        ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : 'bg-red-500/15 border-2 border-red-500/30 active:bg-red-500/30'
                    )}>
                      <ShieldAlert className={cn('h-5 w-5', active ? 'text-white' : 'text-red-400')} strokeWidth={2} />
                    </div>
                    <span className={cn('text-[9px] font-semibold', active ? 'text-red-400' : 'text-white/25')}>SOS</span>
                  </NavLink>
                )
              }
              return (
                <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-1.5 px-3 transition-all duration-150">
                  <div className="relative">
                    <IconComp className={cn('h-5 w-5 transition-colors', active ? 'text-[#D4AF37]' : 'text-white/25')} strokeWidth={active ? 2 : 1.5} />
                    {active && (
                      <motion.div layoutId="bottom-nav-dot" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-[#D4AF37]" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    )}
                  </div>
                  <span className={cn('text-[10px] font-medium', active ? 'text-[#D4AF37]' : 'text-white/25')}>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>

      <OnboardingWizard />
      <PWAInstallPrompt />
      <FallDetectionOverlay />
      <FakeCallOverlay />
    </div>
  )
}