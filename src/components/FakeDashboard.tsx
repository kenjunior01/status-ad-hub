/**
 * FakeDashboard — Versão inofensiva do dashboard
 *
 * Mostrado quando o utilizador entra com a senha anti-coerção.
 * Parece um app de produtividade/finanças genérico.
 * NUNCA mostra dados de segurança, contactos de emergência,
 * localização, ou qualquer informação sensível.
 *
 * Características:
 *   - Layout de app financeiro genérico
 *   - Dados totalmente falsos (hardcoded)
 *   - Navegação interna que não revela o app real
 *   - Ícones e cores neutras (azul/cinza, NÃO verde)
 *   - Parece um app legítimo de gestão financeira pessoal
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, TrendingDown, CreditCard,
  ArrowUpRight, ArrowDownLeft, PiggyBank, BarChart3,
  Settings, Bell, ChevronRight, LogOut, Menu, X,
  Home, Receipt, Target, CircleDollarSign,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAntiCoercion } from '@/hooks/useAntiCoercion'

// ============================================
// FAKE DATA — everything is hardcoded, no real data
// ============================================

const fakeBalance = 12450.00
const fakeIncome = 3200.00
const fakeExpenses = 1850.00
const fakeSavings = 1350.00

const fakeTransactions = [
  { id: 1, name: 'Supermercado', category: 'Alimentacao', amount: -2450.00, date: '01/09/2026', icon: Receipt },
  { id: 2, name: 'Salario', category: 'Rendimento', amount: 32000.00, date: '01/09/2026', icon: CircleDollarSign },
  { id: 3, name: 'Electricidade', category: 'Contas', amount: -1850.00, date: '31/08/2026', icon: CreditCard },
  { id: 4, name: 'Transferencia', category: 'Transferencia', amount: 5000.00, date: '30/08/2026', icon: ArrowUpRight },
  { id: 5, name: 'Restaurante', category: 'Alimentacao', amount: -890.00, date: '29/08/2026', icon: Receipt },
  { id: 6, name: 'Freelance', category: 'Rendimento', amount: 15000.00, date: '28/08/2026', icon: CircleDollarSign },
]

const fakeSavingsGoals = [
  { name: 'Viagem', target: 50000.00, current: 32000.00, color: 'bg-blue-500' },
  { name: 'Carro', target: 150000.00, current: 45000.00, color: 'bg-purple-500' },
  { name: 'Emergencia', target: 30000.00, current: 28000.00, color: 'bg-amber-500' },
]

const fakeMonthlyData = [
  { month: 'Abr', income: 30000, expenses: 20000 },
  { month: 'Mai', income: 31000, expenses: 18000 },
  { month: 'Jun', income: 29000, expenses: 22000 },
  { month: 'Jul', income: 32000, expenses: 19000 },
  { month: 'Ago', income: 32000, expenses: 18500 },
]

// ============================================
// FORMATTING
// ============================================

function formatMeticais(value: number): string {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

// ============================================
// SUB-PAGES (all fake, no real navigation)
// ============================================

type FakePage = 'home' | 'transactions' | 'savings' | 'stats' | 'settings'

function FakeHomePage() {
  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg"
      >
        <p className="text-xs text-blue-100/70 uppercase tracking-wider">Saldo Total</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{formatMeticais(fakeBalance)}</p>
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5 text-green-300" />
            <div>
              <p className="text-[10px] text-blue-100/60">Receitas</p>
              <p className="text-xs font-semibold text-green-300">{formatMeticais(fakeIncome)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-red-300" />
            <div>
              <p className="text-[10px] text-blue-100/60">Despesas</p>
              <p className="text-xs font-semibold text-red-300">{formatMeticais(fakeExpenses)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: ArrowUpRight, label: 'Enviar', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
          { icon: ArrowDownLeft, label: 'Receber', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
          { icon: PiggyBank, label: 'Poupar', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
          { icon: CreditCard, label: 'Pagar', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        ].map((item) => (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition"
          >
            <div className={`p-2 rounded-lg border ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-white/50">{item.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Savings Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/70">Objectivos</h3>
          <button className="text-[10px] text-blue-400/60 hover:text-blue-400 transition">Ver tudo</button>
        </div>
        <div className="space-y-3">
          {fakeSavingsGoals.map((goal) => (
            <div key={goal.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/70">{goal.name}</span>
                <span className="text-[10px] text-white/30">
                  {formatMeticais(goal.current)} / {formatMeticais(goal.target)}
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(goal.current / goal.target) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${goal.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/70">Transaccoes Recentes</h3>
          <button className="text-[10px] text-blue-400/60 hover:text-blue-400 transition">Ver tudo</button>
        </div>
        <div className="space-y-2">
          {fakeTransactions.slice(0, 4).map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="p-2 rounded-lg bg-white/[0.04]">
                <tx.icon className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/70 truncate">{tx.name}</p>
                <p className="text-[10px] text-white/25">{tx.category} · {tx.date}</p>
              </div>
              <span className={`text-xs font-semibold ${tx.amount >= 0 ? 'text-green-400' : 'text-white/50'}`}>
                {tx.amount >= 0 ? '+' : ''}{formatMeticais(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FakeTransactionsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Transaccoes</h2>
      <div className="flex gap-2">
        {['Todas', 'Receitas', 'Despesas'].map((filter) => (
          <button
            key={filter}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06] border border-white/[0.04] transition"
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {fakeTransactions.map((tx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <div className="p-2 rounded-lg bg-white/[0.04]">
              <tx.icon className="h-4 w-4 text-white/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 truncate">{tx.name}</p>
              <p className="text-[10px] text-white/25">{tx.category} · {tx.date}</p>
            </div>
            <span className={`text-xs font-semibold ${tx.amount >= 0 ? 'text-green-400' : 'text-white/50'}`}>
              {tx.amount >= 0 ? '+' : ''}{formatMeticais(tx.amount)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function FakeSavingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Poupancas</h2>
      <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/10 p-5">
        <p className="text-xs text-purple-200/60 uppercase tracking-wider">Total Poupanhado</p>
        <p className="mt-1 text-2xl font-bold text-purple-300">{formatMeticais(fakeSavings)}</p>
        <p className="mt-1 text-[10px] text-purple-200/40">Este mes</p>
      </div>
      <div className="space-y-4">
        {fakeSavingsGoals.map((goal) => {
          const pct = Math.round((goal.current / goal.target) * 100)
          return (
            <div key={goal.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white/70">{goal.name}</span>
                <span className="text-xs text-white/40">{pct}%</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={`h-full rounded-full ${goal.color}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/25">
                <span>{formatMeticais(goal.current)}</span>
                <span>Meta: {formatMeticais(goal.target)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FakeStatsPage() {
  const maxVal = Math.max(...fakeMonthlyData.flatMap(d => [d.income, d.expenses]))
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Estatisticas</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <TrendingUp className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-[10px] text-white/30 uppercase">Media Receitas</p>
          <p className="text-lg font-bold text-white/80">{formatMeticais(fakeMonthlyData.reduce((s, d) => s + d.income, 0) / fakeMonthlyData.length)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <TrendingDown className="h-5 w-5 text-red-400 mb-2" />
          <p className="text-[10px] text-white/30 uppercase">Media Despesas</p>
          <p className="text-lg font-bold text-white/80">{formatMeticais(fakeMonthlyData.reduce((s, d) => s + d.expenses, 0) / fakeMonthlyData.length)}</p>
        </div>
      </div>
      {/* Simple bar chart */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <p className="text-xs text-white/40 mb-4">Receitas vs Despesas</p>
        <div className="flex items-end gap-3 h-40">
          {fakeMonthlyData.map((d) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.income / maxVal) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="flex-1 bg-blue-500/60 rounded-t"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.expenses / maxVal) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                  className="flex-1 bg-red-400/40 rounded-t"
                />
              </div>
              <span className="text-[9px] text-white/25">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-blue-500/60" />
            <span className="text-[10px] text-white/30">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-red-400/40" />
            <span className="text-[10px] text-white/30">Despesas</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FakeSettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Configuracoes</h2>
      {[
        { icon: Bell, label: 'Notificacoes', desc: 'Alertas de transaccoes', value: true },
        { icon: CreditCard, label: 'Moeda', desc: 'Metical (MZN)', value: undefined },
        { icon: Target, label: 'Objectivos', desc: '3 objectivos activos', value: undefined },
        { icon: BarChart3, label: 'Relatorios', desc: 'Mensal', value: true },
        { icon: Wallet, label: 'Contas', desc: '1 conta vinculada', value: undefined },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="p-2 rounded-lg bg-white/[0.04]">
            <item.icon className="h-4 w-4 text-white/40" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white/70">{item.label}</p>
            <p className="text-[10px] text-white/25">{item.desc}</p>
          </div>
          {item.value !== undefined && (
            <div className={`w-9 h-5 rounded-full relative ${item.value ? 'bg-blue-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${item.value ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-white/15" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// MAIN FAKE DASHBOARD
// ============================================

const fakeNavItems: { page: FakePage; label: string; icon: React.ElementType }[] = [
  { page: 'home', label: 'Inicio', icon: Home },
  { page: 'transactions', label: 'Transaccoes', icon: Receipt },
  { page: 'savings', label: 'Poupancas', icon: PiggyBank },
  { page: 'stats', label: 'Estatisticas', icon: BarChart3 },
  { page: 'settings', label: 'Configuracoes', icon: Settings },
]

export function FakeDashboard() {
  const [currentPage, setCurrentPage] = useState<FakePage>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut } = useAuth()
  const { deactivateCoercionMode } = useAntiCoercion()

  const handleSignOut = async () => {
    deactivateCoercionMode()
    await signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <FakeHomePage />
      case 'transactions': return <FakeTransactionsPage />
      case 'savings': return <FakeSavingsPage />
      case 'stats': return <FakeStatsPage />
      case 'settings': return <FakeSettingsPage />
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1629] flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[240px] bg-[#0D1321] border-r border-white/[0.04] z-40">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.04]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Financa<span className="text-blue-400">App</span></span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {fakeNavItems.map((item) => {
            const IconComp = item.icon
            const active = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'text-blue-400 bg-blue-500/[0.08]'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                <IconComp className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="px-3 pb-4 border-t border-white/[0.04] pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0D1321] border-r border-white/[0.06] z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Wallet className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="font-bold text-white text-base">Financa<span className="text-blue-400">App</span></span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {fakeNavItems.map((item) => {
                  const IconComp = item.icon
                  const active = currentPage === item.page
                  return (
                    <button
                      key={item.page}
                      onClick={() => { setCurrentPage(item.page); setSidebarOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'text-blue-400 bg-blue-500/[0.08]'
                          : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                      }`}
                    >
                      <IconComp className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
              <div className="px-3 pb-4 border-t border-white/[0.04] pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 bg-[#0F1629]/80 backdrop-blur-2xl border-b border-white/[0.04]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition"
          >
            <Menu className="h-5 w-5 text-white/60" />
          </button>
          <h2 className="hidden sm:block text-sm font-medium text-white/40">Gestao Financeira Pessoal</h2>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition">
              <Bell className="h-[18px] w-[18px] text-white/40" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0D1321]/95 backdrop-blur-2xl border-t border-white/[0.04]">
        <div className="flex items-center justify-around h-16 px-2">
          {fakeNavItems.map((item) => {
            const IconComp = item.icon
            const active = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                  active ? 'text-blue-400' : 'text-white/25'
                }`}
              >
                <IconComp className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default FakeDashboard
