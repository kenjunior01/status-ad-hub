import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Bluetooth, Users, History, Settings,
  Shield, Bell, LogOut, Menu, X, ChevronRight, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { NoiseTexture, Shimmer } from '@/components/effects'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { useDashboardStats } from '@/hooks/useHistory'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'Dispositivos', icon: Bluetooth },
  { to: '/emergency-contacts', label: 'Contactos', icon: Users },
  { to: '/emergency', label: 'Emergencia', icon: ShieldAlert },
  { to: '/history', label: 'Historico', icon: History },
  { to: '/settings', label: 'Configuracoes', icon: Settings },
]

const mobileNavItems = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/devices', label: 'Dispositivos', icon: Bluetooth },
  { to: '/emergency', label: 'Emergencia', icon: ShieldAlert },
  { to: '/history', label: 'Historico', icon: History },
  { to: '/settings', label: 'Config.', icon: Settings },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isActive = (path: string) => location.pathname === path
  const { activeEmergency } = useEmergencyAlerts()
  const { data: stats } = useDashboardStats()
  const alertCount = (stats?.active_emergencies ?? 0) + (stats?.alerts_today ?? 0)

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, i) => {
          const IconComp = item.icon
          const active = isActive(item.to)
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <NavLink
                to={item.to}
                onClick={() => mobile && setSidebarOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'text-[#25D366] bg-[#25D366]/[0.08]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                )}
              >
                {active && (
                  <motion.div
                    layoutId={mobile ? 'mobile-nav-indicator' : 'desktop-nav-indicator'}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#25D366]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <IconComp className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                {item.label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />}
              </NavLink>
            </motion.div>
          )
        })}
      </nav>
      <div className="px-3 pb-4 border-t border-white/[0.04] pt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(37,211,102,0.2)]">
              {(user?.user_metadata as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#25D366] border-2 border-[#0D1321]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{(user?.user_metadata as any)?.full_name || 'Utilizador'}</p>
            <p className="text-[10px] text-white/25 truncate font-mono">{user?.email || 'user@email.com'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-2 text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] px-3 rounded-xl transition-all"
        >
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex">
      <NoiseTexture opacity={0.015} />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] bg-[#0A0F1A]/95 border-r border-white/[0.04] z-40 backdrop-blur-xl relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#25D366]/[0.03] to-transparent" />
        <NoiseTexture opacity={0.01} />
        <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.04]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 animate-glow-pulse">
            <Shield className="h-4 w-4 text-[#25D366]" />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight">Status<span className="text-[#25D366]">Ads</span></span>
        </div>
        <NavContent />
        </div>
      </aside>

      {/* MOBILE SIDEBAR OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden" />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#0A0F1A] border-r border-white/[0.06] z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
                    <Shield className="h-4 w-4 text-[#25D366]" />
                  </div>
                  <span className="font-display font-bold text-white text-base">Status<span className="text-[#25D366]">Ads</span></span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>
              <NavContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN AREA */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 backdrop-blur-2xl bg-[#0A0F1A]/60 border-b border-white/[0.04]">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition">
            <Menu className="h-5 w-5 text-white/60" />
          </button>
          <h2 className="hidden sm:block text-sm font-medium text-white/50">Painel de Seguranca</h2>
          <div className="sm:hidden" />
          <button onClick={() => navigate('/dashboard/emergency')} className="relative p-2 rounded-xl hover:bg-white/5 transition">
            <Bell className="h-[18px] w-[18px] text-white/50" />
            {alertCount > 0 && (
              <span className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white',
                stats?.active_emergencies
                  ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                  : 'bg-amber-500/80'
              )}>{alertCount}</span>
            )}
          </button>
        </header>
        <main className="flex-1 pb-20 lg:pb-0">
          {/* Active Emergency Banner - shows on all dashboard pages except /emergency */}
          {activeEmergency?.status === 'active' && location.pathname !== '/dashboard/emergency' && (
            <div
              onClick={() => navigate('/dashboard/emergency')}
              className="flex items-center gap-3 px-4 md:px-6 py-2.5 bg-red-950/80 border-b border-red-500/15 cursor-pointer hover:bg-red-950/90 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/15 shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              </div>
              <p className="text-xs font-medium text-red-300 flex-1">
                Emergencia activa! Clique para ver detalhes e resolver.
              </p>
              <ChevronRight className="h-4 w-4 text-red-400/50" />
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAV - hidden when Dashboard is active (it has its own bottom bar) */}
      <nav className={cn('fixed bottom-0 left-0 right-0 z-40 lg:hidden backdrop-blur-2xl bg-[#0A0F1A]/90 border-t border-white/[0.04] transition-all duration-300', isActive('/dashboard') && 'translate-y-full opacity-0 pointer-events-none')}>
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const IconComp = item.icon
            const active = isActive(item.to)
            return (
              <NavLink key={item.to} to={item.to} className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200',
                active ? 'text-[#25D366]' : 'text-white/30'
              )}>
                <div className={cn('relative', active && 'shadow-[0_0_12px_rgba(37,211,102,0.3)] rounded-lg')}>
                  <IconComp className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                  {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-[#25D366]" />}
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
      <PWAInstallPrompt />
    </div>
  )
}
