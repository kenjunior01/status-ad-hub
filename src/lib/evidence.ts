/**
 * evidence.ts — Caminho de gravação das evidências (o elo que faltava)
 *
 * Guarda gravações de áudio no cofre de evidências:
 *  1. Tenta inserir na tabela `audio_evidence` (Supabase) — sincronizado
 *     entre dispositivos, aparece no cofre de qualquer sessão.
 *  2. Se a tabela não existir (42P01/PGRST205) ou falhar, grava no
 *     localStorage `statusads-local-evidence` — EXACTAMENTE a mesma shape
 *     que o EvidenceVault lê, portanto aparece no cofre como gravação local.
 *
 * Usado por: QuickActions (Gravação Rápida), EvidenceVault (barra de gravação).
 */

import { supabase } from '@/lib/supabase'

export interface EvidenceRecord {
  id: string
  user_id?: string
  audio_url: string | null
  audio_data_b64: string | null
  duration_seconds: number
  file_size_bytes: number
  mime_type: string
  created_at: string
}

export const LS_EVIDENCE = 'statusads-local-evidence'

export interface SaveResult {
  saved: boolean
  location: 'remote' | 'local' | 'none'
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

  // 1) Tentar sincronizar no Supabase
  if (userId) {
    try {
      const { error } = await supabase.from('audio_evidence').insert({
        user_id: userId,
        audio_url: null,
        audio_data_b64: base64,
        duration_seconds: Math.max(1, Math.round(durationSeconds)),
        file_size_bytes: sizeBytes,
        mime_type: mimeType,
      })
      if (!error) return { saved: true, location: 'remote' }

      // Tabela não existe ou colunas diferentes → fallback local
      console.warn('[EVIDENCE] insert remoto falhou, a guardar localmente:', error.message)
    } catch (err) {
      console.warn('[EVIDENCE] erro remoto, a guardar localmente:', err)
    }
  }

  // 2) Fallback local — shape idêntica à que EvidenceVault lê
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
    // Limitar a 20 gravações locais (base64 é pesado — ~5MB quota)
    const trimmed = list.slice(0, 20)
    localStorage.setItem(LS_EVIDENCE, JSON.stringify(trimmed))
    return { saved: true, location: 'local' }
  } catch (err) {
    // Quota do localStorage cheia
    console.error('[EVIDENCE] falha ao guardar localmente:', err)
    return { saved: false, location: 'none', error: 'Armazenamento cheio — apague gravações antigas no Cofre' }
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
