import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Shimmer, SpotlightCard, BeamBorder, GlowCard } from '@/components/effects'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  Share2,
  Copy,
  Check,
  MapPin,
  Clock,
  Lock,
  Shield,
  Link2,
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  StopCircle,
  RefreshCw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LocationShareLinkProps {
  className?: string
  /** Auto-generate a share link on mount (default true) */
  autoGenerate?: boolean
}

interface ShareLinkData {
  token: string
  lat: number
  lng: number
  createdAt: number
  expiresAt: number | null
  password: string | null
  active: boolean
}

type ExpiryOption = {
  label: string
  value: number | null // milliseconds, null = unlimited
}

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
  { label: '1 hora', value: 60 * 60 * 1000 },
  { label: '2 horas', value: 2 * 60 * 60 * 1000 },
  { label: 'Ilimitado', value: null },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateToken(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'O'}`
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = 'share-link-'

function saveShareLink(data: ShareLinkData): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + data.token, JSON.stringify(data))
  } catch {
    // localStorage unavailable
  }
}

function loadShareLinks(): ShareLinkData[] {
  const links: ShareLinkData[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) links.push(JSON.parse(raw))
        } catch {
          // corrupted entry
        }
      }
    }
  } catch {
    // localStorage unavailable
  }
  return links
}

function updateShareLink(token: string, patch: Partial<ShareLinkData>): void {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + token)
    if (raw) {
      const data = JSON.parse(raw) as ShareLinkData
      const updated = { ...data, ...patch }
      localStorage.setItem(STORAGE_PREFIX + token, JSON.stringify(updated))
      return
    }
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LocationShareLink({ className, autoGenerate = true }: LocationShareLinkProps) {
  const { position } = useGeolocation(300_000, false)

  // ---- state ----
  const [link, setLink] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [expiryMs, setExpiryMs] = useState<number | null>(30 * 60 * 1000)
  const [password, setPassword] = useState<string | null>(null)
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number>(0)
  const [shareLinks, setShareLinks] = useState<ShareLinkData[]>([])

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const coordUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ---- build / generate link ---- */
  const generateLink = useCallback(() => {
    if (!position) {
      toast.error('Localizacao indisponivel. Aguarde a obtencao do GPS.')
      return
    }

    setIsGenerating(true)
    setIsExpired(false)
    setIsStopped(false)

    // small artificial delay for shimmer UX
    setTimeout(() => {
      const t = generateToken()
      const pw = passwordEnabled ? generatePin() : null
      const now = Date.now()
      const expiresAt = expiryMs ? now + expiryMs : null

      const data: ShareLinkData = {
        token: t,
        lat: position.latitude,
        lng: position.longitude,
        createdAt: now,
        expiresAt,
        password: pw,
        active: true,
      }

      saveShareLink(data)
      setToken(t)
      setPassword(pw)
      setLink(`${window.location.origin}/track/${t}`)
      setIsActive(true)
      setIsGenerating(false)

      if (expiryMs) {
        setRemainingMs(expiryMs)
      }

      setShareLinks(loadShareLinks())
      toast.success('Link de partilha gerado com sucesso!')
    }, 800)
  }, [position, expiryMs, passwordEnabled])

  /* ---- auto-generate on mount ---- */
  useEffect(() => {
    if (autoGenerate && position) {
      generateLink()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, position])

  /* ---- expiry countdown ---- */
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)

    if (isActive && !isExpired && !isStopped && expiryMs) {
      countdownRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          if (prev <= 1000) {
            clearInterval(countdownRef.current!)
            setIsExpired(true)
            setIsActive(false)
            updateShareLink(token, { active: false })
            toast.info('O link de partilha expirou.')
            return 0
          }
          return prev - 1000
        })
      }, 1000)
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isActive, isExpired, isStopped, expiryMs, token])

  /* ---- real-time coordinate updates every 10s ---- */
  useEffect(() => {
    if (coordUpdateRef.current) clearInterval(coordUpdateRef.current)

    if (isActive && !isExpired && !isStopped && token) {
      coordUpdateRef.current = setInterval(() => {
        if (position) {
          updateShareLink(token, { lat: position.latitude, lng: position.longitude })
        }
      }, 10_000)
    }

    return () => {
      if (coordUpdateRef.current) clearInterval(coordUpdateRef.current)
    }
  }, [isActive, isExpired, isStopped, token, position])

  /* ---- refresh share links list ---- */
  useEffect(() => {
    setShareLinks(loadShareLinks())
  }, [])

  /* ---- stop sharing ---- */
  const handleStop = useCallback(() => {
    setIsActive(false)
    setIsStopped(true)
    updateShareLink(token, { active: false })
    toast.info('Partilha de localizacao desactivada.')
  }, [token])

  /* ---- copy link ---- */
  const handleCopy = useCallback(async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copiado para a area de transferencia!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Nao foi possivel copiar o link.')
    }
  }, [link])

  /* ---- share message helper ---- */
  const buildMessage = useCallback((): string => {
    const pwLine = password ? ` Pin de acesso: ${password}` : ''
    return `🛡️ A minha localizacao em tempo real:\n${link}\n${pwLine}\n-- StatusAds Connect`
  }, [link, password])

  /* ---- navigator.share (mobile preferred) ---- */
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'StatusAds Connect — Partilha de Localizacao',
          text: buildMessage(),
          url: link,
        })
        return
      } catch (e: any) {
        if (e.name === 'AbortError') return // user cancelled
      }
    }
    handleCopy()
  }, [link, buildMessage, handleCopy])

  /* ---- WhatsApp ---- */
  const handleWhatsApp = useCallback(() => {
    const msg = encodeURIComponent(buildMessage())
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }, [buildMessage])

  /* ---- SMS ---- */
  const handleSMS = useCallback(() => {
    const body = encodeURIComponent(buildMessage())
    window.open(`sms:?body=${body}`, '_self')
  }, [buildMessage])

  /* ---- Email ---- */
  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent('StatusAds Connect — Partilha de Localizacao')
    const body = encodeURIComponent(buildMessage())
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }, [buildMessage])

  /* ---- derived state ---- */
  const isDeactivated = isStopped || isExpired
  const statusLabel = isStopped
    ? 'Desactivada'
    : isExpired
    ? 'Expirado'
    : isActive
    ? 'Activa'
    : ''

  /* ---- render ---- */
  return (
    <div className={cn('relative', className)}>
      <GlowCard
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl"
        glowColor={isActive ? '#25D366' : undefined}
      >
        {/* ---- Header ---- */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                isActive
                  ? 'bg-[#25D366]/15 text-[#25D366]'
                  : isDeactivated
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-white/[0.06] text-white/50'
              )}
            >
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/90">
                Partilha de Localizacao
              </h3>
              {statusLabel && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      isActive ? 'bg-[#25D366] animate-pulse' : 'bg-red-400'
                    )}
                  />\n                  <span
                    className={cn(
                      'text-xs font-medium',
                      isActive ? 'text-[#25D366]' : 'text-red-400'
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Countdown timer */}
          {isActive && !isDeactivated && expiryMs && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5"
            >
              <Clock size={14} className="text-[#25D366]" />
              <span className="font-mono text-sm font-semibold tabular-nums text-white/80">
                {formatCountdown(remainingMs)}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* ---- Map Preview ---- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          className="relative mb-4 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
        >
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#25D366]/[0.04] to-transparent" />

          {isGenerating ? (
            <Shimmer className="h-full w-full rounded-xl" />
          ) : position ? (
            <div className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/20"
              >
                <MapPin size={20} className="text-[#25D366]" />
              </motion.div>
              <p className="text-center text-xs font-medium text-white/60">
                {formatCoords(position.latitude, position.longitude)}
              </p>
              <p className="text-[10px] text-white/30">
                Precisao: {Math.round(position.accuracy)}m
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/30">
              <MapPin size={24} />
              <p className="text-xs">A aguardar localizacao GPS...</p>
            </div>
          )}

          {/* Deactivated overlay */}
          <AnimatePresence>
            {isDeactivated && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0A0F1A]/80 backdrop-blur-sm"
              >
                <Shield size={28} className="text-red-400/60" />
                <p className="text-sm font-semibold text-red-400">{statusLabel}</p>
                <p className="text-xs text-white/40">
                  {isStopped
                    ? 'A partilha foi desactivada manualmente'
                    : 'O link de partilha expirou'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ---- Generated Link Display ---- */}
        <AnimatePresence mode="wait">
          {link && !isGenerating ? (
            <motion.div
              key="link-display"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="mb-4"
            >
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">
                Link de Rastreamento
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <Link2 size={14} className="shrink-0 text-white/30" />
                <span className="min-w-0 flex-1 truncate text-sm text-white/70 font-mono">
                  {link}
                </span>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleCopy}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    copied
                      ? 'bg-[#25D366]/20 text-[#25D366]'
                      : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                  )}
                  aria-label="Copiar link"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </motion.button>
              </div>
            </motion.div>
          ) : isGenerating ? (
            <motion.div
              key="link-shimmer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">
                Link de Rastreamento
              </label>
              <Shimmer className="h-11 w-full rounded-xl" />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ---- Share Buttons Row ---- */}
        {isActive && !isDeactivated && link && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 24 }}
            className="mb-4"
          >
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/30">
              Partilhar via
            </label>
            <div className="grid grid-cols-4 gap-2">
              {/* WhatsApp */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <Phone size={18} className="text-[#25D366]" />
                <span className="text-[10px] font-medium text-white/50">WhatsApp</span>
              </motion.button>

              {/* SMS */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSMS}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <MessageSquare size={18} className="text-blue-400" />
                <span className="text-[10px] font-medium text-white/50">SMS</span>
              </motion.button>

              {/* Email */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEmail}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <Mail size={18} className="text-amber-400" />
                <span className="text-[10px] font-medium text-white/50">Email</span>
              </motion.button>

              {/* Copy / Native Share */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <ExternalLink size={18} className="text-white/60" />
                <span className="text-[10px] font-medium text-white/50">
                  {navigator.share ? 'Partilhar' : 'Copiar'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ---- Expiry Selector ---- */}
        {!isActive && !isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/30">
              <Clock size={12} />
              Validade do Link
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setExpiryMs(opt.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                    expiryMs === opt.value
                      ? 'border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---- Password Protection Toggle ---- */}
        {!isActive && !isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <button
              onClick={() => setPasswordEnabled(!passwordEnabled)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all',
                passwordEnabled
                  ? 'border-[#25D366]/30 bg-[#25D366]/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Lock size={16} className={passwordEnabled ? 'text-[#25D366]' : 'text-white/40'} />
                <div className="text-left">
                  <p className={cn(
                    'text-sm font-medium',
                    passwordEnabled ? 'text-white/80' : 'text-white/50'
                  )}>
                    Protecao por PIN
                  </p>
                  <p className="text-[11px] text-white/30">
                    {passwordEnabled
                      ? 'Um codigo de 4 digitos sera gerado'
                      : 'Qualquer pessoa com o link pode aceder'}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  passwordEnabled ? 'bg-[#25D366]/30' : 'bg-white/[0.1]'
                )}
              >
                <motion.div
                  layout
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full shadow-md',
                    passwordEnabled
                      ? 'left-[18px] bg-[#25D366]'
                      : 'left-0.5 bg-white/50'
                  )}
                />
              </div>
            </button>
          </motion.div>
        )}

        {/* ---- Password Display ---- */}
        {isActive && password && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2"
          >
            <Lock size={14} className="text-amber-400" />
            <span className="text-xs text-white/50">PIN de acesso:</span>
            <span className="font-mono text-sm font-bold tracking-[0.3em] text-amber-300">
              {password}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(password)
                toast.success('PIN copiado!')
              }}
              className="ml-auto text-white/30 hover:text-white/60 transition-colors"
              aria-label="Copiar PIN"
            >
              <Copy size={13} />
            </button>
          </motion.div>
        )}

        {/* ---- Active sharing info ---- */}
        {isActive && !isDeactivated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-[#25D366]/[0.06] border border-[#25D366]/10 px-3 py-2"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="h-2 w-2 rounded-full bg-[#25D366]"
            />
            <span className="text-xs text-[#25D366]/80">
              Coordenadas a actualizar a cada 10 segundos
            </span>
          </motion.div>
        )}

        {/* ---- Action Buttons ---- */}
        <div className="flex gap-2">
          {/* Generate / Regenerate */}
          {!isActive || isDeactivated ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={generateLink}
              disabled={isGenerating || !position}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                isGenerating || !position
                  ? 'bg-white/[0.04] text-white/30 cursor-not-allowed'
                  : 'bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25'
              )}
            >
              {isGenerating ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Share2 size={16} />
              )}
              {isGenerating ? 'A gerar...' : isDeactivated ? 'Gerar Novo Link' : 'Gerar Link de Partilha'}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStop}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20"
            >
              <StopCircle size={16} />
              Parar Partilha
            </motion.button>
          )}
        </div>

        {/* ---- Active links count ---- */}
        {shareLinks.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-center text-[11px] text-white/20"
          >
            {shareLinks.filter((l) => l.active).length} link(s) activo(s) no total
          </motion.p>
        )}
      </GlowCard>
    </div>
  )
}

export default LocationShareLink
