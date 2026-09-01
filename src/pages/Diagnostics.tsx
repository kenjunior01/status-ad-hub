import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Bell, Volume2, MessageSquare, Bluetooth, Shield,
  MapPin, Smartphone, CheckCircle2, XCircle, AlertCircle,
  Loader2, RefreshCw, ExternalLink, Wifi, WifiOff, Database, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useNotifications } from '@/hooks/useNotifications'
import { useDevices } from '@/hooks/useDevices'
import { useContacts } from '@/hooks/useContacts'
import { SpotlightCard, Shimmer } from '@/components/effects'
import { isPushSupported } from '@/lib/web-push'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { getErrorLogs, clearErrorLogs } from '@/components/ErrorBoundary'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

// ============================================
// Diagnostic check types
// ============================================

interface CheckResult {
  id: string
  label: string
  description: string
  status: 'checking' | 'pass' | 'fail' | 'warn'
  detail: string
  icon: React.ElementType
  action?: { label: string; onClick: () => void }
}

export default function Diagnostics() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { position: userPos, permissionState: geoPerm, isTracking } = useGeolocation()
  const { permission: notifPerm, isPushSubscribed, isPushSupported, requestPermission, subscribePush } = useNotifications()
  const { devices } = useDevices()
  const { contacts } = useContacts()

  const [checks, setChecks] = useState<CheckResult[]>([])
  const [running, setRunning] = useState(false)
  const [alarmTested, setAlarmTested] = useState(false)
  const network = useNetworkStatus(false)
  const queue = useOfflineQueue()
  const [errorLogs, setErrorLogs] = useState<ReturnType<typeof getErrorLogs>>([])

  const runDiagnostics = async () => {
    setRunning(true)
    setAlarmTested(false)

    const results: CheckResult[] = []

    // 1. Authentication
    results.push({
      id: 'auth', label: 'Autenticacao',
      description: 'Sessao Supabase activa',
      status: user ? 'pass' : 'fail',
      detail: user ? `Logado como ${(user.email || '').slice(0, 20)}` : 'Nao autenticado',
      icon: Shield,
    })

    // 2. GPS / Geolocation
    results.push({
      id: 'gps', label: 'GPS / Localizacao',
      description: 'Geolocalizacao do navegador',
      status: userPos ? (userPos.accuracy && userPos.accuracy < 50 ? 'pass' : 'warn') : (geoPerm === 'denied' ? 'fail' : 'warn'),
      detail: userPos
        ? `Lat: ${userPos.latitude.toFixed(5)}, Lng: ${userPos.longitude.toFixed(5)} (${Math.round(userPos.accuracy || 0)}m)`
        : geoPerm === 'denied' ? 'Permissao negada' : 'A aguardar GPS...',
      icon: Radio,
      action: geoPerm !== 'granted' && geoPerm !== 'denied' ? { label: 'Pedir GPS', onClick: () => {} } : undefined,
    })

    // 3. Browser Notifications
    results.push({
      id: 'notif', label: 'Notificacoes do Browser',
      description: 'Permissao para mostrar alertas',
      status: notifPerm === 'granted' ? 'pass' : notifPerm === 'denied' ? 'fail' : 'warn',
      detail: notifPerm === 'granted' ? 'Permissao concedida' : notifPerm === 'denied' ? 'Bloqueadas pelo utilizador' : 'Ainda nao pedida',
      icon: Bell,
      action: notifPerm !== 'granted' && notifPerm !== 'denied' ? { label: 'Activar', onClick: () => requestPermission() } : undefined,
    })

    // 4. Web Push
    results.push({
      id: 'push', label: 'Web Push',
      description: 'Notificacoes em fundo via Service Worker',
      status: isPushSubscribed ? 'pass' : isPushSupported ? 'warn' : 'fail',
      detail: isPushSubscribed ? 'Subscrito — recebera alertas em fundo' : isPushSupported ? 'Suportado mas nao inscrito' : 'Nao suportado neste navegador',
      icon: Volume2,
      action: isPushSupported && !isPushSubscribed ? { label: 'Activar Push', onClick: () => subscribePush() } : undefined,
    })

    // 5. BLE Support
    const bleSupported = 'bluetooth' in navigator
    results.push({
      id: 'ble', label: 'Bluetooth BLE',
      description: 'Web Bluetooth API para dispositivos',
      status: bleSupported ? 'pass' : 'warn',
      detail: bleSupported ? 'Web Bluetooth disponivel (Chromium)' : 'Nao disponivel — use Chrome/Edge',
      icon: Bluetooth,
    })

    // 6. Service Worker
    const swReady = 'serviceWorker' in navigator && !!navigator.serviceWorker?.controller
    results.push({
      id: 'sw', label: 'Service Worker',
      description: 'PWA offline + push handler',
      status: swReady ? 'pass' : 'warn',
      detail: swReady ? 'Activo — push notifications funcionam' : 'Nao registado — recarregue a pagina',
      icon: Wifi,
    })

    // 7. Paired Devices
    results.push({
      id: 'devices', label: 'Dispositivos Pareados',
      description: 'BLE devices registados',
      status: devices.length > 0 ? 'pass' : 'warn',
      detail: devices.length > 0 ? `${devices.length} dispositivo(s) — ${devices.filter(d => d.status === 'online' || d.status === 'connected').length} activos` : 'Nenhum dispositivo — adicione em Dispositivos',
      icon: Smartphone,
      action: devices.length === 0 ? { label: 'Adicionar', onClick: () => navigate('/dashboard/devices') } : undefined,
    })

    // 8. Emergency Contacts
    results.push({
      id: 'contacts', label: 'Contactos de Emergencia',
      description: 'Pessoas a notificar via SMS',
      status: contacts.length > 0 ? 'pass' : 'fail',
      detail: contacts.length > 0 ? `${contacts.length} contacto(s) com alerta activo` : 'CRITICO: Sem contactos — SMS nao sera enviado',
      icon: MessageSquare,
      action: contacts.length === 0 ? { label: 'Adicionar', onClick: () => navigate('/dashboard/contacts') } : undefined,
    })

    // 9. Network
    results.push({
      id: 'network', label: 'Conexao a Internet',
      description: 'Connectividade para API + SMS',
      status: navigator.onLine ? 'pass' : 'fail',
      detail: navigator.onLine ? 'Online' : 'Offline — emergencias serao guardadas localmente',
      icon: Wifi,
    })

    // 10. Offline Queue
    const q = queue.pendingCount
    results.push({
      id: 'queue', label: 'Fila Offline',
      description: 'Pedidos pendentes em IndexedDB',
      status: q === 0 ? 'pass' : queue.emergencyPending > 0 ? 'fail' : 'warn',
      detail: q === 0 ? 'Fila vazia' : `${q} item(s) — ${queue.emergencyPending} emergencia(s), ${queue.eventPending} evento(s)`,
      icon: Database,
      action: q > 0 && navigator.onLine ? { label: 'Sincronizar', onClick: () => queue.syncQueue() } : undefined,
    })

    // 11. PWA Installable
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    results.push({
      id: 'pwa', label: 'Modo PWA',
      description: 'App instalada no dispositivo',
      status: isPWA ? 'pass' : 'warn',
      detail: isPWA ? 'A correr como app instalada' : 'No browser — instale para melhor experiencia',
      icon: MapPin,
    })

    setChecks(results)
    setRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
    setErrorLogs(getErrorLogs())
  }, [])

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length
  const isReady = failCount === 0 && passCount >= 9

  // Test alarm sound
  const handleTestAlarm = async () => {
    const { startEmergencyAlarm, stopEmergencyAlarm } = await import('@/lib/emergency-alarm')
    startEmergencyAlarm({ duration: 5_000, volume: 0.5, vibrate: true })
    setAlarmTested(true)
    toast.success('Alarme de teste — 5 segundos', { duration: 3_000 })
    setTimeout(() => stopEmergencyAlarm(), 5_500)
  }

  // Test notification
  const handleTestNotification = async () => {
    if (notifPerm !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }
    // Direct notification via Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready
      reg.showNotification('TESTE — StatusAds Connect', {
        body: 'Esta e uma notificacao de teste. O sistema esta a funcionar correctamente.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        vibrate: [100],
        actions: [
          { action: 'view', title: 'Ver Diagnostico' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      } as NotificationOptions)
      toast.success('Notificacao de teste enviada', { duration: 3_000 })
    } else {
      new Notification('TESTE — StatusAds Connect', {
        body: 'Notificacao de teste (sem Service Worker).',
        icon: '/pwa-192x192.png',
      })
    }
  }

  const statusColors = {
    checking: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    pass: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20',
    fail: 'text-red-400 bg-red-500/10 border-red-500/20',
    warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }
  const statusIcons = {
    checking: Loader2,
    pass: CheckCircle2,
    fail: XCircle,
    warn: AlertCircle,
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Diagnostico do Sistema</h1>
        <p className="text-sm text-white/30 mt-1">Verifique se o StatusAds Connect esta pronto para proteger voce.</p>
      </motion.div>

      {/* Overall status banner */}
      {checks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-4 p-4 rounded-2xl border mb-6',
            isReady
              ? 'bg-[#25D366]/[0.05] border-[#25D366]/15'
              : 'bg-red-500/[0.05] border-red-500/15'
          )}
        >
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            isReady ? 'bg-[#25D366]/15' : 'bg-red-500/15'
          )}>
            {isReady
              ? <CheckCircle2 className="h-6 w-6 text-[#25D366]" />
              : <AlertCircle className="h-6 w-6 text-red-400" />
            }
          </div>
          <div className="flex-1">
            <h2 className={cn('font-display font-bold', isReady ? 'text-[#25D366]' : 'text-red-400')}>
              {isReady ? 'Sistema Pronto' : 'Atencao Necessaria'}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {passCount}/{checks.length} verificacoes passaram{failCount > 0 ? ` — ${failCount} problema(s) encontrado(s)` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-white">{passCount}</div>
            <div className="text-[10px] text-white/25">de {checks.length}</div>
          </div>
        </motion.div>
      )}

      {/* Test actions */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2 mb-6">
        <Button onClick={runDiagnostics} disabled={running} variant="outline" className="gap-2 rounded-xl border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.04]">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Executar Diagnosticos
        </Button>
        <Button onClick={handleTestAlarm} variant="outline" className="gap-2 rounded-xl border-amber-500/15 text-amber-400 hover:bg-amber-500/[0.06]">
          <Volume2 className="h-3.5 w-3.5" />
          Testar Alarme Sonoro
        </Button>
        <Button onClick={handleTestNotification} variant="outline" className="gap-2 rounded-xl border-blue-500/15 text-blue-400 hover:bg-blue-500/[0.06]">
          <Bell className="h-3.5 w-3.5" />
          Testar Notificacao
        </Button>
      </motion.div>

      {/* Check results */}
      <div className="space-y-2 max-w-3xl">
        {checks.length === 0 && (
          <div className="space-y-3">
            <Shimmer className="h-20 w-full rounded-2xl" />
            <Shimmer className="h-20 w-full rounded-2xl" />
            <Shimmer className="h-20 w-full rounded-2xl" />
          </div>
        )}
        {checks.map((check, i) => {
          const StatusIcon = statusIcons[check.status]
          const CheckIcon = check.icon
          return (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <SpotlightCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border shrink-0',
                    statusColors[check.status]
                  )}>
                    <StatusIcon className={cn('h-5 w-5', check.status === 'checking' && 'animate-spin')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-3.5 w-3.5 text-white/30" />
                      <p className="text-sm font-medium text-white/80">{check.label}</p>
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5">{check.description}</p>
                    <p className={cn(
                      'text-xs mt-1.5 font-mono',
                      check.status === 'pass' ? 'text-[#25D366]/70' :
                      check.status === 'fail' ? 'text-red-400/70' : 'text-amber-400/70'
                    )}>
                      {check.detail}
                    </p>
                  </div>
                  {check.action && (
                    <Button
                      size="sm"
                      onClick={check.action.onClick}
                      variant="outline"
                      className="shrink-0 h-8 text-[10px] rounded-lg border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/10"
                    >
                      {check.action.label}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )
        })}
      </div>

      {/* Note about SMS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="max-w-3xl mt-6">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[11px] text-white/25 leading-relaxed">
            <strong className="text-white/40">Nota sobre SMS:</strong> O envio de SMS via Twilio requer configuracao de secrets nas Edge Functions do Supabase
            (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER). Veja o ficheiro .env.example para instrucoes.
            Sem esta configuracao, as emergencias serao registadas mas os contactos nao receberao SMS.
          </p>
        </div>
      </motion.div>

      {/* Error Logs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="max-w-3xl mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-white">Registo de Erros</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25">{errorLogs.length} registos</span>
            {errorLogs.length > 0 && (
              <button
                onClick={() => { clearErrorLogs(); setErrorLogs([]); toast.success('Registos apagados') }}
                className="text-white/20 hover:text-red-400 transition-colors"
                title="Limpar registos"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {errorLogs.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#25D366]/[0.03] border border-[#25D366]/10 text-center">
            <CheckCircle2 className="h-5 w-5 text-[#25D366]/40 mx-auto mb-1.5" />
            <p className="text-xs text-[#25D366]/50">Sem erros registados. O sistema esta estavel.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {errorLogs.map((log, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-white/20">{new Date(log.timestamp).toLocaleString('pt-PT')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/70">{log.context || 'global'}</span>
                </div>
                <p className="text-xs font-mono text-red-400/50 break-all">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
