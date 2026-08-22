import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { BluetoothProvider } from '@/hooks/useBluetooth'
import { NotificationProvider } from '@/hooks/useNotifications'
import { PWAProvider } from '@/hooks/usePWA'
import { lazy, Suspense } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { NoiseTexture, MorphingBlob, Shimmer } from '@/components/effects'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Devices = lazy(() => import('@/pages/Devices'))
const EmergencyContacts = lazy(() => import('@/pages/EmergencyContacts'))
const History = lazy(() => import('@/pages/History'))
const Settings = lazy(() => import('@/pages/Settings'))
const Emergency = lazy(() => import('@/pages/Emergency'))

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="devices" element={<Devices />} />
        <Route path="contacts" element={<EmergencyContacts />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="emergency" element={<Emergency />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function LoadingScreen() {
  return (
    <div className="dark min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      <NoiseTexture opacity={0.02} />
      <MorphingBlob className="-left-32 top-1/3" color="rgba(37, 211, 102, 0.04)" size={350} />
      <MorphingBlob className="-right-32 bottom-1/3" color="rgba(59, 130, 246, 0.03)" size={300} />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 animate-breathe">
            <Shield className="h-7 w-7 text-[#25D366]" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-[#25D366]/5 blur-xl" />
        </div>
        <div className="flex flex-col items-center gap-2.5 w-48">
          <Shimmer className="h-3 w-32 rounded-lg" />
          <Shimmer className="h-2 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BluetoothProvider>
        <NotificationProvider>
        <PWAProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-[#1F2937] dark:text-white dark:border-white/10'
            }}
          />
        </BrowserRouter>
        </PWAProvider>
        </NotificationProvider>
        </BluetoothProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}