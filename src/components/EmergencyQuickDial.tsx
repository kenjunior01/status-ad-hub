import { useMemo, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, UserPlus, AlertTriangle, Shield, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useContacts } from '@/hooks/useContacts'
import { useGeolocation } from '@/hooks/useGeolocation'
import { cn } from '@/lib/utils'
import type { ContactRelation, EmergencyContact } from '@/lib/types'

// ---- Props ----

export interface EmergencyQuickDialProps {
  /** Compact mode: only avatars + call buttons, no names/badges */
  compact?: boolean
  /** Max contacts to display (default 6) */
  maxContacts?: number
  className?: string
}

// ---- Relation helpers ----

const RELATION_LABELS: Record<ContactRelation, string> = {
  parente: 'Parente',
  conjuge: 'Conjuge',
  amigo: 'Amigo',
  colega: 'Colega',
  outro: 'Outro',
}

const RELATION_GRADIENTS: Record<ContactRelation, string> = {
  parente: 'from-rose-500 to-pink-600',
  conjuge: 'from-violet-500 to-purple-600',
  amigo: 'from-sky-500 to-blue-600',
  colega: 'from-amber-500 to-orange-600',
  outro: 'from-gray-400 to-gray-500',
}

// ---- Animation variants ----

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.07,
      type: 'spring',
      stiffness: 400,
      damping: 24,
    },
  }),
}

const sosButtonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.07 + 0.15,
      type: 'spring',
      stiffness: 350,
      damping: 22,
    },
  }),
}

// ---- Skeleton loader ----

function SkeletonCard({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3',
        compact ? 'w-[72px]' : 'w-[160px]'
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
        {!compact && (
          <>
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-2.5 w-10 animate-pulse rounded bg-white/[0.06]" />
          </>
        )}
        <div className="flex gap-1.5">
          <div className="h-7 w-7 animate-pulse rounded-lg bg-white/[0.06]" />
          {!compact && <div className="h-7 w-7 animate-pulse rounded-lg bg-white/[0.06]" />}
        </div>
      </div>
    </div>
  )
}

// ---- Empty state ----

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-10 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
        <AlertTriangle className="h-6 w-6 text-amber-400/70" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/80">
          Nenhum contacto de emergencia
        </p>
        <p className="max-w-[220px] text-xs text-white/40">
          Adicione contactos de confianca para activar a marcacao rapida em situacoes de perigo.
        </p>
      </div>
      <Link
        to="/dashboard/contacts"
        className="mt-1 flex items-center gap-1.5 rounded-xl bg-brand/10 px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Adicionar Contactos
      </Link>
    </motion.div>
  )
}

// ---- Single contact card ----

function ContactCard({
  contact,
  index,
  compact,
  onCall,
  onSms,
}: {
  contact: EmergencyContact
  index: number
  compact: boolean
  onCall: (phone: string) => void
  onSms: (phone: string) => void
}) {
  const firstLetter = contact.name.charAt(0).toUpperCase()
  const gradient = RELATION_GRADIENTS[contact.relation] || RELATION_GRADIENTS.outro
  const label = RELATION_LABELS[contact.relation] || 'Outro'

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex-shrink-0 rounded-2xl border bg-white/[0.02] transition-colors',
        contact.is_primary
          ? 'border-brand/30 shadow-[0_0_16px_rgba(212,175,55,0.08)]'
          : 'border-white/[0.06]',
        compact ? 'w-[72px] p-2' : 'w-[160px] p-3'
      )}
    >
      {/* Primary pulse ring */}
      {contact.is_primary && (
        <motion.span
          className="pointer-events-none absolute -inset-px rounded-2xl border-2 border-brand/20"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex flex-col items-center gap-2">
        {/* Avatar */}
        <div
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg',
            gradient,
            compact && 'h-9 w-9 text-xs'
          )}
        >
          {firstLetter}
          {contact.is_primary && (
            <Star className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 fill-brand text-brand" />
          )}
        </div>

        {/* Name + badge (non-compact) */}
        {!compact && (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="max-w-[140px] truncate text-xs font-medium text-white/85">
              {contact.name}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/45">
              {label}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.preventDefault()
              onCall(contact.phone)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors hover:bg-brand/20"
            aria-label={`Ligar para ${contact.name}`}
          >
            <Phone className="h-3.5 w-3.5" />
          </motion.button>

          {!compact && (
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.preventDefault()
                onSms(contact.phone)
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-colors hover:bg-sky-500/20"
              aria-label={`Enviar SMS para ${contact.name}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---- SOS 112 button ----

function SOSButton({ index }: { index: number }) {
  return (
    <motion.a
      custom={index}
      variants={sosButtonVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.93 }}
      href="tel:112"
      className="flex flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/[0.06] px-5 py-3 shadow-[0_0_20px_rgba(239,68,68,0.08)] transition-colors hover:bg-red-500/[0.12]"
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
        <Phone className="h-4 w-4 text-white" />
        <motion.span
          className="absolute -inset-1 rounded-full border-2 border-red-500/30"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-bold text-red-400">Emergencia</span>
        <span className="text-lg font-extrabold leading-none text-red-500">112</span>
      </div>
    </motion.a>
  )
}

// ---- Main component ----

export function EmergencyQuickDial({
  compact = false,
  maxContacts = 6,
  className,
}: EmergencyQuickDialProps) {
  const { contacts, loading } = useContacts()
  const { position } = useGeolocation(0, false) // no auto-logging for quick dial

  const [isMobile] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  })

  const visibleContacts = useMemo(
    () => contacts.slice(0, maxContacts),
    [contacts, maxContacts]
  )

  // Build location string for SMS body
  const buildLocationText = useCallback((): string => {
    if (position) {
      return `https://maps.google.com/?q=${position.latitude},${position.longitude}`
    }
    return window.location.href
  }, [position])

  // ---- Call handler ----
  const handleCall = useCallback(
    (phone: string) => {
      if (isMobile) {
        window.location.href = `tel:${phone}`
      } else {
        // On desktop, show toast with the number
        toast.info(`A ligar para ${phone}...`, {
          description: 'Num dispositivo movel, a chamada sera iniciada automaticamente.',
          action: {
            label: 'Copiar numero',
            onClick: () => {
              navigator.clipboard.writeText(phone)
              toast.success('Numero copiado!')
            },
          },
        })
      }
    },
    [isMobile]
  )

  // ---- SMS handler ----
  const handleSms = useCallback(
    (phone: string) => {
      const body = `Preciso de ajuda! Minha localizacao: ${buildLocationText()}`

      // Try native share first (better mobile UX)
      if (navigator.share) {
        navigator
          .share({
            title: 'Emergencia - StatusAds Connect',
            text: body,
          })
          .catch(() => {
            // User cancelled or error — fall through to SMS link
            window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`
          })
        return
      }

      // Fallback: sms: link
      window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`
    },
    [buildLocationText]
  )

  // ---- Render: Loading ----
  if (loading) {
    return (
      <div className={cn('flex gap-3 overflow-x-auto pb-1', className)}>
        {Array.from({ length: Math.min(4, maxContacts) }).map((_, i) => (
          <SkeletonCard key={i} compact={compact} />
        ))}
        {!compact && <SkeletonCard compact={compact} />}
      </div>
    )
  }

  // ---- Render: Empty ----
  if (visibleContacts.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    )
  }

  // ---- Render: Contact list + SOS ----
  return (
    <div className={cn('relative', className)}>
      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand/60" />
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Marcacao Rapida
        </span>
      </div>

      {/* Scrollable row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {visibleContacts.map((contact, i) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              index={i}
              compact={compact}
              onCall={handleCall}
              onSms={handleSms}
            />
          ))}
        </AnimatePresence>

        {/* 112 SOS button */}
        <SOSButton index={visibleContacts.length} />
      </div>
    </div>
  )
}

export default EmergencyQuickDial
