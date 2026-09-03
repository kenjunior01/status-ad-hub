import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HeartPulse, Droplets, Pill, Bandage, FileText, ArrowLeft, Shield,
  CheckCircle2, Loader2, Info, Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { NoiseTexture } from '@/components/effects'
import { useMedicalProfile, isMedicalEmpty, type MedicalProfile } from '@/hooks/useMedicalProfile'
import { toast } from 'sonner'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'desconhecido']

export default function MedicalProfilePage() {
  const navigate = useNavigate()
  const { profile, loading, saving, isLocal, save } = useMedicalProfile()
  const [form, setForm] = useState<MedicalProfile>({ blood_type: null, allergies: null, medications: null, medical_notes: null })

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  const dirty = JSON.stringify(form) !== JSON.stringify(profile)

  async function handleSave() {
    const r = await save(form)
    if (r.ok) {
      toast.success('Ficha médica guardada', {
        description: r.remote
          ? 'Sincronizada — visível na tua página de emergência e no link de partilha.'
          : 'Guardada neste dispositivo. Corre a migration 010 no Supabase para sincronizar na partilha de emergência.',
      })
    } else {
      toast.error('Erro ao guardar')
    }
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    )
  }

  const filled = !isMedicalEmpty(profile)

  return (
    <div className="dark min-h-screen bg-background text-white relative">
      <NoiseTexture opacity={0.015} />
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
            <ArrowLeft className="h-5 w-5 text-white/50" />
          </button>
          <HeartPulse className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold">Ficha Médica de Emergência</span>
        </div>
        {filled && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Preenchida</Badge>}
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="rounded-2xl border border-brand/15 bg-gradient-to-b from-brand/[0.06] to-transparent p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
              <Stethoscope className="h-4.5 w-4.5 text-brand" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Ajuda quem te socorre a ajudar-te</h1>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">
                Esta informação aparece na tua página de emergência e no link de partilha seguro
                que polícia, familiares e paramédicos podem abrir — mesmo com o ecrã bloqueado.
              </p>
            </div>
          </div>
        </div>

        {isLocal && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80">
              Modo offline: os dados ficam guardados neste dispositivo. Para aparecerem na partilha de emergência pública, executa a migration 010 no Supabase.
            </p>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-5">
          {/* Tipo sanguíneo */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs text-white/50">
              <Droplets className="h-3.5 w-3.5 text-brand" /> Tipo sanguíneo
            </Label>
            <Select value={form.blood_type ?? undefined} onValueChange={(v) => setForm((f) => ({ ...f, blood_type: v === 'desconhecido' ? null : v }))}>
              <SelectTrigger className="h-11 bg-white/[0.04] border-white/[0.08] text-white rounded-xl">
                <SelectValue placeholder="Selecciona o teu tipo" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-white">
                {BLOOD_TYPES.map((t) => <SelectItem key={t} value={t} className="text-sm">{t === 'desconhecido' ? 'Não sei' : t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Alergias */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs text-white/50">
              <Bandage className="h-3.5 w-3.5 text-brand" /> Alergias
            </Label>
            <Textarea
              placeholder="Ex: Penicilina, amendoim, picada de abelha…"
              value={form.allergies ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value || null }))}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl min-h-[70px] text-sm"
            />
          </div>

          {/* Medicação */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs text-white/50">
              <Pill className="h-3.5 w-3.5 text-brand" /> Medicação em curso
            </Label>
            <Textarea
              placeholder="Ex: Insulina (diabetes tipo 1), Losartan 50mg…"
              value={form.medications ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value || null }))}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl min-h-[70px] text-sm"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs text-white/50">
              <FileText className="h-3.5 w-3.5 text-brand" /> Condições médicas e notas
            </Label>
            <Textarea
              placeholder="Ex: Epilepsia — em caso de convulsão não segurar a língua. Contacto do médico: Dr. Tomás 84 123 4567"
              value={form.medical_notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, medical_notes: e.target.value || null }))}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl min-h-[90px] text-sm"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full h-11 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? <Shield className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {dirty ? 'Guardar ficha médica' : 'Ficha guardada'}
          </Button>
        </motion.div>

        {/* Preview */}
        {filled && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Como os socorristas vêem</p>
            <div className="rounded-xl bg-black/30 border border-white/[0.05] p-4 space-y-2.5">
              <MedicalRow icon={Droplets} label="Tipo sanguíneo" value={profile?.blood_type} />
              <MedicalRow icon={Bandage} label="Alergias" value={profile?.allergies} />
              <MedicalRow icon={Pill} label="Medicação" value={profile?.medications} />
              <MedicalRow icon={FileText} label="Notas" value={profile?.medical_notes} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MedicalRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
      <span className="text-white/35 min-w-[90px]">{label}</span>
      <span className="text-white/85 flex-1">{value}</span>
    </div>
  )
}
