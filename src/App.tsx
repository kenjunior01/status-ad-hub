import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Devices = lazy(() => import('@/pages/Devices'))
const EmergencyContacts = lazy(() => import('@/pages/EmergencyContacts'))
const History = lazy(() => import('@/pages/History'))
const Settings = lazy(() => import('@/pages/Settings'))

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="dark min-h-screen bg-[#0A0F1A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="dark min-h-screen bg-[#0A0F1A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
    </div>
  )
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={
            <div className="dark min-h-screen bg-[#0A0F1A] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
            </div>
          }>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-[#1F2937] dark:text-white dark:border-white/10'
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}