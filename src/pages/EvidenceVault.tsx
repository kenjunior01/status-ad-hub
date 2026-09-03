import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Archive, Play, Pause, Download, Trash2, Mic, ArrowLeft,
  Shield, Lock, Loader2, Sparkles, Square,
  Share2, RefreshCw, CloudUpload, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { NoiseTexture } from '@/components/effects'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePlanState } from '@/hooks/useSubscription'
import { formatDateTime } from '@/lib/payments'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import {
  saveEvidenceRecording, syncLocalEvidence, resolveEvidenceSource,
  shareEvidenceRecording, deleteLocalEvidence, getLocalEvidence,
  type EvidenceRecord,
} from '@/lib/evidence'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Evidence = EvidenceRecord

const FREE_LIMIT = 3

export default function EvidenceVault() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state } = usePlanState()
  const [items, setItems] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [localPending, setLocalPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)

  // ── Gravação directa no cofre ──
  const recorder = useAudioRecorder(300)
  const [recSeconds, setRecSeconds] = useState(0)
  const [recSaving, setRecSaving] = useState(false)
  const recSecondsRef = useRef(0)
  recSecondsRef.current = recSeconds
  const [pendingSave, setPendingSave] = useState(false)

  useEffect(() => {
    if (!recorder.isRecording) return
    const startedAt = Date.now()
    setRecSeconds(0)
    const t = setInterval(() => setRecSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [recorder.isRecording])

  const isPremium = (state?.plan.max_contacts ?? 0) >= 99
  const visible = isPremium ? items : items.slice(0, FREE_LIMIT)
  const locked = items.length - visible.length

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    let remote: Evidence[] = []
    try {
      // select('*') — compatível com servidores sem a coluna storage_path
      // (antes da migration 013) e com os novos (ficheiro no bucket)
      const { data, error } = await supabase
        .from('audio_evidence')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      remote = (data ?? []) as Evidence[]
    } catch { /* tabela/nuvem indisponível → só locais */ }

    // funde com evidências locais (gravações offline ainda não sincronizadas)
    const local = getLocalEvidence()
    const remoteIds = new Set(remote.map((e) => e.id))
    const merged = [...remote, ...local.filter((e) => !remoteIds.has(e.id))]
    setItems(merged)
    setLocalPending(local.length)
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  // ── Sincronização automática: gravações offline → nuvem ──
  const runSync = useCallback(async (silent: boolean) => {
    const pending = getLocalEvidence().length
    if (pending === 0) { if (!silent) toast.info('Tudo sincronizado — não há gravações pendentes neste dispositivo'); return }
    setSyncing(true)
    try {
      const n = await syncLocalEvidence()
      if (n > 0) toast.success(`${n} gravação(ões) sincronizada(s) na nuvem`, { description: 'Já estão no seu histórico, disponíveis em qualquer dispositivo.' })
      else if (!silent) toast.error('Não foi possível sincronizar agora — sem internet ou servidor indisponível. Tentamos mais tarde.')
      await load()
    } finally {
      setSyncing(false)
    }
  }, [load])

  useEffect(() => {
    // auto-sync discreto ao abrir (se houver pendentes)
    if (!loading && localPending > 0) void runSync(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const toggleRecording = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.stopRecording()
      setPendingSave(true) // o blob chega async → guardamos no effect abaixo
      return
    }
    try {
      const ok = await recorder.startRecording()
      if (!ok) {
        toast.error('Não foi possível aceder ao microfone — verifique as permissões')
      }
    } catch {
      toast.error('Não foi possível aceder ao microfone — verifique as permissões')
    }
  }, [recorder])

  // Guarda no cofre quando o blob da gravação parada fica disponível
  useEffect(() => {
    if (!pendingSave || !recorder.blob) return
    let cancelled = false
    ;(async () => {
      setPendingSave(false)
      setRecSaving(true)
      try {
        const b64 = await recorder.getBase64()
        if (b64 && !cancelled) {
          const res = await saveEvidenceRecording(b64, recSecondsRef.current, 'audio/webm')
          if (res.saved) {
            toast.success(`Evidência guardada (${recSecondsRef.current}s)`, {
              description: res.location === 'local' ? 'No dispositivo — sincroniza com a nuvem assim que houver internet' : 'No seu histórico na nuvem',
            })
          } else {
            toast.error(res.error ?? 'Não foi possível guardar')
          }
        }
      } catch {
        if (!cancelled) toast.error('Erro ao guardar a gravação')
      } finally {
        if (!cancelled) {
          setRecSaving(false)
          recorder.reset()
          setRecSeconds(0)
          void load()
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSave, recorder.blob])

  async function handleDelete(id: string) {
    setDeleteId(null)
    const target = items.find((e) => e.id === id)
    try {
      if (target?.storage_path) {
        await supabase.storage.from('evidence-audio').remove([target.storage_path])
      }
      const { error } = await supabase.from('audio_evidence').delete().eq('id', id)
      if (error) throw error
    } catch {
      deleteLocalEvidence(id)
    }
    setItems((prev) => prev.filter((e) => e.id !== id))
    toast.success('Evidência eliminada')
  }

  async function handlePlay(e: Evidence) {
    if (playingId === e.id) { setPlayingId(null); setPlayUrl(null); return }
    setPlayingId(e.id)
    setPlayUrl(null)
    const url = await resolveEvidenceSource(e)
    if (url) setPlayUrl(url)
    else setPlayingId(null)
  }

  async function handleDownload(e: Evidence) {
    const url = await resolveEvidenceSource(e)
    if (!url) { toast.error('Fonte de áudio indisponível'); return }
    const a = document.createElement('a')
    a.href = url
    a.download = `statusads-evidencia-${e.id.slice(0, 8)}.${e.mime_type.includes('mp4') ? 'm4a' : 'webm'}`
    a.target = '_blank'
    a.click()
  }

  async function handleShare(e: Evidence) {
    setSharingId(e.id)
    try {
      const ok = await shareEvidenceRecording(e)
      if (ok) toast.success('Partilha aberta — escolha para quem enviar')
      // cancelado pelo utilizador → sem toast de erro
    } catch {
      toast.error('Não foi possível partilhar — tente descarregar primeiro')
    } finally {
      setSharingId(null)
    }
  }

  return (
    <div className="dark min-h-screen bg-background text-white relative">
      <NoiseTexture opacity={0.015} />
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 backdrop-blur-2xl bg-background/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
            <ArrowLeft className="h-5 w-5 text-white/50" />
          </button>
          <Archive className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold">Cofre de Evidências</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{items.length} gravações</Badge>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="rounded-2xl border border-brand/15 bg-gradient-to-b from-brand/[0.06] to-transparent p-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
            <Shield className="h-4.5 w-4.5 text-brand" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base">Provas que falam por ti</h1>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Grave áudio em qualquer momento — fica guardado no <span className="text-brand/80 font-medium">histórico da sua conta na nuvem</span> e
              no dispositivo. Disponível como prova mesmo que perca o telemóvel.
            </p>
          </div>
        </div>

        {/* ── DICAS: como funciona o fluxo da gravação ── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold text-white/70 mb-3.5">
            <Info className="h-3.5 w-3.5 text-brand" /> Como usar as gravações
          </p>
          <div className="space-y-3">
            {[
              { n: '1', t: 'Grave', d: 'Toque no microfone dourado abaixo. O áudio é gravado mesmo com o ecrã bloqueado (na app instalada) e guardado automaticamente ao parar.' },
              { n: '2', t: 'Fica salvo na nuvem', d: 'Com internet, a gravação sobe para o histórico da sua conta — aparece aqui em qualquer aparelho onde entre. Sem internet, fica no telemóvel e sobe sozinha depois (sincronização automática).' },
              { n: '3', t: 'Partilhe com quem confia', d: 'Toque em Partilhar numa gravação para enviar por WhatsApp, Telegram, SMS ou e-mail — o ficheiro de áudio vai anexado. Pode também descarregar para guardar fora do telemóvel.' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-brand">{s.n}</div>
                <div>
                  <p className="text-[13px] font-semibold text-white/85">{s.t}</p>
                  <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel de gravação directa */}
        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            recorder.isRecording
              ? 'border-red-500/40 bg-red-500/[0.07]'
              : 'border-white/[0.07] bg-white/[0.02]'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => void toggleRecording()}
                disabled={recSaving}
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50',
                  recorder.isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-brand text-black shadow-lg shadow-brand/25'
                )}
                aria-label={recorder.isRecording ? 'Parar gravação' : 'Começar a gravar'}
              >
                {recorder.isRecording && (
                  <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                )}
                {recorder.isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <div>
                <p className="text-sm font-semibold">
                  {recSaving ? 'A guardar…' : recorder.isRecording ? 'A gravar…' : 'Gravar evidência agora'}
                </p>
                <p className="text-[11px] text-white/40">
                  {recorder.isRecording
                    ? `${recSeconds}s — toque para parar e guardar no cofre`
                    : 'Toque no microfone. O áudio fica salvo no seu histórico.'}
                </p>
              </div>
            </div>
            {recorder.isRecording && (
              <Badge variant="outline" className="text-[10px] text-red-300 border-red-500/40 bg-red-500/10">
                ● REC {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
              </Badge>
            )}
          </div>
        </div>

        {/* Sincronização */}
        {(localPending > 0 || syncing) && (
          <button
            onClick={() => void runSync(false)}
            disabled={syncing}
            className="w-full flex items-center gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/[0.06] p-4 text-left hover:bg-blue-500/[0.1] transition disabled:opacity-60"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              {syncing ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : <CloudUpload className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-300">
                {syncing ? 'A sincronizar…' : `${localPending} gravação(ões) apenas neste dispositivo`}
              </p>
              <p className="text-[11px] text-white/40">Toque para enviar à nuvem — assim ficam no histórico da sua conta e não se perdem.</p>
            </div>
            <RefreshCw className={cn('h-4 w-4 text-blue-400/60', syncing && 'animate-spin')} />
          </button>
        )}

        {!isPremium && items.length > FREE_LIMIT && (
          <button
            onClick={() => navigate('/dashboard/assinatura')}
            className="w-full flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4 text-left hover:bg-brand/[0.1] transition"
          >
            <Lock className="h-4.5 w-4.5 text-brand shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand">{locked} evidência(s) bloqueada(s)</p>
              <p className="text-[11px] text-white/40">O plano {state?.plan.name} mostra as {FREE_LIMIT} mais recentes. Premium = arquivo completo ilimitado.</p>
            </div>
            <Sparkles className="h-4 w-4 text-brand" />
          </button>
        )}

        {loading && (
          <div className="py-16 text-center"><Loader2 className="h-7 w-7 text-brand animate-spin mx-auto" /></div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <Mic className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/60 font-medium">Ainda não há evidências</p>
            <p className="text-[11px] text-white/30 mt-1.5 max-w-[300px] mx-auto leading-relaxed">
              Grave agora com o microfone acima, ou deixe que o SOS, o modo pânico e os óculos inteligentes activem a captação automaticamente.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {visible.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => void handlePlay(e)}
                  className={cn(
                    'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-all',
                    playingId === e.id
                      ? 'bg-brand border-brand text-black'
                      : 'bg-brand/10 border-brand/20 text-brand hover:bg-brand/20',
                  )}
                  aria-label={playingId === e.id ? 'Parar reprodução' : 'Reproduzir gravação'}
                >
                  {playingId === e.id ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">
                    Gravação de {formatDateTime(e.created_at)}
                  </p>
                  <p className="text-[11px] text-white/30 font-mono mt-0.5 flex items-center gap-1.5">
                    <span>
                      {Math.floor(e.duration_seconds / 60)}:{String(e.duration_seconds % 60).padStart(2, '0')} · {(e.file_size_bytes / 1024).toFixed(0)} KB
                    </span>
                    {!e.audio_data_b64?.startsWith('data:') && (
                      <span className="inline-flex items-center gap-1 text-brand/50 not-italic" title="Guardada na nuvem">
                        <CloudUpload className="h-3 w-3" /> nuvem
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => void handleShare(e)} disabled={sharingId === e.id} className="p-2 rounded-lg hover:bg-brand/[0.08] transition disabled:opacity-50" title="Partilhar (WhatsApp, SMS…)">
                  {sharingId === e.id ? <Loader2 className="h-4 w-4 text-brand animate-spin" /> : <Share2 className="h-4 w-4 text-white/40 hover:text-brand" />}
                </button>
                <button onClick={() => void handleDownload(e)} className="p-2 rounded-lg hover:bg-white/[0.06] transition" title="Descarregar">
                  <Download className="h-4 w-4 text-white/40 hover:text-brand" />
                </button>
                <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg hover:bg-red-500/[0.08] transition" title="Eliminar">
                  <Trash2 className="h-4 w-4 text-white/25 hover:text-red-400" />
                </button>
              </div>
              {playingId === e.id && (
                <div className="mt-3.5">
                  {playUrl ? (
                    <audio
                      src={playUrl}
                      controls
                      autoPlay
                      onEnded={() => { setPlayingId(null); setPlayUrl(null) }}
                      className="w-full h-9"
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-1.5">
                      <Loader2 className="h-3.5 w-3.5 text-brand animate-spin" />
                      <p className="text-[11px] text-white/30">A abrir o áudio…</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {!isPremium && locked > 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center">
              <Lock className="h-4 w-4 text-white/20 mx-auto mb-1.5" />
              <p className="text-[11px] text-white/25">{locked} evidência(s) mais antigas no arquivo completo</p>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-white/20 pt-2">
          As gravações são privadas — só a sua conta acede. Active a partilha apenas com pessoas de confiança.
        </p>
      </div>

      {/* Confirmação de eliminação */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="bg-card border-white/10 text-white max-w-xs">
          <div className="text-center space-y-3 py-2">
            <div className="h-11 w-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <p className="font-display font-bold text-sm">Eliminar evidência?</p>
            <p className="text-[11px] text-white/35">Esta acção é permanente — a gravação é removida do dispositivo e da nuvem.</p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 h-10 border-white/10 bg-white/[0.03] text-white/60 rounded-xl">Cancelar</Button>
              <Button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl">Eliminar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
