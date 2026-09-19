import { useState, useEffect, useRef, type MouseEvent, type TouchEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Bell, Menu, ChevronRight, ShieldAlert,
  WifiOff, RefreshCw, Database,
  Phone, Volume2, VolumeX, Share2, Radar, ShieldCheck, ArrowUpRight, EyeOff,
} from 'lucide-react'
import { App as CapApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { toast } from 'sonner'
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
import { useRadarWatch } from '@/hooks/useRadarWatch'
import { useDiscreetMode } from '@/hooks/useDiscreetMode'
import { useRipple } from '@/components/native/native-gestures'
import { shareLocation } from '@/lib/share'
import { startEmergencyAlarm, stopEmergencyAlarm, isAlarmPlaying } from '@/lib/emergency-alarm'
import { useEmergency } from '@/hooks/useEmergency'
import { bottomNav, sidebarSections } from '@/lib/dashboard-nav'
import { swipeNavEnabled } from '@/lib/native'
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

  // ── v3.20.0 — LONG-PRESS NA DOCK = ações rápidas (estilo app nativa) ──
  const [sheet, setSheet] = useState<{ title: string; kind: 'nav' | 'sos'; to?: string } | null>(null)
  const pressTimer = useRef<number | null>(null)
  const suppressNextClick = useRef(false)
  const radarWatch = useRadarWatch()
  const [alarmOn, setAlarmOn] = useState(false)
  const { activate: activateDiscreet, isActive: discreetActive } = useDiscreetMode()
  // v3.22.0 — ink ripple táctil (Material) nos alvos principais
  const dockRipple = useRipple<HTMLAnchorElement>('gold')
  const sheetRipple = useRipple<HTMLButtonElement>('gold')

  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  /** inicia o temporizador de long-press (450ms) → abre a folha de ações */
  const startPress = (title: string, kind: 'nav' | 'sos', to?: string) => () => {
    suppressNextClick.current = false
    clearPress()
    pressTimer.current = window.setTimeout(() => {
      suppressNextClick.current = true
      void haptic('medium')
      if (kind === 'sos') setAlarmOn(isAlarmPlaying())
      setSheet({ title, kind, to })
    }, 450)
  }

  /** ignora o clique que se segue a um long-press (para não navegar) */
  const clickGuard = (e: MouseEvent) => {
    if (suppressNextClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressNextClick.current = false
    }
  }

  const closeSheet = () => setSheet(null)

  const toggleSentinel = () => {
    const next = radarWatch.toggle()
    void haptic('light')
    toast.success(next ? 'Sentinela ACTIVADA — vigilância contínua' : 'Sentinela desactivada', {
      description: next ? 'A app escaneia o ambiente a cada 45s.' : undefined,
    })
    closeSheet()
  }

  const verifyNow = async () => {
    void haptic('light')
    closeSheet()
    toast.info('A verificar o ambiente…')
    try {
      await radarWatch.runOnce()
      toast.success('Verificação concluída — diário de segurança actualizado')
    } catch {
      toast.error('Não foi possível verificar o ambiente agora')
    }
  }

  const shareNow = async () => {
    void haptic('light')
    closeSheet()
    toast.info('A obter a localização…')
    const pos = await geoGetCurrent(8_000).catch(() => null)
    if (!pos) {
      toast.error('Sem GPS disponível — tente ao ar livre')
      return
    }
    const ok = await shareLocation({
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy,
      deviceName: 'StatusAds Connect',
    })
    if (!ok) toast.error('Não foi possível partilhar a localização')
  }

  const toggleAlarm = () => {
    if (alarmOn) {
      stopEmergencyAlarm()
      setAlarmOn(false)
      toast.success('Sirene desligada')
    } else {
      startEmergencyAlarm()
      setAlarmOn(true)
      void haptic('heavy')
      toast.success('Sirene de emergência ACTIVA')
    }
  }

  const call112 = () => {
    void haptic('heavy')
    closeSheet()
    window.location.href = 'tel:112'
  }

  /** v3.39.0 — camuflar directamente da folha de acções (app nativa) */
  const camouflageNow = () => {
    void haptic('medium')
    closeSheet()
    activateDiscreet()
    toast.success('Camuflagem activa — a app agora parece outra coisa', {
      description: 'Fica activa mesmo se fechar a app. Long-press 2s no canto superior esquerdo + PIN para voltar',
      duration: 5000,
    })
  }

  // ── v3.21.0 — TRANSIÇÃO DIRECCIONAL: avançar desliza da direita, recuar da esquerda ──
  const navFlatOrder = useRef<string[]>(
    sidebarSections.flatMap((s) => s.items.map((i) => i.to))
  )
  const prevPathRef = useRef(location.pathname)
  const [dir, setDir] = useState<'fwd' | 'bwd'>('fwd')
  if (prevPathRef.current !== location.pathname) {
    const a = navFlatOrder.current.indexOf(prevPathRef.current)
    const b = navFlatOrder.current.indexOf(location.pathname)
    setDir(a === -1 || b === -1 || b >= a ? 'fwd' : 'bwd')
    prevPathRef.current = location.pathname
  }

  // ── v3.21.0 — SWIPE HORIZONTAL entre abas da dock (gesto nativo) ──
  const swipeOrder = useRef<string[]>(bottomNav.filter((i) => !i.isSOS).map((i) => i.to))
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const onSwipeStart = (e: TouchEvent) => {
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
  }

  const onSwipeEnd = (e: TouchEvent) => {
    const st = swipeStart.current
    swipeStart.current = null
    if (!st || !swipeNavEnabled() || sheet || sidebarOpen) return
    const t = e.changedTouches[0]
    const dx = t.clientX - st.x
    const dy = t.clientY - st.y
    // tem de ser claramente horizontal e longo o suficiente
    if (Math.abs(dx) < 90 || Math.abs(dy) > 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return
    // não navega se o toque foi num campo ou num scroller horizontal
    const el = e.target as HTMLElement | null
    if (el?.closest('input, textarea, select, [contenteditable="true"], [data-no-swipe]')) return
    let n: HTMLElement | null = el
    while (n && n !== document.body) {
      if (n.scrollWidth > n.clientWidth + 8) {
        const ox = window.getComputedStyle(n).overflowX
        if (ox === 'auto' || ox === 'scroll') return
      }
      n = n.parentElement
    }
    const cur = swipeOrder.current.indexOf(location.pathname)
    if (cur === -1) return
    const next = dx < 0 ? cur + 1 : cur - 1
    if (next < 0 || next >= swipeOrder.current.length) return
    void haptic('light')
    navigate(swipeOrder.current[next])
  }

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

  // ── v3.39.0 — BOTÃO VOLTAR NATIVO (APK) ──
  // Comporta-se como um app de verdade: fecha o que estiver aberto (folha de
  // acções, menu lateral), depois recua um ecrã e, no Painel, sai da app —
  // nunca fica preso nem fecha à cara do utilizador no meio de nada.
  // COM A CAMUFLAGEM ACTIVA o back é CONSUMIDO (o useDiscreetMode também o
  // registra): sair da app com o disfarce no ecrã é exactamente o que um
  // agressor tentaria forçar — aqui não faz nada.
  const backStateRef = useRef({ sheet: null as typeof sheet, sidebarOpen, pathname: location.pathname, locationKey: location.key, discreetActive })
  backStateRef.current = { sheet, sidebarOpen, pathname: location.pathname, locationKey: location.key, discreetActive }
  useEffect(() => {
    if (!isNative()) return
    let handle: PluginListenerHandle | null = null
    CapApp.addListener('backButton', () => {
      const s = backStateRef.current
      if (s.discreetActive) return // disfarce no ecrã — back consumido
      if (s.sheet) { setSheet(null); return }
      if (s.sidebarOpen) { setSidebarOpen(false); return }
      if (s.pathname !== '/dashboard') {
        if (s.locationKey !== 'default') window.history.back()
        else navigate('/dashboard', { replace: true })
        return
      }
      void CapApp.exitApp()
    })
      .then((h) => { handle = h })
      .catch(() => { /* web — sem botão nativo */ })
    return () => { void handle?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {/* Page Content — transição direcional nativa (v3.21.0) */}
        <main className="flex-1 pb-28 lg:pb-6">
          <div
            key={location.pathname}
            className={dir === 'bwd' ? 'screen-bwd' : 'screen-fwd'}
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
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
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="aegis-dock-sos"
                  onTouchStart={startPress(item.label, 'sos', item.to)}
                  onTouchEnd={clearPress}
                  onTouchMove={clearPress}
                  onClickCapture={clickGuard}
                  aria-label="SOS — toque para emergências, manter premido para ações"
                >
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
              <NavLink
                key={item.to}
                to={item.to}
                className="aegis-dock-item"
                onPointerDown={dockRipple}
                onTouchStart={startPress(item.label, 'nav', item.to)}
                onTouchEnd={clearPress}
                onTouchMove={clearPress}
                onClickCapture={clickGuard}
                aria-label={`${item.label} — toque para abrir, manter premido para ações`}
              >
                {active && (
                  <motion.span
                    layoutId="aegis-dock-pill"
                    className="aegis-dock-pill"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
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

      {/* ── FOLHA DE AÇÕES RÁPIDAS (v3.20.0) — aberta por long-press na dock ── */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              key="aegis-sheet-backdrop"
              className="aegis-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
            />
            <motion.div
              key="aegis-sheet"
              className="aegis-sheet"
              role="menu"
              aria-label={`Ações rápidas — ${sheet.title}`}
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.55 }}
              onDragEnd={(_, info) => {
                // gesto nativo: arrastar para baixo fecha a folha (v3.22.0)
                if (info.offset.y > 90 || info.velocity.y > 550) {
                  void haptic('light')
                  closeSheet()
                }
              }}
            >
              <div className="aegis-sheet-handle" />
              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-white/35 mb-2">
                Ações rápidas · {sheet.title}
              </p>
              {sheet.kind === 'sos' ? (
                <>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={call112}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10">
                      <Phone className="h-4.5 w-4.5 text-red-400" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Ligar 112</span>
                      <span className="block text-[10.5px] text-white/40">Emergência nacional — chamada direta</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={toggleAlarm}>
                    <span className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border',
                      alarmOn ? 'border-red-500/30 bg-red-500/15' : 'bg-white/[0.04] border-white/[0.07]'
                    )}>
                      {alarmOn ? <VolumeX className="h-4.5 w-4.5 text-red-400" /> : <Volume2 className="h-4.5 w-4.5 text-white/60" />}
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">{alarmOn ? 'Desligar sirene' : 'Sirene de emergência'}</span>
                      <span className="block text-[10.5px] text-white/40">{alarmOn ? 'A tocar — toque para parar' : 'Som alto para afastar agressores'}</span>
                    </span>
                    {alarmOn && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={() => void shareNow()}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.04] border-white/[0.07]">
                      <Share2 className="h-4.5 w-4.5 text-white/60" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Partilhar localização</span>
                      <span className="block text-[10.5px] text-white/40">Enviar GPS actual a quem confia</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={() => { void haptic('light'); closeSheet(); navigate(sheet.to ?? '/dashboard') }}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-brand/10 border-brand/25">
                      <ArrowUpRight className="h-4.5 w-4.5 text-brand" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Abrir {sheet.title}</span>
                      <span className="block text-[10.5px] text-white/40">Ir directamente para o ecrã</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={toggleSentinel}>
                    <span className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border',
                      radarWatch.watching ? 'border-emerald-500/25 bg-emerald-500/10' : 'bg-white/[0.04] border-white/[0.07]'
                    )}>
                      <ShieldCheck className={cn('h-4.5 w-4.5', radarWatch.watching ? 'text-emerald-400' : 'text-white/60')} />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">{radarWatch.watching ? 'Sentinela ACTIVA — desactivar' : 'Activar Sentinela'}</span>
                      <span className="block text-[10.5px] text-white/40">Vigilância Wi-Fi + BLE a cada 45s</span>
                    </span>
                    {radarWatch.watching && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={() => void verifyNow()}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.04] border-white/[0.07]">
                      <Radar className="h-4.5 w-4.5 text-white/60" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Verificar ambiente agora</span>
                      <span className="block text-[10.5px] text-white/40">Scan único + análise de ameaças</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={() => { void haptic('light'); closeSheet(); navigate('/dashboard/seguranca') }}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.04] border-white/[0.07]">
                      <Shield className="h-4.5 w-4.5 text-white/60" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Central de Segurança</span>
                      <span className="block text-[10.5px] text-white/40">Diário, locais conhecidos e veredicto</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                  <button type="button" className="aegis-sheet-row" onPointerDown={sheetRipple} onClick={camouflageNow}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/25 bg-purple-500/10">
                      <EyeOff className="h-4.5 w-4.5 text-purple-300" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[13px] font-semibold text-white">Camuflar agora</span>
                      <span className="block text-[10.5px] text-white/40">Disfarça a app no disfarce escolhido</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <OnboardingWizard />
      {/* v3.39.0 — FeatureTour e PWAInstallPrompt são conceitos WEB: na APK
          nada de "tour" nem de "instalar a PWA" — a app já é a app. */}
      {!isNative() && <FeatureTour />}
      {!isNative() && <PWAInstallPrompt />}
      <FallDetectionOverlay />
      <FakeCallOverlay />
    </div>
  )
}