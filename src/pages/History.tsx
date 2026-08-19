import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  MapPin,
  AlertTriangle,
  Shield,
  Bluetooth,
  ChevronRight,
  Activity,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = 'localizacao' | 'emergencia' | 'geofence' | 'dispositivo';

interface HistoryEvent {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  description: string;
  location?: string;
  expanded?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const ALL_EVENTS: HistoryEvent[] = [
  {
    id: '1',
    timestamp: 'Hoje, 14:32',
    type: 'localizacao',
    title: 'Localização actualizada',
    description: 'A sua localização foi actualizada automaticamente.',
    location: '-25.9692, 32.5732',
  },
  {
    id: '2',
    timestamp: 'Hoje, 13:15',
    type: 'emergencia',
    title: 'Emergência activada — Botão BLE',
    description:
      'O botão de pânico BLE nos seus AirPods Pro 2 foi premido. Contactos de emergência notificados.',
    location: '-25.9710, 32.5680',
  },
  {
    id: '3',
    timestamp: 'Hoje, 12:08',
    type: 'geofence',
    title: 'Entrou na zona: Casa',
    description: 'Detectada entrada na geofence "Casa" (raio 200m).',
    location: '-25.9665, 32.5710',
  },
  {
    id: '4',
    timestamp: 'Hoje, 09:42',
    type: 'dispositivo',
    title: 'Dispositivo AirPods desconectado',
    description:
      'Os AirPods Pro 2 deixaram de comunicar via BLE. Última conecção há 25 min.',
  },
  {
    id: '5',
    timestamp: 'Hoje, 08:00',
    type: 'localizacao',
    title: 'Localização actualizada',
    description: 'Registo periódico de localização.',
    location: '-25.9735, 32.5750',
  },
  {
    id: '6',
    timestamp: 'Ontem, 22:30',
    type: 'geofence',
    title: 'Saiu da zona: Escritório',
    description:
      'Detectada saída da geofence "Escritório" (raio 150m). Tempo de permanência: 8h 45min.',
    location: '-25.9620, 32.5800',
  },
  {
    id: '7',
    timestamp: 'Ontem, 18:12',
    type: 'localizacao',
    title: 'Localização actualizada',
    description: 'Registo periódico de localização.',
    location: '-25.9610, 32.5790',
  },
  {
    id: '8',
    timestamp: 'Ontem, 14:05',
    type: 'emergencia',
    title: 'Teste de emergência executado',
    description:
      'Foi executado um teste do sistema de emergência. Todos os contactos receberam o alerta de teste.',
    location: '-25.9640, 32.5765',
  },
  {
    id: '9',
    timestamp: 'Ontem, 09:30',
    type: 'dispositivo',
    title: 'Galaxy Watch 6 conectado',
    description:
      'O Galaxy Watch 6 foi pareado com sucesso via Bluetooth Low Energy.',
  },
  {
    id: '10',
    timestamp: '12 Dez, 20:45',
    type: 'geofence',
    title: 'Entrou na zona: Casa',
    description: 'Detectada entrada na geofence "Casa" (raio 200m).',
    location: '-25.9665, 32.5710',
  },
];

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  EventType,
  { icon: typeof MapPin; color: string; bg: string; label: string }
> = {
  localizacao: {
    icon: MapPin,
    color: 'text-[#25D366]',
    bg: 'bg-[#25D366]/15',
    label: 'Localização',
  },
  emergencia: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    label: 'Emergência',
  },
  geofence: {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    label: 'Geofence',
  },
  dispositivo: {
    icon: Bluetooth,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    label: 'Dispositivo',
  },
};

// ─── Date Range Filters ───────────────────────────────────────────────────────
const DATE_RANGES = ['Hoje', '7 dias', '30 dias', 'Tudo'] as const;
type DateRange = (typeof DATE_RANGES)[number];

// ─── Type Filters ─────────────────────────────────────────────────────────────
const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'localizacao', label: 'Localização' },
  { value: 'emergencia', label: 'Emergência' },
  { value: 'geofence', label: 'Geofence' },
];

// ─── Stagger Animation ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('Tudo');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Simple mock filtering by date range
  const filteredEvents = useMemo(() => {
    let events = ALL_EVENTS;

    // Date range filter
    if (dateRange === 'Hoje') {
      events = events.filter((e) => e.timestamp.startsWith('Hoje'));
    } else if (dateRange === '7 dias') {
      events = events; // all mock events are within 7 days
    } else if (dateRange === '30 dias') {
      events = events;
    }

    // Type filter
    if (typeFilter !== 'todos') {
      events = events.filter((e) => e.type === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.location && e.location.includes(q))
      );
    }

    return events;
  }, [dateRange, typeFilter, searchQuery]);

  // Summary stats
  const stats = useMemo(
    () => ({
      total: ALL_EVENTS.length,
      emergencies: ALL_EVENTS.filter((e) => e.type === 'emergencia').length,
      geofences: ALL_EVENTS.filter((e) => e.type === 'geofence').length,
    }),
    []
  );

  return (
    <div className="dark min-h-screen bg-[#0A0F1A] text-white">
      {/* ═══ INLINE STYLES ═══ */}
      <style>{`
        .glass {
          background: rgba(10, 15, 26, 0.75);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-hover:hover {
          background: rgba(10, 15, 26, 0.85);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header className="glass fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">
            Histórico
          </h1>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-12 md:px-6">
        {/* ─── Date Range Buttons ─── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex gap-2 overflow-x-auto pb-1"
        >
          {DATE_RANGES.map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'safe' : 'glass'}
              size="sm"
              onClick={() => setDateRange(range)}
              className={cn(
                'shrink-0',
                dateRange !== range &&
                  'border-white/[0.06] text-white/50 hover:text-white'
              )}
            >
              {range}
            </Button>
          ))}
        </motion.div>

        {/* ─── Summary Stats ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-6 grid grid-cols-3 gap-3"
        >
          {[
            {
              label: 'Total de eventos',
              value: stats.total,
              icon: Activity,
              color: 'text-white/60',
              bg: 'bg-white/[0.06]',
            },
            {
              label: 'Emergências',
              value: stats.emergencies,
              icon: AlertTriangle,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
            },
            {
              label: 'Geofences',
              value: stats.geofences,
              icon: Shield,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
          ].map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="glass border-white/[0.06]">
                <CardContent className="flex flex-col items-center gap-1.5 p-4">
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                  <span className={cn('text-xl font-bold', stat.color)}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-white/35 text-center leading-tight">
                    {stat.label}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Filter Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="glass relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Pesquisar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent pl-10 pr-4 text-white placeholder:text-white/25 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/25" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40"
            >
              {TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value} className="bg-[#0A0F1A]">
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* ─── Timeline ─── */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.06]" />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-1"
          >
            {filteredEvents.map((event) => {
              const cfg = TYPE_CONFIG[event.type];
              const Icon = cfg.icon;
              const isExpanded = expandedIds.has(event.id);

              return (
                <motion.div key={event.id} variants={item} className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-2.5 top-5 z-10 flex h-4 w-4 items-center justify-center rounded-full',
                      cfg.bg
                    )}
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        event.type === 'localizacao'
                          ? 'bg-[#25D366]'
                          : event.type === 'emergencia'
                            ? 'bg-red-400'
                            : event.type === 'geofence'
                              ? 'bg-blue-400'
                              : 'bg-purple-400'
                      )}
                    />
                  </div>

                  {/* Event card */}
                  <Card className="glass glass-hover border-white/[0.06] transition-colors">
                    <button
                      onClick={() => toggleExpand(event.id)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          cfg.bg
                        )}
                      >
                        <Icon className={cn('h-4 w-4', cfg.color)} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-white">
                            {event.title}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[11px] text-white/30">
                            {event.timestamp}
                          </span>
                          {event.location && !isExpanded && (
                            <span className="truncate text-[11px] text-white/20">
                              · {event.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="shrink-0"
                      >
                        <ChevronRight className="h-4 w-4 text-white/20" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/[0.06] px-4 py-3">
                            <p className="text-sm leading-relaxed text-white/50">
                              {event.description}
                            </p>
                            {event.location && (
                              <div className="mt-2 flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-white/25" />
                                <span className="font-mono text-xs text-white/30">
                                  {event.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-12 mt-10 flex flex-col items-center gap-2 text-center"
            >
              <Search className="h-8 w-8 text-white/10" />
              <p className="text-sm text-white/30">
                Nenhum evento encontrado
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
