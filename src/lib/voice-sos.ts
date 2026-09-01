/**
 * Voice SOS — Web Speech API para activação de emergência mãos-livres.
 * Detecta frases de activação em Português e dispara o protocolo de emergência.
 * Funciona em background contínuo com cooldown anti-falsos positivos.
 */

declare const SpeechRecognition: any
declare const SpeechRecognitionEvent: any

const SpeechRecognitionImpl =
  (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null

export interface VoiceSOSOptions {
  wakePhrases: string[]
  confirmationPhrase?: string
  requireConfirmation?: boolean
  language?: string
  continuous?: boolean
  cooldownMs?: number
  onPhraseDetected?: (phrase: string, confidence: number) => void
  onActivated?: (phrase: string, confidence: number) => void
  onError?: (error: string) => void
  onStateChange?: (listening: boolean) => void
}

export interface VoiceSOSController {
  isListening: boolean
  isSupported: boolean
  lastDetected: string | null
  lastConfidence: number
  activationCount: number
  start: () => void
  stop: () => void
  destroy: () => void
}

const DEFAULT_PHRASES = [
  // Portuguese primary
  'socorro', 'ajuda', 'emergencia', 'socorro socorro',
  'me ajuda', 'preciso de ajuda', 'estou em perigo',
  'ajuda emergencia', 'socorro ajuda', 'policia',
  // Urgent short codes
  '112', '911',
  // English (for tourists/mixed speakers)
  'help me', 'emergency', 'help', 'sos',
  // Whisper detection — lower confidence threshold
  'socorro baixinho', 'me ajude', 'perigo',
  // South African English / local slang
  'danger', 'help please', 'iyoh', 'nkarhi',
  // Scenario-based (triggered during specific situations)
  'nao me larga', 'solta me', 'vai embora',
  'chama a policia', 'liga para a policia',
]

const DEFAULT_CONFIRMATION = 'confirmar'

/**
 * Normaliza texto: remove acentos, lowercase, trim, normaliza espaços.
 * Permite detecção fiável independentemente de sotaque.
 */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Fuzzy match — permite pequenas variações na frase detectada */
function fuzzyMatch(transcript: string, phrase: string, threshold = 0.7): { matched: boolean; confidence: number } {
  const normTranscript = normalize(transcript)
  const normPhrase = normalize(phrase)

  if (normTranscript.includes(normPhrase)) {
    return { matched: true, confidence: 0.95 }
  }

  // Levenshtein-based similarity for short phrases
  if (normTranscript.length >= 3 && normPhrase.length >= 3) {
    const words = normPhrase.split(' ')
    const transcriptWords = normTranscript.split(' ')
    let matchCount = 0
    for (const pw of words) {
      for (const tw of transcriptWords) {
        if (tw.includes(pw) || levenshtein(tw, pw) <= Math.max(1, Math.floor(pw.length * 0.3))) {
          matchCount++
          break
        }
      }
    }
    const wordConfidence = matchCount / words.length
    if (wordConfidence >= threshold) {
      return { matched: true, confidence: wordConfidence }
    }
  }

  return { matched: false, confidence: 0 }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

/**
 * Creates a Voice SOS controller.
 * Not a React hook — can be used from any context.
 */
export function createVoiceSOS(options: VoiceSOSOptions): VoiceSOSController {
  const phrases = options.wakePhrases.length > 0 ? options.wakePhrases : DEFAULT_PHRASES
  const confirmationPhrase = options.confirmationPhrase || DEFAULT_CONFIRMATION
  const requireConfirmation = options.requireConfirmation ?? true
  const language = options.language || 'pt-BR'
  const continuous = options.continuous ?? true
  const cooldownMs = options.cooldownMs || 30_000

  let recognition: any = null
  let isListening = false
  let lastActivationTime = 0
  let lastDetected: string | null = null
  let lastConfidence = 0
  let activationCount = 0
  let isWaitingConfirmation = false
  let destroyed = false

  const isSupported = !!SpeechRecognitionImpl

  function start() {
    if (!isSupported || destroyed) {
      options.onError?.('Speech recognition not supported in this browser')
      return
    }
    if (isListening) return

    try {
      recognition = new SpeechRecognitionImpl()
      recognition.lang = language
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.maxAlternatives = 3

      recognition.onresult = (event: any) => {
        if (destroyed) return

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const transcript = result[0].transcript
            const confidence = result[0].confidence
            processTranscript(transcript, confidence)
          } else {
            // Security: check interim results for urgent short codes (112, 911, SOS)
            // These bypass confirmation to save critical seconds
            const interimTranscript = result[0].transcript
            const urgentCodes = ['112', '911', 'sos']
            if (urgentCodes.some(code => normalize(interimTranscript).includes(code))) {
              processTranscript(interimTranscript, 0.5) // Process even as interim for speed
            }
          }
        }
      }

      recognition.onerror = (event) => {
        if (destroyed) return
        console.warn('[VoiceSOS] Error:', event.error)
        // 'no-speech' and 'aborted' are common and non-critical
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          options.onError?.(event.error)
        }
        // Auto-restart on network errors
        if (event.error === 'network' && continuous && !destroyed) {
          setTimeout(() => { if (!destroyed) start() }, 2000)
        }
      }

      recognition.onend = () => {
        if (destroyed) return
        isListening = false
        options.onStateChange?.(false)
        // Auto-restart if continuous mode
        if (continuous && !destroyed) {
          setTimeout(() => { if (!destroyed && !isListening) start() }, 300)
        }
      }

      recognition.onstart = () => {
        isListening = true
        options.onStateChange?.(true)
      }

      recognition.start()
    } catch (err) {
      options.onError?.(`Failed to start: ${err}`)
    }
  }

  function processTranscript(transcript: string, confidence: number) {
    // Check cooldown
    const now = Date.now()
    if (now - lastActivationTime < cooldownMs) return

    if (isWaitingConfirmation) {
      // Check for confirmation phrase
      const confirmMatch = fuzzyMatch(transcript, confirmationPhrase, 0.6)
      if (confirmMatch.matched) {
        isWaitingConfirmation = false
        lastActivationTime = now
        activationCount++
        lastDetected = confirmationPhrase
        lastConfidence = confirmMatch.confidence
        options.onActivated?.(confirmationPhrase, confirmMatch.confidence)
      } else {
        // Reset if different phrase (timeout handled by timer)
        isWaitingConfirmation = false
      }
      return
    }

    // Check all wake phrases
    for (const phrase of phrases) {
      const match = fuzzyMatch(transcript, phrase)
      if (match.matched) {
        lastDetected = phrase
        lastConfidence = match.confidence
        options.onPhraseDetected?.(phrase, match.confidence)

        if (requireConfirmation) {
          isWaitingConfirmation = true
          // Auto-cancel confirmation after 8 seconds
          setTimeout(() => { isWaitingConfirmation = false }, 8000)
        } else {
          lastActivationTime = now
          activationCount++
          options.onActivated?.(phrase, match.confidence)
        }
        return
      }
    }
  }

  function stop() {
    if (recognition) {
      try { recognition.stop() } catch {}
      recognition = null
    }
    isListening = false
    isWaitingConfirmation = false
    options.onStateChange?.(false)
  }

  function destroy() {
    destroyed = true
    stop()
  }

  return {
    get isListening() { return isListening },
    isSupported,
    get lastDetected() { return lastDetected },
    get lastConfidence() { return lastConfidence },
    get activationCount() { return activationCount },
    start,
    stop,
    destroy,
  }
}

export { DEFAULT_PHRASES, DEFAULT_CONFIRMATION }
