import { useEffect, useState } from 'react'
import { Save, Loader2, Phone, Landmark, Globe, LifeBuoy, Info, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings'
import type { PaymentNumbers, SupportInfo } from '@/lib/app-settings'
import { toast } from 'sonner'

export default function AdminConfiguracoes() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()

  const [pn, setPn] = useState<PaymentNumbers>({
    mpesa: '', emola: '', mkesh: '',
    bank_name: '', bank_holder: '', bank_nib: '', paypal_email: '',
  })
  const [support, setSupport] = useState<SupportInfo>({ whatsapp: '', email: '' })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (settings && !loaded) {
      setPn(settings.payment_numbers)
      setSupport(settings.support)
      setLoaded(true)
    }
  }, [settings, loaded])

  function set<K extends keyof PaymentNumbers>(k: K, v: string) {
    setPn((p) => ({ ...p, [k]: v }))
  }

  function savePaymentNumbers() {
    updateSetting.mutate(
      { key: 'payment_numbers', value: { ...pn } as unknown as Record<string, string> },
      {
        onSuccess: () => toast.success('Números de pagamento guardados', {
          description: 'Já aparecem no checkout manual dos utilizadores.',
        }),
        onError: (e: any) => toast.error('Erro ao guardar', { description: e?.message }),
      },
    )
  }

  function saveSupport() {
    updateSetting.mutate(
      { key: 'support', value: { ...support } as unknown as Record<string, string> },
      {
        onSuccess: () => toast.success('Contactos de suporte guardados'),
        onError: (e: any) => toast.error('Erro ao guardar', { description: e?.message }),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="py-14 text-center">
        <Loader2 className="h-6 w-6 text-brand animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Explicação do fluxo */}
      <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-4 flex gap-3">
        <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand">Como funciona o pagamento manual (sem API)</p>
          <p className="text-[11px] text-white/45 leading-relaxed">
            1. Configura aqui os teus números M-Pesa, e-Mola, mKesh, conta bancária e PayPal.
            2. O utilizador escolhe o método no checkout, paga para estes números e submete o ID da transacção.
            3. Vês o pagamento em <span className="text-brand">Admin → Pagamentos</span>; ao clicares
            "Confirmar", a assinatura activa automaticamente (+31 dias, trigger SQL).
            Nenhuma API do operador é necessária — funciona desde já.
          </p>
        </div>
      </div>

      {/* Números de pagamento */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand" /> Números de Pagamento
          </h3>
          <Badge variant="outline" className="text-[9px] text-white/30 border-white/10">aparecem no checkout</Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="M-Pesa (Vodacom)" value={pn.mpesa} onChange={(v) => set('mpesa', v)} placeholder="84 xxx xxxx" mono />
          <Field label="e-Mola (Movitel)" value={pn.emola} onChange={(v) => set('emola', v)} placeholder="86 xxx xxxx" mono />
          <Field label="mKesh (Tmcel)" value={pn.mkesh} onChange={(v) => set('mkesh', v)} placeholder="82 xxx xxxx" mono />
          <Field label="E-mail PayPal" value={pn.paypal_email} onChange={(v) => set('paypal_email', v)} placeholder="pagamentos@oteu-dominio.com" mono />
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <h4 className="text-xs font-semibold text-white/60 flex items-center gap-2 mb-3">
            <Landmark className="h-3.5 w-3.5 text-brand" /> Transferência Bancária
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Banco" value={pn.bank_name} onChange={(v) => set('bank_name', v)} placeholder="BCI / BIM / Standard Bank" />
            <Field label="Titular da conta" value={pn.bank_holder} onChange={(v) => set('bank_holder', v)} placeholder="O teu nome ou empresa" />
            <Field label="NIB / IBAN" value={pn.bank_nib} onChange={(v) => set('bank_nib', v)} placeholder="0000000000000000000 000" mono full />
          </div>
        </div>

        <Button
          onClick={savePaymentNumbers}
          disabled={updateSetting.isPending}
          className="h-10 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl gap-2"
        >
          {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar números de pagamento
        </Button>
      </section>

      {/* Suporte */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-brand" /> Contactos de Suporte
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="WhatsApp de suporte" value={support.whatsapp} onChange={(v) => setSupport((s) => ({ ...s, whatsapp: v }))} placeholder="+258 84 xxx xxxx" mono />
          <Field label="E-mail de suporte" value={support.email} onChange={(v) => setSupport((s) => ({ ...s, email: v }))} placeholder="suporte@oteu-dominio.com" mono />
        </div>
        <Button
          onClick={saveSupport}
          disabled={updateSetting.isPending}
          variant="outline"
          className="h-10 border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] rounded-xl gap-2"
        >
          {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar contactos
        </Button>
      </section>

      <div className="flex items-center gap-2 text-[11px] text-white/25">
        <CheckCircle2 className="h-3.5 w-3.5 text-brand/50" />
        Estes dados são lidos em tempo real pelo checkout — alterações aplicam-se de imediato.
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, mono, full }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={full ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <label className="text-[10px] text-white/40 uppercase tracking-wider">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={mono ? 'bg-white/[0.04] border-white/[0.08] text-white font-mono placeholder:text-white/20 h-9 rounded-xl' : 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-9 rounded-xl'}
      />
    </div>
  )
}
