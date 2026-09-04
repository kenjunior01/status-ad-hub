import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, LogOut, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useAdmin'
import { useDashboardStats } from '@/hooks/useHistory'
import { sidebarSections } from '@/lib/dashboard-nav'

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

/**
 * Menu lateral deslizante (overlay) — partilhado entre o DashboardLayout
 * (todas as páginas) e a página Dashboard (que tem o seu próprio cabeçalho
 * fixo e tapa o cabeçalho do layout). Auto-contida: usa os próprios hooks.
 */
export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const { user, signOut } = useAuth()
  const { isAdmin } = useIsAdmin()
  const location = useLocation()
  const { data: stats } = useDashboardStats()
  const alertCount = (stats?.active_emergencies ?? 0) + (stats?.alerts_today ?? 0)
  const hasAlerts = alertCount > 0
  const isActive = (path: string) => location.pathname === path

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-card border-r border-white/[0.06] z-[71] flex flex-col overflow-hidden"
          >
            {/* Sidebar Header with user info */}
            <div className="relative px-5 pt-5 pb-4">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-brand/[0.05] to-transparent" />
              <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-brand" />
                  </div>
                  <span className="font-display font-bold text-white text-base">Status<span className="text-brand">Ads</span></span>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition" aria-label="Fechar menu">
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>
              <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand to-amber-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(user?.user_metadata as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{(user?.user_metadata as any)?.full_name || 'Utilizador'}</p>
                  <p className="text-[11px] text-white/25 truncate font-mono">{user?.email || ''}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-brand shrink-0" />
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
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                            active
                              ? 'text-brand bg-brand/[0.08]'
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
                  <p className="px-3 mb-1.5 text-[10px] font-semibold text-brand/50 uppercase tracking-wider">Administração</p>
                  <div className="space-y-0.5">
                    <NavLink
                      to="/dashboard/admin"
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                        location.pathname.startsWith('/dashboard/admin')
                          ? 'text-brand bg-brand/[0.08]'
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
                onClick={() => { signOut(); onClose() }}
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
  )
}

