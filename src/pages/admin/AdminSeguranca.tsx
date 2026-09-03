import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useDemoMode } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShieldCheck, ScanSearch, Loader2, AlertTriangle, CheckCircle2, KeyRound,
  Lock, EyeOff, Server, RefreshCw, Fingerprint,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/**
 * AdminSeguranca — auditoria do servidor, rotação do código de admin e
 * boas práticas. Auditoria via RPC security_audit() (migration 014).
 */

interface AuditResult {
  tables_missing_rls: string[]
  permissive_policies: { table: string; policy: string; cmd: string }[]
  functions_without_search_path: number
  failed_24h: { admin_activate: number; device_code_verify: number; promo_validate: number }
  audited_at: string
}

export default function AdminSeguranca() {
  const demo = useDemoMode()
  const [auditing, setAuditing] = useState(false)
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)

  // Rotação do código de administração
  const [oldCode, setOldCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newCode2, setNewCode2] = useState('')
  const [rotating, setRotating] = useState(false)

  const runAudit = useCallback(async () => {
    setAuditing(true); setAuditError(null)
    if (demo) {
      setTimeout(() => {
        setAudit({
          tables_missing_rls: [],
          permissive_policies: [],
          functions_without_search_path: 0,
          failed_24h: { admin_activate: 0, device_code_verify: 3, promo_validate: 1 },
          audited_at: new Date().toISOString(),
        })
        setAuditing(false)
      }, 800)
      return
    }
    const { data, error } = await supabase.rpc('security_audit')
    if (error) {
      const c = (error as { code?: string }).code ?? ''
      if (c === 'PGRST202' || error.message.includes('Could not find the function')) {
        setAuditError('O servidor ainda não tem a auditoria — aplique a migration 014 (TUDO.sql) no SQL Editor do Supabase.')
      } else if (error.message.includes('Not authorized')) {
        setAuditError('A auditoria só está disponível para contas de administração.')
      } else {
        setAuditError('Não foi possível correr a auditoria agora. Tente novamente.')
      }
    } else {
      setAudit(data as AuditResult)
    }
    setAuditing(false)
  }, [demo])

  useEffect(() => { void runAudit() }, [runAudit])

  async function rotateCode() {
    if (!oldCode.trim() || !newCode.trim() || rotating) return
    if (newCode !== newCode2) { toast.error('Os novos códigos não coincidem'); return }
    if (newCode.trim().length < 8) { toast.error('O novo código deve ter pelo menos 8 caracteres'); return }
    if (newCode.trim() === oldCode.trim()) { toast.error('O novo código deve ser diferente do actual'); return }
    setRotating(true)
    try {
      if (demo) {
        toast.success('Código actualizado (demo local — no servidor real aplica-se via RPC)')
        setOldCode(''); setNewCode(''); setNewCode2('')
        setRotating(false)
        return
      }
      const { data, error } = await supabase.rpc('admin_set_admin_code', {
        p_old_code: oldCode.trim(), p_new_code: newCode.trim(),
      })
      if (error) {
        const c = (error as { code?: string }).code ?? ''
        if (c === 'PGRST202' || error.message.includes('Could not find the function')) {
          toast.error('Servidor sem a rotação de código', { description: 'Aplique a migration 014 (TUDO.sql) no SQL Editor.' })
        } else {
          toast.error('Erro ao actualizar o código')
        }
        return
      }
      const res = data as { success: boolean; message: string }
      if (res?.success) {
        toast.success(res.message)
        setOldCode(''); setNewCode(''); setNewCode2('')
      } else {
        toast.error(res?.message ?? 'Não foi possível actualizar o código.')
      }
    } finally {
      setRotating(false)
    }
  }

  const rlsOk = !audit || (audit.tables_missing_rls.length === 0 && audit.permissive_policies.length === 0 && audit.functions_without_search_path === 0)
  const totalFails = audit
    ? audit.failed_24h.admin_activate + audit.failed_24h.device_code_verify + audit.failed_24h.promo_validate
    : 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg text-white">Segurança</h2>
        <p className="text-[11px] text-white/40 mt-0.5">
          Auditoria do servidor, tentativas de intrusão e rotação do código de administração.
        </p>
      </div>

      {/* ── Auditoria ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <ScanSearch className="h-4.5 w-4.5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-white">Auditoria do servidor</p>
              <p className="text-[10px] text-white/40">
                {audit ? `Corrida às ${new Date(audit.audited_at).toLocaleTimeString('pt-PT')}` : 'A analisar permissões e políticas…'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void runAudit()} disabled={auditing} className="h-8 px-3 text-[11px] text-white/50 hover:text-[#D4AF37] gap-1.5">
            {auditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Correr de novo
          </Button>
        </div>

        {auditError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed">{auditError}</p>
          </div>
        )}

        {audit && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <AuditItem
              ok={audit.tables_missing_rls.length === 0}
              title="Row Level Security em todas as tabelas"
              failText={`Sem RLS: ${audit.tables_missing_rls.join(', ')}`}
              okText="Todas as tabelas públicas têm RLS activo"
            />
            <AuditItem
              ok={audit.permissive_policies.length === 0}
              title="Sem políticas públicas de mais"
              failText={`${audit.permissive_policies.length} política(s) aberta(s) a todos — ver SQL Editor`}
              okText="Nenhuma política com acesso universal"
            />
            <AuditItem
              ok={audit.functions_without_search_path === 0}
              title="Funções com search_path fixado"
              failText={`${audit.functions_without_search_path} função(ões) SECURITY DEFINER sem search_path — risco de hijack`}
              okText="Todas as funções protegidas contra hijack de schema"
            />
            <div className={cn(
              'rounded-xl border px-3.5 py-3',
              totalFails > 10 ? 'border-amber-500/25 bg-amber-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.04]',
            )}>
              <p className="text-[12px] font-medium flex items-center gap-1.5">
                {totalFails > 10
                  ? <><AlertTriangle className="h-4 w-4 text-amber-400" /><span className="text-amber-300">Actividade suspeita nas últimas 24h</span></>
                  : <><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-emerald-300/90">Sem intrusões nas últimas 24h</span></>}
              </p>
              <div className="flex gap-4 mt-1.5 text-[10px] text-white/40 font-mono">
                <span>admin: {audit.failed_24h.admin_activate}</span>
                <span>códigos: {audit.failed_24h.device_code_verify}</span>
                <span>promo: {audit.failed_24h.promo_validate}</span>
              </div>
            </div>
          </div>
        )}

        {audit && !rlsOk && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3.5 py-3">
            <p className="text-[11px] text-red-300 leading-relaxed">
              Foram encontradas fragilidades. Execute a <span className="font-mono text-[#D4AF37]">migration 014 (TUDO.sql)</span> no
              SQL Editor — ela corrige automaticamente os furos mais comuns (códigos públicos, funções sem search_path) e esta
              auditoria passa a ficar verde.
            </p>
          </div>
        )}
      </div>

      {/* ── Rotação do código de administração ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <KeyRound className="h-4.5 w-4.5 text-[#D4AF37]" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white">Código de administração</p>
            <p className="text-[10px] text-white/40">Usado para desbloquear o painel admin. Troque regularmente.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-white/50">Código actual *</label>
            <Input
              type="password" value={oldCode} onChange={(e) => setOldCode(e.target.value)}
              placeholder="Código em uso" autoComplete="off"
              className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-white/50">Novo código *</label>
            <Input
              value={newCode} onChange={(e) => setNewCode(e.target.value)}
              placeholder="Mín. 8 caracteres" autoComplete="off"
              className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-white/50">Repetir novo código *</label>
            <Input
              value={newCode2} onChange={(e) => setNewCode2(e.target.value)}
              placeholder="Repita o novo código" autoComplete="off"
              className="bg-black/30 border-white/[0.08] text-white font-mono text-xs h-10"
            />
          </div>
        </div>

        <Button
          onClick={() => void rotateCode()}
          disabled={!oldCode.trim() || !newCode.trim() || !newCode2.trim() || rotating}
          className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold text-xs gap-2 disabled:opacity-40"
        >
          {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          Trocar código de administração
        </Button>
      </div>

      {/* ── Blindagens activas ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white">Blindagens activas (migration 014)</p>
            <p className="text-[10px] text-white/40">Protecções automáticas contra invasão e vazamento de dados</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Códigos de activação privados', 'Ninguém consegue listar códigos da base de dados — a fuga da 008 está fechada'],
            ['Anti força-bruta', 'Códigos de dispositivo: 25 tentativas/10 min · admin: 5/15 min · promo: 20/10 min'],
            ['Gravações privadas', 'Cada utilizador só acede à SUA pasta no bucket — nem admin lê o conteúdo'],
            ['1 promoção por utilizador', 'Resgate único por conta, com limite global de usos e validade'],
            ['Promoções nunca bloqueiam pagamentos', 'Falha no desconto não impede a confirmação (trigger à prova de erro)'],
            ['Log de todas as tentativas', 'Tentativa falhada fica registada — visível na auditoria acima'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-medium text-white/85">{title}</p>
                <p className="text-[10px] text-white/35 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Boas práticas do dono ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Fingerprint className="h-4.5 w-4.5 text-white/60" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white">Boas práticas do dono da plataforma</p>
            <p className="text-[10px] text-white/40">5 minutos que fecham 95% dos riscos</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            ['Activar MFA no Supabase Dashboard', 'Account → Security → Multi-factor. Mesmo que roubem a senha, não entram.'],
            ['Nunca partilhar a service_role key', 'Ela ignora TODAS as proteções. Só em servidor próprio (edge functions).'],
            ['Trocar o código de admin regularmente', 'Use o formulário acima — e nunca use o código por defeito do repositório.'],
            ['Revisão mensal desta auditoria', 'Volte a esta página após cada migration ou mudança de equipa.'],
            ['Backup semanal (Supabase → Database → Backups)', 'Em caso de incidente, restaura em minutos.'],
          ].map(([title, desc], i) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-2.5">
              <span className="shrink-0 h-5 w-5 rounded-full bg-white/[0.06] border border-white/10 text-[9px] font-bold flex items-center justify-center text-white/50 mt-0.5">{i + 1}</span>
              <div>
                <p className="text-[12px] font-medium text-white/85">{title}</p>
                <p className="text-[10px] text-white/35 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-3">
          <EyeOff className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/30 leading-relaxed">
            Dados pessoais dos utilizadores (contactos de emergência, ficha médica, localizações e gravações) são
            visíveis apenas pelo próprio utilizador. O painel admin vê métricas agregadas — nunca o conteúdo privado.
          </p>
        </div>
      </div>

      {demo && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 flex items-start gap-2.5">
          <Server className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Modo demo — a auditoria mostra dados de exemplo. Aplique a migration 014 (<span className="font-mono text-[#D4AF37]">TUDO.sql</span>) no SQL Editor do Supabase para a auditoria real.
          </p>
        </div>
      )}
    </div>
  )
}

function AuditItem({ ok, title, okText, failText }: { ok: boolean; title: string; okText: string; failText: string }) {
  return (
    <div className={cn(
      'rounded-xl border px-3.5 py-3',
      ok ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]',
    )}>
      <p className="text-[12px] font-medium flex items-center gap-1.5">
        {ok
          ? <><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /><span className="text-emerald-300/90">{title}</span></>
          : <><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /><span className="text-amber-300">{title}</span></>}
      </p>
      <p className="text-[10px] text-white/40 leading-relaxed mt-1">{ok ? okText : failText}</p>
    </div>
  )
}
