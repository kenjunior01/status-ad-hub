import { Component, type ErrorInfo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Shield, RefreshCw, Home, AlertTriangle, Copy, Check, ClipboardList } from 'lucide-react'
import { logError, getUserId, exportErrorLogs } from '@/lib/error-logger'

type Severity = 'fatal' | 'error' | 'warning'

interface Props {
  children: ReactNode
  context?: string
  fallback?: ReactNode
  severity?: Severity
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '', copied: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info.componentStack ? info.componentStack.slice(0, 500) : ''
    this.setState({ errorInfo: stack, copied: false })

    const ctx = this.props.context || 'global'
    const sev: Severity = this.props.severity
      ? this.props.severity
      : ctx === 'emergency' ? 'fatal' : 'error'

    console.error('[ErrorBoundary' + (ctx !== 'global' ? ' (' + ctx + ')' : '') + ']', error)
    this.props.onError?.(error, info)

    // Persist to IndexedDB via error-logger (fire-and-forget)
    logError({
      timestamp: new Date().toISOString(),
      context: ctx,
      source: 'boundary',
      message: error.message,
      stack: (error.stack || '').slice(0, 500),
      componentStack: stack,
      userId: getUserId(),
      severity: sev,
    }).catch(() => { /* noop */ })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '', copied: false })
  }

  private handleGoHome = () => { window.location.href = '/dashboard' }
  private handleReload = () => { window.location.reload() }

  private handleCopy = async () => {
    try {
      const data = await exportErrorLogs()
      const text = this.state.error
        ? `Erro: ${this.state.error.message}\n\nStack:\n${(this.state.error.stack || '').slice(0, 800)}\n\nContexto: ${this.props.context || 'global'}\n\nComponent Stack:\n${this.state.errorInfo}`
        : data
      await navigator.clipboard.writeText(text)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2_000)
    } catch { /* clipboard API not available */ }
  }

  private renderError() {
    const isEmergency = this.props.context === 'emergency'
    const errorMsg = this.state.error ? this.state.error.message : ''
    const ctxLabel = this.props.context
      ? ' em "' + this.props.context + '"'
      : ''
    const desc = isEmergency
      ? 'A pagina de emergencia encontrou um erro. A sua seguranca nao foi afectada. Use o botao SOS flutuante ou recarregue a pagina.'
      : 'Ocorreu um erro inesperado' + ctxLabel + '. Tente recarregar a pagina. Se o problema persistir, contacte o suporte.'
    const title = isEmergency ? 'Erro na Pagina de Emergencia' : 'Algo correu mal'
    const iconBg = isEmergency ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
    const glowBg = isEmergency ? 'bg-red-500/20' : 'bg-amber-500/20'
    const iconColor = isEmergency ? 'text-red-400' : 'text-amber-400'

    return (
      <div className="min-h-screen bg-[#0C0B08] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.02] to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <div className={"flex h-16 w-16 items-center justify-center rounded-2xl border " + iconBg}>
            {isEmergency
              ? <AlertTriangle className={"h-8 w-8 " + iconColor} />
              : <Shield className={"h-8 w-8 " + iconColor} />}
          </div>
          <div className={"absolute inset-0 rounded-2xl blur-xl opacity-30 " + glowBg} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-lg font-display font-bold text-white mb-2 text-center"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-sm text-white/40 text-center max-w-sm mb-6 leading-relaxed"
        >
          {desc}
        </motion.p>

        {errorMsg ? (
          <motion.details
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md mb-6"
          >
            <summary className="text-[10px] text-white/20 cursor-pointer hover:text-white/30 transition-colors text-center select-none">
              Detalhes tecnicos
            </summary>
            <div className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-auto max-h-32">
              <p className="text-[10px] font-mono text-red-400/60 break-all">{errorMsg}</p>
              {this.state.errorInfo ? (
                <pre className="mt-2 text-[9px] font-mono text-white/15 whitespace-pre-wrap break-all">{this.state.errorInfo}</pre>
              ) : null}
            </div>
          </motion.details>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
        >
          <button onClick={this.handleReset} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-white font-semibold text-sm transition-colors">
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
          </button>
          <button onClick={this.handleGoHome} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 text-sm transition-colors">
            <Home className="h-4 w-4" /> Ir para Dashboard
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 mt-4"
        >
          <button onClick={this.handleCopy} className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors">
            {this.state.copied
              ? <><Check className="h-3 w-3 text-[#D4AF37]" /> Copiado</>
              : <><Copy className="h-3 w-3" /> Copiar erro</>}
          </button>
          <button onClick={this.handleReload} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
            Recarregar pagina
          </button>
        </motion.div>

        {isEmergency ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/15"
          >
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-red-300/70">O botao SOS permanece activo no canto inferior da tela.</span>
          </motion.div>
        ) : null}

        <p className="mt-8 text-[10px] text-white/10 font-mono">StatusAds Connect v3.2.0</p>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return this.renderError()
    }
    return this.props.children
  }
}

/** HOC for convenient usage in JSX */
export function WithErrorBoundary({ context, severity, children }: { context?: string; severity?: Severity; children: ReactNode }) {
  return <ErrorBoundary context={context} severity={severity}>{children}</ErrorBoundary>
}

/**
 * @deprecated Use `getErrorLogs` from `@/lib/error-logger` instead.
 * Kept for backward compat with Settings page import.
 */
export function getErrorLogs() {
  try {
    return JSON.parse(localStorage.getItem('statusads_error_log') || '[]')
  } catch { return [] }
}

/**
 * @deprecated Use `clearErrorLogs` from `@/lib/error-logger` instead.
 */
export function clearErrorLogs() {
  localStorage.removeItem('statusads_error_log')
}
