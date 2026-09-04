import {
  LayoutDashboard, Bluetooth, Users, History, Settings,
  ShieldAlert, Zap, ShieldCheck, Glasses, Radar, Navigation,
  Map, Clock, Activity, EyeOff, Fingerprint, PhoneIncoming,
  Lightbulb, Package, BookOpen, PersonStanding, CreditCard,
  Archive, HeartPulse, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type DashboardNavItem = {
  to: string
  label: string
  icon: LucideIcon
  badge?: boolean
  isSOS?: boolean
}

export type DashboardNavSection = {
  title: string
  items: DashboardNavItem[]
}

/* ── Sidebar Navigation (menu completo — mobile overlay e futura sidebar desktop) ── */
export const sidebarSections: DashboardNavSection[] = [
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
      { to: '/dashboard/bellvion', label: 'Dispositivos BELLVION', icon: Package },
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
      { to: '/dashboard/dicas', label: 'Dicas de Seguranca', icon: Lightbulb },
    ],
  },
  {
    title: 'Privacidade',
    items: [
      { to: '/dashboard/discreto', label: 'Modo Discreto', icon: Fingerprint },
      { to: '/dashboard/camuflar', label: 'Camuflagem', icon: EyeOff },
      { to: '/dashboard/camuflagem-pwa', label: 'Camuflagem na PWA', icon: BookOpen },
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

/* ── Bottom nav: 5 items for quick access on mobile ── */
export const bottomNav: DashboardNavItem[] = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/dashboard/devices', label: 'Dispositivos', icon: Bluetooth },
  { to: '/dashboard/contacts', label: 'Contactos', icon: Users },
  { to: '/dashboard/emergency', label: 'SOS', icon: ShieldAlert, isSOS: true },
  { to: '/dashboard/settings', label: 'Mais', icon: MoreHorizontal },
]
