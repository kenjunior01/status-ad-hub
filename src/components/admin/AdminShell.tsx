import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useAdmin'
import { useDemoMode } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard, Users, CreditCard, CalendarClock, ShieldAlert,
  Settings2, Lock, ArrowLeft, Loader2, FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/dashboard/admin/utilizadores', label: 'Utilizadores', icon: Users },
  { to: '/dashboard/admin/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/dashboard/admin/assinaturas', label: 'Assinaturas', icon: CalendarClock },
  { to: '/dashboard/admin/eventos', label: 'Eventos SOS', icon: ShieldAlert },
  { to: '/dashboard/admin/planos', label: 'Planos', icon: Settings2 },
]

export default function AdminShell() {
  const { isAdmin, loading, isDemo } = useIsAdmin()
  const { user, signOut } = useAuth()
  const demo = useDemoMode()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="font-display font-bold text-lg text-white">Acesso restrito</h2>
          <p className="text-xs text-white/40 mt-2 leading-relaxed">
            Esta área é exclusiva de administradores. Se és o dono da plataforma, executa a migration 009 e corre:
          </p>
          <code className="block mt-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono text-[#D4AF37] text-left overflow-x-auto">
            update profiles set role = 'admin' where user_id = (select id from auth.users where email = 'teu-email');
          </code>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-5 border-white/10 bg-white/[0.03] text-white/70 rounded-xl h-10">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar ao painel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="dark bg-[#0C0B08] text-white relative min-h-screen">
      {/* Header admin */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-[#0C0B08]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                <LayoutDashboard className="h-4.5 w-4.5 text-black" strokeWidth={2} />
              </div>
              <div>
                <h1 className="font-display font-bold text-base leading-tight">Painel Administrativo</h1>
                <p className="text-[10px] text-white/30">{user?.email}</p>
              </div>
              {isDemo && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] gap-1">
                  <FlaskConical className="h-3 w-3" /> DEMO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white text-xs gap-1.5 rounded-lg">
                <ArrowLeft className="h-3.5 w-3.5" /> App
              </Button>
              <Button size="sm" variant="ghost" onClick={() => signOut()} className="text-white/30 hover:text-red-400 text-xs rounded-lg">Sair</Button>
            </div>
          </div>

          {/* Tabs — scrollable em mobile */}
          <nav className="mt-3.5 flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                    isActive
                      ? 'bg-[#D4AF37]/[0.12] text-[#D4AF37] border border-[#D4AF37]/25'
                      : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04] border border-transparent',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-0 sm:px-6 py-6">
        <Outlet />
      </div>
    </div>
  )
}
