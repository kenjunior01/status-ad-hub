/**
 * native-evidence.ts — ponte para a gravação NATIVA de evidências (v3.27.0).
 *
 * O MediaRecorder do WebView morre quando a app é despachada — exactamente
 * quando a evidência mais importa. O EvidenceService nativo (foreground,
 * tipo microfone) grava pelo lado Android e continua com a app fechada.
 *
 * Esta lib expõe:
 *  · start/stop/toggle — o toggle é usado pelo botão REC do widget
 *    (deep link com.statusads.connect://evidence) e pelos botões na app
 *  · status — para o timer do botão REC e do cartão do Guardião
 *  · lista + partilha — os .m4a vivem em Android/data/…/files/Evidence/;
 *    a partilha usa o FileProvider (WhatsApp, Telegram, e-mail…)
 *
 * Tudo é no-op seguro no web/PWA (devolve 'unavailable' / [] sem erros).
 */

import { getNativePanic, type NativeEvidenceRecording } from '@/lib/guardian'

export type { NativeEvidenceRecording }

export interface EvidenceToggleResult {
  ok: boolean
  /** 'permission' = falta RECORD_AUDIO (o diálogo do sistema foi pedido) */
  reason?: 'permission' | 'error' | 'unavailable'
}

export function nativeEvidenceAvailable(): boolean {
  return getNativePanic() != null
}

/** Evento global para a UI actualizar o estado do REC (start/stop/toggle). */
export function notifyEvidenceChange(): void {
  try {
    window.dispatchEvent(new CustomEvent('native-evidence-change'))
  } catch {
    // ambiente sem window — ignorar
  }
}

export async function startNativeEvidence(): Promise<EvidenceToggleResult> {
  const panic = getNativePanic()
  if (!panic) return { ok: false, reason: 'unavailable' }
  try {
    const res = await panic.startEvidence()
    if (res.started) {
      notifyEvidenceChange()
      return { ok: true }
    }
    return { ok: false, reason: (res.reason as EvidenceToggleResult['reason']) || 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function stopNativeEvidence(): Promise<
  { ok: boolean; path?: string | null; durationMs?: number }
> {
  const panic = getNativePanic()
  if (!panic) return { ok: false }
  try {
    const res = await panic.stopEvidence()
    notifyEvidenceChange()
    return { ok: true, path: res.path ?? null, durationMs: res.durationMs ?? 0 }
  } catch {
    notifyEvidenceChange()
    return { ok: false }
  }
}

export async function nativeEvidenceStatus(): Promise<{ running: boolean; elapsedMs: number }> {
  const panic = getNativePanic()
  if (!panic) return { running: false, elapsedMs: 0 }
  try {
    const res = await panic.evidenceStatus()
    return { running: !!res.running, elapsedMs: res.elapsedMs ?? 0 }
  } catch {
    return { running: false, elapsedMs: 0 }
  }
}

/** Metadados das gravações nativas (mais recente primeiro). */
export async function getNativeRecordings(): Promise<NativeEvidenceRecording[]> {
  const panic = getNativePanic()
  if (!panic) return []
  try {
    const { recordings } = await panic.getNativeEvidence()
    return Array.isArray(recordings) ? recordings : []
  } catch {
    return []
  }
}

/** Partilha um ficheiro nativo via share sheet do sistema. */
export async function shareNativeRecording(path: string): Promise<boolean> {
  const panic = getNativePanic()
  if (!panic) return false
  try {
    await panic.shareNativeEvidence({ path })
    return true
  } catch {
    return false
  }
}

/**
 * Liga/desliga a gravação — usado pelo deep link do widget e pelos botões
 * na app. Dispara 'native-evidence-change' em qualquer transição.
 */
export async function toggleNativeEvidence(): Promise<'started' | 'stopped' | 'unavailable'> {
  const status = await nativeEvidenceStatus()
  if (status.running) {
    await stopNativeEvidence()
    return 'stopped'
  }
  const res = await startNativeEvidence()
  return res.ok ? 'started' : 'unavailable'
}
