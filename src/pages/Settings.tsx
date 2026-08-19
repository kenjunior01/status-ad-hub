import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Bell,
  Lock,
  CreditCard,
  Bluetooth,
  MapPin,
  Info,
  ChevronDown,
  ChevronUp,
  Camera,
  ExternalLink,
  Trash2,
  Headphones,
  Watch,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SettingsSection {
  id: string;
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}

// ─── Toggle Switch Component ─────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors',
        checked ? 'bg-[#25D366]' : 'bg-white/15'
      )}
    >
      <motion.div
        className="h-5 w-5 rounded-full bg-white shadow-lg"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// ─── Stagger Animation ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Settings() {
  // Section collapse state
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['perfil', 'notificacoes'])
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── State: Notifications ───
  const [notifEmergency, setNotifEmergency] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifGeofence, setNotifGeofence] = useState(true);
  const [notifDevice, setNotifDevice] = useState(false);

  // ─── State: Privacy ───
  const [privacyLocation, setPrivacyLocation] = useState(true);
  const [privacyInvisible, setPrivacyInvisible] = useState(false);
  const [privacyAutoDelete, setPrivacyAutoDelete] = useState(false);
  const [privacyAutoDeleteDays, setPrivacyAutoDeleteDays] = useState('30');

  // ─── State: Emergency Zone ───
  const [autoEmergency, setAutoEmergency] = useState(true);

  // ─── State: Profile ───
  const [profileName, setProfileName] = useState('Carlos Silva');
  const [profilePhone, setProfilePhone] = useState('+258 84 555 1234');

  // ─── Paired devices for settings ───
  const pairedDevices = [
    { id: '1', name: 'iPhone 15 Pro', type: 'phone' as const },
    { id: '2', name: 'AirPods Pro 2', type: 'headphones' as const },
    { id: '3', name: 'Galaxy Watch 6', type: 'watch' as const },
  ];
  const [devices, setDevices] = useState(pairedDevices);

  const deviceIconMap: Record<string, typeof Smartphone> = {
    phone: Smartphone,
    headphones: Headphones,
    watch: Watch,
  };

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
      <header className="glass fixed top-0 left-0 right-0 z-50 flex h-16 items-center gap-4 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">
          Configurações
        </h1>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-24 md:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {/* ═══ 1. PERFIL ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('perfil')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/10">
                    <User className="h-4 w-4 text-[#25D366]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Perfil</CardTitle>
                    <CardDescription className="mt-0.5">
                      Informações pessoais e conta
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('perfil') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('perfil') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="space-y-4 border-t border-white/[0.06] px-5 py-5">
                      {/* Avatar placeholder */}
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366]/30 to-[#25D366]/10 ring-2 ring-[#25D366]/20">
                          <span className="text-xl font-bold text-[#25D366]">
                            CS
                          </span>
                        </div>
                        <div>
                          <Button
                            variant="glass"
                            size="sm"
                            className="border-white/10 text-xs text-white/60"
                          >
                            <Camera className="mr-1.5 h-3.5 w-3.5" />
                            Alterar Foto
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm text-white/60">
                            Nome
                          </Label>
                          <Input
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="border-white/10 bg-white/5 text-white focus-visible:ring-[#25D366]/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-white/60">
                            Email
                          </Label>
                          <Input
                            value="carlos.silva@email.com"
                            readOnly
                            className="border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-white/60">
                          Telefone
                        </Label>
                        <Input
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="border-white/10 bg-white/5 text-white focus-visible:ring-[#25D366]/40"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button variant="safe" size="sm">
                          Guardar Alterações
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 2. NOTIFICAÇÕES ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('notificacoes')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Bell className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Notificações
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Gerir alertas e notificações
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('notificacoes') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('notificacoes') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 py-1">
                      {[
                        {
                          label: 'Alertas de emergência',
                          desc: 'Receber notificações quando uma emergência for activada',
                          checked: notifEmergency,
                          onChange: setNotifEmergency,
                        },
                        {
                          label: 'Relatórios diários',
                          desc: 'Resumo diário de actividade por email',
                          checked: notifDaily,
                          onChange: setNotifDaily,
                        },
                        {
                          label: 'Alertas de geofence',
                          desc: 'Notificação ao entrar ou sair de zonas definidas',
                          checked: notifGeofence,
                          onChange: setNotifGeofence,
                        },
                        {
                          label: 'Actualizações de dispositivo',
                          desc: 'Quando dispositivos conectam ou desconectam',
                          checked: notifDevice,
                          onChange: setNotifDevice,
                        },
                      ].map((toggle) => (
                        <div
                          key={toggle.label}
                          className="flex items-center justify-between py-4"
                        >
                          <div className="pr-4">
                            <p className="text-sm font-medium text-white">
                              {toggle.label}
                            </p>
                            <p className="mt-0.5 text-xs text-white/35">
                              {toggle.desc}
                            </p>
                          </div>
                          <ToggleSwitch
                            checked={toggle.checked}
                            onChange={toggle.onChange}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 3. PRIVACIDADE ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('privacidade')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                    <Lock className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Privacidade</CardTitle>
                    <CardDescription className="mt-0.5">
                      Controlo de dados e visibilidade
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('privacidade') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('privacidade') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 py-1">
                      {/* Share location */}
                      <div className="flex items-center justify-between py-4">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-white">
                            Compartilhar localização com contactos
                          </p>
                          <p className="mt-0.5 text-xs text-white/35">
                            Os seus contactos de emergência podem ver a sua
                            posição em tempo real
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={privacyLocation}
                          onChange={setPrivacyLocation}
                        />
                      </div>

                      {/* Invisible mode */}
                      <div className="flex items-center justify-between py-4">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-white">
                            Modo invisível
                          </p>
                          <p className="mt-0.5 text-xs text-white/35">
                            Ocultar o seu estado online de todos os contactos
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={privacyInvisible}
                          onChange={setPrivacyInvisible}
                        />
                      </div>

                      {/* Auto delete history */}
                      <div className="flex items-center justify-between py-4">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-white">
                            Eliminar histórico automaticamente
                          </p>
                          <p className="mt-0.5 text-xs text-white/35">
                            Remover registos antigos após um período
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {privacyAutoDelete && (
                            <select
                              value={privacyAutoDeleteDays}
                              onChange={(e) =>
                                setPrivacyAutoDeleteDays(e.target.value)
                              }
                              className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/70 outline-none"
                            >
                              <option value="7" className="bg-[#0A0F1A]">
                                após 7 dias
                              </option>
                              <option value="30" className="bg-[#0A0F1A]">
                                após 30 dias
                              </option>
                              <option value="90" className="bg-[#0A0F1A]">
                                após 90 dias
                              </option>
                            </select>
                          )}
                          <ToggleSwitch
                            checked={privacyAutoDelete}
                            onChange={setPrivacyAutoDelete}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 4. PLANO E PAGAMENTO ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('pagamento')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                    <CreditCard className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Plano e Pagamento
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Subscrição e facturamento
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('pagamento') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('pagamento') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="border-t border-white/[0.06] px-5 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                              Plano Família
                            </span>
                            <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-semibold text-[#25D366]">
                              Activo
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/35">
                            Renovação em 15 de Janeiro de 2026
                          </p>
                          <p className="mt-0.5 text-xs text-white/25">
                            499 MT/mês · 6 membros incluídos
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="safe"
                            size="sm"
                            className="shrink-0"
                          >
                            Fazer Upgrade
                          </Button>
                          <button className="text-xs text-white/30 transition hover:text-red-400">
                            Cancelar Subscrição
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 5. DISPOSITIVOS PAREADOS ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('dispositivos')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Bluetooth className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Dispositivos Pareados
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {devices.length} dispositivo{devices.length !== 1 && 's'}
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('dispositivos') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('dispositivos') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 py-1">
                      {devices.map((dev) => {
                        const Icon = deviceIconMap[dev.type] || Bluetooth;
                        return (
                          <div
                            key={dev.id}
                            className="flex items-center justify-between py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-[#25D366]" />
                              <span className="text-sm text-white">
                                {dev.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() =>
                                setDevices((prev) =>
                                  prev.filter((d) => d.id !== dev.id)
                                )
                              }
                            >
                              Esquecer
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 6. ZONA DE EMERGÊNCIA ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('emergencia')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                    <MapPin className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Zona de Emergência
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Geofence e activação automática
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('emergencia') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('emergencia') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="border-t border-white/[0.06] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-white">
                            Auto-activar emergência ao sair de geofence
                          </p>
                          <p className="mt-0.5 text-xs text-white/35">
                            Quando sair de uma zona segura definida, o modo de
                            emergência será activado automaticamente
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={autoEmergency}
                          onChange={setAutoEmergency}
                        />
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ═══ 7. SOBRE ═══ */}
          <motion.div variants={item}>
            <Card className="glass border-white/[0.06]">
              <button
                onClick={() => toggleSection('sobre')}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Info className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sobre</CardTitle>
                    <CardDescription className="mt-0.5">
                      Versão 2.4.1
                    </CardDescription>
                  </div>
                </div>
                {openSections.has('sobre') ? (
                  <ChevronUp className="h-5 w-5 text-white/30" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/30" />
                )}
              </button>
              <AnimatePresence>
                {openSections.has('sobre') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="border-t border-white/[0.06] px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-white/30">
                          StatusAds v2.4.1 · Build 2024.12.15
                        </p>
                        <div className="flex gap-4">
                          {[
                            { label: 'Termos de Serviço' },
                            { label: 'Política de Privacidade' },
                            { label: 'Suporte' },
                          ].map((link) => (
                            <button
                              key={link.label}
                              className="flex items-center gap-1 text-xs text-[#25D366]/70 transition hover:text-[#25D366]"
                            >
                              {link.label}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══ ELIMINAR CONTA ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-2 text-center"
        >
          <div className="flex items-center gap-2 text-sm text-white/25">
            <AlertTriangle className="h-4 w-4" />
            Acção irreversível
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-600/20 text-red-400 shadow-none hover:bg-red-600/30 hover:text-red-300"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar Conta
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
