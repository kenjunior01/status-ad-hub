import { motion, AnimatePresence } from 'framer-motion'
import {
  Bluetooth, BluetoothConnected, Clock, AlertTriangle,
  CheckCircle2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BLEDeviceStatus, DisconnectionAlert } from '@/hooks/useProximityMonitor'

interface ProximityPanelProps {
  isMonitoring: boolean
  deviceStatuses: BLEDeviceStatus[]
  alerts: DisconnectionAlert[]
  onDismissAlert: (deviceId: string) => void
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 5) return 'agora'
  if (secs < 60) return `ha ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `ha ${mins}min`
  return `ha ${Math.floor(mins / 60)}h`
}

/**
 * ProximityPanel — Real-time BLE monitoring panel for the Dashboard.
 * Shows connection status, grace period countdown, and recent alerts.
 */
export function ProximityPanel({ isMonitoring, deviceStatuses, alerts, onDismissAlert }: ProximityPanelProps) {
  const unhandledAlerts = alerts.filter(a => !a.handled)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg border',
            isMonitoring
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-white/[0.03] border-white/[0.06]'
          )}>
            {isMonitoring
              ? <BluetoothConnected className="h-3.5 w-3.5 text-blue-400" />
              : <Bluetooth className="h-3.5 w-3.5 text-white/30" />
            }
          </div>
          <span className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full border',
            isMonitoring
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-white/[0.03] text-white/20 border-white/[0.06]'
          )}>
            {isMonitoring ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Device List */}
      {deviceStatuses.length === 0 ? (
        <div className="text-center py-4">
          <Bluetooth className="h-6 w-6 text-white/10 mx-auto mb-1.5" />
          <p className="text-[10px] text-white/25">Sem dispositivos monitorados</p>
          <p className="text-[9px] text-white/15 mt-0.5">Pareie e active monitorizacao em Dispositivos</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {deviceStatuses.map(ds => (
            <div
              key={ds.deviceId}
              className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300',
                ds.inGracePeriod
                  ? 'bg-amber-500/[0.06] border-amber-500/20'
                  : ds.connected
                    ? 'bg-brand/[0.03] border-brand/10'
                    : 'bg-red-500/[0.04] border-red-500/10'
              )}
            >
              {/* Connection Icon */}
              <div className="shrink-0">
                {ds.inGracePeriod ? (
                  <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                ) : ds.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
              </div>

              {/* Device info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white/70 truncate">{ds.deviceName}</p>
                {ds.inGracePeriod ? (
                  <p className="text-[10px] text-amber-400 font-mono">
                    Grace: {ds.graceRemaining}s
                  </p>
                ) : ds.connected ? (
                  <p className="text-[9px] text-brand/60">Conectado</p>
                ) : (
                  <p className="text-[9px] text-red-400/60">
                    {ds.disconnectedAt ? `Desconectado ha ${timeSince(ds.disconnectedAt)}` : 'Desconectado'}
                  </p>
                )}
              </div>

              {/* Status dot */}
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0',
                ds.inGracePeriod
                  ? 'bg-amber-400 animate-pulse'
                  : ds.connected
                    ? 'bg-brand'
                    : 'bg-red-400'
              )} />
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      <AnimatePresence>
        {unhandledAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-medium">Alertas Recentes</p>
            {unhandledAlerts.slice(0, 3).map(alert => (
              <div
                key={alert.deviceId + alert.disconnectedAt}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/[0.04] border border-red-500/10"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-red-300/80 font-medium truncate">{alert.deviceName}</p>
                  <p className="text-[9px] text-white/25">
                    {alert.emergencyTriggered ? 'Emergencia activada' : 'Desconectado'} · {timeSince(alert.disconnectedAt)}
                  </p>
                </div>
                <button
                  onClick={() => onDismissAlert(alert.deviceId)}
                  className="p-0.5 rounded hover:bg-white/[0.06] transition"
                >
                  <X className="h-3 w-3 text-white/20" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
