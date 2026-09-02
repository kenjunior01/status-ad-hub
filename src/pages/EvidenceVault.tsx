import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Archive, Play, Pause, Download, Trash2, Mic, ArrowLeft,
  Shield, Lock, Loader2, Sparkles, AlertTriangle, Square,
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
import { saveEvidenceRecording } from '@/lib/evidence'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Evidence {
  id: string
  audio_url: string | null
  audio_data_b64: string | null
  duration_seconds: number
  file_size_bytes: number
  mime_type: string
  created_at: string
}

const LS_EVIDENCE = 'statusads-local-evidence'
const FREE_LIMIT = 3

function sourceUrl(e: Evidence): string | null {
  if (e.audio_url) return e.audio_url
  if (e.audio_data_b64) return e.audio_data_b64.startsWith('data:') ? e.audio_data_b64 : `data:audio/webm;base64,${e.audio_data_b64}`
  return null
}

export default function EvidenceVault() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state } = usePlanState()
  const [items, setItems] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [isLocal, setIsLocal] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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
    let tableMissing = false
    try {
      const { data, error } = await supabase
        .from('audio_evidence')
        .select('id, audio_url, audio_data_b64, duration_seconds, file_size_bytes, mime_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      remote = (data ?? []) as Evidence[]
    } catch {
      tableMissing = true
    }
    // funde com evidências locais (gravações offline ainda não sincronizadas)
    let local: Evidence[] = []
    try {
      local = JSON.parse(localStorage.getItem(LS_EVIDENCE) ?? '[]')
    } catch { local = [] }
    const remoteIds = new Set(remote.map((e) => e.id))
    const merged = [...remote, ...local.filter((e) => !remoteIds.has(e.id))]
    setItems(merged)
    setIsLocal(tableMissing || local.length > 0)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

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
              description: res.location === 'local' ? 'Guardada neste dispositivo' : 'Sincronizada na sua conta',
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
    try {
      const { error } = await supabase.from('audio_evidence').delete().eq('id', id)
      if (error) throw error
    } catch {
      // local
      const local = JSON.parse(localStorage.getItem(LS_EVIDENCE) ?? '[]').filter((e: Evidence) => e.id !== id)
      localStorage.setItem(LS_EVIDENCE, JSON.stringify(local))
    }
    setItems((prev) => prev.filter((e) => e.id !== id))
    toast.success('Evidência eliminada')
  }

  function handleDownload(e: Evidence) {
    const url = sourceUrl(e)
    if (!url) { toast.error('Fonte de áudio indisponível'); return }
    const a = document.createElement('a')
    a.href = url
    a.download = `statusads-evidencia-${e.id.slice(0, 8)}.${e.mime_type.includes('mp4') ? 'm4a' : 'webm'}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="dark min-h-screen bg-[#0C0B08] text-white relative">
      <NoiseTexture opacity={0.015} />
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 backdrop-blur-2xl bg-[#0C0B08]/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
            <ArrowLeft className="h-5 w-5 text-white/50" />
          </button>
          <Archive className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-sm font-bold">Cofre de Evidências</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{items.length} gravações</Badge>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
            <Shield className="h-4.5 w-4.5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base">Provas que falam por ti</h1>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Áudio gravado automaticamente durante emergências, modo pânico e óculos inteligentes.
              Guardado com segurança e disponível como prova.
            </p>
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
                    : 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/25'
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
                    : 'Toque no microfone. O áudio fica guardado como prova.'}
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

        {!isPremium && items.length > FREE_LIMIT && (
          <button
            onClick={() => navigate('/dashboard/assinatura')}
            className="w-full flex items-center gap-3 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-4 text-left hover:bg-[#D4AF37]/[0.1] transition"
          >
            <Lock className="h-4.5 w-4.5 text-[#D4AF37] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#D4AF37]">{locked} evidência(s) bloqueada(s)</p>
              <p className="text-[11px] text-white/40">O plano {state?.plan.name} mostra as {FREE_LIMIT} mais recentes. Premium = arquivo completo ilimitado.</p>
            </div>
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          </button>
        )}

        {loading && (
          <div className="py-16 text-center"><Loader2 className="h-7 w-7 text-[#D4AF37] animate-spin mx-auto" /></div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <Mic className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/60 font-medium">Ainda não há evidências</p>
            <p className="text-[11px] text-white/30 mt-1.5 max-w-[300px] mx-auto leading-relaxed">
              As gravações aparecem aqui automaticamente quando o SOS, o modo pânico ou os óculos inteligentes activam a captação de áudio.
            </p>
          </div>
        )}

        {isLocal && items.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80">Evidências locais deste dispositivo (servidor ainda não migrado). Descarrega as que forem importantes.</p>
          </div>
        )}

        <div className="space-y-3">
          {visible.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => setPlayingId(playingId === e.id ? null : e.id)}
                  className={cn(
                    'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-all',
                    playingId === e.id
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                      : 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/20',
                  )}
                >
                  {playingId === e.id ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">
                    Gravação de {formatDateTime(e.created_at)}
                  </p>
                  <p className="text-[11px] text-white/30 font-mono mt-0.5">
                    {Math.floor(e.duration_seconds / 60)}:{String(e.duration_seconds % 60).padStart(2, '0')} · {(e.file_size_bytes / 1024).toFixed(0)} KB · {e.mime_type.split('/')[1]?.split(';')[0] ?? 'audio'}
                  </p>
                </div>
                <button onClick={() => handleDownload(e)} className="p-2 rounded-lg hover:bg-white/[0.06] transition" title="Descarregar">
                  <Download className="h-4 w-4 text-white/40 hover:text-[#D4AF37]" />
                </button>
                <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg hover:bg-red-500/[0.08] transition" title="Eliminar">
                  <Trash2 className="h-4 w-4 text-white/25 hover:text-red-400" />
                </button>
              </div>
              {playingId === e.id && (
                <div className="mt-3.5">
                  {sourceUrl(e) ? (
                    <audio
                      src={sourceUrl(e)!}
                      controls
                      autoPlay
                      onEnded={() => setPlayingId(null)}
                      className="w-full h-9"
                    />
                  ) : (
                    <p className="text-[11px] text-red-400/70">Fonte de áudio indisponível para esta evidência.</p>
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
      </div>

      {/* Confirmação de eliminação */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="bg-[#14120D] border-white/10 text-white max-w-xs">
          <div className="text-center space-y-3 py-2">
            <div className="h-11 w-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <p className="font-display font-bold text-sm">Eliminar evidência?</p>
            <p className="text-[11px] text-white/35">Esta acção é permanente — a gravação não pode ser recuperada.</p>
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
