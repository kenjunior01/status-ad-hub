import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useAdmin'
import { useDemoMode } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard, Users, CreditCard, CalendarClock, ShieldAlert,
  Settings2, Lock, ArrowLeft, Loader2, FlaskConical, SlidersHorizontal,
  KeyRound, Crown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/dashboard/admin/utilizadores', label: 'Utilizadores', icon: Users },
  { to: '/dashboard/admin/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/dashboard/admin/assinaturas', label: 'Assinaturas', icon: CalendarClock },
  { to: '/dashboard/admin/eventos', label: 'Eventos SOS', icon: ShieldAlert },
  { to: '/dashboard/admin/planos', label: 'Planos', icon: Settings2 },
  { to: '/dashboard/admin/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
]

export default function AdminShell() {
  const { isAdmin, loading, isDemo } = useIsAdmin()
  const { user, signOut } = useAuth()
  const demo = useDemoMode()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const qc = useQueryClient()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return <AdminGate onActivated={() => qc.invalidateQueries({ queryKey: ['my-role', user?.id] })} />
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

/* ──────────────────────────────────────────────────────────────
 * AdminGate — ecrã de desbloqueio por código digitado.
 * O dono da plataforma entra na sua conta, digita o código de
 * administração (definido na migration 013 em app_security_config)
 * e o painel desbloqueia na hora, sem precisar de correr SQL.
 * ────────────────────────────────────────────────────────────── */
function AdminGate({ onActivated }: { onActivated: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleActivate() {
    if (!code.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('activate_admin', { p_code: code.trim() })
      if (rpcErr) {
        const code = (rpcErr as { code?: string }).code ?? ''
        if (code === 'PGRST202' || rpcErr.message.includes('Could not find the function')) {
          setError('O servidor ainda não tem o activador de admin. Aplique a migration 013 (ficheiro supabase/APLICAR-TUDO.sql) no SQL Editor do Supabase.')
        } else if (code === '42703' || rpcErr.message.includes('does not exist')) {
          setError('O servidor ainda não tem o schema completo. Aplique supabase/APLICAR-TUDO.sql no SQL Editor e volte a tentar.')
        } else {
          setError('Não foi possível validar o código agora. Tente novamente.')
        }
        return
      }
      const res = data as { success: boolean; message: string }
      if (res?.success) {
        toast.success(res.message ?? 'Administrador activado!')
        onActivated()
      } else {
        setError(res?.message ?? 'Código incorrecto. Verifique e tente novamente.')
      }
    } catch {
      setError('Erro de ligação ao servidor. Verifique a internet e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full">
        <div className="rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-7 text-center relative overflow-hidden">
          {/* brilho de fundo */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-32 w-56 bg-[#D4AF37]/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(212,175,55,0.25)]">
              <Crown className="h-6 w-6 text-black" strokeWidth={2} />
            </div>
            <h2 className="font-display font-bold text-lg text-white">Painel do Administrador</h2>
            <p className="text-xs text-white/45 mt-2 leading-relaxed">
              Área exclusiva do dono da plataforma. Introduza o
              <span className="text-[#D4AF37] font-medium"> código de administração </span>
              para desbloquear esta sessão.
            </p>

            <div className="mt-5 space-y-3 text-left">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <Input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && void handleActivate()}
                  placeholder="Código de administração"
                  autoComplete="off"
                  autoFocus
                  className={cn(
                    'pl-10 h-12 rounded-xl bg-black/30 border text-white tracking-widest font-mono text-sm placeholder:text-white/20 placeholder:font-sans placeholder:tracking-normal',
                    error ? 'border-red-500/50' : 'border-white/10 focus-visible:border-[#D4AF37]/40'
                  )}
                />
              </div>

              {error && (
                <p className="text-[11px] text-red-400 leading-relaxed bg-red-500/[0.06] border border-red-500/15 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}

              <Button
                onClick={() => void handleActivate()}
                disabled={!code.trim() || submitting}
                className="w-full h-12 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold text-sm disabled:opacity-40 shadow-lg shadow-[#D4AF37]/20"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 mr-1.5" />}
                {submitting ? 'A validar…' : 'Desbloquear Painel Admin'}
              </Button>
            </div>

            <p className="text-[10px] text-white/25 mt-4 leading-relaxed">
              Sessão: <span className="font-mono text-white/40">{user?.email ?? '—'}</span><br />
              O código é definido pelo dono no servidor (tabela app_security_config)
              e pode ser alterado a qualquer momento no SQL Editor.
            </p>

            <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mt-4 text-white/40 hover:text-white/70 text-xs rounded-xl h-9">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar ao painel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
