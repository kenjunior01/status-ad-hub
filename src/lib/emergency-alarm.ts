/**
 * Emergency Alarm System
 *
 * Uses the Web Audio API to generate a loud, attention-grabbing alarm
 * when an emergency is triggered. No external audio files needed.
 *
 * Features:
 * - Dual-tone siren pattern (alternating frequencies)
 * - Vibration API integration (mobile devices)
 * - Gradual volume ramp-up
 * - Configurable duration with auto-stop
 * - Respects system audio context policies (requires user gesture)
 */

let audioCtx: AudioContext | null = null
let oscillators: OscillatorNode[] = []
let gainNode: GainNode | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let isPlaying = false
let vibrationIntervalId: ReturnType<typeof setInterval> | null = null

/** Ensure AudioContext is created (must happen after user gesture) */
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Start the emergency alarm.
 * Call this after a user gesture (button click).
 *
 * @param options.duration - Auto-stop after this many ms (default 30s)
 * @param options.volume   - Peak volume 0-1 (default 0.7)
 * @param options.vibrate  - Enable vibration pattern (default true)
 */
export function startEmergencyAlarm(options?: {
  duration?: number
  volume?: number
  vibrate?: boolean
}): void {
  if (isPlaying) return

  const duration = options?.duration ?? 30_000
  const peakVolume = options?.volume ?? 0.7
  const doVibrate = options?.vibrate ?? true

  try {
    const ctx = getAudioContext()
    gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.connect(ctx.destination)

    isPlaying = true
    let toggle = false
    let step = 0

    // Siren pattern: alternate between two frequencies
    const FREQ_HIGH = 880  // A5
    const FREQ_LOW = 660   // E5

    function createOscillator(freq: number) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      osc.connect(gainNode!)
      osc.start(ctx.currentTime)
      oscillators.push(osc)
      return osc
    }

    // Start initial tone
    createOscillator(FREQ_HIGH)

    // Ramp up volume over 500ms
    gainNode.gain.linearRampToValueAtTime(peakVolume, ctx.currentTime + 0.5)

    // Alternate siren pattern every 600ms
    intervalId = setInterval(() => {
      step++
      if (step > Math.floor(duration / 600)) {
        stopEmergencyAlarm()
        return
      }

      toggle = !toggle
      const freq = toggle ? FREQ_HIGH : FREQ_LOW
      const nextFreq = toggle ? FREQ_LOW : FREQ_HIGH

      // Smooth frequency transition
      oscillators.forEach((osc) => {
        osc.frequency.linearRampToValueAtTime(freq, getAudioContext().currentTime + 0.15)
      })

      // Pulse volume for urgency
      if (gainNode) {
        gainNode.gain.linearRampToValueAtTime(peakVolume * 0.3, ctx.currentTime + 0.3)
        gainNode.gain.linearRampToValueAtTime(peakVolume, ctx.currentTime + 0.5)
      }
    }, 600)

    // Vibration pattern for mobile
    if (doVibrate && 'vibrate' in navigator) {
      const pattern = [200, 100, 200, 100, 200, 300, 200, 100, 200]
      try {
        ;(navigator as any).vibrate(pattern)
        vibrationIntervalId = setInterval(() => {
          try { (navigator as any).vibrate(pattern) } catch {}
        }, 2000)
      } catch {}
    }

    // Auto-stop after duration
    setTimeout(() => stopEmergencyAlarm(), duration)
  } catch (err) {
    console.error('[ALARM] Failed to start:', err)
    isPlaying = false
  }
}

/**
 * Stop the emergency alarm and clean up resources.
 */
export function stopEmergencyAlarm(): void {
  if (!isPlaying) return
  isPlaying = false

  try {
    // Fade out over 300ms
    if (gainNode && audioCtx) {
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3)
    }

    // Stop oscillators after fade
    setTimeout(() => {
      oscillators.forEach((osc) => {
        try { osc.stop() } catch {}
      })
      oscillators = []
      gainNode = null
    }, 350)
  } catch {}

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }

  if (vibrationIntervalId) {
    clearInterval(vibrationIntervalId)
    vibrationIntervalId = null
  }

  // Stop vibration
  if ('vibrate' in navigator) {
    try { (navigator as any).vibrate(0) } catch {}
  }
}

/** Check if the alarm is currently playing */
export function isAlarmPlaying(): boolean {
  return isPlaying
}
