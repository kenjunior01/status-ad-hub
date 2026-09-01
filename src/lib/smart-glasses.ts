// ============================================
// Smart Glasses — BLE HID Communication Layer
// ============================================
// Camada de comunicação BLE HID para óculos inteligentes.
// Óculos (SG15, SG16 etc.) conectam via perfil BLE HID e
// enviam eventos de teclado quando o usuário toca a haste.

import type { TapPattern, SmartGlassesConfig } from '@/lib/types'

// ---- HID Key Mapping ----
// Óculos inteligentes enviam eventos de tecla de mídia via BLE HID:
// - Toque único: MediaPlayPause (keyCode 179, code "MediaPlayPause")
// - Toque duplo: MediaNextTrack (keyCode 176, code "MediaNextTrack")
// - Toque triplo: MediaPrevTrack (keyCode 177, code "MediaPrevTrack")
// - Pressão longa: VolumeUp segurado (keyCode 175, code "VolumeUp")

export const GLASSES_HID_KEYS = {
  SINGLE_TAP: { code: 'MediaPlayPause', keyCode: 179 },
  DOUBLE_TAP: { code: 'MediaNextTrack', keyCode: 176 },
  TRIPLE_TAP: { code: 'MediaPrevTrack', keyCode: 177 },
  LONG_PRESS: { code: 'VolumeUp', keyCode: 175 },
} as const

export type GlassesAction = 'sos' | 'checkin' | 'record_audio' | 'none'

export interface TapDetectionResult {
  pattern: TapPattern
  action: GlassesAction
  timestamp: number
  keyCode: number
  code: string
}

// ============================================
// CLASSE: GlassesTapDetector
// ============================================
// Acumula eventos de tecla e detecta padrões de toque.
// - Toque duplo: 2 toques dentro de 400ms
// - Toque triplo: 3 toques dentro de 800ms
// - Pressão longa: segurar > 600ms

export class GlassesTapDetector {
  private tapTimes: number[] = []
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private isLongPressing = false
  private callback: (result: TapDetectionResult) => void
  private enabled = true

  // Ações mapeadas por padrão de toque (configurável)
  private actionMap: Record<TapPattern, GlassesAction> = {
    double: 'sos',
    triple: 'checkin',
    long_press: 'record_audio',
  }

  constructor(callback: (result: TapDetectionResult) => void) {
    this.callback = callback
  }

  /** Atualiza o mapeamento de ações por padrão de toque */
  setActionMap(map: Partial<Record<TapPattern, GlassesAction>>): void {
    this.actionMap = { ...this.actionMap, ...map }
  }

  /** Configura a partir do config do banco */
  applyConfig(config: SmartGlassesConfig): void {
    // Mapeia o padrão SOS para a ação 'sos'
    const patternMap: Record<TapPattern, GlassesAction> = {
      double: 'none',
      triple: 'none',
      long_press: 'none',
    }
    patternMap[config.sos_tap_pattern] = config.sos_enabled ? 'sos' : 'none'

    // Triplo toque padrão = check-in
    if (patternMap.triple === 'none') {
      patternMap.triple = 'checkin'
    }

    // Pressão longa padrão = gravar áudio
    if (patternMap.long_press === 'none') {
      patternMap.long_press = 'record_audio'
    }

    this.actionMap = patternMap
  }

  /** Chamado a cada keydown do dispositivo HID */
  onKeyEvent(code: string, keyCode: number): void {
    if (!this.enabled) return

    if (code === GLASSES_HID_KEYS.DOUBLE_TAP.code) {
      this.detectDoubleTap(keyCode, code)
    } else if (code === GLASSES_HID_KEYS.TRIPLE_TAP.code) {
      this.detectTripleTap(keyCode, code)
    } else if (code === GLASSES_HID_KEYS.LONG_PRESS.code) {
      this.startLongPress(keyCode, code)
    }
    // SINGLE_TAP é ignorado — apenas duplo, triplo e longo são ações
  }

  /** Chamado no keyup (para detecção de pressão longa) */
  onKeyUp(code: string): void {
    if (code === GLASSES_HID_KEYS.LONG_PRESS.code && this.isLongPressing) {
      this.isLongPressing = false
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }
    }
  }

  // ---- Detecção de toque duplo (2 toques em 400ms) ----
  private detectDoubleTap(keyCode: number, code: string): void {
    const now = Date.now()
    this.tapTimes.push(now)
    // Manter apenas toques recentes (dentro de 1 segundo)
    this.tapTimes = this.tapTimes.filter(t => now - t < 1000)

    if (this.tapTimes.length >= 2) {
      const first = this.tapTimes[this.tapTimes.length - 2]
      if (now - first < 400) {
        // Limpar timer de pressão longa se existir
        this.cancelLongPress()
        this.tapTimes = []
        this.emitResult('double', keyCode, code)
      }
    }
  }

  // ---- Detecção de toque triplo (3 toques em 800ms) ----
  private detectTripleTap(keyCode: number, code: string): void {
    const now = Date.now()
    this.tapTimes.push(now)
    this.tapTimes = this.tapTimes.filter(t => now - t < 1200)

    if (this.tapTimes.length >= 3) {
      const first = this.tapTimes[this.tapTimes.length - 3]
      if (now - first < 800) {
        this.cancelLongPress()
        this.tapTimes = []
        this.emitResult('triple', keyCode, code)
      }
    }
  }

  // ---- Detecção de pressão longa (> 600ms) ----
  private startLongPress(keyCode: number, code: string): void {
    if (this.isLongPressing) return
    this.isLongPressing = true

    this.longPressTimer = setTimeout(() => {
      if (this.isLongPressing && this.enabled) {
        this.tapTimes = []
        this.emitResult('long_press', keyCode, code)
      }
    }, 600)
  }

  private cancelLongPress(): void {
    this.isLongPressing = false
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private emitResult(pattern: TapPattern, keyCode: number, code: string): void {
    this.callback({
      pattern,
      action: this.actionMap[pattern] || 'none',
      timestamp: Date.now(),
      keyCode,
      code,
    })
  }

  /** Desabilita o detector */
  destroy(): void {
    this.enabled = false
    this.cancelLongPress()
    this.tapTimes = []
  }
}

// ============================================
// FUNÇÃO: startGlassesHIDListener
// ============================================
// Anexa listeners globais de keydown/keyup e roteia
// eventos para o detector de toques.

export function startGlassesHIDListener(
  detector: GlassesTapDetector,
  _targetDeviceId?: string
): () => void {
  const isMediaKey = (code: string): boolean => {
    return (
      code?.startsWith('Media') ||
      code === 'VolumeUp' ||
      code === 'VolumeDown'
    )
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isMediaKey(e.code)) {
      // Prevenir comportamento padrão do navegador para teclas de mídia
      e.preventDefault()
      e.stopPropagation()
      detector.onKeyEvent(e.code, e.keyCode)
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (isMediaKey(e.code)) {
      e.preventDefault()
      e.stopPropagation()
      detector.onKeyUp(e.code)
    }
  }

  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })

  // Retorna função de limpeza
  return () => {
    window.removeEventListener('keydown', onKeyDown, { capture: true })
    window.removeEventListener('keyup', onKeyUp, { capture: true })
  }
}

// ============================================
// AVALIAÇÃO DE REMOÇÃO FORÇADA DOS ÓCULOS
// ============================================

export interface RemovalAssessment {
  isSuspicious: boolean
  reason: string
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Avalia se uma desconexão BLE é uma possível remoção forçada.
 * Combina múltiplos sinais para calcular confiança.
 */
export function assessGlassesRemoval(
  disconnectReason: 'timeout' | 'user' | 'unknown',
  wasMonitored: boolean,
  hasActiveEmergency: boolean,
  connectionDuration: number,
  rssiTrend: 'stable' | 'weakening' | 'sudden_drop',
  timeOfDay: number,
  gracePeriodSeconds: number
): RemovalAssessment {
  // Se não está sendo monitorado, não é suspeito
  if (!wasMonitored) {
    return { isSuspicious: false, reason: 'Dispositivo não monitorado', confidence: 'low' }
  }

  // Desconexão iniciada pelo usuário = baixa suspeição
  if (disconnectReason === 'user') {
    return { isSuspicious: false, reason: 'Desconexão iniciada pelo usuário', confidence: 'low' }
  }

  // Se há emergência ativa, qualquer desconexão é suspeita
  if (hasActiveEmergency) {
    return {
      isSuspicious: true,
      reason: 'Desconexão durante emergência ativa',
      confidence: 'high',
    }
  }

  // Sistema de pontuação para avaliar suspeição
  let score = 0
  const reasons: string[] = []

  // 1. Tendência do RSSI
  if (rssiTrend === 'sudden_drop') {
    score += 40
    reasons.push('Queda abrupta de sinal RSSI')
  } else if (rssiTrend === 'weakening') {
    score += 15
    reasons.push('Sinal enfraquecendo')
  }

  // 2. Duração da conexão (curta = mais suspeito para remoção)
  const shortConnectionThreshold = 60_000 // 1 minuto
  if (connectionDuration < shortConnectionThreshold) {
    score += 20
    reasons.push('Conexão de curta duração')
  }

  // 3. Hora do dia (22h às 6h = horário de risco)
  const isNightTime = timeOfDay >= 22 || timeOfDay < 6
  if (isNightTime) {
    score += 20
    reasons.push('Desconexão em horário noturno')
  }

  // 4. Motivo da desconexão
  if (disconnectReason === 'unknown') {
    score += 15
    reasons.push('Motivo de desconexão desconhecido')
  } else if (disconnectReason === 'timeout') {
    score += 10
    reasons.push('Conexão perdida por timeout')
  }

  // 5. Período de carência — se a desconexão foi rápida demais
  // (menos que o período de carência configurado)
  const connectionSeconds = connectionDuration / 1000
  if (connectionSeconds < gracePeriodSeconds) {
    score += 10
    reasons.push(`Dentro do período de carência (${gracePeriodSeconds}s)`)
  }

  // Determinar resultado
  if (score >= 50) {
    return {
      isSuspicious: true,
      reason: reasons.join('; '),
      confidence: 'high',
    }
  } else if (score >= 30) {
    return {
      isSuspicious: true,
      reason: reasons.join('; '),
      confidence: 'medium',
    }
  } else {
    return {
      isSuspicious: false,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Sem indicadores de suspeição',
      confidence: 'low',
    }
  }
}

// ============================================
// CONFIGURAÇÃO PADRÃO DOS ÓCULOS
// ============================================

export const DEFAULT_GLASSES_CONFIG: Omit<SmartGlassesConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  device_id: null,
  sos_tap_pattern: 'double',
  sos_enabled: true,
  auto_record_audio: true,
  max_record_duration: 120, // 2 minutos
  removal_alert_enabled: true,
  removal_grace_seconds: 30,
  share_audio_evidence: false,
  hid_key_code: 0, // detecção automática
  stealth_mode: true,
}
