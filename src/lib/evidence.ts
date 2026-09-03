/**
 * evidence.ts — Cofre de Evidências v2: gravação, nuvem, sincronização e partilha
 *
 * Estratégia de gravação (em cascata, nunca perde o áudio):
 *  1. SUPABASE STORAGE (bucket privado `evidence-audio`, pasta {user_id}/…)
 *     + linha na tabela `audio_evidence` com storage_path — histórico na
 *     nuvem, disponível em qualquer dispositivo.
 *  2. Se o Storage falhar → insert com audio_data_b64 (base64 na tabela).
 *  3. Se a nuvem falhar/estiver offline → localStorage
 *     `statusads-local-evidence` — sincroniza automaticamente depois
 *     (syncLocalEvidence, chamada ao abrir o Cofre).
 *
 * Partilha: shareEvidenceRecording() usa o share sheet nativo
 * (WhatsApp, Telegram, e-mail…) com o ficheiro de áudio anexado quando
 * o browser/APK suporta (Web Share API Level 2); senão descarrega.
 *
 * Usado por: QuickActions (Gravação Rápida), EvidenceVault, SmartGlasses.
 */

import { supabase } from '@/lib/supabase'

export interface EvidenceRecord {
  id: string
  user_id?: string
  audio_url: string | null
  audio_data_b64: string | null
  storage_path?: string | null
  duration_seconds: number
  file_size_bytes: number
  mime_type: string
  created_at: string
}

export const LS_EVIDENCE = 'statusads-local-evidence'
const BUCKET = 'evidence-audio'

export interface SaveResult {
  saved: boolean
  location: 'remote' | 'local' | 'none'
  storagePath?: string
  error?: string
}

/** Lê todas as gravações locais (mesma lista que o EvidenceVault mostra) */
export function getLocalEvidence(): EvidenceRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LS_EVIDENCE) ?? '[]')
  } catch {
    return []
  }
}

function writeLocalEvidence(list: EvidenceRecord[]): void {
  // Limitar a 20 gravações locais (base64 é pesado — ~5MB quota)
  localStorage.setItem(LS_EVIDENCE, JSON.stringify(list.slice(0, 20)))
}

function extFor(mime: string): string {
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

/**
 * Guarda uma gravação no cofre. `dataUrl` deve ser um data-URL
 * (ex.: "data:audio/webm;base64,XXXX") — igual ao que getBase64()
 * do useAudioRecorder devolve.
 */
export async function saveEvidenceRecording(
  dataUrl: string,
  durationSeconds: number,
  mimeType = 'audio/webm'
): Promise<SaveResult> {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const sizeBytes = Math.round((base64.length * 3) / 4)

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (userId) {
    const duration = Math.max(1, Math.round(durationSeconds))

    // 1) Storage (ficheiro) + linha com storage_path
    try {
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(mimeType)}`
      const blob = await (await fetch(`data:${mimeType};base64,${base64}`)).blob()
      const up = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: mimeType, upsert: false,
      })
      if (!up.error) {
        const { error: insErr } = await supabase.from('audio_evidence').insert({
          user_id: userId,
          audio_url: null,
          audio_data_b64: null,
          storage_path: path,
          duration_seconds: duration,
          file_size_bytes: sizeBytes,
          mime_type: mimeType,
        })
        if (!insErr) return { saved: true, location: 'remote', storagePath: path }
        // linha falhou mas o ficheiro subiu — tenta linha sem path
        const { error: insErr2 } = await supabase.from('audio_evidence').insert({
          user_id: userId, audio_url: null, audio_data_b64: base64,
          duration_seconds: duration, file_size_bytes: sizeBytes, mime_type: mimeType,
        })
        if (!insErr2) return { saved: true, location: 'remote' }
      }
    } catch (err) {
      console.warn('[EVIDENCE] storage falhou:', err)
    }

    // 2) Tabela com base64 (instalações antigas sem bucket)
    try {
      const { error } = await supabase.from('audio_evidence').insert({
        user_id: userId,
        audio_url: null,
        audio_data_b64: base64,
        duration_seconds: duration,
        file_size_bytes: sizeBytes,
        mime_type: mimeType,
      })
      if (!error) return { saved: true, location: 'remote' }
      console.warn('[EVIDENCE] insert remoto falhou, a guardar localmente:', error.message)
    } catch (err) {
      console.warn('[EVIDENCE] erro remoto, a guardar localmente:', err)
    }
  }

  // 3) Fallback local — shape idêntica à que EvidenceVault lê
  try {
    const rec: EvidenceRecord = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      audio_url: null,
      audio_data_b64: `data:${mimeType};base64,${base64}`,
      duration_seconds: Math.max(1, Math.round(durationSeconds)),
      file_size_bytes: sizeBytes,
      mime_type: mimeType,
      created_at: new Date().toISOString(),
    }
    const list = getLocalEvidence()
    list.unshift(rec)
    writeLocalEvidence(list)
    return { saved: true, location: 'local' }
  } catch (err) {
    console.error('[EVIDENCE] falha ao guardar localmente:', err)
    return { saved: false, location: 'none', error: 'Armazenamento cheio — apague gravações antigas no Cofre' }
  }
}

/**
 * Sincroniza gravações locais para a nuvem (chamado ao abrir o Cofre
 * com internet). Devolve quantas subiram.
 */
export async function syncLocalEvidence(): Promise<number> {
  const local = getLocalEvidence()
  if (local.length === 0) return 0
  let synced = 0
  const remaining: EvidenceRecord[] = []

  for (const rec of local) {
    try {
      // extrai base64 do data-URL local
      const raw = rec.audio_data_b64 ?? ''
      if (!raw.startsWith('data:')) { remaining.push(rec); continue }
      const mime = raw.slice(5, raw.indexOf(';')) || rec.mime_type || 'audio/webm'
      const b64 = raw.split(',')[1] ?? ''
      if (!b64) { remaining.push(rec); continue }

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) { remaining.push(rec); continue }

      let done = false
      try {
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(mime)}`
        const blob = await (await fetch(raw)).blob()
        const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false })
        if (!up.error) {
          const { error } = await supabase.from('audio_evidence').insert({
            user_id: userId, audio_url: null, audio_data_b64: null, storage_path: path,
            duration_seconds: rec.duration_seconds, file_size_bytes: rec.file_size_bytes,
            mime_type: mime, created_at: rec.created_at,
          })
          done = !error
        }
      } catch { /* tenta base64 abaixo */ }

      if (!done) {
        const { error } = await supabase.from('audio_evidence').insert({
          user_id: userId, audio_url: null, audio_data_b64: b64,
          duration_seconds: rec.duration_seconds, file_size_bytes: rec.file_size_bytes,
          mime_type: mime, created_at: rec.created_at,
        })
        done = !error
      }

      if (done) synced++
      else remaining.push(rec)
    } catch {
      remaining.push(rec)
    }
  }

  writeLocalEvidence(remaining)
  return synced
}

/**
 * Resolve a fonte reproduzível de uma evidência:
 * storage_path → URL assinada privada (2h); senão data-URL local.
 */
export async function resolveEvidenceSource(rec: {
  audio_url?: string | null
  audio_data_b64?: string | null
  storage_path?: string | null
  mime_type?: string
}): Promise<string | null> {
  if (rec.audio_data_b64?.startsWith('data:')) return rec.audio_data_b64
  if (rec.audio_data_b64) return `data:${rec.mime_type || 'audio/webm'};base64,${rec.audio_data_b64}`
  if (rec.audio_url) return rec.audio_url
  if (rec.storage_path) {
    try {
      const { data, error } = await supabase.rpc('evidence_signed_url', { p_path: rec.storage_path })
      if (!error && data) return data as string
      // fallback: assinatura directa (se políticas de storage permitirem)
      const { data: signed } = await supabase.storage
        .from(BUCKET).createSignedUrl(rec.storage_path, 7200)
      if (signed?.signedUrl) return signed.signedUrl
    } catch { /* ignore */ }
  }
  return null
}

/**
 * Partilha uma gravação via share sheet nativo (WhatsApp, Telegram, SMS,
 * e-mail…). Suporte a ficheiros: Web Share API Level 2 (Android Chrome /
 * iOS Safari / Capacitor WebView moderno). Sem suporte → descarrega o
 * ficheiro e o utilizador anexa manualmente.
 */
export async function shareEvidenceRecording(rec: EvidenceRecord): Promise<boolean> {
  const src = await resolveEvidenceSource(rec)
  if (!src) return false

  const stamp = new Date(rec.created_at)
  const name = `statusads-evidencia-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}.${extFor(rec.mime_type)}`

  // 1) Tentar partilhar o FICHEIRO (share sheet com anexo de áudio)
  try {
    const blob = await (await fetch(src)).blob()
    const file = new File([blob], name, { type: rec.mime_type || blob.type || 'audio/webm' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: 'Evidência StatusAds Connect',
        text: `Gravação de ${stamp.toLocaleString('pt-PT')} — guardada no meu Cofre de Evidências StatusAds.`,
      })
      return true
    }
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return false // cancelado
    // cai para os fallbacks abaixo
  }

  // 2) Partilhar TEXTO + link (se for URL assinada, o destinatário abre)
  if (src.startsWith('http')) {
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (nav.share) {
        await nav.share({
          title: 'Evidência StatusAds Connect',
          text: `Gravação de ${stamp.toLocaleString('pt-PT')} — válida por 2 horas.`,
          url: src,
        })
        return true
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return false
    }
  }

  // 3) Fallback: descarregar (o áudio fica nas Descargas para anexar)
  try {
    const a = document.createElement('a')
    a.href = src
    a.download = name
    a.target = '_blank'
    a.click()
    return true
  } catch {
    return false
  }
}

/**
 * Elimina uma gravação local (o EvidenceVault também faz delete remoto,
 * esta função é só para o caminho local).
 */
export function deleteLocalEvidence(id: string): void {
  const list = getLocalEvidence().filter((e) => e.id !== id)
  localStorage.setItem(LS_EVIDENCE, JSON.stringify(list))
}
