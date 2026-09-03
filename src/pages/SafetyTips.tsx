/**
 * SafetyTips — Centro de dicas de segurança pessoal.
 *
 * "Dica do dia" em destaque (rotação diária automática) + exploração
 * por 9 categorias com 45+ dicas práticas localizadas para Moçambique.
 * Acesso directo às funcionalidades do app citadas nas dicas.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, Sparkles, ChevronDown, Search, Star,
  ShieldCheck, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SAFETY_TIPS, TIP_CATEGORIES, getDailyTip, type TipCategory,
} from '@/lib/safety-tips'
import { SpotlightCard } from '@/components/effects'

const TIP_ACTION_MAP: Record<string, { label: string; to: string }> = {
  'app-1': { label: 'Abrir Contactos de Emergência', to: '/dashboard/contacts' },
  'app-2': { label: 'Testar SOS por Voz', to: '/dashboard/accoes' },
  'app-3': { label: 'Abrir Chamada Falsa', to: '/dashboard/chamada-falsa' },
  'app-4': { label: 'Activar Dead Man\'s Switch', to: '/dashboard/accoes' },
  'app-5': { label: 'Ver formas de instalar', to: '/instalar' },
  'app-6': { label: 'Abrir Cofre de Evidências', to: '/dashboard/evidencias' },
  'fam-4': { label: 'Preencher Ficha Médica', to: '/dashboard/ficha-medica' },
  'viag-1': { label: 'Activar Rastreamento de Viagem', to: '/dashboard/viagens' },
  'rua-3': { label: 'Calcular Rota Segura', to: '/dashboard/rota' },
  'rua-6': { label: 'Enviar Alerta por WhatsApp', to: '/dashboard/accoes' },
}

export default function SafetyTips() {
  const daily = getDailyTip()
  const [activeCategory, setActiveCategory] = useState<TipCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(daily.id)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SAFETY_TIPS
      .filter((t) => activeCategory === 'all' || t.category === activeCategory)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.text.toLowerCase().includes(q))
      .sort((a, b) => (b.essential ? 1 : 0) - (a.essential ? 1 : 0))
  }, [activeCategory, search])

  const counts = useMemo(() => {
    const map = new Map<TipCategory, number>()
    SAFETY_TIPS.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + 1))
    return map
  }, [])

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-brand" />
          Dicas de Segurança
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {SAFETY_TIPS.length} dicas práticas para viveres com mais segurança — em casa, na rua e online
        </p>
      </div>

      {/* Dica do dia */}
      <SpotlightCard className="p-5 rounded-2xl bg-gradient-to-br from-brand/[0.12] to-card border border-brand/25 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 opacity-[0.06]">
          <Sparkles className="h-36 w-36 text-brand" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-2.5 py-1 rounded-full bg-brand text-black text-[10px] font-bold tracking-wide">
              DICA DE HOJE
            </span>
            <span className="text-[11px] text-white/40">
              {TIP_CATEGORIES.find((c) => c.id === daily.category)?.emoji}{' '}
              {TIP_CATEGORIES.find((c) => c.id === daily.category)?.label}
            </span>
          </div>
          <h2 className="text-white font-bold text-lg">{daily.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed mt-2">{daily.text}</p>
          {TIP_ACTION_MAP[daily.id] && (
            <a
              href={TIP_ACTION_MAP[daily.id].to}
              className="inline-flex items-center gap-1.5 mt-4 text-brand text-xs font-semibold hover:gap-2.5 transition-all"
            >
              {TIP_ACTION_MAP[daily.id].label}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </SpotlightCard>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar dica (ex: táxi, WhatsApp, crianças…)"
          className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-brand/40"
        />
      </div>

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all',
            activeCategory === 'all'
              ? 'bg-brand text-black border-brand'
              : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]'
          )}
        >
          Todas ({SAFETY_TIPS.length})
        </button>
        {TIP_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              'shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all',
              activeCategory === c.id
                ? 'bg-brand text-black border-brand'
                : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]'
            )}
          >
            {c.emoji} {c.label} ({counts.get(c.id) ?? 0})
          </button>
        ))}
      </div>

      {/* Lista de dicas */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-2.5">
          {filtered.map((tip, idx) => {
            const isOpen = expanded === tip.id
            const action = TIP_ACTION_MAP[tip.id]
            return (
              <motion.div
                key={tip.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : tip.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border transition-all',
                    isOpen
                      ? 'bg-card border-brand/25'
                      : 'bg-card/60 border-white/[0.05] hover:border-white/[0.12]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {tip.essential && <Star className="h-3.5 w-3.5 text-brand shrink-0 fill-brand" />}
                      <span className={cn(
                        'text-sm font-semibold truncate',
                        isOpen ? 'text-brand' : 'text-white/85'
                      )}>
                        {tip.title}
                      </span>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 shrink-0 text-white/30 transition-transform',
                      isOpen && 'rotate-180 text-brand'
                    )} />
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-white/55 text-sm leading-relaxed pt-3 pr-6">{tip.text}</p>
                        {action && (
                          <a
                            href={action.to}
                            className="inline-flex items-center gap-1.5 mt-3 text-brand text-xs font-semibold hover:gap-2.5 transition-all"
                          >
                            {action.label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-10">
          <ShieldCheck className="h-10 w-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhuma dica encontrada para "{search}"</p>
        </div>
      )}

      {/* Rodapé de contexto */}
      <div className="flex items-start gap-2.5 px-1 text-xs text-white/30 leading-relaxed">
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-brand/50" />
        <p>
          As dicas marcadas com <Star className="h-3 w-3 inline text-brand fill-brand" /> são as
          essenciais que recomendamos partilhar com toda a família. A dica em destaque muda todos os dias —
          volta amanhã para aprenderes algo novo. Conteúdo educativo de prevenção: não substitui orientação
          das autoridades em situações reais.
        </p>
      </div>
    </div>
  )
}
