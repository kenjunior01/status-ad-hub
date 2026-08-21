import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Bell, Lock, CreditCard, Bluetooth, MapPin, Info, ChevronDown, ChevronUp, Camera, Trash2, ExternalLink, Smartphone, Headphones, Watch, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SpotlightCard } from '@/components/effects'

type SectionId = 'perfil' | 'notificacoes' | 'privacidade' | 'plano' | 'dispositivos' | 'zona' | 'sobre'

const sections: { id: SectionId; title: string; icon: React.ElementType }[] = [
  { id: 'perfil', title: 'Perfil', icon: User },
  { id: 'notificacoes', title: 'Notificacoes', icon: Bell },
  { id: 'privacidade', title: 'Privacidade', icon: Lock },
  { id: 'plano', title: 'Plano', icon: CreditCard },
  { id: 'dispositivos', title: 'Dispositivos Pareados', icon: Bluetooth },
  { id: 'zona', title: 'Zona de Emergencia', icon: MapPin },
  { id: 'sobre', title: 'Sobre', icon: Info },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="shrink-0">
      <div className={cn('w-10 h-5 rounded-full relative transition-colors duration-300', enabled ? 'bg-[#25D366]' : 'bg-white/10')}>
        <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: enabled ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      </div>
    </button>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['perfil']))
  const [profileName, setProfileName] = useState(user?.name || 'Utilizador')
  const [profilePhone, setProfilePhone] = useState('+258 84 123 4567')
  const [notifToggles, setNotifToggles] = useState({ alerts: true, location: true, battery: true, tips: false })
  const [privToggles, setPrivToggles] = useState({ shareLocation: true, anonymous: false, dataRetention: true })
  const [autoActivate, setAutoActivate] = useState(true)
  const toggleSection = (id: SectionId) => { setOpenSections((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  const pairedDevices = [{ name: 'iPhone 15 Pro', icon: Smartphone, color: '#25D366' }, { name: 'AirPods Pro 2', icon: Headphones, color: '#3B82F6' }, { name: 'Galaxy Watch 6', icon: Watch, color: '#F59E0B' }]

  const notifItems = [
    { key: 'alerts' as const, label: 'Alertas de emergencia', desc: 'Receber notificacoes quando um alerta for activado' },
    { key: 'location' as const, label: 'Actualizacoes de localizacao', desc: 'Notificar quando dispositivos partilharem localizacao' },
    { key: 'battery' as const, label: 'Alertas de bateria baixa', desc: 'Avisar quando a bateria estiver baixa' },
    { key: 'tips' as const, label: 'Dicas de seguranca', desc: 'Receber dicas semanais sobre seguranca pessoal' },
  ]
  const privItems = [
    { key: 'shareLocation' as const, label: 'Partilha de localizacao', desc: 'Permitir que contactos vejam a sua localizacao' },
    { key: 'anonymous' as const, label: 'Modo anonimo', desc: 'Ocultar identidade ao partilhar localizacao' },
    { key: 'dataRetention' as const, label: 'Retencao de dados', desc: 'Manter historico de localizacoes por 90 dias' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0F1A] p-4 md:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Configuracoes</h1>
        <p className="text-sm text-white/30 mt-1">Gerir a sua conta e preferencias</p>
      </motion.div>

      <div className="space-y-3 max-w-3xl">
        {sections.map((section, si) => {
          const isOpen = openSections.has(section.id)
          const IconComp = section.icon
          return (
            <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
              <SpotlightCard className="overflow-hidden">
                <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"><IconComp className="h-4 w-4 text-white/40" strokeWidth={1.5} /></div>
                    <span className="font-medium text-sm text-white/80">{section.title}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-white/20" /> : <ChevronDown className="h-4 w-4 text-white/20" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-5 border-t border-white/[0.04] pt-5">
                        {section.id === 'perfil' && (
                          <div className="space-y-5">
                            <div className="flex items-center gap-4">
                              <div className="relative"><div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center text-xl font-display font-bold text-white shadow-[0_0_30px_-5px_rgba(37,211,102,0.2)]">{profileName.charAt(0).toUpperCase()}</div><button className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] transition"><Camera className="h-3 w-3 text-white/50" /></button></div>
                              <div className="text-xs text-white/25">Foto de perfil</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5"><Label className="text-white/40 text-xs">Nome</Label><Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl" /></div>
                              <div className="space-y-1.5"><Label className="text-white/40 text-xs">Email</Label><Input value={user?.email || 'user@statusad.co.mz'} readOnly className="bg-white/[0.02] border-white/[0.06] text-white/30 cursor-not-allowed rounded-xl" /></div>
                              <div className="space-y-1.5 md:col-span-2"><Label className="text-white/40 text-xs">Telefone</Label><Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl" /></div>
                            </div>
                            <Button className="bg-[#25D366] hover:bg-[#1fb855] text-white hover:shadow-[0_0_20px_-5px_rgba(37,211,102,0.3)] rounded-xl">Guardar Alteracoes</Button>
                          </div>
                        )}
                        {section.id === 'notificacoes' && <div className="space-y-4">{notifItems.map(item => (<div key={item.key} className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-white/80">{item.label}</p><p className="text-xs text-white/25 mt-0.5">{item.desc}</p></div><Toggle enabled={notifToggles[item.key]} onToggle={() => setNotifToggles(p => ({ ...p, [item.key]: !p[item.key] }))} /></div>))}</div>}
                        {section.id === 'privacidade' && <div className="space-y-4">{privItems.map(item => (<div key={item.key} className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-white/80">{item.label}</p><p className="text-xs text-white/25 mt-0.5">{item.desc}</p></div><Toggle enabled={privToggles[item.key]} onToggle={() => setPrivToggles(p => ({ ...p, [item.key]: !p[item.key] }))} /></div>))}</div>}
                        {section.id === 'plano' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[#25D366]/[0.05] border border-[#25D366]/15">
                              <div><p className="font-display font-semibold text-[#25D366] text-sm">Plano Familia</p><p className="text-[11px] text-white/25 mt-0.5">Ate 5 dispositivos - Suporte prioritario</p></div>
                              <span className="text-sm font-display font-bold text-white">249 MT/mes</span>
                            </div>
                            <Button className="bg-[#25D366] hover:bg-[#1fb855] text-white gap-2 rounded-xl"><Shield className="h-4 w-4" />Fazer Upgrade para Premium</Button>
                          </div>
                        )}
                        {section.id === 'dispositivos' && <div className="space-y-2">{pairedDevices.map(d => { const DIcon = d.icon; return (<div key={d.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition"><div className="p-2 rounded-lg border border-white/[0.06]" style={{ backgroundColor: d.color + '10' }}><DIcon className="h-4 w-4" style={{ color: d.color }} /></div><div><p className="text-sm font-medium text-white/80">{d.name}</p><p className="text-[10px] text-white/20">Pareado</p></div></div>) })}</div>}
                        {section.id === 'zona' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-white/80">Activar automaticamente</p><p className="text-xs text-white/25 mt-0.5">Activar o modo de emergencia ao sair da zona</p></div><Toggle enabled={autoActivate} onToggle={() => setAutoActivate(!autoActivate)} /></div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"><div className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4 text-[#25D366]" /><span className="text-sm font-medium text-white/70">Zona Actual</span></div><p className="text-[11px] text-white/20 font-mono">Centro: -25.9692, 32.5732 | Raio: 500m</p></div>
                          </div>
                        )}
                        {section.id === 'sobre' && (
                          <div className="space-y-3">
                            {[{ l: 'Versao', r: '2.4.1', link: false }, { l: 'Termos de Servico', link: true }, { l: 'Politica de Privacidade', link: true }, { l: 'Licenca', r: 'MIT', link: false }].map(item => (
                              <div key={item.l} className="flex items-center justify-between py-1">
                                <span className="text-sm text-white/40">{item.l}</span>
                                {item.link ? <button className="text-sm text-[#25D366]/70 flex items-center gap-1 hover:text-[#25D366] hover:underline"><span>Ver</span><ExternalLink className="h-3 w-3" /></button> : <span className="text-sm text-white/60 font-mono">{item.r}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SpotlightCard>
            </motion.div>
          )
        })}

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sections.length * 0.04 }} className="pt-6">
          <Button variant="outline" className="w-full gap-2 border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] h-12 rounded-xl transition-all">
            <Trash2 className="h-4 w-4" /> Eliminar Conta
          </Button>
          <p className="text-[10px] text-white/15 text-center mt-2">Esta accao e irreversivel.</p>
        </motion.div>
      </div>
    </div>
  )
}
