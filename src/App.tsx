import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { BluetoothProvider } from '@/hooks/useBluetooth'
import { NotificationProvider } from '@/hooks/useNotifications'
import { OfflineQueueProvider } from '@/hooks/useOfflineQueue'
import { PWAProvider } from '@/hooks/usePWA'
import { useGlobalErrorHandlers, getReactQueryDefaults } from '@/hooks/useGlobalErrorHandlers'
import { lazy, Suspense } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { NoiseTexture, MorphingBlob, Shimmer } from '@/components/effects'
import { ErrorBoundary, WithErrorBoundary } from '@/components/ErrorBoundary'
import { SOSButton } from '@/components/SOSButton'
import { useSmartGlasses } from '@/hooks/useSmartGlasses'
import { GlassesSOSOverlay } from '@/components/GlassesSOSOverlay'
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts'
import { VoiceSOSProvider } from '@/hooks/useVoiceSOS'
import { PanicModeProvider } from '@/hooks/usePanicMode'
import { DiscreetModeProvider } from '@/hooks/useDiscreetMode'
import { DeadMansSwitchProvider } from '@/hooks/useDeadMansSwitch'
import { NightSafetyProvider } from '@/hooks/useNightSafety'
import { TripTrackingProvider } from '@/hooks/useTripTracking'
import { AntiCoercionProvider, useAntiCoercion } from '@/hooks/useAntiCoercion'
import { FakeDashboard } from '@/components/FakeDashboard'
import { DiscreetModeOverlay } from '@/components/DiscreetModeOverlay'
import { PanicModeOverlay } from '@/components/PanicModeOverlay'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const ActivateDevice = lazy(() => import('@/pages/ActivateDevice'))
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Devices = lazy(() => import('@/pages/Devices'))
const EmergencyContacts = lazy(() => import('@/pages/EmergencyContacts'))
const History = lazy(() => import('@/pages/History'))
const Settings = lazy(() => import('@/pages/Settings'))
const Emergency = lazy(() => import('@/pages/Emergency'))
const TrackEmergency = lazy(() => import('@/pages/TrackEmergency'))
const Diagnostics = lazy(() => import('@/pages/Diagnostics'))
const CheckIn = lazy(() => import('@/pages/CheckIn'))
const SmartGlasses = lazy(() => import('@/pages/SmartGlasses'))
const QuickActions = lazy(() => import('@/pages/QuickActions'))
const CommunityRadar = lazy(() => import('@/pages/CommunityRadar'))
const DiscreetModeSettings = lazy(() => import('@/pages/DiscreetModeSettings'))
const DisguiseSelector = lazy(() => import('@/pages/DisguiseSelector'))
const BellvionDevices = lazy(() => import('@/pages/BellvionDevices'))
const CamuflagemPWA = lazy(() => import('@/pages/CamuflagemPWA'))
const SafeRoute = lazy(() => import('@/pages/SafeRoute'))
const TripTracking = lazy(() => import('@/pages/TripTracking'))
const IncidentTimeline = lazy(() => import('@/pages/IncidentTimeline'))
const InstallChoice = lazy(() => import('@/components/InstallChoice'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Subscription = lazy(() => import('@/pages/Subscription'))
const AdminShell = lazy(() => import('@/components/admin/AdminShell'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'))
const AdminSubscriptions = lazy(() => import('@/pages/admin/AdminSubscriptions'))
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents'))
const AdminPlans = lazy(() => import('@/pages/admin/AdminPlans'))
const AdminConfiguracoes = lazy(() => import('@/pages/admin/AdminConfiguracoes'))
const AdminCodigos = lazy(() => import('@/pages/admin/AdminCodigos'))
const AdminSeguranca = lazy(() => import('@/pages/admin/AdminSeguranca'))
const EvidenceVault = lazy(() => import('@/pages/EvidenceVault'))
const MedicalProfile = lazy(() => import('@/pages/MedicalProfile'))
const FallDetection = lazy(() => import('@/pages/FallDetection'))
const FakeCall = lazy(() => import('@/pages/FakeCall'))
const SafetyTips = lazy(() => import('@/pages/SafetyTips'))

const queryClient = new QueryClient({ defaultOptions: getReactQueryDefaults() })

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { isCoercionMode } = useAntiCoercion()
  if (loading) return <LoadingScreen />
  // In coercion mode, allow access even without auth (fake session)
  if (!user && !isCoercionMode) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function CoercionShield({ children }: { children: React.ReactNode }) {
  const { isCoercionMode } = useAntiCoercion()
  if (isCoercionMode) return <FakeDashboard />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WithErrorBoundary context="landing"><Landing /></WithErrorBoundary>} />
      <Route path="/login" element={<PublicRoute><WithErrorBoundary context="login"><Login /></WithErrorBoundary></PublicRoute>} />
      <Route path="/ativar" element={<PublicRoute><WithErrorBoundary context="activate"><ActivateDevice /></WithErrorBoundary></PublicRoute>} />
      <Route path="/track/:token" element={<WithErrorBoundary context="tracking"><TrackEmergency /></WithErrorBoundary>} />
      <Route path="/instalar" element={<WithErrorBoundary context="install"><InstallChoice /></WithErrorBoundary>} />
      <Route path="/planos" element={<WithErrorBoundary context="pricing"><Pricing /></WithErrorBoundary>} />
      <Route path="/dashboard" element={<ProtectedRoute><CoercionShield><DashboardLayout /></CoercionShield></ProtectedRoute>}>
        <Route index element={<WithErrorBoundary context="dashboard"><Dashboard /></WithErrorBoundary>} />
        <Route path="devices" element={<WithErrorBoundary context="devices"><Devices /></WithErrorBoundary>} />
        <Route path="contacts" element={<WithErrorBoundary context="contacts"><EmergencyContacts /></WithErrorBoundary>} />
        <Route path="emergency-contacts" element={<Navigate to="/dashboard/contacts" replace />} />
        <Route path="history" element={<WithErrorBoundary context="history"><History /></WithErrorBoundary>} />
        <Route path="settings" element={<WithErrorBoundary context="settings"><Settings /></WithErrorBoundary>} />
        <Route path="emergency" element={<WithErrorBoundary context="emergency" severity="fatal"><Emergency /></WithErrorBoundary>} />
        <Route path="diagnostics" element={<WithErrorBoundary context="diagnostics"><Diagnostics /></WithErrorBoundary>} />
        <Route path="checkin" element={<WithErrorBoundary context="checkin"><CheckIn /></WithErrorBoundary>} />
        <Route path="oculos" element={<WithErrorBoundary context="smart-glasses"><SmartGlasses /></WithErrorBoundary>} />
        <Route path="accoes" element={<WithErrorBoundary context="quick-actions"><QuickActions /></WithErrorBoundary>} />
        <Route path="radar" element={<WithErrorBoundary context="community-radar"><CommunityRadar /></WithErrorBoundary>} />
        <Route path="discreto" element={<WithErrorBoundary context="discreet-settings"><DiscreetModeSettings /></WithErrorBoundary>} />
        <Route path="camuflar" element={<WithErrorBoundary context="disguise-selector"><DisguiseSelector /></WithErrorBoundary>} />
        <Route path="camuflagem-pwa" element={<WithErrorBoundary context="camuflagem-pwa"><CamuflagemPWA /></WithErrorBoundary>} />
        <Route path="bellvion" element={<WithErrorBoundary context="bellvion-devices"><BellvionDevices /></WithErrorBoundary>} />
        <Route path="rota" element={<WithErrorBoundary context="safe-route"><SafeRoute /></WithErrorBoundary>} />
        <Route path="viagens" element={<WithErrorBoundary context="trip-tracking"><TripTracking /></WithErrorBoundary>} />
        <Route path="timeline" element={<WithErrorBoundary context="incident-timeline"><IncidentTimeline /></WithErrorBoundary>} />
        <Route path="assinatura" element={<WithErrorBoundary context="subscription"><Subscription /></WithErrorBoundary>} />
        <Route path="evidencias" element={<WithErrorBoundary context="evidence-vault"><EvidenceVault /></WithErrorBoundary>} />
        <Route path="ficha-medica" element={<WithErrorBoundary context="medical-profile"><MedicalProfile /></WithErrorBoundary>} />
        <Route path="queda" element={<WithErrorBoundary context="fall-detection"><FallDetection /></WithErrorBoundary>} />
        <Route path="chamada-falsa" element={<WithErrorBoundary context="fake-call"><FakeCall /></WithErrorBoundary>} />
        <Route path="dicas" element={<WithErrorBoundary context="safety-tips"><SafetyTips /></WithErrorBoundary>} />
        <Route path="admin" element={<WithErrorBoundary context="admin"><AdminShell /></WithErrorBoundary>}>
          <Route index element={<AdminDashboard />} />
          <Route path="utilizadores" element={<AdminUsers />} />
          <Route path="pagamentos" element={<AdminPayments />} />
          <Route path="assinaturas" element={<AdminSubscriptions />} />
          <Route path="eventos" element={<AdminEvents />} />
          <Route path="planos" element={<AdminPlans />} />
          <Route path="configuracoes" element={<AdminConfiguracoes />} />
          <Route path="codigos" element={<AdminCodigos />} />
          <Route path="seguranca" element={<AdminSeguranca />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LoadingScreen() {
  return (
    <div className="dark min-h-screen bg-[#0C0B08] flex flex-col items-center justify-center relative overflow-hidden">
      <NoiseTexture opacity={0.02} />
      <MorphingBlob className="-left-32 top-1/3" color="rgba(212, 175, 55, 0.04)" size={350} />
      <MorphingBlob className="-right-32 bottom-1/3" color="rgba(212, 175, 55, 0.03)" size={300} />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 animate-breathe">
            <Shield className="h-7 w-7 text-[#D4AF37]" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/5 blur-xl" />
        </div>
        <div className="flex flex-col items-center gap-2.5 w-48">
          <Shimmer className="h-3 w-32 rounded-lg" />
          <Shimmer className="h-2 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function GlassesOverlayWrapper() {
  const { state, config, audioRecorder, stopAndSaveEvidence } = useSmartGlasses()
  const { activeEmergency } = useEmergencyAlerts()

  const isActive = state.isHIDActive && config?.sos_enabled && !!activeEmergency

  return (
    <GlassesSOSOverlay
      isActive={isActive}
      isStealth={config?.stealth_mode ?? true}
      isRecording={audioRecorder.isRecording}
      recordingDuration={audioRecorder.duration}
      onStop={stopAndSaveEvidence}
    />
  )
}

/**
 * InnerApp — mounts inside providers, has access to auth context.
 * Installs global error handlers and renders SOS button OUTSIDE the
 * global ErrorBoundary so it survives page-level crashes.
 */
function InnerApp() {
  useGlobalErrorHandlers()

  return (
    <BrowserRouter>
      <ErrorBoundary context="global">
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
      {/* Overlays render ABOVE the global ErrorBoundary — always accessible */}
      <GlassesOverlayWrapper />
      <PanicModeOverlay />
      <DiscreetModeOverlay />
      <SOSButton />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-[#221E16] dark:text-white dark:border-white/10'
        }}
      />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BluetoothProvider>
        <NotificationProvider>
        <OfflineQueueProvider>
        <PWAProvider>
        <VoiceSOSProvider>
        <PanicModeProvider>
        <DiscreetModeProvider>
        <DeadMansSwitchProvider>
        <NightSafetyProvider>
        <TripTrackingProvider>
        <AntiCoercionProvider>
          <InnerApp />
        </AntiCoercionProvider>
        </TripTrackingProvider>
        </NightSafetyProvider>
        </DeadMansSwitchProvider>
        </DiscreetModeProvider>
        </PanicModeProvider>
        </VoiceSOSProvider>
        </PWAProvider>
        </OfflineQueueProvider>
        </NotificationProvider>
        </BluetoothProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}